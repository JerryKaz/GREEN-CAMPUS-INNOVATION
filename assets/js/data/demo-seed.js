// =============================================================================
// DEMONSTRATION DATA — single source of truth.
// Used by (1) the in-browser demo mode and (2) scripts/generate-seed.mjs,
// which turns it into supabase/seed.sql.
//
// EVERY record here is fictional and flagged is_demo = true. Location names
// are labelled "DEMO" and coordinates are offsets around the configured map
// centre — they are NOT real VVU sites. Never present these as research.
// =============================================================================

const id = (prefix, n) => `00000000-0000-4000-${prefix}-${String(n).padStart(12, '0')}`;

// Offsets (degrees) from the map centre so demo markers cluster sensibly.
const OFFSETS = [
  [0.0012, -0.0010], [0.0004, 0.0015], [-0.0009, 0.0006],
  [-0.0014, -0.0012], [0.0018, 0.0003], [-0.0003, -0.0019],
];

export function buildDemoData(center = [5.6037, -0.187]) {
  const [lat0, lng0] = center;
  const r6 = (v) => Math.round(v * 1e6) / 1e6;

  const locSpecs = [
    ['Hostel Block A washrooms (sample)', 'hostel'],
    ['Academic Block B ground floor (sample)', 'academic'],
    ['Dining hall kitchen (sample)', 'kitchen'],
    ['Overhead tank T1 (sample)', 'tank'],
    ['Sports field standpipe (sample)', 'outdoor'],
    ['Administration washrooms (sample)', 'office'],
  ];

  const campus_locations = locSpecs.map(([name, type], i) => ({
    id: id('8001', i + 1),
    name,
    description: 'Sample location for demonstration only. Not a surveyed campus site.',
    location_details: 'Replace with a verified location once surveyed.',
    latitude: r6(lat0 + OFFSETS[i][0]),
    longitude: r6(lng0 + OFFSETS[i][1]),
    location_type: type,
    is_verified: false,
    is_demo: true,
    created_at: '2026-10-01T08:00:00Z',
  }));
  const L = (i) => campus_locations[i].id;

  const issues = ['leaking_tap', 'broken_pipe', 'overflowing_tank', 'faulty_flush', 'unnecessary_usage', 'other'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed'];
  const descriptions = {
    leaking_tap: 'Tap drips continuously even when fully closed.',
    broken_pipe: 'Water pooling under an exposed pipe joint.',
    overflowing_tank: 'Tank overflow pipe running for long periods.',
    faulty_flush: 'Cistern keeps refilling after every flush.',
    unnecessary_usage: 'Hose left running after cleaning was finished.',
    other: 'Unusual damp patch on wall near water line.',
  };

  const water_reports = Array.from({ length: 20 }, (_, i) => {
    const issue = issues[i % issues.length];
    const day = String(3 + i).padStart(2, '0');
    return {
      id: id('8002', i + 1),
      reference_number: `WW-SMPL-${String(i + 1).padStart(2, '0')}`,
      location_id: L(i % 6),
      location_note: '',
      issue_type: issue,
      description: descriptions[issue],
      severity: severities[(i * 3) % 4],
      status: statuses[i % statuses.length],
      observed_at: `2026-10-${day}T09:30:00Z`,
      photo_path: null,
      is_anonymous: i % 3 !== 0,
      reporter_name: i % 3 !== 0 ? null : `Demo Reporter ${i + 1}`,
      reporter_contact: null,
      assigned_to: i % statuses.length >= 2 ? 'Estates and Facilities' : '',
      admin_notes: '',
      is_demo: true,
      submitted_at: `2026-10-${day}T10:00:00Z`,
    };
  });

  // 4 locations × (3 baseline days + 3 pilot days) = 24 readings
  const water_readings = [];
  const baseline = [
    { loc: 0, unit: 'L', base: 4200 },
    { loc: 2, unit: 'L', base: 3100 },
    { loc: 3, unit: 'm3', base: 6.8 },
    { loc: 5, unit: 'L', base: 1500 },
  ];
  let n = 1;
  baseline.forEach(({ loc, unit, base }, bi) => {
    const method = unit === 'm3' ? 'Sub-meter reading' : 'Bucket-and-stopwatch estimate';
    [5, 6, 7].forEach((d, k) => {
      const v = unit === 'm3' ? +(base * (1 + 0.03 * (k - 1))).toFixed(2) : Math.round(base * (1 + 0.04 * (k - 1)));
      water_readings.push({
        id: id('8003', n++), location_id: L(loc), reading_date: `2026-10-0${d}`,
        consumption_value: v, measurement_unit: unit, measurement_method: method, phase: 'baseline',
        meter_reading: unit === 'm3' ? +(1200 + bi * 50 + k * base).toFixed(2) : null,
        notes: 'Sample value', recorded_by: null, is_demo: true, created_at: `2026-10-0${d}T17:00:00Z`,
      });
    });
    [26, 27, 28].forEach((d, k) => {
      const factor = 0.82 + 0.02 * k;
      const v = unit === 'm3' ? +(base * factor).toFixed(2) : Math.round(base * factor);
      water_readings.push({
        id: id('8003', n++), location_id: L(loc), reading_date: `2026-10-${d}`,
        consumption_value: v, measurement_unit: unit, measurement_method: method, phase: 'pilot',
        meter_reading: unit === 'm3' ? +(1300 + bi * 50 + k * base).toFixed(2) : null,
        notes: 'Sample value', recorded_by: null, is_demo: true, created_at: `2026-10-${d}T17:00:00Z`,
      });
    });
  });

  const actionSpecs = [
    [0, 'Replace worn tap washers in washroom row 1', 'Estates/Facilities', 'verified', 120, 110],
    [1, 'Re-seal exposed pipe joint', 'Estates/Facilities', 'completed', 250, 260],
    [3, 'Fit float valve to overhead tank', 'Estates/Facilities', 'in_progress', 400, null],
    [4, 'Install self-closing nozzle on standpipe', 'Estates/Facilities', 'planned', 180, null],
    [2, 'Post water-saving signage in kitchen', "Students' Representative Council", 'completed', 60, 55],
    [5, 'Adjust cistern fill levels', 'Estates/Facilities', 'planned', 90, null],
  ];
  const conservation_actions = actionSpecs.map(([loc, desc, team, status, est, act], i) => ({
    id: id('8004', i + 1),
    report_id: water_reports[i].id,
    location_id: L(loc),
    action_description: desc,
    responsible_team: team,
    implementation_date: `2026-10-${String(12 + i * 2).padStart(2, '0')}`,
    estimated_cost: est,
    actual_cost: act,
    status,
    verification_notes: status === 'verified' ? 'Checked by facilities officer.' : '',
    is_demo: true,
    created_at: `2026-10-${String(10 + i).padStart(2, '0')}T12:00:00Z`,
  }));

  const commitments = ['report_leaks', 'turn_off_taps', 'avoid_waste', 'encourage_others', 'participate'];
  const pledges = Array.from({ length: 8 }, (_, i) => ({
    id: id('8005', i + 1),
    commitment_type: commitments[i % commitments.length],
    full_name: null, email: null,
    department: i % 2 ? 'Sample department' : null,
    comments: null,
    consent_status: true, is_demo: true,
    submitted_at: `2026-10-${String(14 + i).padStart(2, '0')}T15:00:00Z`,
  }));

  const fbCats = ['general', 'website', 'reporting', 'pilot', 'suggestion', 'other'];
  const feedback = fbCats.map((category, i) => ({
    id: id('8006', i + 1),
    category,
    message: `Sample feedback about ${category.replace('_', ' ')}. Demonstration text only.`,
    contact_name: null, contact_email: null,
    consent_status: true, status: i < 2 ? 'reviewed' : 'new', is_demo: true,
    submitted_at: `2026-10-${String(20 + i).padStart(2, '0')}T11:00:00Z`,
  }));

  const budgetSpecs = [
    ['leak_detection', 'Dye tablets and leak test kit', 2, 150],
    ['plumbing_repairs', 'Tap washers, seals and fittings', 20, 25],
    ['monitoring_equipment', 'Water sub-meter', 2, 650],
    ['signage', 'Printed conservation signs', 30, 15],
    ['hosting', 'Domain registration (annual)', 1, 200],
    ['training', 'Awareness session materials', 1, 300],
    ['maintenance', 'Monthly follow-up inspections', 6, 50],
  ];
  const budget_items = budgetSpecs.map(([category, item, quantity, unit_cost], i) => ({
    id: id('8007', i + 1), category, item, quantity, unit_cost,
    cost_basis: 'estimate', notes: 'Sample estimate. Replace with a real quotation.',
    is_demo: true, created_at: '2026-10-01T08:00:00Z',
  }));

  return {
    profiles: [],
    campus_locations, water_reports, water_readings, conservation_actions,
    pledges, feedback, budget_items,
    gallery_photos: [],
    site_settings: DEFAULT_SETTINGS.map((s) => ({ ...s, value: structuredClone(s.value) })),
  };
}

// Settings the group edits from the admin area. All empty until real data exists.
export const DEFAULT_SETTINGS = [
  { key: 'videos', value: { problem_url: '', solution_url: '' } },
  { key: 'research_findings', value: {
      challenges: '', processes: '', causes: '', experiences: '', opportunities: '' } },
  { key: 'pilot', value: {
      location: '', testing_date: '', users: null, feedback: '', problems: '', improvements: '' } },
  { key: 'tariff', value: { value: null, unit: 'm3', source: '', verified: false } },
  { key: 'roadmap', value: { current_phase: 1 } },
];
