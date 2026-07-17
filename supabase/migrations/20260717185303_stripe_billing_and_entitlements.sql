create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  object_id text,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;
grant all on public.stripe_webhook_events to service_role;

create trigger stripe_webhook_events_set_updated_at
before update on public.stripe_webhook_events
for each row execute function private.set_updated_at();

create or replace function public.consume_mcp_call_admin(p_user_id uuid)
returns table (allowed boolean, used bigint, quota bigint, resets_at date)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan text;
  v_limit bigint;
  v_period_start date;
  v_period_end date;
  v_used bigint;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = '22023';
  end if;

  select case
    when subscriptions.status in ('active', 'trialing') then subscriptions.plan
    else 'free'
  end
  into v_plan
  from public.subscriptions
  where subscriptions.user_id = p_user_id;

  v_limit := case coalesce(v_plan, 'free')
    when 'max' then 250000
    when 'pro' then 50000
    else 1000
  end;
  v_period_start := date_trunc('month', timezone('UTC', now()))::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.usage_periods (
    user_id, period_start, period_end, mcp_calls
  )
  values (p_user_id, v_period_start, v_period_end, 1)
  on conflict (user_id, period_start)
  do update set
    mcp_calls = public.usage_periods.mcp_calls + 1,
    period_end = excluded.period_end
  where public.usage_periods.mcp_calls < v_limit
  returning mcp_calls into v_used;

  if v_used is null then
    select usage_periods.mcp_calls into v_used
    from public.usage_periods
    where usage_periods.user_id = p_user_id
      and usage_periods.period_start = v_period_start;
    return query
      select false, coalesce(v_used, v_limit), v_limit, v_period_end;
    return;
  end if;

  return query select true, v_used, v_limit, v_period_end;
end;
$$;

revoke all on function public.consume_mcp_call_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_mcp_call_admin(uuid) to service_role;

create or replace function public.reserve_storage_bytes_admin(
  p_user_id uuid,
  p_bytes bigint
)
returns table (allowed boolean, used bigint, quota bigint)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan text;
  v_limit bigint;
  v_used bigint;
begin
  if p_user_id is null or p_bytes is null or p_bytes <= 0 then
    raise exception 'valid user_id and positive bytes are required'
      using errcode = '22023';
  end if;

  select case
    when subscriptions.status in ('active', 'trialing') then subscriptions.plan
    else 'free'
  end
  into v_plan
  from public.subscriptions
  where subscriptions.user_id = p_user_id;

  v_limit := case coalesce(v_plan, 'free')
    when 'max' then 50000000000
    when 'pro' then 10000000000
    else 100000000
  end;

  insert into public.storage_usage (user_id, bytes_used)
  values (p_user_id, p_bytes)
  on conflict (user_id)
  do update set bytes_used = public.storage_usage.bytes_used + p_bytes
  where public.storage_usage.bytes_used + p_bytes <= v_limit
  returning bytes_used into v_used;

  if v_used is null then
    select storage_usage.bytes_used into v_used
    from public.storage_usage
    where storage_usage.user_id = p_user_id;
    return query select false, coalesce(v_used, 0), v_limit;
    return;
  end if;

  return query select true, v_used, v_limit;
end;
$$;

revoke all on function public.reserve_storage_bytes_admin(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.reserve_storage_bytes_admin(uuid, bigint)
  to service_role;