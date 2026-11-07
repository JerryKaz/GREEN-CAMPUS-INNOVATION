import { initLayout } from '../layout.js';
import { CONFIG } from '../data/db.js';
import { esc, fmtDate, fmtNum } from '../lib/dom.js';
import { toLitres, reportDailyConsumption, reportBaselineVsPilot } from '../lib/calc.js';
import { ISSUE_TYPES, PHASES, UNITS, label } from '../lib/labels.js';
import { renderChart } from '../components/charts.js';
import { plotHotspots, MAP_LEGEND } from '../components/map.js';
import { renderGallery } from '../components/gallery.js';
import { renderVideoSlot, renderInterviewVideos } from '../components/video.js';
import { siteContent, galleryImages } from '../lib/content.js';
import { researchHTML, researchSections, methodologyHTML, quietEmpty, RESEARCH_EMPTY } from '../lib/research-view.js';

const { db } = await initLayout();
const $ = (id) => document.getElementById(id);

// ---- research information entered by the admin --------------------------------
siteContent(db).then(({ research = {} }) => {
  const s = researchSections(research);
  if (s.methodology) $('methodology-admin').innerHTML = methodologyHTML(research);
  const { methodology, ...rest } = s;
  const any = Object.values(rest).some(Boolean);
  $('research-content').innerHTML = any ? researchHTML({ ...research, published: { ...research.published, methodology: false } }) : quietEmpty(RESEARCH_EMPTY, 'flask');
}).catch(() => { $('research-content').innerHTML = quietEmpty(RESEARCH_EMPTY, 'flask'); });

renderVideoSlot($('video-problem'), db, 'documentary');
renderInterviewVideos($('interview-videos'), db);

// ---- water consumption -----------------------------------------------------------
let readings = [];
let locations = [];
let stats = null;
const fromLitres = (l, unit) => (unit === 'm3' ? l / 1000 : l);

async function drawCharts(unit) {
  const u = unit === 'm3' ? 'm³' : 'L';
  const daily = reportDailyConsumption(readings, locations);
  const dates = [...new Set(daily.map((d) => d.reading_date))].sort();
  const total = dates.map((d) => fromLitres(daily.filter((x) => x.reading_date === d).reduce((s, x) => s + x.consumption_litres, 0), unit));
  await renderChart($('chart-daily'), { type: 'line', labels: dates.map(fmtDate), datasets: [{ label: `Total (${u})`, data: total }], yTitle: u });

  const byLoc = new Map();
  for (const w of readings) {
    const name = locations.find((l) => l.id === w.location_id)?.name ?? 'Unlisted location';
    const g = byLoc.get(name) ?? { sum: 0, days: new Set() };
    g.sum += toLitres(w.consumption_value, w.measurement_unit) ?? 0;
    g.days.add(`${w.reading_date}|${w.phase}`);
    byLoc.set(name, g);
  }
  const names = [...byLoc.keys()];
  await renderChart($('chart-location'), { type: 'bar', horizontal: true, labels: names,
    datasets: [{ label: `Average per reading day (${u})`, data: names.map((n) => fromLitres(byLoc.get(n).sum / byLoc.get(n).days.size, unit)), color: '#0891B2' }], yTitle: u });

  const bvp = reportBaselineVsPilot(readings, locations).filter((r) => r.baseline_avg_daily_l !== null && r.pilot_avg_daily_l !== null);
  $('chart-bvp-card').hidden = !bvp.length; // shown once both phases are recorded somewhere
  if (bvp.length) {
    await renderChart($('chart-bvp'), { type: 'bar', labels: bvp.map((r) => r.location_name), yTitle: u, datasets: [
      { label: `Baseline avg/day (${u})`, data: bvp.map((r) => fromLitres(r.baseline_avg_daily_l, unit)), color: '#14532D' },
      { label: `Pilot avg/day (${u})`, data: bvp.map((r) => fromLitres(r.pilot_avg_daily_l, unit)), color: '#38BDF8' }] });
  }

  const issues = stats?.by_issue_type ?? {};
  const keys = Object.keys(ISSUE_TYPES).filter((k) => issues[k]);
  $('chart-issues-card').hidden = !keys.length;
  if (keys.length) await renderChart($('chart-issues'), { type: 'bar', labels: keys.map((k) => ISSUE_TYPES[k]),
    datasets: [{ label: 'Reports', data: keys.map((k) => issues[k]), color: '#15803D' }], yTitle: 'Reports' });
}

function drawTable() {
  const rows = [...readings].sort((a, b) => b.reading_date.localeCompare(a.reading_date));
  $('readings-table').innerHTML = `<table class="data"><caption class="sr-only">Water measurement log</caption><thead><tr>
    <th>Date</th><th>Location</th><th class="num">Consumption</th><th>Unit</th><th>Phase</th><th>Method</th><th>Observations</th></tr></thead><tbody>
    ${rows.map((w) => `<tr><td>${esc(fmtDate(w.reading_date))}</td>
      <td>${esc(locations.find((l) => l.id === w.location_id)?.name ?? 'N/A')}</td>
      <td class="num">${esc(fmtNum(w.consumption_value, 3))}</td><td>${esc(label(UNITS, w.measurement_unit))}</td>
      <td>${esc(label(PHASES, w.phase))}</td><td>${esc(w.measurement_method)}</td><td>${esc(w.notes || '')}</td></tr>`).join('')}
    </tbody></table>`;
}

try {
  [readings, locations, stats] = await Promise.all([
    db.publicList('water_readings', { order: ['reading_date', 'asc'] }),
    db.publicList('campus_locations'),
    db.publicStats(),
  ]);
  if (!readings.length) {
    $('readings-empty').innerHTML = quietEmpty('No water readings have been recorded yet.', 'gauge');
  } else {
    $('readings-content').hidden = false;
    drawTable();
    await drawCharts('L');
    document.querySelectorAll('input[name="unit"]').forEach((r) => r.addEventListener('change', () => drawCharts(r.value)));
  }
} catch (err) {
  console.error(err);
  $('readings-empty').innerHTML = quietEmpty('Water readings could not be loaded right now. Please refresh the page.', 'gauge');
}

// ---- verified hotspots map ----------------------------------------------------------
(async () => {
  const mapEl = $('hotspot-map');
  try {
    const rows = await db.publicHotspots();
    if (!rows.length) { mapEl.outerHTML = quietEmpty('No verified water conservation hotspots have been added yet.', 'pin'); return; }
    await plotHotspots(mapEl, rows, { center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM });
    $('map-legend').innerHTML = MAP_LEGEND;
  } catch (err) {
    console.error(err);
    mapEl.outerHTML = quietEmpty('The map needs an internet connection to load.', 'pin');
  }
})();

// ---- gallery ------------------------------------------------------------------------
galleryImages(db)
  .then((images) => renderGallery($('gallery-filters'), $('gallery'), images))
  .catch(() => renderGallery($('gallery-filters'), $('gallery'), []));
