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
 * Plot hotspots: one marker per location, sized/coloured by the worst open issue.
 * rows: output of publicHotspots().
 */
export async function plotHotspots(el, rows, { center, zoom }) {
  const { map, L: Lf } = await createMap(el, { center, zoom });
  const byLoc = new Map();
  for (const r of rows) {
    const g = byLoc.get(r.location_id) ?? { ...r, issues: [] };
    g.issues.push(r);
    byLoc.set(r.location_id, g);
  }
  const bounds = [];
  for (const g of byLoc.values()) {
    const open = g.issues.filter((i) => !['resolved', 'closed'].includes(i.status));
    const worst = (open.length ? open : g.issues).reduce((a, b) => (SEV_RANK[b.severity] > SEV_RANK[a.severity] ? b : a));
    const color = open.length ? SEVERITY_COLORS[worst.severity] : '#15803D';
    const marker = Lf.circleMarker([g.latitude, g.longitude], {
      radius: 8 + Math.min(10, g.issues.length * 1.5), color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.9,
    }).addTo(map);
    const list = g.issues.slice(0, 6).map((i) =>
      `<li>${esc(label(ISSUE_TYPES, i.issue_type))} · <strong>${esc(label(SEVERITIES, i.severity))}</strong> · ${esc(label(REPORT_STATUSES, i.status))} · ${esc(fmtDate(i.submitted_at))}</li>`).join('');
    marker.bindPopup(`<h4>${esc(g.location_name)}</h4>
      ${g.location_demo ? '<span class="badge badge--demo">Demo location</span> ' : ''}${g.location_verified ? '<span class="badge badge--verified">Verified location</span>' : ''}
      <p style="margin:6px 0">${g.issues.length} report(s), ${open.length} open</p><ul style="padding-left:16px;margin:0">${list}</ul>
      ${g.issues.length > 6 ? `<p style="margin:4px 0 0">+${g.issues.length - 6} more</p>` : ''}`);
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
  <span>Marker size = number of reports</span></div>`;
