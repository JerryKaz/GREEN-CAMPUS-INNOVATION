// Headline impact statistics (home + dashboard). Never invents figures.
import { esc, errorHTML } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { estimatedDailySaving } from '../lib/calc.js';
import { includeDemo } from '../data/db.js';
import { countUp } from '../layout.js';

export async function loadPublicData(db, { demo = includeDemo() } = {}) {
  const [stats, readings, locations] = await Promise.all([
    db.publicStats(demo),
    db.list('water_readings', { includeDemo: demo }),
    db.list('campus_locations', { includeDemo: demo }),
  ]);
  return { stats, readings, locations, demo };
}

const card = (iconName, title, value, note, unit = '') => `<div class="stat">
  <span class="stat__label">${icon(iconName, 16)}${esc(title)}</span>
  ${value === null ? '<span class="stat__value stat__value--pending">Awaiting baseline data</span>'
    : `<span class="stat__value"><span data-count="${value}">${value}</span>${unit ? `<small>${esc(unit)}</small>` : ''}</span>`}
  ${note ? `<span class="stat__note">${esc(note)}</span>` : ''}</div>`;

export const SAMPLE_CHIP = '<span class="sample-chip" title="These figures include demonstration records, not measured campus data">DEMO DATA: includes demonstration records, not research findings</span>';

export function renderImpactStats(host, noticeHost, { stats, readings, locations }) {
  const saved = estimatedDailySaving(readings, locations);
  const usesDemo = stats.includes_demo || readings.some((r) => r.is_demo);
  host.innerHTML = [
    card('pin', 'Water hotspots identified', stats.hotspots, 'Locations with at least one report'),
    card('alert', 'Water issues reported', stats.reports_total, `${stats.reports_open} still open`),
    card('checkCircle', 'Issues resolved', stats.reports_resolved,
      stats.reports_total ? `${Math.round((stats.reports_resolved / stats.reports_total) * 100)}% of all reports` : 'No reports yet'),
    card('droplet', 'Estimated water saved', saved, saved === null ? 'Needs three baseline and three pilot days' : 'Baseline compared with pilot', 'L/day'),
  ].join('');
  if (noticeHost) noticeHost.innerHTML = usesDemo ? SAMPLE_CHIP : '';
  countUp(host);
}

export function renderStatsError(host, err) {
  host.innerHTML = errorHTML(`Statistics could not be loaded. ${err?.message ?? ''}`);
}
