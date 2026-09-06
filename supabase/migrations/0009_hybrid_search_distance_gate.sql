-- Semantic k-NN without a distance gate always returns the closest chunks in
-- the workspace, even if they are unrelated (e.g. query "uziel" → Forge FAQ).
-- Cosine distance <=> is 0 identical … 2 opposite. Keep neighbors under 0.42
-- (~similarity 0.58). Keyword hits from FTS still surface without that gate.

create or replace function public.hybrid_search(
  p_workspace_id uuid,
  p_query text,
  p_embedding vector,
  p_match_count int default 8
)
returns table (
  id uuid,
  content text,
  source_type text,
  source_id uuid,
  chunk_index int,
  metadata jsonb,
  score double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := trim(coalesce(p_query, ''));
  v_max_distance double precision := 0.42;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;

  return query
  with semantic as (
    select
      c.id as hit_id,
      c.content as hit_content,
      c.source_type as hit_source_type,
      c.source_id as hit_source_id,
      c.chunk_index as hit_chunk_index,
      c.metadata as hit_metadata,
      row_number() over (order by c.embedding <=> p_embedding) as hit_rank
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and c.embedding is not null
      and (c.embedding <=> p_embedding) < v_max_distance
    order by c.embedding <=> p_embedding
    limit 20
  ),
  fts as (
    select
      c.id as hit_id,
      c.content as hit_content,
      c.source_type as hit_source_type,
      c.source_id as hit_source_id,
      c.chunk_index as hit_chunk_index,
      c.metadata as hit_metadata,
      row_number() over (
        order by ts_rank_cd(to_tsvector('spanish', c.content), plainto_tsquery('spanish', v_q)) desc
      ) as hit_rank
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and v_q <> ''
      and to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', v_q)
    limit 20
  )
  select
    coalesce(s.hit_id, f.hit_id)::uuid,
    coalesce(s.hit_content, f.hit_content)::text,
    coalesce(s.hit_source_type, f.hit_source_type)::text,
    coalesce(s.hit_source_id, f.hit_source_id)::uuid,
    coalesce(s.hit_chunk_index, f.hit_chunk_index)::integer,
    coalesce(s.hit_metadata, f.hit_metadata)::jsonb,
    (
      coalesce(1.0 / (60 + s.hit_rank), 0.0) +
      coalesce(1.0 / (60 + f.hit_rank), 0.0)
    )::double precision
  from semantic s
  full outer join fts f on s.hit_id = f.hit_id
  order by 7 desc
  limit greatest(p_match_count, 1);
end;
$$;

grant execute on function public.hybrid_search(uuid, text, vector, integer) to authenticated;
