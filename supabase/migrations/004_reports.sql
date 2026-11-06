-- =============================================================================
-- 004_reports.sql — saved database reports (views)
-- security_invoker = true → the caller's RLS applies, so only admin-area users
-- see report-level data. Query them from the SQL editor or the admin
-- "Reports & Analytics" page.
-- =============================================================================

-- Report 1: water issues grouped by location and status
create or replace view public.report_issues_by_location_status
with (security_invoker = true) as
select coalesce(l.name, 'Unlisted location')                 as location_name,
       r.status,
       count(*)                                               as issue_count,
       count(*) filter (where r.severity in ('high','critical')) as high_severity_count,
       min(r.submitted_at)                                    as first_reported,
       max(r.submitted_at)                                    as last_reported,
       bool_or(r.is_demo)                                     as includes_demo
  from public.water_reports r
  left join public.campus_locations l on l.id = r.location_id
 group by 1, 2
 order by 1, 2;

-- Report 2: daily water consumption by location (normalised to litres)
create or replace view public.report_daily_consumption
with (security_invoker = true) as
select w.reading_date,
       l.name                                                  as location_name,
       w.phase,
       w.measurement_method,
       sum(case w.measurement_unit when 'm3' then w.consumption_value * 1000
                                   else w.consumption_value end) as consumption_litres,
       count(*)                                                as reading_count,
       bool_or(w.is_demo)                                      as includes_demo
  from public.water_readings w
  join public.campus_locations l on l.id = w.location_id
 group by 1, 2, 3, 4
 order by 1, 2;

-- Report 3: baseline vs pilot — only compares like with like
-- (same location AND same measurement method). Percentage is null when the
-- baseline is zero or a phase is missing.
create or replace view public.report_baseline_vs_pilot
with (security_invoker = true) as
with daily as (
  select location_id, measurement_method, phase, reading_date,
         sum(case measurement_unit when 'm3' then consumption_value * 1000
                                   else consumption_value end) as litres,
         bool_or(is_demo) as is_demo
    from public.water_readings
   where phase in ('baseline','pilot')
   group by 1, 2, 3, 4
), agg as (
  select location_id, measurement_method,
         avg(litres) filter (where phase = 'baseline')         as baseline_avg_daily_l,
         count(*)    filter (where phase = 'baseline')         as baseline_days,
         avg(litres) filter (where phase = 'pilot')            as pilot_avg_daily_l,
         count(*)    filter (where phase = 'pilot')            as pilot_days,
         bool_or(is_demo)                                      as includes_demo
    from daily group by 1, 2
)
select l.name                                                  as location_name,
       a.measurement_method,
       round(a.baseline_avg_daily_l, 2)                        as baseline_avg_daily_l,
       a.baseline_days,
       round(a.pilot_avg_daily_l, 2)                           as pilot_avg_daily_l,
       a.pilot_days,
       round(a.baseline_avg_daily_l - a.pilot_avg_daily_l, 2)  as saved_per_day_l,
       case when a.baseline_avg_daily_l > 0 and a.pilot_avg_daily_l is not null
            then round((a.baseline_avg_daily_l - a.pilot_avg_daily_l) / a.baseline_avg_daily_l * 100, 1)
       end                                                     as reduction_pct,
       (a.baseline_days >= 3 and a.pilot_days >= 3)            as meets_minimum_days,
       a.includes_demo
  from agg a
  join public.campus_locations l on l.id = a.location_id
 order by 1, 2;

-- Report 4: conservation actions summary by status and team
create or replace view public.report_conservation_actions
with (security_invoker = true) as
select a.status,
       a.responsible_team,
       count(*)                          as action_count,
       sum(a.estimated_cost)             as estimated_cost_ghs,
       sum(a.actual_cost)                as actual_cost_ghs,
       count(a.report_id)                as linked_to_reports,
       bool_or(a.is_demo)                as includes_demo
  from public.conservation_actions a
 group by 1, 2
 order by 1, 2;

grant select on public.report_issues_by_location_status, public.report_daily_consumption,
                public.report_baseline_vs_pilot, public.report_conservation_actions
  to authenticated;
