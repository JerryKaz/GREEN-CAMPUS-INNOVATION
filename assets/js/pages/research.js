import { initLayout } from '../layout.js';
import { includeDemo, CONFIG } from '../data/db.js';
import { esc, fmtDate, fmtNum, emptyHTML, errorHTML, demoBadge } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { toLitres, reportDailyConsumption, reportBaselineVsPilot } from '../lib/calc.js';
import { ISSUE_TYPES, PHASES, UNITS, label } from '../lib/labels.js';
import { renderChart } from '../components/charts.js';
import { plotHotspots, MAP_LEGEND } from '../components/map.js';
import { renderGallery } from '../components/gallery.js';
import { renderVideoSlot, renderInterviewVideos } from '../components/video.js';
import { siteContent, galleryImages } from '../lib/content.js';
import { SAMPLE_CHIP } from '../components/stats.js';

const { db } = await initLayout();
const demo = includeDemo();

const FINDINGS = [
  ['A', 'challenges', 'Identified water challenges'],
  ['B', 'processes', 'Existing water management processes'],
  ['C', 'causes', 'Causes of water wastage'],
  ['D', 'experiences', 'Student and staff experiences'],
  ['E', 'opportunities', 'Opportunities for process improvement'],
];

// ---- published content (public/data/site-content.json + admin changes on this device)
const verified = '<span class="badge badge--verified">Verified finding</span>';
const pending = (what) => `<p class="muted" style="margin:0">${esc(what)} will be published once fieldwork is complete and verified.</p>`;
siteContent(db).then((s) => {
  const f = s.research_findings ?? {};
  document.getElementById('findings').innerHTML = FINDINGS.map(([letter, key, title]) => `
    <article class="finding"><h3><span class="letter">${letter}.</span>${esc(title)} ${f[key] ? verified : ''}</h3>
      ${f[key] ? `<p class="prose-block">${esc(f[key])}</p>` : pending('Findings for this section')}
    </article>`).join('');

  const o = s.observations ?? {};
  const iv = s.interviews ?? {};
  const days = Number(o.days_observed) || 0;
  const card = (ic, title, meta, body, ok) => `<article class="card"><span class="icon-tile">${icon(ic, 20)}</span>
    <h3>${esc(title)} ${ok ? verified : ''}</h3>${meta ? `<p class="small muted">${meta}</p>` : ''}${body}</article>`;
  document.getElementById('fieldwork').innerHTML = [
    card('search', 'Baseline observations',
      days ? `${days} day(s) observed${o.period ? ` · ${esc(o.period)}` : ''}${days < 3 ? ' · <strong>below the 3-day minimum</strong>' : ''}` : 'Target: at least 3 days',
      o.summary ? `<p class="prose-block">${esc(o.summary)}</p>` : pending('Observation notes'), !!o.summary),
    card('wrench', 'Estates/Facilities interviews',
      iv.estates_count ? `${esc(iv.estates_count)} staff member(s) interviewed` : 'Target: Estates/Facilities staff',
      iv.estates_summary ? `<p class="prose-block">${esc(iv.estates_summary)}</p>` : pending('Interview findings'), !!iv.estates_summary),
    card('users', 'Student interviews',
      iv.students_count ? `${esc(iv.students_count)} student(s) interviewed${iv.students_count < 5 ? ' · <strong>below the target of 5</strong>' : ''}` : 'Target: at least 5 students',
      iv.students_summary ? `<p class="prose-block">${esc(iv.students_summary)}</p>` : pending('Interview findings'), !!iv.students_summary),
  ].join('') + (iv.themes ? `<article class="card" style="grid-column:1/-1"><h3>Common themes ${verified}</h3><p class="prose-block">${esc(iv.themes)}</p></article>` : '');
}).catch((e) => { document.getElementById('findings').innerHTML = errorHTML(e.message); });

renderVideoSlot(document.getElementById('video-problem'), db, 'documentary');
renderInterviewVideos(document.getElementById('interview-videos'), db);

// ---- baseline dashboard ----------------------------------------------------
const chartIds = ['chart-daily', 'chart-location', 'chart-issues', 'chart-bvp'];
let readings = [];
let locations = [];
let stats = null;

function fromLitres(l, unit) { return unit === 'm3' ? l / 1000 : l; }

