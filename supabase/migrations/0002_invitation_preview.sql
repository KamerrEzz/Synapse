-- Allow invitees to read their own pending invitation by JWT email.
-- Preview RPC so the /invite/[token] page works before membership exists.

create or replace function public.get_invitation_preview(p_token text)
returns table (
  email text,
  workspace_name text,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.email,
    w.name,
    i.expires_at,
    i.accepted_at
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = p_token
  limit 1;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;

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
    and created_at >= date_trunc('month', now())
    and public.is_workspace_member(p_workspace_id);
$$;

create policy "invitations_select_own_email"
  on public.workspace_invitations for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
