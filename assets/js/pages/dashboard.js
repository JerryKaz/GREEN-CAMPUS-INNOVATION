// Public WaterWatch dashboard: every value is derived from stored records.
// Filters (search, dates, category, status, location) recompute everything.
// Updates live when records change in another tab (e.g. the admin panel).
import { initLayout } from '../layout.js';
import { CONFIG, includeDemo } from '../data/db.js';
import { esc, fmtNum, fmtDate, fmtDateTime, emptyHTML, errorHTML, demoBadge } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { reportBaselineVsPilot, estimatedDailySaving } from '../lib/calc.js';
import { ISSUE_TYPES, REPORT_STATUSES, ACTION_STATUSES, COMMITMENTS, FEEDBACK_CATEGORIES, PHASES, CHART_COLORS, label } from '../lib/labels.js';
import { renderChart } from '../components/charts.js';
import { plotHotspots, MAP_LEGEND } from '../components/map.js';
import { SAMPLE_CHIP } from '../components/stats.js';

const { db } = await initLayout();
const $ = (id) => document.getElementById(id);
const demo = includeDemo();
const OPEN = ['submitted', 'under_review', 'assigned'];
const PROGRESS = ['in_progress'];
const DONE = ['resolved', 'closed'];
const day = (iso) => String(iso ?? '').slice(0, 10);
const opts = (map, all) => `<option value="">${all}</option>${Object.entries(map).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}`;

$('df-cat').innerHTML = opts(ISSUE_TYPES, 'All categories');
$('df-status').innerHTML = opts({ open: 'Open', in_progress: 'In progress', resolved: 'Resolved or closed', ...REPORT_STATUSES }, 'All statuses');

let data;
async function load() {
  const [reports, readings, actions, pledges, feedback, locations] = await Promise.all(
    ['water_reports', 'water_readings', 'conservation_actions', 'pledges', 'feedback', 'campus_locations']
      .map((t) => db.list(t, { includeDemo: demo })),
  );
  data = { reports, readings, actions, pledges, feedback, locations, locName: new Map(locations.map((l) => [l.id, l.name])) };
  const sel = $('df-loc');
  const cur = sel.value;
  sel.innerHTML = `<option value="">All locations</option>${locations.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}`;
  sel.value = cur;
}

function filters() {
  const f = Object.fromEntries(new FormData($('dash-filters')));
  const inRange = (iso) => (!f.from || day(iso) >= f.from) && (!f.to || day(iso) <= f.to);
  const q = (f.q ?? '').trim().toLowerCase();
  const statusOk = (s) => !f.status || (f.status === 'open' ? OPEN.includes(s) : f.status === 'resolved' ? DONE.includes(s) : s === f.status);
  const reports = data.reports.filter((r) => inRange(r.submitted_at) && (!f.category || r.issue_type === f.category) && statusOk(r.status)
    && (!f.location || r.location_id === f.location)
    && (!q || [r.reference_number, data.locName.get(r.location_id), r.location_note, label(ISSUE_TYPES, r.issue_type)].some((x) => String(x ?? '').toLowerCase().includes(q))));
  const readings = data.readings.filter((w) => inRange(w.reading_date) && (!f.location || w.location_id === f.location)
    && (!q || String(data.locName.get(w.location_id) ?? '').toLowerCase().includes(q)));
  const actions = data.actions.filter((a) => inRange(a.implementation_date ?? a.created_at) && (!f.location || a.location_id === f.location));
  return { f, reports, readings, actions, pledges: data.pledges.filter((p) => inRange(p.submitted_at)), feedback: data.feedback.filter((x) => inRange(x.submitted_at)) };
}

const stat = (ic, title, value, note = '') => `<div class="stat"><span class="stat__label">${icon(ic, 16)}${esc(title)}</span>
  <span class="stat__value">${value}</span>${note ? `<span class="stat__note">${esc(note)}</span>` : ''}</div>`;
const pct = (a, b) => (b ? `${fmtNum((a / b) * 100, 0)}%` : 'N/A');

