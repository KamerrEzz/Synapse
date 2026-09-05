-- Realtime Authorization for private Broadcast channels (doc:*, chat:*, workspace:*).
-- The management API / MCP role is not owner of realtime.messages, so this must be
-- run in the Dashboard SQL editor as postgres if policies are missing.

alter table realtime.messages enable row level security;

drop policy if exists synapse_realtime_select on realtime.messages;
create policy synapse_realtime_select
  on realtime.messages for select to authenticated
  using (public.realtime_topic_allowed());

drop policy if exists synapse_realtime_insert on realtime.messages;
create policy synapse_realtime_insert
  on realtime.messages for insert to authenticated
  with check (public.realtime_topic_allowed());

grant execute on function public.realtime_topic_allowed() to authenticated, anon;
