create or replace function public.reconcile_storage_usage_admin()
returns table (
  users_updated bigint,
  total_bytes bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_users bigint;
  v_total bigint;
begin
  insert into public.storage_usage (user_id, bytes_used)
  select
    profiles.user_id,
    coalesce(sum(media_assets.byte_size), 0)::bigint
  from public.profiles
  left join public.media_assets
    on media_assets.user_id = profiles.user_id
  group by profiles.user_id
  on conflict (user_id)
  do update set bytes_used = excluded.bytes_used;

  get diagnostics v_users = row_count;
  select coalesce(sum(storage_usage.bytes_used), 0)::bigint
  into v_total
  from public.storage_usage;

  return query select v_users, v_total;
end;
$$;

revoke all on function public.reconcile_storage_usage_admin()
  from public, anon, authenticated;
grant execute on function public.reconcile_storage_usage_admin()
  to service_role;