-- Let service_role (MCP) pass p_user_id after TypeScript membership checks.
-- Authenticated callers still use auth.uid(); they must not impersonate.

drop function if exists public.workspace_index_totals(uuid);
drop function if exists public.workspace_mcp_token_stats(uuid);

create function public.workspace_index_totals(p_workspace_id uuid, p_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is not null and p_user_id is not null and p_user_id is distinct from v_uid then
    raise exception 'Sin acceso';
  end if;
  v_uid := coalesce(v_uid, p_user_id);
  if v_uid is null or not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = v_uid
  ) then
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

create function public.workspace_mcp_token_stats(p_workspace_id uuid, p_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is not null and p_user_id is not null and p_user_id is distinct from v_uid then
    raise exception 'Sin acceso';
  end if;
  v_uid := coalesce(v_uid, p_user_id);
  if v_uid is null or not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = v_uid
  ) then
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

grant execute on function public.workspace_index_totals(uuid, uuid) to authenticated, service_role;
grant execute on function public.workspace_mcp_token_stats(uuid, uuid) to authenticated, service_role;
