-- Synapse initial schema: multi-tenant RLS, Yjs documents, unified RAG chunks.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references public.profiles(id),
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index workspace_invitations_pending_email
  on public.workspace_invitations (workspace_id, lower(email))
  where accepted_at is null;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default 'Sin título',
  yjs_state bytea,
  plain_text text not null default '',
  content jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  path text not null,
  mime_type text,
  size bigint,
  status text not null default 'processing' check (status in ('processing', 'ready', 'error')),
  error_message text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('file', 'document')),
  source_id uuid not null,
  content text not null,
  embedding vector(1536),
  chunk_index int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  is_private boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  title text,
  created_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id),
  kind text not null check (kind in ('ai_tokens', 'embedding_tokens', 'file_upload')),
  quantity bigint not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index documents_workspace_idx on public.documents (workspace_id, updated_at desc);
create index files_workspace_idx on public.files (workspace_id, created_at desc);
create index knowledge_chunks_workspace_idx on public.knowledge_chunks (workspace_id);
create index knowledge_chunks_source_idx on public.knowledge_chunks (source_type, source_id);
create index messages_channel_idx on public.messages (channel_id, created_at);
create index ai_conversations_user_idx on public.ai_conversations (workspace_id, user_id, created_at desc);
create index usage_events_ws_kind_idx on public.usage_events (workspace_id, kind, created_at desc);

create index knowledge_chunks_embedding_hnsw
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

create index documents_title_fts
  on public.documents
  using gin (to_tsvector('spanish', coalesce(title, '')));

create index documents_plain_fts
  on public.documents
  using gin (to_tsvector('spanish', coalesce(plain_text, '')));

create index knowledge_chunks_content_fts
  on public.knowledge_chunks
  using gin (to_tsvector('spanish', content));

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER to avoid recursive policies)
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(ws_id uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = any (roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_workspace(p_name text, p_slug text default null)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_slug text;
  v_ws public.workspaces;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'El nombre del workspace es demasiado corto';
  end if;

  v_slug := coalesce(nullif(trim(p_slug), ''), lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'workspace';
  end if;
  if exists (select 1 from public.workspaces where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(p_name), v_slug, v_user)
  returning * into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws.id, v_user, 'owner');

  insert into public.channels (workspace_id, name, created_by)
  values (v_ws.id, 'general', v_user);

  return v_ws;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_inv public.workspace_invitations;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;

  select email into v_email from auth.users where id = v_user;

  select * into v_inv
  from public.workspace_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'Invitación inválida o caducada';
  end if;

  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'Esta invitación es para otra cuenta';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_user, v_inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
  set accepted_at = now()
  where id = v_inv.id;

  return v_inv.workspace_id;
end;
$$;

create or replace function public.get_document_state(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ws uuid;
  v_state bytea;
begin
  select workspace_id, yjs_state into v_ws, v_state
  from public.documents
  where id = p_id;

  if v_ws is null then
    return null;
  end if;
  if not public.is_workspace_member(v_ws) then
    raise exception 'Sin acceso';
  end if;
  if v_state is null then
    return null;
  end if;
  return encode(v_state, 'base64');
end;
$$;

create or replace function public.persist_document_state(
  p_id uuid,
  p_state text,
  p_plain_text text,
  p_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
begin
  select workspace_id into v_ws from public.documents where id = p_id;
  if v_ws is null or not public.is_workspace_member(v_ws) then
    raise exception 'Sin acceso';
  end if;

  update public.documents
  set
    yjs_state = case when p_state is null or p_state = '' then yjs_state else decode(p_state, 'base64') end,
    plain_text = coalesce(p_plain_text, plain_text),
    title = coalesce(nullif(trim(p_title), ''), title)
  where id = p_id;
end;
$$;

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
        order by ts_rank_cd(to_tsvector('spanish', c.content), websearch_to_tsquery('spanish', coalesce(p_query, ''))) desc
      ) as rank
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and coalesce(p_query, '') <> ''
      and to_tsvector('spanish', c.content) @@ websearch_to_tsquery('spanish', p_query)
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

create or replace function public.workspace_monthly_ai_tokens(p_workspace_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(quantity), 0)
  from public.usage_events
  where workspace_id = p_workspace_id
    and kind = 'ai_tokens'
    and created_at >= date_trunc('month', now());
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.documents enable row level security;
alter table public.files enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.usage_events enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "workspaces_select_member"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces_update_admin"
  on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']))
  with check (public.has_workspace_role(id, array['owner', 'admin']));

create policy "workspaces_delete_owner"
  on public.workspaces for delete to authenticated
  using (public.has_workspace_role(id, array['owner']));

create policy "members_select"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members_insert_admin"
  on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "members_update_admin"
  on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "members_delete_admin"
  on public.workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "invitations_select_admin"
  on public.workspace_invitations for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "invitations_insert_admin"
  on public.workspace_invitations for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "invitations_delete_admin"
  on public.workspace_invitations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "documents_select_member"
  on public.documents for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "documents_insert_member"
  on public.documents for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "documents_update_member"
  on public.documents for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "documents_delete_member"
  on public.documents for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "files_select_member"
  on public.files for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "files_insert_member"
  on public.files for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "files_update_member"
  on public.files for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "files_delete_member"
  on public.files for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "chunks_select_member"
  on public.knowledge_chunks for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "chunks_insert_member"
  on public.knowledge_chunks for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "chunks_delete_member"
  on public.knowledge_chunks for delete to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "channels_select_member"
  on public.channels for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "channels_insert_member"
  on public.channels for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "channels_delete_admin"
  on public.channels for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "messages_select_member"
  on public.messages for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "messages_insert_member"
  on public.messages for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create policy "messages_delete_own"
  on public.messages for delete to authenticated
  using (user_id = auth.uid() or public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "ai_conv_select_own"
  on public.ai_conversations for select to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "ai_conv_insert_own"
  on public.ai_conversations for insert to authenticated
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "ai_conv_delete_own"
  on public.ai_conversations for delete to authenticated
  using (user_id = auth.uid());

create policy "ai_msg_select_own"
  on public.ai_messages for select to authenticated
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "ai_msg_insert_own"
  on public.ai_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "usage_select_admin"
  on public.usage_events for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']) or user_id = auth.uid());

create policy "usage_insert_member"
  on public.usage_events for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'workspace-files',
    'workspace-files',
    false,
    26214400,
    array[
      'application/pdf',
      'text/markdown',
      'text/plain',
      'text/md',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif'
    ]
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  )
on conflict (id) do nothing;

create policy "workspace_files_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.is_workspace_member((split_part(name, '/', 1))::uuid)
  );

create policy "workspace_files_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'workspace-files'
    and public.is_workspace_member((split_part(name, '/', 1))::uuid)
  );

create policy "workspace_files_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'workspace-files'
    and public.is_workspace_member((split_part(name, '/', 1))::uuid)
  );

