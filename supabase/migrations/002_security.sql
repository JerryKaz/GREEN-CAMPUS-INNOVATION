-- =============================================================================
-- 002_security.sql — role helpers, Row Level Security, column-level grants
-- Principle: the anon key is public. Everything it can do is defined here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so policies can read profiles without
-- recursing through the profiles policies themselves.
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_admin_access()   -- admin, staff, viewer
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() in ('admin','staff','viewer'), false)
$$;

create or replace function public.is_staff()           -- admin, staff
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() in ('admin','staff'), false)
$$;

create or replace function public.is_admin()           -- admin only
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() = 'admin', false)
$$;

-- ---------------------------------------------------------------------------
-- Start from zero: remove Supabase's default broad grants, then add back
-- exactly what each role needs. RLS then filters rows.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.campus_locations, public.water_reports,
              public.water_readings, public.conservation_actions, public.pledges,
              public.feedback, public.gallery_photos, public.budget_items,
              public.site_settings
  from anon, authenticated;

alter table public.profiles             enable row level security;
alter table public.campus_locations     enable row level security;
alter table public.water_reports        enable row level security;
alter table public.water_readings       enable row level security;
alter table public.conservation_actions enable row level security;
alter table public.pledges              enable row level security;
alter table public.feedback             enable row level security;
alter table public.gallery_photos       enable row level security;
alter table public.budget_items         enable row level security;
alter table public.site_settings        enable row level security;

-- ---------------------------------------------------------------------------
-- Public (anon) read access — research data intended for the website only.
-- ---------------------------------------------------------------------------
grant select on public.campus_locations, public.water_readings, public.budget_items,
                public.site_settings, public.gallery_photos
  to anon, authenticated;

create policy "locations readable by everyone" on public.campus_locations
  for select using (true);
create policy "readings readable by everyone" on public.water_readings
  for select using (true);
create policy "budget readable by everyone" on public.budget_items
  for select using (true);
create policy "settings readable by everyone" on public.site_settings
  for select using (true);
create policy "published photos readable" on public.gallery_photos
  for select using (is_published or public.has_admin_access());

-- ---------------------------------------------------------------------------
-- Public submissions: column-level INSERT only. Anon cannot set is_demo,
-- status, ids or timestamps, and cannot read anything back.
-- Water reports are NOT directly insertable — see submit_water_report().
-- ---------------------------------------------------------------------------
grant insert (commitment_type, full_name, email, department, comments, consent_status)
  on public.pledges to anon, authenticated;
grant insert (category, message, contact_name, contact_email, consent_status)
  on public.feedback to anon, authenticated;

create policy "anyone can pledge" on public.pledges
  for insert to anon, authenticated with check (consent_status = true);
create policy "anyone can send feedback" on public.feedback
  for insert to anon, authenticated with check (consent_status = true);

-- ---------------------------------------------------------------------------
-- Admin area (authenticated + role in profiles)
-- ---------------------------------------------------------------------------
grant select, update on public.profiles to authenticated;
create policy "read own profile or all if admin area" on public.profiles
  for select to authenticated using (id = auth.uid() or public.has_admin_access());
create policy "admins change roles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant insert, update, delete on public.campus_locations to authenticated;
create policy "staff manage locations" on public.campus_locations
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, update, delete on public.water_reports to authenticated;
create policy "admin area reads reports" on public.water_reports
  for select to authenticated using (public.has_admin_access());
create policy "staff update reports" on public.water_reports
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "admins delete reports" on public.water_reports
  for delete to authenticated using (public.is_admin());

grant insert, update, delete on public.water_readings to authenticated;
create policy "staff manage readings" on public.water_readings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.conservation_actions to authenticated;
create policy "admin area reads actions" on public.conservation_actions
  for select to authenticated using (public.has_admin_access());
create policy "staff manage actions" on public.conservation_actions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, delete on public.pledges, public.feedback to authenticated;
grant update (status) on public.feedback to authenticated;
create policy "admin area reads pledges" on public.pledges
  for select to authenticated using (public.has_admin_access());
create policy "admins delete pledges" on public.pledges
  for delete to authenticated using (public.is_admin());
create policy "admin area reads feedback" on public.feedback
  for select to authenticated using (public.has_admin_access());
create policy "staff triage feedback" on public.feedback
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "admins delete feedback" on public.feedback
  for delete to authenticated using (public.is_admin());

grant insert, update, delete on public.gallery_photos to authenticated;
create policy "staff manage gallery" on public.gallery_photos
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant insert, update, delete on public.budget_items, public.site_settings to authenticated;
create policy "admins manage budget" on public.budget_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Prevent an admin from demoting the last admin (lock-out protection).
create or replace function public.guard_last_admin()
returns trigger language plpgsql as $$
begin
  if old.role = 'admin' and new.role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'At least one admin must remain';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_last_admin on public.profiles;
create trigger trg_guard_last_admin before update of role on public.profiles
  for each row execute function public.guard_last_admin();
