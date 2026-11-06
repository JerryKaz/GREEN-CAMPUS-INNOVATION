-- =============================================================================
-- 006_admin_functions.sql — admin-only helpers used by /admin
-- =============================================================================

-- Wipe every demonstration row before going live. Admins only.
create or replace function public.delete_demo_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  delete from conservation_actions where is_demo;
  delete from water_readings       where is_demo;
  delete from water_reports        where is_demo;
  delete from pledges              where is_demo;
  delete from feedback             where is_demo;
  delete from budget_items         where is_demo;
  delete from campus_locations l   where l.is_demo
    and not exists (select 1 from water_readings w where w.location_id = l.id)
    and not exists (select 1 from conservation_actions a where a.location_id = l.id);
end $$;
revoke all on function public.delete_demo_data() from public, anon;
grant execute on function public.delete_demo_data() to authenticated;

-- User access list (emails live in auth.users, which the browser cannot read).
create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, role text,
               created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at, u.last_sign_in_at
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.created_at;
end $$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
