import { initLayout } from '../layout.js';
import { CONFIG } from '../data/db.js';
import { esc, fmtNum, emptyHTML, errorHTML, demoBadge } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { reportBaselineVsPilot } from '../lib/calc.js';
import { ISSUE_TYPES, SEVERITIES, REPORT_STATUSES, SEVERITY_COLORS, CHART_COLORS } from '../lib/labels.js';
import { loadPublicData, renderImpactStats, renderStatsError } from '../components/stats.js';
import { renderChart } from '../components/charts.js';
import { plotHotspots, MAP_LEGEND } from '../components/map.js';

const { db } = await initLayout();
const $ = (id) => document.getElementById(id);

let data;
try {
  data = await loadPublicData(db);
  renderImpactStats($('dash-stats'), $('dash-notice'), data);
} catch (err) {
  console.error(err);
  renderStatsError($('dash-stats'), err);
}

if (data) {
  const { stats, readings, locations, demo } = data;
  const mini = (ic, t, v) => `<div class="stat"><span class="stat__label">${icon(ic, 16)}${esc(t)}</span><span class="stat__value">${v}</span></div>`;
  $('dash-stats-2').innerHTML = [
    mini('route', 'Open issues', fmtNum(stats.reports_open)),
    mini('wrench', 'Actions completed', fmtNum(stats.actions_completed)),
    mini('gauge', 'Water readings', fmtNum(readings.length)),
    mini('heart', 'Pledges received', fmtNum(stats.pledges_total)),
  ].join('');

  const series = (obj, map) => Object.keys(map).filter((k) => obj[k]);
  if (!stats.reports_total) {
    ['c-status', 'c-severity', 'c-type'].forEach((id) => ($(id).innerHTML = emptyHTML('No reports yet', '', 'chart')));
  } else {
    const st = series(stats.by_status, REPORT_STATUSES);
    renderChart($('c-status'), { type: 'doughnut', labels: st.map((k) => REPORT_STATUSES[k]),
      datasets: [{ label: 'Reports', data: st.map((k) => stats.by_status[k]), colors: CHART_COLORS, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: '#fff' }] });
    const sv = series(stats.by_severity, SEVERITIES);
    renderChart($('c-severity'), { type: 'bar', labels: sv.map((k) => SEVERITIES[k]),
      datasets: [{ label: 'Reports', data: sv.map((k) => stats.by_severity[k]), backgroundColor: sv.map((k) => SEVERITY_COLORS[k]) }] });
    const ty = series(stats.by_issue_type, ISSUE_TYPES);
    renderChart($('c-type'), { type: 'bar', horizontal: true, labels: ty.map((k) => ISSUE_TYPES[k]),
      datasets: [{ label: 'Reports', data: ty.map((k) => stats.by_issue_type[k]), color: '#0891B2' }] });
  }

  const bvp = reportBaselineVsPilot(readings, locations);
  $('dash-bvp').innerHTML = !bvp.length ? emptyHTML('Awaiting baseline data', 'Comparisons appear once baseline and pilot readings are recorded.', 'gauge')
    : `<table class="data"><thead><tr><th>Location</th><th>Method</th><th class="num">Baseline L/day</th><th class="num">Pilot L/day</th><th class="num">Saved L/day</th><th class="num">Reduction</th><th>Evidence</th></tr></thead><tbody>
      ${bvp.map((r) => `<tr><td>${esc(r.location_name)} ${demoBadge(r.includes_demo)}</td><td>${esc(r.measurement_method)}</td>
        <td class="num">${fmtNum(r.baseline_avg_daily_l, 1)}</td><td class="num">${fmtNum(r.pilot_avg_daily_l, 1)}</td>
        <td class="num">${fmtNum(r.saved_per_day_l, 1)}</td><td class="num">${r.reduction_pct === null ? 'N/A' : `${fmtNum(r.reduction_pct, 1)}%`}</td>
        <td>${r.meets_minimum_days ? '<span class="badge badge--verified">≥3 days each</span>' : `<span class="badge">${r.baseline_days}+${r.pilot_days} days</span>`}</td></tr>`).join('')}
      </tbody></table>`;

  try {
    const rows = await db.publicHotspots(demo);
    if (!rows.length) $('dash-map').outerHTML = `<div class="placeholder">${emptyHTML('No mapped hotspots yet', 'Markers appear when reports are linked to locations with verified coordinates.', 'pin')}</div>`;
    else { await plotHotspots($('dash-map'), rows, { center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM }); $('dash-legend').innerHTML = MAP_LEGEND; }
  } catch (err) {
    console.error(err);
    $('dash-map').innerHTML = errorHTML('The map could not be loaded.');
  }
}