create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.messages replica identity full;
alter table public.documents replica identity full;
alter table public.files replica identity full;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.files;
alter publication supabase_realtime add table public.channels;
alter publication supabase_realtime add table public.workspace_members;

create or replace function public.realtime_topic_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t text;
  topic_id uuid;
begin
  t := realtime.topic();
  begin
    if t like 'doc:%' then
      topic_id := substr(t, 5)::uuid;
      return exists (
        select 1 from public.documents d
        where d.id = topic_id and public.is_workspace_member(d.workspace_id)
      );
    elsif t like 'chat:%' then
      topic_id := substr(t, 6)::uuid;
      return exists (
        select 1 from public.channels c
        where c.id = topic_id and public.is_workspace_member(c.workspace_id)
      );
    elsif t like 'workspace:%' then
      topic_id := substr(t, 11)::uuid;
      return public.is_workspace_member(topic_id);
    end if;
  exception when others then
    return false;
  end;
  return false;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'realtime' and table_name = 'messages'
  ) then
    execute 'alter table realtime.messages enable row level security';
    execute $p$
      create policy "synapse_realtime_select"
      on realtime.messages for select to authenticated
      using (public.realtime_topic_allowed())
    $p$;
    execute $p$
      create policy "synapse_realtime_insert"
      on realtime.messages for insert to authenticated
      with check (public.realtime_topic_allowed())
    $p$;
  end if;
exception when others then
  raise notice 'Realtime authorization policies skipped: %', sqlerrm;
end;
$$;

-- Grants
grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.get_document_state(uuid) to authenticated;
grant execute on function public.persist_document_state(uuid, text, text, text) to authenticated;
grant execute on function public.hybrid_search(uuid, text, vector, int) to authenticated;
grant execute on function public.workspace_monthly_ai_tokens(uuid) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;
