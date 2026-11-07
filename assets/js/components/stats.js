// Headline impact statistics (home + dashboard). Never invents figures.
import { esc, errorHTML } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { estimatedDailySaving } from '../lib/calc.js';
import { countUp } from '../layout.js';

export async function loadPublicData(db) {
  const [stats, readings, locations] = await Promise.all([
    db.publicStats(),
    db.publicList('water_readings'),
    db.publicList('campus_locations'),
  ]);
  return { stats, readings, locations };
}

const card = (iconName, title, value, note, unit = '') => `<div class="stat">
  <span class="stat__label">${icon(iconName, 16)}${esc(title)}</span>
  ${value === null ? '<span class="stat__value stat__value--pending">Awaiting baseline data</span>'
    : `<span class="stat__value"><span data-count="${value}">${value}</span>${unit ? `<small>${esc(unit)}</small>` : ''}</span>`}
  ${note ? `<span class="stat__note">${esc(note)}</span>` : ''}</div>`;


export function renderImpactStats(host, noticeHost, { stats, readings, locations }) {
  const saved = estimatedDailySaving(readings, locations);
  host.innerHTML = [
    card('pin', 'Water hotspots identified', stats.hotspots, 'Locations with at least one report'),
    card('alert', 'Water issues reported', stats.reports_total, `${stats.reports_open} still open`),
    card('checkCircle', 'Issues resolved', stats.reports_resolved,
      stats.reports_total ? `${Math.round((stats.reports_resolved / stats.reports_total) * 100)}% of all reports` : 'No reports yet'),
    ...(saved === null ? [] : [card('droplet', 'Estimated water saved', saved, 'Baseline compared with pilot', 'L/day')]),
  ].join('');
  countUp(host);
}

export function renderStatsError(host, err) {
  host.innerHTML = errorHTML(`Statistics could not be loaded. ${err?.message ?? ''}`);
}
