-- OpenAI-compatible providers (NaN, custom base URL). Unbounded vectors so
-- 1536 and 4096 can coexist in different workspaces. One dim per workspace.

alter table public.workspaces
  add column if not exists embedding_dim int;

alter table public.user_openai_keys
  add column if not exists provider text not null default 'openai',
  add column if not exists base_url text,
  add column if not exists chat_model text,
  add column if not exists embedding_model text,
  add column if not exists embedding_dim int;

alter table public.user_openai_keys
  drop constraint if exists user_openai_keys_provider_check;

alter table public.user_openai_keys
  add constraint user_openai_keys_provider_check
  check (provider in ('openai', 'nan', 'compatible'));

drop index if exists knowledge_chunks_embedding_hnsw;

alter table public.knowledge_chunks
  alter column embedding type vector using embedding;

drop function if exists public.hybrid_search(uuid, text, vector, integer);

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

grant execute on function public.hybrid_search(uuid, text, vector, integer) to authenticated;

create or replace function public.claim_workspace_embedding_dim(p_workspace_id uuid, p_dim int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dim int;
begin
  if auth.uid() is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;
  if p_dim is null or p_dim < 8 or p_dim > 16000 then
    raise exception 'Dimensión inválida';
  end if;

  select w.embedding_dim into v_dim
  from public.workspaces w
  where w.id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace no encontrado';
  end if;

  if v_dim is null then
    update public.workspaces
    set embedding_dim = p_dim
    where id = p_workspace_id;
    return p_dim;
  end if;

  if v_dim <> p_dim then
    raise exception 'Este workspace ya indexó con vectores de % dimensiones. Usa el mismo modelo de embeddings o borra lo indexado.', v_dim;
  end if;

  return v_dim;
end;
$$;

grant execute on function public.claim_workspace_embedding_dim(uuid, integer) to authenticated;

drop function if exists public.save_own_openai_key(text, text);

create or replace function public.save_own_ai_credential(
  p_provider text,
  p_base_url text,
  p_chat_model text,
  p_embedding_model text,
  p_embedding_dim int,
  p_ciphertext text,
  p_last4 text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_provider is null or p_provider not in ('openai', 'nan', 'compatible') then
    raise exception 'Proveedor inválido';
  end if;
  if p_base_url is null or length(p_base_url) < 8 or length(p_base_url) > 200 then
    raise exception 'URL inválida';
  end if;
  if p_chat_model is null or length(p_chat_model) < 2 or length(p_chat_model) > 80 then
    raise exception 'Modelo de chat inválido';
  end if;
  if p_embedding_model is null or length(p_embedding_model) < 2 or length(p_embedding_model) > 80 then
    raise exception 'Modelo de embeddings inválido';
  end if;
  if p_embedding_dim is null or p_embedding_dim < 8 or p_embedding_dim > 16000 then
    raise exception 'Dimensión inválida';
  end if;

  if p_ciphertext is null then
    update public.user_openai_keys
    set provider = p_provider,
        base_url = p_base_url,
        chat_model = p_chat_model,
        embedding_model = p_embedding_model,
        embedding_dim = p_embedding_dim,
        updated_at = now()
    where user_id = auth.uid();
    if not found then
      raise exception 'Añade una clave';
    end if;
    return;
  end if;

  if length(p_ciphertext) < 16 then
    raise exception 'Clave inválida';
  end if;
  if p_last4 is null or length(p_last4) < 2 or length(p_last4) > 8 then
    raise exception 'Metadato inválido';
  end if;

  insert into public.user_openai_keys (
    user_id, ciphertext, last4, provider, base_url, chat_model, embedding_model, embedding_dim
  )
  values (
    auth.uid(), p_ciphertext, p_last4, p_provider, p_base_url, p_chat_model, p_embedding_model, p_embedding_dim
  )
  on conflict (user_id) do update
    set ciphertext = excluded.ciphertext,
        last4 = excluded.last4,
        provider = excluded.provider,
        base_url = excluded.base_url,
        chat_model = excluded.chat_model,
        embedding_model = excluded.embedding_model,
        embedding_dim = excluded.embedding_dim,
        updated_at = now();
end;
$$;

revoke all on function public.save_own_ai_credential(text, text, text, text, int, text, text) from public, anon;
grant execute on function public.save_own_ai_credential(text, text, text, text, int, text, text) to authenticated;

drop function if exists public.own_openai_key_meta();

create or replace function public.own_openai_key_meta()
returns table (
  last4 text,
  updated_at timestamptz,
  provider text,
  base_url text,
  chat_model text,
  embedding_model text,
  embedding_dim int
)
language sql
stable
security definer
set search_path = public
as $$
  select k.last4, k.updated_at, k.provider, k.base_url, k.chat_model, k.embedding_model, k.embedding_dim
  from public.user_openai_keys k
  where k.user_id = auth.uid();
$$;

revoke all on function public.own_openai_key_meta() from public, anon;
grant execute on function public.own_openai_key_meta() to authenticated;
