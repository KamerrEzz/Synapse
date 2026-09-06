-- Workspace AI billing mode: each member's BYOK, or the owner's key server-side.
-- Ciphertext stays in user_openai_keys; clients never SELECT it.

alter table public.workspaces
  add column if not exists ai_key_mode text not null default 'personal'
  constraint workspaces_ai_key_mode_check check (ai_key_mode in ('personal', 'shared'));

comment on column public.workspaces.ai_key_mode is
  'personal: each member uses their own BYOK. shared: members use the owner key on the server; ciphertext is never sent to clients.';