let mapDrawn = false;
async function draw() {
  const v = filters();
  const { reports, readings, actions, pledges, feedback } = v;
  const usesDemo = [reports, readings, actions, pledges, feedback].some((arr) => arr.some((r) => r.is_demo));
  $('dash-notice').innerHTML = usesDemo ? SAMPLE_CHIP : '';
  const n = (set) => reports.filter((r) => set.includes(r.status)).length;
  const done = actions.filter((a) => ['completed', 'verified'].includes(a.status)).length;

  $('dash-stats').innerHTML = [
    stat('clipboard', 'Total water reports', fmtNum(reports.length), `${Object.keys(ISSUE_TYPES).filter((k) => reports.some((r) => r.issue_type === k)).length} categories reported`),
    stat('alert', 'Open reports', fmtNum(n(OPEN)), 'Submitted, under review or assigned'),
    stat('route', 'In progress', fmtNum(n(PROGRESS)), 'Repair work under way'),
    stat('checkCircle', 'Resolved', fmtNum(n(DONE)), 'Resolved or closed'),
    stat('gauge', 'Water readings recorded', fmtNum(readings.length), `${new Set(readings.map((w) => w.location_id)).size} location(s)`),
    stat('wrench', 'Conservation actions', fmtNum(actions.length), `${done} completed or verified`),
    stat('heart', 'Pledges received', fmtNum(pledges.length), ''),
    stat('message', 'Feedback received', fmtNum(feedback.length), `${feedback.filter((x) => x.status === 'new').length} not yet reviewed`),
  ].join('');

  // Performance indicators: transparent ratios from the same records.
  const bvp = reportBaselineVsPilot(readings, data.locations);
  const saved = estimatedDailySaving(readings, data.locations);
  const comparable = bvp.filter((r) => r.meets_minimum_days && r.baseline_avg_daily_l);
  const totalB = comparable.reduce((s, r) => s + r.baseline_avg_daily_l, 0);
  const totalP = comparable.reduce((s, r) => s + (r.pilot_avg_daily_l ?? 0), 0);
  $('dash-kpis').innerHTML = [
    stat('checkCircle', 'Resolution rate', pct(n(DONE), reports.length), 'Reports resolved or closed'),
    stat('wrench', 'Action completion', pct(done, actions.length), 'Actions completed or verified'),
    stat('droplet', 'Estimated water saved', saved === null ? 'N/A' : `${fmtNum(saved)} <small>L/day</small>`, saved === null ? 'Needs 3 baseline and 3 pilot days' : 'Baseline minus pilot, comparable locations'),
    stat('chart', 'Overall reduction', totalB ? `${fmtNum(((totalB - totalP) / totalB) * 100, 1)}%` : 'N/A', `${comparable.length} comparable location/method group(s)`),
  ].join('');

  // Charts
  if (!reports.length) {
    ['c-time', 'c-type', 'c-status'].forEach((id) => { $(id).innerHTML = emptyHTML('No reports match', 'Change or clear the filters.', 'chart'); });
  } else {
    const weekOf = (iso) => { const d = new Date(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
    const weeks = [...new Set(reports.map((r) => weekOf(r.submitted_at)))].sort();
    await renderChart($('c-time'), { type: 'line', labels: weeks.map((w) => `Week of ${fmtDate(w)}`),
      datasets: [{ label: 'Reports', data: weeks.map((w) => reports.filter((r) => weekOf(r.submitted_at) === w).length) }], yTitle: 'Reports' });
    const types = Object.keys(ISSUE_TYPES).filter((k) => reports.some((r) => r.issue_type === k));
    await renderChart($('c-type'), { type: 'bar', horizontal: true, labels: types.map((k) => ISSUE_TYPES[k]),
      datasets: [{ label: 'Reports', data: types.map((k) => reports.filter((r) => r.issue_type === k).length), color: '#0891B2' }] });
    const st = Object.keys(REPORT_STATUSES).filter((k) => reports.some((r) => r.status === k));
    await renderChart($('c-status'), { type: 'doughnut', labels: st.map((k) => REPORT_STATUSES[k]),
      datasets: [{ label: 'Reports', data: st.map((k) => reports.filter((r) => r.status === k).length), backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: '#fff' }] });
  }
  const withData = bvp.filter((r) => r.baseline_avg_daily_l !== null || r.pilot_avg_daily_l !== null);
  if (!withData.length) $('c-readings').innerHTML = emptyHTML('No readings in this selection', 'Readings appear once baseline or pilot measurements are recorded.', 'gauge');
  else await renderChart($('c-readings'), { type: 'bar', labels: withData.map((r) => r.location_name), yTitle: 'Litres per day', datasets: [
    { label: 'Baseline avg L/day', data: withData.map((r) => r.baseline_avg_daily_l), color: '#14532D' },
    { label: 'Pilot avg L/day', data: withData.map((r) => r.pilot_avg_daily_l), color: '#38BDF8' }] });

  // Baseline vs pilot table
  $('dash-bvp').innerHTML = !bvp.length ? emptyHTML('Awaiting baseline data', 'Comparisons appear once baseline and pilot readings are recorded.', 'gauge')
    : `<table class="data"><thead><tr><th>Location</th><th>Method</th><th class="num">Baseline L/day</th><th class="num">Pilot L/day</th><th class="num">Saved L/day</th><th class="num">Reduction</th><th>Evidence</th></tr></thead><tbody>
      ${bvp.map((r) => `<tr><td>${esc(r.location_name)} ${demoBadge(r.includes_demo)}</td><td>${esc(r.measurement_method)}</td>
        <td class="num">${fmtNum(r.baseline_avg_daily_l, 1)}</td><td class="num">${fmtNum(r.pilot_avg_daily_l, 1)}</td>
        <td class="num">${fmtNum(r.saved_per_day_l, 1)}</td><td class="num">${r.reduction_pct === null ? 'N/A' : `${fmtNum(r.reduction_pct, 1)}%`}</td>
        <td>${r.meets_minimum_days ? '<span class="badge badge--verified">≥3 days each</span>' : `<span class="badge">${r.baseline_days}+${r.pilot_days} days</span>`}</td></tr>`).join('')}
      </tbody></table>`;

  // Recent activity
  const events = [
    ...reports.map((r) => ({ at: r.submitted_at, ic: 'alert', demo: r.is_demo,
      text: `Report <span class="mono">${esc(r.reference_number)}</span>: ${esc(label(ISSUE_TYPES, r.issue_type))} at ${esc(data.locName.get(r.location_id) ?? (r.location_note || 'unlisted location'))} · ${esc(label(REPORT_STATUSES, r.status))}` })),
    ...actions.map((a) => ({ at: a.updated_at ?? a.created_at, ic: 'wrench', demo: a.is_demo,
      text: `Action ${esc(label(ACTION_STATUSES, a.status).toLowerCase())}: ${esc(a.action_description)}` })),
    ...readings.map((w) => ({ at: w.created_at ?? w.reading_date, ic: 'gauge', demo: w.is_demo,
      text: `${esc(label(PHASES, w.phase))} reading at ${esc(data.locName.get(w.location_id) ?? 'a location')} for ${esc(fmtDate(w.reading_date))}` })),
    ...pledges.map((p) => ({ at: p.submitted_at, ic: 'heart', demo: p.is_demo, text: `New pledge: ${esc(label(COMMITMENTS, p.commitment_type))}` })),
    ...feedback.map((x) => ({ at: x.submitted_at, ic: 'message', demo: x.is_demo, text: `Feedback received (${esc(label(FEEDBACK_CATEGORIES, x.category))})` })),
  ].filter((e) => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
  $('dash-activity').innerHTML = events.length
    ? events.map((e) => `<li>${icon(e.ic, 18)}<span>${e.text} ${demoBadge(e.demo)}</span><span class="when">${esc(fmtDateTime(e.at))}</span></li>`).join('')
    : `<li>${emptyHTML('No activity in this selection', '', 'info')}</li>`;

  if (!mapDrawn) {
    mapDrawn = true;
    try {
      const rows = await db.publicHotspots(demo);
      if (!rows.length) $('dash-map').outerHTML = `<div class="placeholder">${emptyHTML('No mapped hotspots yet', 'Markers appear when locations are added with coordinates.', 'pin')}</div>`;
      else { await plotHotspots($('dash-map'), rows, { center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM }); $('dash-legend').innerHTML = MAP_LEGEND; }
    } catch (err) {
      console.error(err);
      $('dash-map').innerHTML = errorHTML('The map could not be loaded (map tiles need an internet connection).');
    }
  }
}

try {
  await load();
  await draw();
} catch (err) {
  console.error(err);
  $('dash-stats').innerHTML = errorHTML(`The dashboard could not be loaded. ${err?.message ?? ''}`);
}
let t;
$('dash-filters').addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 150); });
$('dash-filters').addEventListener('reset', () => setTimeout(draw, 0));
$('dash-filters').addEventListener('submit', (e) => e.preventDefault());
db.onChange(async () => { await load(); await draw(); });
