create or replace function public.hybrid_search(
  p_workspace_id uuid,
  p_query text,
  p_embedding vector(1536),
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
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;

  return query
  with semantic as (
    select
      c.id,
      c.content,
      c.source_type,
      c.source_id,
      c.chunk_index,
      c.metadata,
      row_number() over (order by c.embedding <=> p_embedding) as rank
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and c.embedding is not null
    order by c.embedding <=> p_embedding
    limit 20
  ),
  fts as (
    select
      c.id,
      c.content,
      c.source_type,
      c.source_id,
      c.chunk_index,
      c.metadata,
      row_number() over (
        order by ts_rank_cd(to_tsvector('spanish', c.content), plainto_tsquery('spanish', v_q)) desc
      ) as rank
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and v_q <> ''
      and to_tsvector('spanish', c.content) @@ plainto_tsquery('spanish', v_q)
    limit 20
  )
  select
    coalesce(s.id, f.id) as id,
    coalesce(s.content, f.content) as content,
    coalesce(s.source_type, f.source_type) as source_type,
    coalesce(s.source_id, f.source_id) as source_id,
    coalesce(s.chunk_index, f.chunk_index) as chunk_index,
    coalesce(s.metadata, f.metadata) as metadata,
    (
      coalesce(1.0 / (60 + s.rank), 0) +
      coalesce(1.0 / (60 + f.rank), 0)
    ) as score
  from semantic s
  full outer join fts f on s.id = f.id
  order by score desc
  limit greatest(p_match_count, 1);
end;
$$;
