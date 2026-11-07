// Leaflet (self-hosted in /vendor) + OpenStreetMap tiles, loaded lazily.
import { esc, fmtDate } from '../lib/dom.js';
import { ISSUE_TYPES, SEVERITIES, REPORT_STATUSES, SEVERITY_COLORS, label } from '../lib/labels.js';
import { loadStyle, vendorURL } from '../lib/vendor.js';

let leaflet;
export async function L() {
  if (!leaflet) {
    loadStyle('leaflet/leaflet.css');
    leaflet = import(vendorURL('leaflet/leaflet-src.esm.js')).then((m) => {
      m.Icon.Default.imagePath = vendorURL('leaflet/images/');
      return m;
    });
  }
  return leaflet;
}

export async function createMap(el, { center, zoom = 16, scrollZoom = false }) {
  const Lf = await L();
  const map = Lf.map(el, { scrollWheelZoom: scrollZoom }).setView(center, zoom);
  Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());
  return { map, L: Lf };
}

const SEV_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Plot campus locations as hotspot markers.
 * rows: output of db.publicHotspots(): locations with coordinates, each with its reports.
 * Colour = worst OPEN issue; green = all issues resolved; grey = no reports linked.
 */
export async function plotHotspots(el, rows, { center, zoom }) {
  const { map, L: Lf } = await createMap(el, { center, zoom });
  const bounds = [];
  for (const g of rows) {
    const open = g.reports.filter((i) => !['resolved', 'closed'].includes(i.status));
    const worst = open.reduce((a, b) => (!a || SEV_RANK[b.severity] > SEV_RANK[a.severity] ? b : a), null);
    const color = worst ? SEVERITY_COLORS[worst.severity] : g.reports.length ? '#15803D' : '#94A3B8';
    const marker = Lf.circleMarker([g.latitude, g.longitude], {
      radius: 8 + Math.min(10, g.reports.length * 1.5), color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.9,
      dashArray: g.is_verified ? null : '3 3',
    }).addTo(map);
    const byType = {};
    g.reports.forEach((r) => { byType[r.issue_type] = (byType[r.issue_type] ?? 0) + 1; });
    const status = !g.reports.length ? 'No reports linked' : open.length ? `${open.length} open of ${g.reports.length}` : 'All reported issues resolved';
    const recent = [...g.reports].sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at))).slice(0, 5);
    marker.bindPopup(`<h4 style="margin:0 0 4px">${esc(g.name)}</h4>
      ${g.is_verified ? '<span class="badge badge--verified">Verified location</span>' : '<span class="badge">Not yet verified</span>'}
      ${g.description ? `<p style="margin:6px 0">${esc(g.description)}</p>` : ''}
      <p style="margin:6px 0"><strong>Status:</strong> ${esc(status)}</p>
      ${Object.keys(byType).length ? `<p style="margin:6px 0"><strong>Problem categories:</strong> ${Object.entries(byType).map(([k, n]) => `${esc(label(ISSUE_TYPES, k))} (${n})`).join(', ')}</p>` : ''}
      ${recent.length ? `<strong>Related reports</strong><ul style="padding-left:16px;margin:4px 0 0">${recent.map((i) =>
        `<li>${esc(label(ISSUE_TYPES, i.issue_type))} · ${esc(label(SEVERITIES, i.severity))} · ${esc(label(REPORT_STATUSES, i.status))} · ${esc(fmtDate(i.submitted_at))}</li>`).join('')}</ul>` : ''}
      ${g.reports.length > 5 ? `<p style="margin:4px 0 0">+${g.reports.length - 5} more</p>` : ''}`, { maxWidth: 320 });
    bounds.push([g.latitude, g.longitude]);
  }
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
  else if (bounds.length === 1) map.setView(bounds[0], 17);
  return map;
}

export const MAP_LEGEND = `<div class="map-legend">
  <span><i class="dot" style="background:${SEVERITY_COLORS.low}"></i>Low</span>
  <span><i class="dot" style="background:${SEVERITY_COLORS.medium}"></i>Medium</span>
  <span><i class="dot" style="background:${SEVERITY_COLORS.high}"></i>High</span>
  <span><i class="dot" style="background:${SEVERITY_COLORS.critical}"></i>Critical</span>
  <span><i class="dot" style="background:#15803D"></i>All issues resolved</span>
  <span><i class="dot" style="background:#94A3B8"></i>No reports linked</span>
  <span>Marker size = number of reports</span></div>`;
