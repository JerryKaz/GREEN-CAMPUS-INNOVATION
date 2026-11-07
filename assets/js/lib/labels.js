// Enumerations shared by forms, admin views and record validation (data/schema.js).
export const ISSUE_TYPES = {
  water_leak: 'Water leakage (wall, floor or ground)',
  leaking_tap: 'Leaking or faulty tap',
  broken_pipe: 'Broken pipe',
  overflowing_tank: 'Overflowing tank',
  faulty_flush: 'Faulty toilet flush',
  unnecessary_usage: 'Unnecessary water usage',
  other: 'Other water-related problem',
};
export const SEVERITIES = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
export const REPORT_STATUSES = {
  submitted: 'Submitted', under_review: 'Under Review', assigned: 'Assigned',
  in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};
export const ACTION_STATUSES = {
  planned: 'Planned', in_progress: 'In Progress', completed: 'Completed',
  verified: 'Verified', cancelled: 'Cancelled',
};
export const LOCATION_TYPES = {
  hostel: 'Hostel', academic: 'Academic building', washroom: 'Washroom block',
  kitchen: 'Kitchen / dining', tank: 'Water tank', outdoor: 'Outdoor / field',
  office: 'Office', other: 'Other',
};
export const PHASES = { baseline: 'Baseline', pilot: 'Pilot', routine: 'Routine monitoring' };
export const UNITS = { L: 'Litres (L)', m3: 'Cubic metres (m³)' };
export const COMMITMENTS = {
  report_leaks: 'I will report leaking taps and pipes.',
  turn_off_taps: 'I will turn off taps when not in use.',
  avoid_waste: 'I will avoid unnecessary water consumption.',
  encourage_others: 'I will encourage others to conserve water.',
  participate: 'I will participate in campus conservation activities.',
};
export const FEEDBACK_CATEGORIES = {
  general: 'General', website: 'Website / WaterWatch', reporting: 'Reporting a problem',
  pilot: 'Pilot activities', suggestion: 'Idea or suggestion', other: 'Other',
};
export const FEEDBACK_STATUSES = { new: 'New', reviewed: 'Reviewed', archived: 'Archived' };
// Image folders under public/images/ (the folder name is the gallery category).
export const MEDIA_FOLDERS = {
  campus: 'Campus', 'water-hotspots': 'Water hotspots', research: 'Research activities',
  interviews: 'Interviews', prototype: 'Prototype', pilot: 'Pilot', 'before-after': 'Before & after',
};
// Video slots, matching public/videos/ sub-folders.
export const VIDEO_SLOTS = {
  documentary: 'Video 1: Problem documentary', 'solution-demo': 'Video 2: Solution demonstration', interviews: 'Interview video',
};
export const BUDGET_CATEGORIES = {
  leak_detection: 'Leak detection materials', plumbing_repairs: 'Plumbing repairs',
  monitoring_equipment: 'Water monitoring equipment', signage: 'Signage & awareness materials',
  hosting: 'Website & database hosting', training: 'Training & sensitisation',
  maintenance: 'Maintenance', other: 'Other',
};
export const COST_BASIS = { estimate: 'Estimate', quotation: 'Quotation', actual: 'Actual' };

export const SEVERITY_COLORS = { low: '#38BDF8', medium: '#0891B2', high: '#D97706', critical: '#B91C1C' };
export const CHART_COLORS = ['#15803D', '#0891B2', '#38BDF8', '#14532D', '#65A30D', '#0E7490', '#86EFAC', '#164E63'];

export const label = (map, key) => map[key] ?? key ?? 'N/A';
export const options = (map) => Object.entries(map).map(([value, text]) => ({ value, text }));
