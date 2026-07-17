create policy "stripe_webhook_events_service_only"
on public.stripe_webhook_events
for all
to service_role
using (true)
with check (true);

create index event_media_event_owner_idx
  on public.event_media (event_id, user_id);

create index goal_media_goal_owner_idx
  on public.goal_media (goal_id, user_id);