-- Conversational questions like "de que trata el archivo de certificate"
-- became AND queries (trat & archiv & certificat) and missed the PDF.
-- Search title+content and OR the query lexemes; boost title hits.
-- Keyword hits still skip the semantic distance gate.

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
  v_or text;
  v_fts tsquery;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;

  v_or := (
    select string_agg(lexeme, ' | ' order by lexeme)
    from unnest(tsvector_to_array(to_tsvector('spanish', v_q))) as lexeme
    where length(lexeme) >= 3
  );
  if v_or is not null then
    v_fts := to_tsquery('spanish', v_or);
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
        order by (
          ts_rank_cd(
            to_tsvector(
              'spanish',
              coalesce(c.metadata->>'title', '') || ' ' || c.content
            ),
            v_fts
          )
          + case
              when to_tsvector('spanish', coalesce(c.metadata->>'title', '')) @@ v_fts
                then 1.0
              else 0.0
            end
        ) desc
      ) as hit_rank
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and v_fts is not null
      and to_tsvector(
        'spanish',
        coalesce(c.metadata->>'title', '') || ' ' || c.content
      ) @@ v_fts
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

create or replace function public.mcp_hybrid_search(
  p_user_id uuid,
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
  v_or text;
  v_fts tsquery;
begin
  if p_user_id is null or not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = p_user_id
  ) then
    raise exception 'Sin acceso';
  end if;

  v_or := (
    select string_agg(lexeme, ' | ' order by lexeme)
    from unnest(tsvector_to_array(to_tsvector('spanish', v_q))) as lexeme
    where length(lexeme) >= 3
  );
  if v_or is not null then
    v_fts := to_tsquery('spanish', v_or);
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
        order by (
          ts_rank_cd(
            to_tsvector(
              'spanish',
              coalesce(c.metadata->>'title', '') || ' ' || c.content
            ),
            v_fts
          )
          + case
              when to_tsvector('spanish', coalesce(c.metadata->>'title', '')) @@ v_fts
                then 1.0
              else 0.0
            end
        ) desc
      ) as hit_rank
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and v_fts is not null
      and to_tsvector(
        'spanish',
        coalesce(c.metadata->>'title', '') || ' ' || c.content
      ) @@ v_fts
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
revoke all on function public.mcp_hybrid_search(uuid, uuid, text, vector, integer) from public, anon, authenticated;
grant execute on function public.mcp_hybrid_search(uuid, uuid, text, vector, integer) to service_role;
