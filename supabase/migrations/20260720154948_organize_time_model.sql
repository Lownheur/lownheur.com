-- V1 time model: category trees, measurable goals and recurring schedules.

alter table public.categories
  add column parent_id uuid;

alter table public.categories
  add constraint categories_parent_not_self_check
    check (parent_id is null or parent_id <> id),
  add constraint categories_parent_owner_fkey
    foreign key (parent_id, user_id)
    references public.categories(id, user_id)
    on delete restrict;

drop index public.categories_user_title_lower_uidx;

create unique index categories_user_root_title_lower_uidx
  on public.categories (user_id, lower(title))
  where parent_id is null;

create unique index categories_user_parent_title_lower_uidx
  on public.categories (user_id, parent_id, lower(title))
  where parent_id is not null;

create index categories_parent_user_idx
  on public.categories (parent_id, user_id)
  where parent_id is not null;

create or replace function private.prevent_category_cycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  has_cycle boolean;
begin
  if new.parent_id is null then
    return new;
  end if;

  with recursive ancestors as (
    select
      categories.id,
      categories.parent_id,
      array[categories.id] as visited
    from public.categories
    where categories.id = new.parent_id
      and categories.user_id = new.user_id

    union all

    select
      categories.id,
      categories.parent_id,
      ancestors.visited || categories.id
    from public.categories
    join ancestors on categories.id = ancestors.parent_id
    where categories.user_id = new.user_id
      and not categories.id = any(ancestors.visited)
  )
  select coalesce(bool_or(ancestors.id = new.id), false)
  into has_cycle
  from ancestors;

  if has_cycle then
    raise exception 'A category cannot be moved inside itself or one of its descendants.'
      using errcode = '23514', constraint = 'categories_no_cycles_check';
  end if;

  return new;
end;
$$;

revoke execute on function private.prevent_category_cycle()
  from public, anon, authenticated;

create trigger categories_prevent_cycle
before insert or update of parent_id, user_id on public.categories
for each row execute function private.prevent_category_cycle();

alter table public.goals
  add column goal_type text not null default 'completion',
  add column target_value numeric(14, 4) not null default 1,
  add column unit text not null default 'success',
  add column period text not null default 'once';

alter table public.goals
  add constraint goals_type_check
    check (goal_type in ('target', 'frequency', 'completion')),
  add constraint goals_target_value_check
    check (target_value >= 0 and target_value <= 9999999999.9999),
  add constraint goals_unit_check
    check (char_length(trim(unit)) between 1 and 40),
  add constraint goals_period_check
    check (period in ('once', 'day', 'week', 'month'));

alter table public.schedules
  add column recurrence text not null default 'none',
  add column recurrence_interval smallint not null default 1,
  add column recurrence_weekdays smallint[] not null default '{}'::smallint[],
  add column recurrence_ends_at timestamptz,
  add column recurrence_timezone text not null default 'UTC';

update public.schedules as schedules
set recurrence_timezone = profiles.timezone
from public.profiles as profiles
where profiles.user_id = schedules.user_id;

alter table public.schedules
  add constraint schedules_recurrence_check
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  add constraint schedules_recurrence_interval_check
    check (recurrence_interval between 1 and 365),
  add constraint schedules_recurrence_weekdays_check
    check (
      (
        recurrence = 'weekly'
        and cardinality(recurrence_weekdays) between 1 and 7
        and recurrence_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
      )
      or (
        recurrence <> 'weekly'
        and cardinality(recurrence_weekdays) = 0
      )
    ),
  add constraint schedules_recurrence_end_check
    check (
      (recurrence = 'none' and recurrence_ends_at is null)
      or (
        recurrence <> 'none'
        and (recurrence_ends_at is null or recurrence_ends_at > starts_at)
      )
    ),
  add constraint schedules_recurrence_timezone_check
    check (char_length(trim(recurrence_timezone)) between 1 and 80);

create index schedules_user_recurrence_end_idx
  on public.schedules (user_id, recurrence, recurrence_ends_at)
  where status = 'scheduled';

