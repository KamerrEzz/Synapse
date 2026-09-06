-- Usage metadata for AI cost, plus member-safe index/MCP aggregates for Estadísticas.

alter table public.usage_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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
    'top_sources', '[]'::jsonb
  ));
end;
$$;

create or replace function public.workspace_mcp_token_stats(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;

  return (
    select jsonb_build_object(
      'active', count(*) filter (where revoked_at is null)::bigint,
      'used', count(*) filter (where revoked_at is null and last_used_at is not null)::bigint,
      'last_used_at', max(last_used_at)
    )
    from public.mcp_tokens
    where revoked_at is null
      and (
        workspace_id = p_workspace_id
        or (
          workspace_id is null
          and user_id in (
            select m.user_id from public.workspace_members m where m.workspace_id = p_workspace_id
          )
        )
      )
  );
end;
$$;

grant execute on function public.workspace_index_totals(uuid) to authenticated;
grant execute on function public.workspace_mcp_token_stats(uuid) to authenticated;
