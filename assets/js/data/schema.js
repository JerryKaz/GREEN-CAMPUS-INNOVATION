// Record schemas: one place that defines what a valid record looks like.
// Used when saving from forms/admin AND when restoring a JSON backup, so a
// corrupted or hand-edited backup cannot put bad data into the database.
import {
  ISSUE_TYPES, SEVERITIES, REPORT_STATUSES, ACTION_STATUSES, LOCATION_TYPES, PHASES, UNITS,
  COMMITMENTS, FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, BUDGET_CATEGORIES, COST_BASIS, MEDIA_FOLDERS, VIDEO_SLOTS,
} from '../lib/labels.js';

/** Bump when the shape of stored records changes; backups record it. */
export const SCHEMA_VERSION = 1;
export const APP_ID = 'green-campus-waterwatch';

/** The six research/application collections plus supporting ones, in restore order (parents first). */
export const COLLECTIONS = ['campus_locations', 'water_reports', 'water_readings', 'conservation_actions',
  'pledges', 'feedback', 'budget_items', 'media_items'];

const keys = (m) => Object.keys(m);
const isDateOnly = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isIso = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

export const SCHEMAS = {
  campus_locations: {
    required: ['name', 'location_type'],
    enums: { location_type: keys(LOCATION_TYPES) },
    text: { name: 160, description: 1000, location_details: 500 },
    numbers: { latitude: [-90, 90], longitude: [-180, 180] },
  },
  water_reports: {
    required: ['reference_number', 'issue_type', 'description', 'severity', 'status', 'submitted_at'],
    enums: { issue_type: keys(ISSUE_TYPES), severity: keys(SEVERITIES), status: keys(REPORT_STATUSES) },
    text: { description: 2000, location_note: 200, reporter_name: 120, reporter_contact: 160, assigned_to: 160, admin_notes: 2000 },
    timestamps: ['submitted_at', 'observed_at'],
    refs: { location_id: 'campus_locations' },
  },
  water_readings: {
    required: ['location_id', 'reading_date', 'consumption_value', 'measurement_unit', 'measurement_method', 'phase'],
    enums: { measurement_unit: keys(UNITS), phase: keys(PHASES) },
    text: { measurement_method: 120, notes: 1000 },
    numbers: { consumption_value: [0, 1e9], meter_reading: [0, 1e12] },
    dates: ['reading_date'],
    refs: { location_id: 'campus_locations' },
  },
  conservation_actions: {
    required: ['action_description', 'responsible_team', 'status'],
    enums: { status: keys(ACTION_STATUSES) },
    text: { action_description: 1000, responsible_team: 160, verification_notes: 2000, outcome: 1000 },
    numbers: { estimated_cost: [0, 1e9], actual_cost: [0, 1e9] },
    dates: ['implementation_date', 'completion_date'],
    refs: { location_id: 'campus_locations', report_id: 'water_reports' },
  },
  pledges: {
    required: ['commitment_type', 'submitted_at'],
    enums: { commitment_type: keys(COMMITMENTS) },
    text: { full_name: 120, email: 160, department: 160, comments: 1000 },
    timestamps: ['submitted_at'],
  },
  feedback: {
    required: ['category', 'message', 'submitted_at'],
    enums: { category: keys(FEEDBACK_CATEGORIES), status: keys(FEEDBACK_STATUSES) },
    text: { message: 2000, contact_name: 120, contact_email: 160 },
    timestamps: ['submitted_at'],
  },
  budget_items: {
    required: ['category', 'item', 'quantity', 'unit_cost', 'cost_basis'],
    enums: { category: keys(BUDGET_CATEGORIES), cost_basis: keys(COST_BASIS) },
    text: { item: 160, notes: 500 },
    numbers: { quantity: [0, 1e6], unit_cost: [0, 1e9] },
  },
  media_items: {
    required: ['kind', 'title'],
    enums: { kind: ['image', 'video'], category: keys(MEDIA_FOLDERS), slot: keys(VIDEO_SLOTS) },
    text: { title: 160, caption: 500, alt: 300, location: 160, description: 1000, path: 300, url: 500 },
  },
};

/**
 * Validate one record. Returns an array of human-readable problems (empty = valid).
 * `existing` (optional): { storeName: Set(ids) } to check relationships.
 */
export function validateRecord(store, rec, existing) {
  const s = SCHEMAS[store];
  const errs = [];
  if (!s) return [`Unknown collection "${store}".`];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return ['Record is not an object.'];
  if (typeof rec.id !== 'string' || !rec.id) errs.push('Missing id.');
  for (const f of s.required) {
    const v = rec[f];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) errs.push(`Missing ${f}.`);
  }
  for (const [f, allowed] of Object.entries(s.enums ?? {})) {
    if (rec[f] !== undefined && rec[f] !== null && rec[f] !== '' && !allowed.includes(rec[f])) errs.push(`Invalid ${f}: "${rec[f]}".`);
  }
  for (const [f, max] of Object.entries(s.text ?? {})) {
    if (rec[f] !== undefined && rec[f] !== null && typeof rec[f] !== 'string') errs.push(`${f} must be text.`);
    else if (typeof rec[f] === 'string' && rec[f].length > max) errs.push(`${f} is longer than ${max} characters.`);
  }
  for (const [f, [min, max]] of Object.entries(s.numbers ?? {})) {
    const v = rec[f];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'number' || !Number.isFinite(v)) errs.push(`${f} must be a number.`);
    else if (v < min || v > max) errs.push(`${f} must be between ${min} and ${max}.`);
  }
  for (const f of s.dates ?? []) if (rec[f] && !isDateOnly(rec[f])) errs.push(`${f} must be a date (YYYY-MM-DD).`);
  for (const f of s.timestamps ?? []) if (rec[f] && !isIso(rec[f])) errs.push(`${f} must be a date and time.`);
  if (existing) {
    for (const [f, target] of Object.entries(s.refs ?? {})) {
      if (rec[f] && existing[target] && !existing[target].has(rec[f])) errs.push(`${f} points to a ${target.replace('_', ' ')} record that does not exist.`);
    }
  }
  return errs;
}