create or replace function public.get_upcoming_schedule_occurrences(
  p_limit integer default 10,
  p_from timestamptz default now()
)
returns table (
  schedule_id uuid,
  event_id uuid,
  goal_id uuid,
  occurrence_starts_at timestamptz,
  occurrence_ends_at timestamptz,
  recurrence text,
  recurrence_timezone text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with settings as (
    select
      least(greatest(coalesce(p_limit, 10), 1), 50) as result_limit,
      coalesce(p_from, now()) as requested_from
  ),
  owned as (
    select
      schedules.*,
      schedules.starts_at at time zone schedules.recurrence_timezone as anchor_local,
      settings.requested_from at time zone schedules.recurrence_timezone as from_local,
      settings.requested_from,
      settings.result_limit
    from public.schedules as schedules
    cross join settings
    where schedules.user_id = (select auth.uid())
      and schedules.status = 'scheduled'
      and (
        (schedules.recurrence = 'none' and schedules.starts_at >= settings.requested_from)
        or (
          schedules.recurrence <> 'none'
          and (
            schedules.recurrence_ends_at is null
            or schedules.recurrence_ends_at >= settings.requested_from
          )
        )
      )
  ),
  single_candidates as (
    select owned.*, owned.starts_at as occurrence_start
    from owned
    where owned.recurrence = 'none'
  ),
  daily_candidates as (
    select
      owned.*,
      (
        owned.anchor_local
        + make_interval(days => series.iteration * owned.recurrence_interval)
      ) at time zone owned.recurrence_timezone as occurrence_start
    from owned
    cross join lateral (
      select greatest(
        0,
        floor(
          extract(epoch from (owned.from_local - owned.anchor_local))
          / 86400
          / owned.recurrence_interval
        )::integer
      ) as first_iteration
    ) as first
    cross join lateral generate_series(
      first.first_iteration,
      first.first_iteration + owned.result_limit
    ) as series(iteration)
    where owned.recurrence = 'daily'
  ),
  weekly_candidates as (
    select
      owned.*,
      (
        (
          week_anchor.anchor_date
          + (series.iteration * owned.recurrence_interval * 7)
          + (weekday.value - 1)
        )::date
        + owned.anchor_local::time
      ) at time zone owned.recurrence_timezone as occurrence_start
    from owned
    cross join lateral (
      select (
        owned.anchor_local::date
        - (extract(isodow from owned.anchor_local)::integer - 1)
      )::date as anchor_date
    ) as week_anchor
    cross join lateral (
      select greatest(
        0,
        floor(
          (owned.from_local::date - week_anchor.anchor_date)::numeric
          / 7
          / owned.recurrence_interval
        )::integer
      ) as first_iteration
    ) as first
    cross join lateral generate_series(
      first.first_iteration,
      first.first_iteration + owned.result_limit
    ) as series(iteration)
    cross join lateral unnest(owned.recurrence_weekdays) as weekday(value)
    where owned.recurrence = 'weekly'
  ),
  monthly_candidates as (
    select
      owned.*,
      (
        (
          month_data.month_start
          + (
            least(
              extract(day from owned.anchor_local)::integer,
              extract(day from month_data.month_end)::integer
            ) - 1
          )
        )::date
        + owned.anchor_local::time
      ) at time zone owned.recurrence_timezone as occurrence_start
    from owned
    cross join lateral (
      select greatest(
        0,
        floor(
          (
            (
              extract(year from owned.from_local)::integer
              - extract(year from owned.anchor_local)::integer
            ) * 12
            + extract(month from owned.from_local)::integer
            - extract(month from owned.anchor_local)::integer
          )::numeric
          / owned.recurrence_interval
        )::integer
      ) as first_iteration
    ) as first
    cross join lateral generate_series(
      first.first_iteration,
      first.first_iteration + owned.result_limit
    ) as series(iteration)
    cross join lateral (
      select (
        date_trunc('month', owned.anchor_local)::date
        + make_interval(months => series.iteration * owned.recurrence_interval)
      )::date as month_start
    ) as month_start
    cross join lateral (
      select
        month_start.month_start,
        (month_start.month_start + interval '1 month - 1 day')::date as month_end
    ) as month_data
    where owned.recurrence = 'monthly'
  ),
  candidates as (
    select * from single_candidates
    union all
    select * from daily_candidates
    union all
    select * from weekly_candidates
    union all
    select * from monthly_candidates
  ),
  filtered as (
    select distinct on (candidates.id, candidates.occurrence_start)
      candidates.id as schedule_id,
      candidates.event_id,
      candidates.goal_id,
      candidates.occurrence_start,
      case
        when candidates.ends_at is null then null
        else candidates.occurrence_start + (candidates.ends_at - candidates.starts_at)
      end as occurrence_end,
      candidates.recurrence,
      candidates.recurrence_timezone,
      candidates.result_limit
    from candidates
    where candidates.occurrence_start >= candidates.requested_from
      and (
        candidates.recurrence_ends_at is null
        or candidates.occurrence_start <= candidates.recurrence_ends_at
      )
    order by candidates.id, candidates.occurrence_start
  )
  select
    filtered.schedule_id,
    filtered.event_id,
    filtered.goal_id,
    filtered.occurrence_start as occurrence_starts_at,
    filtered.occurrence_end as occurrence_ends_at,
    filtered.recurrence,
    filtered.recurrence_timezone
  from filtered
  order by filtered.occurrence_start, filtered.schedule_id
  limit (select settings.result_limit from settings);
$$;

revoke all on function public.get_upcoming_schedule_occurrences(integer, timestamptz)
  from public, anon;
grant execute on function public.get_upcoming_schedule_occurrences(integer, timestamptz)
  to authenticated, service_role;
