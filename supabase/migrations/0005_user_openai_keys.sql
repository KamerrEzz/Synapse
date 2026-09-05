-- Per-user OpenAI keys. Ciphertext is AES-GCM from the Next server.
-- Authenticated role cannot SELECT the table; only SECURITY DEFINER RPCs.

create table public.user_openai_keys (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ciphertext text not null,
  last4 text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_openai_keys enable row level security;
revoke all on public.user_openai_keys from public, anon, authenticated;

create or replace function public.save_own_openai_key(p_ciphertext text, p_last4 text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_ciphertext is null or length(p_ciphertext) < 16 then
    raise exception 'Clave inválida';
  end if;
  if p_last4 is null or length(p_last4) < 2 or length(p_last4) > 8 then
    raise exception 'Metadato inválido';
  end if;
  insert into public.user_openai_keys (user_id, ciphertext, last4)
  values (auth.uid(), p_ciphertext, p_last4)
  on conflict (user_id) do update
    set ciphertext = excluded.ciphertext,
        last4 = excluded.last4,
        updated_at = now();
end;
$$;

create or replace function public.own_openai_key_meta()
returns table (last4 text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select k.last4, k.updated_at
  from public.user_openai_keys k
  where k.user_id = auth.uid();
$$;

create or replace function public.own_openai_key_cipher()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select k.ciphertext
  from public.user_openai_keys k
  where k.user_id = auth.uid();
$$;

create or replace function public.delete_own_openai_key()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  delete from public.user_openai_keys where user_id = auth.uid();
end;
$$;

revoke all on function public.save_own_openai_key(text, text) from public, anon;
revoke all on function public.own_openai_key_meta() from public, anon;
revoke all on function public.own_openai_key_cipher() from public, anon;
revoke all on function public.delete_own_openai_key() from public, anon;

grant execute on function public.save_own_openai_key(text, text) to authenticated;
grant execute on function public.own_openai_key_meta() to authenticated;
grant execute on function public.own_openai_key_cipher() to authenticated;
grant execute on function public.delete_own_openai_key() to authenticated;
