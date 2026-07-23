-- Separate outcomes (goals), actions (events) and time (schedules).
-- Existing goal schedules are converted to linked events before the new
-- event-only schedule constraint is enforced.

alter table public.schedules
  add constraint schedules_id_user_unique unique (id, user_id);

create table public.event_goals (
  event_id uuid not null,
  goal_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, goal_id),
  constraint event_goals_event_owner_fkey
    foreign key (event_id, user_id)
    references public.events(id, user_id)
    on delete cascade,
  constraint event_goals_goal_owner_fkey
    foreign key (goal_id, user_id)
    references public.goals(id, user_id)
    on delete cascade
);

create index event_goals_user_event_idx
  on public.event_goals (user_id, event_id);
create index event_goals_user_goal_idx
  on public.event_goals (user_id, goal_id);

create temporary table goal_schedule_event_map (
  goal_id uuid primary key,
  event_id uuid not null unique,
  user_id uuid not null,
  category_id uuid not null,
  title text not null
) on commit drop;

insert into goal_schedule_event_map (goal_id, event_id, user_id, category_id, title)
select
  goals.id,
  gen_random_uuid(),
  goals.user_id,
  goals.category_id,
  goals.title
from public.goals as goals
where exists (
  select 1
  from public.schedules as schedules
  where schedules.goal_id = goals.id
);

insert into public.events (id, user_id, category_id, title, description)
select
  mapping.event_id,
  mapping.user_id,
  mapping.category_id,
  mapping.title,
  null
from goal_schedule_event_map as mapping;

insert into public.event_goals (event_id, goal_id, user_id)
select mapping.event_id, mapping.goal_id, mapping.user_id
from goal_schedule_event_map as mapping;

update public.schedules as schedules
set
  event_id = mapping.event_id,
  goal_id = null
from goal_schedule_event_map as mapping
where schedules.goal_id = mapping.goal_id;

alter table public.schedules
  drop constraint schedules_exactly_one_target_check,
  add constraint schedules_event_target_check
    check (event_id is not null and goal_id is null);

drop index public.schedules_goal_user_idx;

create table public.schedule_occurrence_completions (
  schedule_id uuid not null,
  occurrence_starts_at timestamptz not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (schedule_id, occurrence_starts_at),
  constraint schedule_occurrence_completions_owner_fkey
    foreign key (schedule_id, user_id)
    references public.schedules(id, user_id)
    on delete cascade
);

create index schedule_occurrence_completions_user_time_idx
  on public.schedule_occurrence_completions (user_id, occurrence_starts_at desc);

create table public.goal_check_ins (
  goal_id uuid not null,
  period_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  value numeric(14, 4) not null default 1
    check (value >= 0 and value <= 9999999999.9999),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (goal_id, period_start),
  constraint goal_check_ins_goal_owner_fkey
    foreign key (goal_id, user_id)
    references public.goals(id, user_id)
    on delete cascade
);

create index goal_check_ins_user_period_idx
  on public.goal_check_ins (user_id, period_start desc);

alter table public.event_goals enable row level security;
alter table public.schedule_occurrence_completions enable row level security;
alter table public.goal_check_ins enable row level security;

create policy "event_goals_manage_own"
on public.event_goals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "schedule_occurrence_completions_manage_own"
on public.schedule_occurrence_completions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "goal_check_ins_manage_own"
on public.goal_check_ins for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.event_goals from public, anon;
revoke all on public.schedule_occurrence_completions from public, anon;
revoke all on public.goal_check_ins from public, anon;

grant select, insert, update, delete on public.event_goals to authenticated;
grant select, insert, update, delete on public.schedule_occurrence_completions to authenticated;
grant select, insert, update, delete on public.goal_check_ins to authenticated;

grant all on public.event_goals to service_role;
grant all on public.schedule_occurrence_completions to service_role;
grant all on public.goal_check_ins to service_role;

create or replace function public.set_event_goals(
  p_event_id uuid,
  p_goal_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal_ids uuid[] := coalesce(p_goal_ids, array[]::uuid[]);
begin
  if v_user_id is null or not exists (
    select 1
    from public.events
    where id = p_event_id
      and user_id = v_user_id
  ) then
    raise exception 'Event not found'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from unnest(v_goal_ids) as requested(goal_id)
    left join public.goals
      on goals.id = requested.goal_id
     and goals.user_id = v_user_id
    where goals.id is null
  ) then
    raise exception 'Goal not found'
      using errcode = '23503';
  end if;

  delete from public.event_goals
  where event_id = p_event_id
    and user_id = v_user_id
    and not (goal_id = any(v_goal_ids));

  insert into public.event_goals (event_id, goal_id, user_id)
  select p_event_id, requested.goal_id, v_user_id
  from (
    select distinct goal_id
    from unnest(v_goal_ids) as input(goal_id)
  ) as requested
  on conflict (event_id, goal_id) do nothing;
end;
$$;

revoke all on function public.set_event_goals(uuid, uuid[]) from public, anon;
grant execute on function public.set_event_goals(uuid, uuid[]) to authenticated;
