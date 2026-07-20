-- Calendar-safe occurrence expansion for bounded day/week views and MCP range queries.

create or replace function public.get_schedule_occurrences_in_range(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 500
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
      p_from as requested_from,
      p_to as requested_to,
      least(greatest(coalesce(p_limit, 500), 1), 500) as result_limit
    where p_to > p_from
      and p_to <= p_from + interval '31 days'
  ),
  owned as (
    select
      schedules.*,
      schedules.starts_at at time zone schedules.recurrence_timezone as anchor_local,
      settings.requested_from at time zone schedules.recurrence_timezone as from_local,
      settings.requested_to at time zone schedules.recurrence_timezone as to_local,
      settings.requested_from,
      settings.requested_to,
      settings.result_limit
    from public.schedules as schedules
    cross join settings
    where schedules.user_id = (select auth.uid())
      and schedules.status = 'scheduled'
      and schedules.starts_at < settings.requested_to
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
    cross join lateral (
      select greatest(
        first.first_iteration,
        ceil(
          extract(epoch from (owned.to_local - owned.anchor_local))
          / 86400
          / owned.recurrence_interval
        )::integer
      ) as last_iteration
    ) as last
    cross join lateral generate_series(
      first.first_iteration,
      last.last_iteration
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
    cross join lateral (
      select greatest(
        first.first_iteration,
        ceil(
          (owned.to_local::date - week_anchor.anchor_date)::numeric
          / 7
          / owned.recurrence_interval
        )::integer
      ) as last_iteration
    ) as last
    cross join lateral generate_series(
      first.first_iteration,
      last.last_iteration
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
    cross join lateral (
      select greatest(
        first.first_iteration,
        ceil(
          (
            (
              extract(year from owned.to_local)::integer
              - extract(year from owned.anchor_local)::integer
            ) * 12
            + extract(month from owned.to_local)::integer
            - extract(month from owned.anchor_local)::integer
          )::numeric
          / owned.recurrence_interval
        )::integer
      ) as last_iteration
    ) as last
    cross join lateral generate_series(
      first.first_iteration,
      last.last_iteration
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
      and candidates.occurrence_start < candidates.requested_to
      and candidates.occurrence_start >= candidates.starts_at
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

revoke all on function public.get_schedule_occurrences_in_range(timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function public.get_schedule_occurrences_in_range(timestamptz, timestamptz, integer)
  to authenticated, service_role;
