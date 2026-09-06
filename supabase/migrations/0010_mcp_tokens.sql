-- Personal MCP tokens. The secret is shown once in Next; only SHA-256 lives here.
-- Authenticated users manage their own rows via RPCs. Resolve is service_role only.

create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null default 'Agente',
  token_hash text not null unique,
  last4 text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mcp_tokens_name_len check (char_length(name) between 1 and 80),
  constraint mcp_tokens_last4_len check (char_length(last4) between 2 and 8)
);

create index mcp_tokens_user_idx on public.mcp_tokens (user_id) where revoked_at is null;

alter table public.mcp_tokens enable row level security;
revoke all on public.mcp_tokens from public, anon, authenticated;

create or replace function public.list_own_mcp_tokens()
returns table (
  id uuid,
  name text,
  last4 text,
  workspace_id uuid,
  last_used_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.name, t.last4, t.workspace_id, t.last_used_at, t.created_at
  from public.mcp_tokens t
  where t.user_id = auth.uid()
    and t.revoked_at is null
  order by t.created_at desc;
$$;

create or replace function public.insert_own_mcp_token(
  p_token_hash text,
  p_last4 text,
  p_name text,
  p_workspace_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_token_hash is null or length(p_token_hash) <> 64 then
    raise exception 'Hash inválido';
  end if;
  if p_workspace_id is not null and not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
  ) then
    raise exception 'Sin acceso a ese workspace';
  end if;

  insert into public.mcp_tokens (user_id, workspace_id, name, token_hash, last4)
  values (
    auth.uid(),
    p_workspace_id,
    left(trim(coalesce(p_name, 'Agente')), 80),
    p_token_hash,
    p_last4
  )
  returning public.mcp_tokens.id into v_id;
  return v_id;
end;
$$;

create or replace function public.revoke_own_mcp_token(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  update public.mcp_tokens
  set revoked_at = now()
  where id = p_id
    and user_id = auth.uid()
    and revoked_at is null;
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
begin
  if p_user_id is null or not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = p_user_id
  ) then
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

revoke all on function public.list_own_mcp_tokens() from public, anon;
revoke all on function public.insert_own_mcp_token(text, text, text, uuid) from public, anon;
revoke all on function public.revoke_own_mcp_token(uuid) from public, anon;
revoke all on function public.mcp_hybrid_search(uuid, uuid, text, vector, integer) from public, anon, authenticated;

grant execute on function public.list_own_mcp_tokens() to authenticated;
grant execute on function public.insert_own_mcp_token(text, text, text, uuid) to authenticated;
grant execute on function public.revoke_own_mcp_token(uuid) to authenticated;
grant execute on function public.mcp_hybrid_search(uuid, uuid, text, vector, integer) to service_role;
grant select, update on public.mcp_tokens to service_role;
