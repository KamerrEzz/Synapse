-- Realtime Authorization for private Broadcast channels (doc:*, chat:*, workspace:*).
-- RLS is already enabled on realtime.messages (owned by supabase_realtime_admin).
-- Do NOT run ALTER TABLE ... ENABLE ROW LEVEL SECURITY — postgres is not the owner.
-- Only CREATE/DROP POLICY is allowed on this table.
-- Also turn off "Allow public access" in Dashboard → Realtime → Settings.

drop policy if exists synapse_realtime_select on realtime.messages;
create policy synapse_realtime_select
  on realtime.messages for select to authenticated
  using (public.realtime_topic_allowed());

drop policy if exists synapse_realtime_insert on realtime.messages;
create policy synapse_realtime_insert
  on realtime.messages for insert to authenticated
  with check (public.realtime_topic_allowed());

grant execute on function public.realtime_topic_allowed() to authenticated, anon;
