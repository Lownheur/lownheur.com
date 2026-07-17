-- Lownheur V1 initial schema
-- Multi-tenant data is isolated with RLS. Quota mutations are service-role only.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  username text not null check (username ~ '^[A-Za-z0-9_]{3,30}$'),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 1024),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  timezone text not null default 'Europe/Paris' check (char_length(timezone) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_lower_uidx on public.profiles (lower(username));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 5000),
  image_path text check (image_path is null or char_length(image_path) <= 1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_id_user_unique unique (id, user_id)
);

create index categories_user_created_idx
  on public.categories (user_id, created_at desc, id desc);
create unique index categories_user_title_lower_uidx
  on public.categories (user_id, lower(title));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_id_user_unique unique (id, user_id),
  constraint events_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories(id, user_id)
    on delete cascade
);

create index events_user_created_idx
  on public.events (user_id, created_at desc, id desc);
create index events_category_user_idx
  on public.events (category_id, user_id);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 5000),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'achieved', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_id_user_unique unique (id, user_id),
  constraint goals_category_owner_fkey
    foreign key (category_id, user_id)
    references public.categories(id, user_id)
    on delete cascade
);

create index goals_user_status_created_idx
  on public.goals (user_id, status, created_at desc, id desc);
create index goals_category_user_idx
  on public.goals (category_id, user_id);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid,
  goal_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_exactly_one_target_check
    check ((event_id is not null)::integer + (goal_id is not null)::integer = 1),
  constraint schedules_end_after_start_check
    check (ends_at is null or ends_at > starts_at),
  constraint schedules_event_owner_fkey
    foreign key (event_id, user_id)
    references public.events(id, user_id)
    on delete cascade,
  constraint schedules_goal_owner_fkey
    foreign key (goal_id, user_id)
    references public.goals(id, user_id)
    on delete cascade
);

create index schedules_user_starts_idx
  on public.schedules (user_id, starts_at, id);
create index schedules_event_user_idx
  on public.schedules (event_id, user_id) where event_id is not null;
create index schedules_goal_user_idx
  on public.schedules (goal_id, user_id) where goal_id is not null;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 1 and 1024),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  created_at timestamptz not null default now(),
  constraint media_assets_id_user_unique unique (id, user_id)
);

create index media_assets_user_created_idx
  on public.media_assets (user_id, created_at desc, id desc);

create table public.event_media (
  event_id uuid not null,
  asset_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 20),
  created_at timestamptz not null default now(),
  primary key (event_id, asset_id),
  constraint event_media_event_owner_fkey
    foreign key (event_id, user_id)
    references public.events(id, user_id)
    on delete cascade,
  constraint event_media_asset_owner_fkey
    foreign key (asset_id, user_id)
    references public.media_assets(id, user_id)
    on delete cascade
);

create index event_media_user_idx on public.event_media (user_id);
create index event_media_asset_user_idx on public.event_media (asset_id, user_id);

create table public.goal_media (
  goal_id uuid not null,
  asset_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 20),
  created_at timestamptz not null default now(),
  primary key (goal_id, asset_id),
  constraint goal_media_goal_owner_fkey
    foreign key (goal_id, user_id)
    references public.goals(id, user_id)
    on delete cascade,
  constraint goal_media_asset_owner_fkey
    foreign key (asset_id, user_id)
    references public.media_assets(id, user_id)
    on delete cascade
);

create index goal_media_user_idx on public.goal_media (user_id);
create index goal_media_asset_user_idx on public.goal_media (asset_id, user_id);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'max')),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'cancelled', 'incomplete')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_periods (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  mcp_calls bigint not null default 0 check (mcp_calls >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start),
  constraint usage_period_valid_check check (period_end > period_start)
);

create index usage_periods_period_end_idx
  on public.usage_periods (period_end);

create table public.storage_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bytes_used bigint not null default 0 check (bytes_used >= 0),
  updated_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function private.set_updated_at();

create trigger goals_set_updated_at
before update on public.goals
for each row execute function private.set_updated_at();

create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function private.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();

create trigger usage_periods_set_updated_at
before update on public.usage_periods
for each row execute function private.set_updated_at();

create trigger storage_usage_set_updated_at
before update on public.storage_usage
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_username text;
  generated_name text;
