-- =============================================================================
-- 003_functions.sql — public RPCs (the only way anon touches reports)
-- =============================================================================

-- Reference numbers look like WW-261105-K7QPM. Alphabet excludes vowels (no accidental words) and 0/O/1/I/L (no look-alikes).
create or replace function public.generate_reference()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'BCDFGHJKMNPQRSTVWXYZ23456789';
  suffix text := '';
begin
  for i in 1..5 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'WW-' || to_char(now() at time zone 'Africa/Accra', 'YYMMDD') || '-' || suffix;
end $$;

-- ---------------------------------------------------------------------------
-- submit_water_report: validates, rate-limits, inserts, returns reference.
-- Runs as owner so anon needs no INSERT/SELECT grant on water_reports.
-- ---------------------------------------------------------------------------
create or replace function public.submit_water_report(
  p_issue_type       text,
  p_description      text,
  p_severity         text,
  p_location_id      uuid    default null,
  p_location_note    text    default '',
  p_observed_at      timestamptz default null,
  p_is_anonymous     boolean default true,
  p_reporter_name    text    default null,
  p_reporter_contact text    default null,
  p_photo_path       text    default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  ref text;
  recent int;
begin
  -- Coarse global flood guard (per-IP limits belong at the edge/CDN).
  select count(*) into recent from water_reports
   where submitted_at > now() - interval '1 minute' and not is_demo;
  if recent >= 30 then
    raise exception 'Too many reports right now. Please try again in a minute.'
      using errcode = 'P0001';
  end if;

  if p_location_id is not null
     and not exists (select 1 from campus_locations where id = p_location_id) then
    raise exception 'Unknown location' using errcode = 'P0001';
  end if;

  if p_photo_path is not null and p_photo_path !~ '^incoming/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' then
    raise exception 'Invalid photo reference' using errcode = 'P0001';
  end if;

  if p_observed_at is not null and p_observed_at > now() + interval '10 minutes' then
    raise exception 'Observation time cannot be in the future' using errcode = 'P0001';
  end if;

  for attempt in 1..5 loop
    ref := generate_reference();
    begin
      insert into water_reports (
        reference_number, location_id, location_note, issue_type, description, severity,
        observed_at, photo_path, is_anonymous, reporter_name, reporter_contact)
      values (
        ref, p_location_id, coalesce(trim(p_location_note), ''), p_issue_type,
        trim(p_description), p_severity, p_observed_at, p_photo_path,
        coalesce(p_is_anonymous, true),
        case when coalesce(p_is_anonymous, true) then null else nullif(trim(p_reporter_name), '') end,
        case when coalesce(p_is_anonymous, true) then null else nullif(trim(p_reporter_contact), '') end);
      return ref;
    exception when unique_violation then
      -- extremely unlikely collision; try another suffix
    end;
  end loop;
  raise exception 'Could not allocate a reference number' using errcode = 'P0001';
end $$;

revoke all on function public.submit_water_report from public;
grant execute on function public.submit_water_report to anon, authenticated;

-- ---------------------------------------------------------------------------
-- public_stats: aggregate counts only — no descriptions, no identities.
-- ---------------------------------------------------------------------------
create or replace function public.public_stats(p_include_demo boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (
    select * from water_reports where p_include_demo or not is_demo
  )
  select jsonb_build_object(
    'reports_total',      (select count(*) from r),
    'reports_resolved',   (select count(*) from r where status in ('resolved','closed')),
    'reports_open',       (select count(*) from r where status not in ('resolved','closed')),
    'hotspots',           (select count(distinct location_id) from r where location_id is not null),
    'by_issue_type',      coalesce((select jsonb_object_agg(issue_type, n)
                            from (select issue_type, count(*) n from r group by 1) t), '{}'::jsonb),
    'by_status',          coalesce((select jsonb_object_agg(status, n)
                            from (select status, count(*) n from r group by 1) t), '{}'::jsonb),
    'by_severity',        coalesce((select jsonb_object_agg(severity, n)
                            from (select severity, count(*) n from r group by 1) t), '{}'::jsonb),
    'pledges_total',      (select count(*) from pledges where p_include_demo or not is_demo),
    'actions_completed',  (select count(*) from conservation_actions
                             where status in ('completed','verified') and (p_include_demo or not is_demo)),
    'includes_demo',      p_include_demo and exists (select 1 from water_reports where is_demo)
  )
$$;
grant execute on function public.public_stats to anon, authenticated;

-- ---------------------------------------------------------------------------
-- public_hotspots: map markers. Only locations with coordinates.
-- ---------------------------------------------------------------------------
create or replace function public.public_hotspots(p_include_demo boolean default false)
returns table (
  location_id uuid, location_name text, location_type text,
  latitude numeric, longitude numeric, location_verified boolean, location_demo boolean,
  issue_type text, severity text, status text, submitted_at timestamptz, is_demo boolean
) language sql stable security definer set search_path = public as $$
  select l.id, l.name, l.location_type, l.latitude, l.longitude, l.is_verified, l.is_demo,
         r.issue_type, r.severity, r.status, r.submitted_at, r.is_demo
    from water_reports r
    join campus_locations l on l.id = r.location_id
   where l.latitude is not null
     and (p_include_demo or (not r.is_demo and not l.is_demo))
   order by r.submitted_at desc
   limit 500
$$;
grant execute on function public.public_hotspots to anon, authenticated;
