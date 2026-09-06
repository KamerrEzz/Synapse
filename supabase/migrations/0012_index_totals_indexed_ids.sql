-- Exact wiki coverage: all indexed document ids, not only the top-25 sources.

create or replace function public.workspace_index_totals(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;

  select jsonb_build_object(
    'chunks', count(*)::bigint,
    'chars', coalesce(sum(char_length(content)), 0)::bigint,
    'avg_chars', coalesce(avg(char_length(content)), 0)::float8,
    'file_chunks', count(*) filter (where source_type = 'file')::bigint,
    'document_chunks', count(*) filter (where source_type = 'document')::bigint,
    'file_sources', count(distinct source_id) filter (where source_type = 'file')::bigint,
    'document_sources', count(distinct source_id) filter (where source_type = 'document')::bigint,
    'indexed_document_ids', coalesce((
      select jsonb_agg(ids.source_id)
      from (
        select distinct source_id
        from public.knowledge_chunks
        where workspace_id = p_workspace_id and source_type = 'document'
      ) ids
    ), '[]'::jsonb),
    'top_sources', coalesce((
      select jsonb_agg(row_to_json(s))
      from (
        select
          source_type,
          source_id,
          count(*)::bigint as chunks,
          coalesce(sum(char_length(content)), 0)::bigint as chars
        from public.knowledge_chunks
        where workspace_id = p_workspace_id
        group by source_type, source_id
        order by count(*) desc
        limit 25
      ) s
    ), '[]'::jsonb)
  )
  into result
  from public.knowledge_chunks
  where workspace_id = p_workspace_id;

  return coalesce(result, jsonb_build_object(
    'chunks', 0,
    'chars', 0,
    'avg_chars', 0,
    'file_chunks', 0,
    'document_chunks', 0,
    'file_sources', 0,
    'document_sources', 0,
    'indexed_document_ids', '[]'::jsonb,
    'top_sources', '[]'::jsonb
  ));
end;
$$;

grant execute on function public.workspace_index_totals(uuid) to authenticated;
