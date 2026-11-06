-- =============================================================================
-- seed.sql — DEMONSTRATION RECORDS ONLY (generated; do not edit by hand)
-- Every row has is_demo = true. Remove with:  select public.delete_demo_data();  (defined in migration 006)
-- Regenerate: node scripts/generate-seed.mjs
-- =============================================================================
begin;

-- campus_locations (6)
insert into public.campus_locations (id, name, description, location_details, latitude, longitude, location_type, is_verified, is_demo, created_at) values
  ('00000000-0000-4000-8001-000000000001', 'Hostel Block A washrooms (sample)', 'Sample location for demonstration only. Not a surveyed campus site.', 'Replace with a verified location once surveyed.', 5.6049, -0.188, 'hostel', false, true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8001-000000000002', 'Academic Block B ground floor (sample)', 'Sample location for demonstration only. Not a surveyed campus site.', 'Replace with a verified location once surveyed.', 5.6041, -0.1855, 'academic', false, true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8001-000000000003', 'Dining hall kitchen (sample)', 'Sample location for demonstration only. Not a surveyed campus site.', 'Replace with a verified location once surveyed.', 5.6028, -0.1864, 'kitchen', false, true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8001-000000000004', 'Overhead tank T1 (sample)', 'Sample location for demonstration only. Not a surveyed campus site.', 'Replace with a verified location once surveyed.', 5.6023, -0.1882, 'tank', false, true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8001-000000000005', 'Sports field standpipe (sample)', 'Sample location for demonstration only. Not a surveyed campus site.', 'Replace with a verified location once surveyed.', 5.6055, -0.1867, 'outdoor', false, true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8001-000000000006', 'Administration washrooms (sample)', 'Sample location for demonstration only. Not a surveyed campus site.', 'Replace with a verified location once surveyed.', 5.6034, -0.1889, 'office', false, true, '2026-10-01T08:00:00Z')
on conflict (id) do nothing;

-- water_reports (20)
insert into public.water_reports (id, reference_number, location_id, location_note, issue_type, description, severity, status, observed_at, photo_path, is_anonymous, reporter_name, reporter_contact, assigned_to, admin_notes, is_demo, submitted_at) values
  ('00000000-0000-4000-8002-000000000001', 'WW-SMPL-01', '00000000-0000-4000-8001-000000000001', '', 'leaking_tap', 'Tap drips continuously even when fully closed.', 'low', 'submitted', '2026-10-03T09:30:00Z', null, false, 'Demo Reporter 1', null, '', '', true, '2026-10-03T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000002', 'WW-SMPL-02', '00000000-0000-4000-8001-000000000002', '', 'broken_pipe', 'Water pooling under an exposed pipe joint.', 'critical', 'under_review', '2026-10-04T09:30:00Z', null, true, null, null, '', '', true, '2026-10-04T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000003', 'WW-SMPL-03', '00000000-0000-4000-8001-000000000003', '', 'overflowing_tank', 'Tank overflow pipe running for long periods.', 'high', 'assigned', '2026-10-05T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-05T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000004', 'WW-SMPL-04', '00000000-0000-4000-8001-000000000004', '', 'faulty_flush', 'Cistern keeps refilling after every flush.', 'medium', 'in_progress', '2026-10-06T09:30:00Z', null, false, 'Demo Reporter 4', null, 'Estates and Facilities', '', true, '2026-10-06T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000005', 'WW-SMPL-05', '00000000-0000-4000-8001-000000000005', '', 'unnecessary_usage', 'Hose left running after cleaning was finished.', 'low', 'resolved', '2026-10-07T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-07T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000006', 'WW-SMPL-06', '00000000-0000-4000-8001-000000000006', '', 'other', 'Unusual damp patch on wall near water line.', 'critical', 'closed', '2026-10-08T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-08T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000007', 'WW-SMPL-07', '00000000-0000-4000-8001-000000000001', '', 'leaking_tap', 'Tap drips continuously even when fully closed.', 'high', 'submitted', '2026-10-09T09:30:00Z', null, false, 'Demo Reporter 7', null, '', '', true, '2026-10-09T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000008', 'WW-SMPL-08', '00000000-0000-4000-8001-000000000002', '', 'broken_pipe', 'Water pooling under an exposed pipe joint.', 'medium', 'under_review', '2026-10-10T09:30:00Z', null, true, null, null, '', '', true, '2026-10-10T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000009', 'WW-SMPL-09', '00000000-0000-4000-8001-000000000003', '', 'overflowing_tank', 'Tank overflow pipe running for long periods.', 'low', 'assigned', '2026-10-11T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-11T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000010', 'WW-SMPL-10', '00000000-0000-4000-8001-000000000004', '', 'faulty_flush', 'Cistern keeps refilling after every flush.', 'critical', 'in_progress', '2026-10-12T09:30:00Z', null, false, 'Demo Reporter 10', null, 'Estates and Facilities', '', true, '2026-10-12T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000011', 'WW-SMPL-11', '00000000-0000-4000-8001-000000000005', '', 'unnecessary_usage', 'Hose left running after cleaning was finished.', 'high', 'resolved', '2026-10-13T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-13T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000012', 'WW-SMPL-12', '00000000-0000-4000-8001-000000000006', '', 'other', 'Unusual damp patch on wall near water line.', 'medium', 'closed', '2026-10-14T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-14T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000013', 'WW-SMPL-13', '00000000-0000-4000-8001-000000000001', '', 'leaking_tap', 'Tap drips continuously even when fully closed.', 'low', 'submitted', '2026-10-15T09:30:00Z', null, false, 'Demo Reporter 13', null, '', '', true, '2026-10-15T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000014', 'WW-SMPL-14', '00000000-0000-4000-8001-000000000002', '', 'broken_pipe', 'Water pooling under an exposed pipe joint.', 'critical', 'under_review', '2026-10-16T09:30:00Z', null, true, null, null, '', '', true, '2026-10-16T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000015', 'WW-SMPL-15', '00000000-0000-4000-8001-000000000003', '', 'overflowing_tank', 'Tank overflow pipe running for long periods.', 'high', 'assigned', '2026-10-17T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-17T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000016', 'WW-SMPL-16', '00000000-0000-4000-8001-000000000004', '', 'faulty_flush', 'Cistern keeps refilling after every flush.', 'medium', 'in_progress', '2026-10-18T09:30:00Z', null, false, 'Demo Reporter 16', null, 'Estates and Facilities', '', true, '2026-10-18T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000017', 'WW-SMPL-17', '00000000-0000-4000-8001-000000000005', '', 'unnecessary_usage', 'Hose left running after cleaning was finished.', 'low', 'resolved', '2026-10-19T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-19T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000018', 'WW-SMPL-18', '00000000-0000-4000-8001-000000000006', '', 'other', 'Unusual damp patch on wall near water line.', 'critical', 'closed', '2026-10-20T09:30:00Z', null, true, null, null, 'Estates and Facilities', '', true, '2026-10-20T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000019', 'WW-SMPL-19', '00000000-0000-4000-8001-000000000001', '', 'leaking_tap', 'Tap drips continuously even when fully closed.', 'high', 'submitted', '2026-10-21T09:30:00Z', null, false, 'Demo Reporter 19', null, '', '', true, '2026-10-21T10:00:00Z'),
  ('00000000-0000-4000-8002-000000000020', 'WW-SMPL-20', '00000000-0000-4000-8001-000000000002', '', 'broken_pipe', 'Water pooling under an exposed pipe joint.', 'medium', 'under_review', '2026-10-22T09:30:00Z', null, true, null, null, '', '', true, '2026-10-22T10:00:00Z')
on conflict (id) do nothing;

-- water_readings (24)
insert into public.water_readings (id, location_id, reading_date, consumption_value, measurement_unit, measurement_method, phase, meter_reading, notes, recorded_by, is_demo, created_at) values
  ('00000000-0000-4000-8003-000000000001', '00000000-0000-4000-8001-000000000001', '2026-10-05', 4032, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-05T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000002', '00000000-0000-4000-8001-000000000001', '2026-10-06', 4200, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-06T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000003', '00000000-0000-4000-8001-000000000001', '2026-10-07', 4368, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-07T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000004', '00000000-0000-4000-8001-000000000001', '2026-10-26', 3444, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-26T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000005', '00000000-0000-4000-8001-000000000001', '2026-10-27', 3528, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-27T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000006', '00000000-0000-4000-8001-000000000001', '2026-10-28', 3612, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-28T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000007', '00000000-0000-4000-8001-000000000003', '2026-10-05', 2976, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-05T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000008', '00000000-0000-4000-8001-000000000003', '2026-10-06', 3100, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-06T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000009', '00000000-0000-4000-8001-000000000003', '2026-10-07', 3224, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-07T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000010', '00000000-0000-4000-8001-000000000003', '2026-10-26', 2542, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-26T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000011', '00000000-0000-4000-8001-000000000003', '2026-10-27', 2604, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-27T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000012', '00000000-0000-4000-8001-000000000003', '2026-10-28', 2666, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-28T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000013', '00000000-0000-4000-8001-000000000004', '2026-10-05', 6.6, 'm3', 'Sub-meter reading', 'baseline', 1300, 'Sample value', null, true, '2026-10-05T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000014', '00000000-0000-4000-8001-000000000004', '2026-10-06', 6.8, 'm3', 'Sub-meter reading', 'baseline', 1306.8, 'Sample value', null, true, '2026-10-06T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000015', '00000000-0000-4000-8001-000000000004', '2026-10-07', 7, 'm3', 'Sub-meter reading', 'baseline', 1313.6, 'Sample value', null, true, '2026-10-07T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000016', '00000000-0000-4000-8001-000000000004', '2026-10-26', 5.58, 'm3', 'Sub-meter reading', 'pilot', 1400, 'Sample value', null, true, '2026-10-26T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000017', '00000000-0000-4000-8001-000000000004', '2026-10-27', 5.71, 'm3', 'Sub-meter reading', 'pilot', 1406.8, 'Sample value', null, true, '2026-10-27T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000018', '00000000-0000-4000-8001-000000000004', '2026-10-28', 5.85, 'm3', 'Sub-meter reading', 'pilot', 1413.6, 'Sample value', null, true, '2026-10-28T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000019', '00000000-0000-4000-8001-000000000006', '2026-10-05', 1440, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-05T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000020', '00000000-0000-4000-8001-000000000006', '2026-10-06', 1500, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-06T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000021', '00000000-0000-4000-8001-000000000006', '2026-10-07', 1560, 'L', 'Bucket-and-stopwatch estimate', 'baseline', null, 'Sample value', null, true, '2026-10-07T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000022', '00000000-0000-4000-8001-000000000006', '2026-10-26', 1230, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-26T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000023', '00000000-0000-4000-8001-000000000006', '2026-10-27', 1260, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-27T17:00:00Z'),
  ('00000000-0000-4000-8003-000000000024', '00000000-0000-4000-8001-000000000006', '2026-10-28', 1290, 'L', 'Bucket-and-stopwatch estimate', 'pilot', null, 'Sample value', null, true, '2026-10-28T17:00:00Z')
on conflict (id) do nothing;

-- conservation_actions (6)
insert into public.conservation_actions (id, report_id, location_id, action_description, responsible_team, implementation_date, estimated_cost, actual_cost, status, verification_notes, is_demo, created_at) values
  ('00000000-0000-4000-8004-000000000001', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8001-000000000001', 'Replace worn tap washers in washroom row 1', 'Estates/Facilities', '2026-10-12', 120, 110, 'verified', 'Checked by facilities officer.', true, '2026-10-10T12:00:00Z'),
  ('00000000-0000-4000-8004-000000000002', '00000000-0000-4000-8002-000000000002', '00000000-0000-4000-8001-000000000002', 'Re-seal exposed pipe joint', 'Estates/Facilities', '2026-10-14', 250, 260, 'completed', '', true, '2026-10-11T12:00:00Z'),
  ('00000000-0000-4000-8004-000000000003', '00000000-0000-4000-8002-000000000003', '00000000-0000-4000-8001-000000000004', 'Fit float valve to overhead tank', 'Estates/Facilities', '2026-10-16', 400, null, 'in_progress', '', true, '2026-10-12T12:00:00Z'),
  ('00000000-0000-4000-8004-000000000004', '00000000-0000-4000-8002-000000000004', '00000000-0000-4000-8001-000000000005', 'Install self-closing nozzle on standpipe', 'Estates/Facilities', '2026-10-18', 180, null, 'planned', '', true, '2026-10-13T12:00:00Z'),
  ('00000000-0000-4000-8004-000000000005', '00000000-0000-4000-8002-000000000005', '00000000-0000-4000-8001-000000000003', 'Post water-saving signage in kitchen', 'Students'' Representative Council', '2026-10-20', 60, 55, 'completed', '', true, '2026-10-14T12:00:00Z'),
  ('00000000-0000-4000-8004-000000000006', '00000000-0000-4000-8002-000000000006', '00000000-0000-4000-8001-000000000006', 'Adjust cistern fill levels', 'Estates/Facilities', '2026-10-22', 90, null, 'planned', '', true, '2026-10-15T12:00:00Z')
on conflict (id) do nothing;

-- pledges (8)
insert into public.pledges (id, commitment_type, full_name, email, department, comments, consent_status, is_demo, submitted_at) values
  ('00000000-0000-4000-8005-000000000001', 'report_leaks', null, null, null, null, true, true, '2026-10-14T15:00:00Z'),
  ('00000000-0000-4000-8005-000000000002', 'turn_off_taps', null, null, 'Sample department', null, true, true, '2026-10-15T15:00:00Z'),
  ('00000000-0000-4000-8005-000000000003', 'avoid_waste', null, null, null, null, true, true, '2026-10-16T15:00:00Z'),
  ('00000000-0000-4000-8005-000000000004', 'encourage_others', null, null, 'Sample department', null, true, true, '2026-10-17T15:00:00Z'),
  ('00000000-0000-4000-8005-000000000005', 'participate', null, null, null, null, true, true, '2026-10-18T15:00:00Z'),
  ('00000000-0000-4000-8005-000000000006', 'report_leaks', null, null, 'Sample department', null, true, true, '2026-10-19T15:00:00Z'),
  ('00000000-0000-4000-8005-000000000007', 'turn_off_taps', null, null, null, null, true, true, '2026-10-20T15:00:00Z'),
  ('00000000-0000-4000-8005-000000000008', 'avoid_waste', null, null, 'Sample department', null, true, true, '2026-10-21T15:00:00Z')
on conflict (id) do nothing;

-- feedback (6)
insert into public.feedback (id, category, message, contact_name, contact_email, consent_status, status, is_demo, submitted_at) values
  ('00000000-0000-4000-8006-000000000001', 'general', 'Sample feedback about general. Demonstration text only.', null, null, true, 'reviewed', true, '2026-10-20T11:00:00Z'),
  ('00000000-0000-4000-8006-000000000002', 'website', 'Sample feedback about website. Demonstration text only.', null, null, true, 'reviewed', true, '2026-10-21T11:00:00Z'),
  ('00000000-0000-4000-8006-000000000003', 'reporting', 'Sample feedback about reporting. Demonstration text only.', null, null, true, 'new', true, '2026-10-22T11:00:00Z'),
  ('00000000-0000-4000-8006-000000000004', 'pilot', 'Sample feedback about pilot. Demonstration text only.', null, null, true, 'new', true, '2026-10-23T11:00:00Z'),
  ('00000000-0000-4000-8006-000000000005', 'suggestion', 'Sample feedback about suggestion. Demonstration text only.', null, null, true, 'new', true, '2026-10-24T11:00:00Z'),
  ('00000000-0000-4000-8006-000000000006', 'other', 'Sample feedback about other. Demonstration text only.', null, null, true, 'new', true, '2026-10-25T11:00:00Z')
on conflict (id) do nothing;

-- budget_items (7)
insert into public.budget_items (id, category, item, quantity, unit_cost, cost_basis, notes, is_demo, created_at) values
  ('00000000-0000-4000-8007-000000000001', 'leak_detection', 'Dye tablets and leak test kit', 2, 150, 'estimate', 'Sample estimate. Replace with a real quotation.', true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8007-000000000002', 'plumbing_repairs', 'Tap washers, seals and fittings', 20, 25, 'estimate', 'Sample estimate. Replace with a real quotation.', true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8007-000000000003', 'monitoring_equipment', 'Water sub-meter', 2, 650, 'estimate', 'Sample estimate. Replace with a real quotation.', true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8007-000000000004', 'signage', 'Printed conservation signs', 30, 15, 'estimate', 'Sample estimate. Replace with a real quotation.', true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8007-000000000005', 'hosting', 'Domain registration (annual)', 1, 200, 'estimate', 'Sample estimate. Replace with a real quotation.', true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8007-000000000006', 'training', 'Awareness session materials', 1, 300, 'estimate', 'Sample estimate. Replace with a real quotation.', true, '2026-10-01T08:00:00Z'),
  ('00000000-0000-4000-8007-000000000007', 'maintenance', 'Monthly follow-up inspections', 6, 50, 'estimate', 'Sample estimate. Replace with a real quotation.', true, '2026-10-01T08:00:00Z')
on conflict (id) do nothing;

-- default settings (empty until Group 5 supplies real content)
insert into public.site_settings (key, value) values ('videos', '{"problem_url":"","solution_url":""}'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('research_findings', '{"challenges":"","processes":"","causes":"","experiences":"","opportunities":""}'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('pilot', '{"location":"","testing_date":"","users":null,"feedback":"","problems":"","improvements":""}'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('tariff', '{"value":null,"unit":"m3","source":"","verified":false}'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('roadmap', '{"current_phase":1}'::jsonb) on conflict (key) do nothing;

commit;
-- 77 demo records