begin
  generated_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  generated_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Lownheur user'
  );

  insert into public.profiles (
    user_id,
    display_name,
    username,
    locale,
    timezone
  )
  values (
    new.id,
    left(generated_name, 80),
    generated_username,
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'fr' end,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'Europe/Paris'), 80)
  )
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.storage_usage (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Backfill safely if the migration is applied to a project that already has users.
insert into public.profiles (user_id, display_name, username)
select
  users.id,
  left(coalesce(nullif(split_part(coalesce(users.email, ''), '@', 1), ''), 'Lownheur user'), 80),
  'user_' || substr(replace(users.id::text, '-', ''), 1, 12)
from auth.users as users
on conflict (user_id) do nothing;

insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.storage_usage (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.goals enable row level security;
alter table public.schedules enable row level security;
alter table public.media_assets enable row level security;
alter table public.event_media enable row level security;
alter table public.goal_media enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_periods enable row level security;
alter table public.storage_usage enable row level security;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "categories_manage_own"
on public.categories for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "events_manage_own"
on public.events for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "goals_manage_own"
on public.goals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "schedules_manage_own"
on public.schedules for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "media_assets_manage_own"
on public.media_assets for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "event_media_manage_own"
on public.event_media for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "goal_media_manage_own"
on public.goal_media for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "subscriptions_select_own"
on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "usage_periods_select_own"
on public.usage_periods for select to authenticated
using ((select auth.uid()) = user_id);

create policy "storage_usage_select_own"
on public.storage_usage for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.schedules to authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;
grant select, insert, update, delete on public.event_media to authenticated;
grant select, insert, update, delete on public.goal_media to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.usage_periods to authenticated;
grant select on public.storage_usage to authenticated;

grant all on public.profiles to service_role;
grant all on public.categories to service_role;
grant all on public.events to service_role;
grant all on public.goals to service_role;
grant all on public.schedules to service_role;
grant all on public.media_assets to service_role;
grant all on public.event_media to service_role;
grant all on public.goal_media to service_role;
grant all on public.subscriptions to service_role;
grant all on public.usage_periods to service_role;
grant all on public.storage_usage to service_role;

create or replace function public.consume_mcp_call_admin(p_user_id uuid)
returns table (
  allowed boolean,
  used bigint,
  quota bigint,
  resets_at date
)
language plpgsql
security invoker
set search_path = ''
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

  select subscriptions.plan
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
    user_id,
    period_start,
    period_end,
    mcp_calls
  )
  values (
    p_user_id,
    v_period_start,
    v_period_end,
    1
  )
  on conflict (user_id, period_start)
  do update set
    mcp_calls = public.usage_periods.mcp_calls + 1,
    period_end = excluded.period_end
  where public.usage_periods.mcp_calls < v_limit
  returning mcp_calls into v_used;

  if v_used is null then
    select usage_periods.mcp_calls
    into v_used
    from public.usage_periods
    where usage_periods.user_id = p_user_id
      and usage_periods.period_start = v_period_start;

    return query select false, coalesce(v_used, v_limit), v_limit, v_period_end;
    return;
  end if;

  return query select true, v_used, v_limit, v_period_end;
end;
$$;

revoke all on function public.consume_mcp_call_admin(uuid) from public, anon, authenticated;
grant execute on function public.consume_mcp_call_admin(uuid) to service_role;

create or replace function public.reserve_storage_bytes_admin(
  p_user_id uuid,
  p_bytes bigint
)
returns table (
  allowed boolean,
  used bigint,
  quota bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_plan text;
  v_limit bigint;
  v_used bigint;
begin
  if p_user_id is null or p_bytes is null or p_bytes <= 0 then
    raise exception 'valid user_id and positive bytes are required' using errcode = '22023';
  end if;

  select subscriptions.plan
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
    select storage_usage.bytes_used
    into v_used
    from public.storage_usage
    where storage_usage.user_id = p_user_id;

    return query select false, coalesce(v_used, 0), v_limit;
    return;
  end if;

  return query select true, v_used, v_limit;
end;
$$;

revoke all on function public.reserve_storage_bytes_admin(uuid, bigint) from public, anon, authenticated;
grant execute on function public.reserve_storage_bytes_admin(uuid, bigint) to service_role;

create or replace function public.release_storage_bytes_admin(
  p_user_id uuid,
  p_bytes bigint
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_used bigint;
begin
  if p_user_id is null or p_bytes is null or p_bytes <= 0 then
    raise exception 'valid user_id and positive bytes are required' using errcode = '22023';
  end if;

  update public.storage_usage
  set bytes_used = greatest(0, bytes_used - p_bytes)
  where user_id = p_user_id
  returning bytes_used into v_used;

  return coalesce(v_used, 0);
end;
$$;

revoke all on function public.release_storage_bytes_admin(uuid, bigint) from public, anon, authenticated;
grant execute on function public.release_storage_bytes_admin(uuid, bigint) to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'user-media',
  'user-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users_read_own_media"
on storage.objects for select to authenticated
using (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Upload, replacement and deletion use server routes so quota counters and metadata stay atomic.
