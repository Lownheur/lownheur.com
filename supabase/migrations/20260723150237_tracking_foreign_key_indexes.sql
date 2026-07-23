create index event_goals_event_owner_idx
  on public.event_goals (event_id, user_id);
create index event_goals_goal_owner_idx
  on public.event_goals (goal_id, user_id);
create index schedule_occurrence_completions_owner_idx
  on public.schedule_occurrence_completions (schedule_id, user_id);
create index goal_check_ins_goal_owner_idx
  on public.goal_check_ins (goal_id, user_id);

-- The legacy goal_id column remains nullable during the V1 transition because
-- the existing occurrence RPCs still expose it. The event-only check ensures
-- it cannot receive new data.
create index schedules_goal_owner_idx
  on public.schedules (goal_id, user_id);