async function drawCharts(unit) {
  const u = unit === 'm3' ? 'm³' : 'L';
  const el = (id) => document.getElementById(id);

  if (!readings.length) {
    ['chart-daily', 'chart-location', 'chart-bvp'].forEach((id) => (el(id).innerHTML =
      emptyHTML('Awaiting baseline data', 'Charts appear once readings are recorded.', 'chart')));
  } else {
    const daily = reportDailyConsumption(readings, locations);
    const dates = [...new Set(daily.map((d) => d.reading_date))].sort();
    const total = dates.map((d) => fromLitres(daily.filter((x) => x.reading_date === d).reduce((s, x) => s + x.consumption_litres, 0), unit));
    await renderChart(el('chart-daily'), { type: 'line', labels: dates.map(fmtDate), datasets: [{ label: `Total (${u})`, data: total }], yTitle: u });

    const byLoc = new Map();
    for (const w of readings) {
      const name = locations.find((l) => l.id === w.location_id)?.name ?? 'Unknown';
      const g = byLoc.get(name) ?? { sum: 0, days: new Set() };
      g.sum += toLitres(w.consumption_value, w.measurement_unit);
      g.days.add(`${w.reading_date}|${w.phase}`);
      byLoc.set(name, g);
    }
    const names = [...byLoc.keys()];
    await renderChart(el('chart-location'), { type: 'bar', horizontal: true, labels: names,
      datasets: [{ label: `Average per reading day (${u})`, data: names.map((n) => fromLitres(byLoc.get(n).sum / byLoc.get(n).days.size, unit)), color: '#0891B2' }], yTitle: u });

    const bvp = reportBaselineVsPilot(readings, locations).filter((r) => r.baseline_avg_daily_l !== null || r.pilot_avg_daily_l !== null);
    if (!bvp.some((r) => r.pilot_avg_daily_l !== null)) {
      el('chart-bvp').innerHTML = emptyHTML('Pilot results not recorded yet', 'The comparison appears once pilot readings exist for a location.', 'chart');
    } else {
      await renderChart(el('chart-bvp'), { type: 'bar',
        labels: bvp.map((r) => r.location_name),
        datasets: [
          { label: `Baseline avg/day (${u})`, data: bvp.map((r) => (r.baseline_avg_daily_l === null ? null : fromLitres(r.baseline_avg_daily_l, unit))), color: '#14532D' },
          { label: `Pilot avg/day (${u})`, data: bvp.map((r) => (r.pilot_avg_daily_l === null ? null : fromLitres(r.pilot_avg_daily_l, unit))), color: '#38BDF8' },
        ], yTitle: u });
    }
  }

  const issues = stats?.by_issue_type ?? {};
  const keys = Object.keys(ISSUE_TYPES).filter((k) => issues[k]);
  if (!keys.length) el('chart-issues').innerHTML = emptyHTML('No issues reported yet', 'Reports submitted through WaterWatch will appear here.', 'alert');
  else await renderChart(el('chart-issues'), { type: 'bar', labels: keys.map((k) => ISSUE_TYPES[k]),
    datasets: [{ label: 'Reports', data: keys.map((k) => issues[k]), color: '#15803D' }], yTitle: 'Reports' });
}

function drawTable() {
  const host = document.getElementById('readings-table');
  if (!readings.length) { host.innerHTML = emptyHTML('No measurements recorded yet', 'Baseline readings will be listed here as soon as they are entered.', 'gauge'); return; }
  const rows = [...readings].sort((a, b) => b.reading_date.localeCompare(a.reading_date));
  host.innerHTML = `<table class="data"><caption class="sr-only">Water measurement log</caption><thead><tr>
    <th>Date</th><th>Location</th><th class="num">Consumption</th><th>Unit</th><th>Phase</th><th>Method</th><th>Observations</th></tr></thead><tbody>
    ${rows.map((w) => `<tr><td>${esc(fmtDate(w.reading_date))}</td>
      <td>${esc(locations.find((l) => l.id === w.location_id)?.name ?? 'N/A')} ${demoBadge(w.is_demo)}</td>
      <td class="num">${esc(fmtNum(w.consumption_value, 3))}</td><td>${esc(label(UNITS, w.measurement_unit))}</td>
      <td>${esc(label(PHASES, w.phase))}</td><td>${esc(w.measurement_method)}</td><td>${esc(w.notes || 'N/A')}</td></tr>`).join('')}
    </tbody></table>`;
}

try {
  chartIds.forEach((id) => (document.getElementById(id).innerHTML = '<div class="state state--loading"><span class="spinner"></span>Loading…</div>'));
  [readings, locations, stats] = await Promise.all([
    db.list('water_readings', { includeDemo: demo, order: ['reading_date', 'asc'] }),
    db.list('campus_locations', { includeDemo: demo }),
    db.publicStats(demo),
  ]);
  if (readings.some((r) => r.is_demo) || stats.includes_demo) {
    document.getElementById('baseline-notice').innerHTML = SAMPLE_CHIP;
  }
  drawTable();
  await drawCharts('L');
  document.querySelectorAll('input[name="unit"]').forEach((r) => r.addEventListener('change', () => drawCharts(r.value)));
} catch (err) {
  console.error(err);
  chartIds.forEach((id) => (document.getElementById(id).innerHTML = errorHTML('Could not load measurements.')));
}

// ---- map --------------------------------------------------------------------
(async () => {
  const mapEl = document.getElementById('hotspot-map');
  try {
    const rows = await db.publicHotspots(demo);
    if (rows.some((r) => r.is_demo || r.location_demo)) {
      document.getElementById('map-notice').innerHTML = SAMPLE_CHIP;
    }
    if (!rows.length) {
      mapEl.outerHTML = `<div class="placeholder">${emptyHTML('No mapped hotspots yet', 'Hotspots appear once administrators add verified locations with coordinates and reports are linked to them.', 'pin')}</div>`;
      return;
    }
    await plotHotspots(mapEl, rows, { center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM });
    document.getElementById('map-legend').innerHTML = MAP_LEGEND;
  } catch (err) {
    console.error(err);
    mapEl.innerHTML = errorHTML('The map could not be loaded.');
  }
})();

// ---- gallery (public/data/media-gallery.json) ------------------------------
galleryImages(db)
  .then((images) => renderGallery(document.getElementById('gallery-filters'), document.getElementById('gallery'), images))
  .catch(() => { document.getElementById('gallery').innerHTML = errorHTML('Photos could not be loaded.'); });
