// Reports & Analytics: four saved reports computed from the local records (lib/calc.js).
import { esc, icon, fmtDate, demoBadge, statusBadge, panel, tableHTML } from '../ui.js';
import { emptyHTML, errorHTML, downloadCSV, fmtNum, fmtGHS } from '../../lib/dom.js';
import { REPORT_STATUSES, ACTION_STATUSES, PHASES, CHART_COLORS, label } from '../../lib/labels.js';
import { renderChart } from '../../components/charts.js';

const REPORTS = [
  {
    key: 'issues_by_location_status', title: '1. Water issues by location and status', icon: 'pin',
    sql: 'report_issues_by_location_status',
    columns: [
      { label: 'Location', value: (r) => `${esc(r.location_name)} ${demoBadge(r.includes_demo)}`, csv: 'location_name' },
      { label: 'Status', value: (r) => statusBadge(REPORT_STATUSES, r.status), csv: (r) => label(REPORT_STATUSES, r.status) },
      { label: 'Issues', num: true, value: (r) => fmtNum(r.issue_count), csv: 'issue_count' },
      { label: 'High/critical', num: true, value: (r) => fmtNum(r.high_severity_count), csv: 'high_severity_count' },
      { label: 'First reported', value: (r) => esc(fmtDate(r.first_reported)), csv: 'first_reported' },
      { label: 'Last reported', value: (r) => esc(fmtDate(r.last_reported)), csv: 'last_reported' },
    ],
    chart: (rows) => {
      const locs = [...new Set(rows.map((r) => r.location_name))];
      const statuses = Object.keys(REPORT_STATUSES).filter((s) => rows.some((r) => r.status === s));
      return { type: 'bar', stacked: true, horizontal: true, labels: locs,
        datasets: statuses.map((s, i) => ({ label: REPORT_STATUSES[s], color: CHART_COLORS[i % CHART_COLORS.length],
          data: locs.map((l) => rows.find((r) => r.location_name === l && r.status === s)?.issue_count ?? 0) })) };
    },
  },
  {
    key: 'daily_consumption', title: '2. Daily water consumption by location (litres)', icon: 'gauge',
    sql: 'report_daily_consumption',
    columns: [
      { label: 'Date', value: (r) => esc(fmtDate(r.reading_date)), csv: 'reading_date' },
      { label: 'Location', value: (r) => `${esc(r.location_name)} ${demoBadge(r.includes_demo)}`, csv: 'location_name' },
      { label: 'Phase', value: (r) => esc(label(PHASES, r.phase)), csv: 'phase' },
      { label: 'Method', value: (r) => esc(r.measurement_method), csv: 'measurement_method' },
      { label: 'Litres', num: true, value: (r) => fmtNum(r.consumption_litres, 1), csv: 'consumption_litres' },
    ],
    chart: (rows) => {
      const dates = [...new Set(rows.map((r) => r.reading_date))].sort();
      const locs = [...new Set(rows.map((r) => r.location_name))];
      return { type: 'line', labels: dates.map(fmtDate), yTitle: 'Litres',
        datasets: locs.map((l, i) => ({ label: l, color: CHART_COLORS[i % CHART_COLORS.length], spanGaps: false, fill: false,
          data: dates.map((d) => rows.filter((r) => r.reading_date === d && r.location_name === l).reduce((s, r) => s + Number(r.consumption_litres), 0) || null) })) };
    },
  },
  {
    key: 'baseline_vs_pilot', title: '3. Baseline versus pilot consumption', icon: 'target',
    sql: 'report_baseline_vs_pilot',
    note: 'Compared only within the same location and measurement method. Averages are litres per measured day. Reduction is blank when the baseline is zero or a phase is missing. Groups with fewer than 3 days in either phase are flagged and should not be presented as findings.',
    columns: [
      { label: 'Location', value: (r) => `${esc(r.location_name)} ${demoBadge(r.includes_demo)}`, csv: 'location_name' },
      { label: 'Method', value: (r) => esc(r.measurement_method), csv: 'measurement_method' },
      { label: 'Baseline L/day', num: true, value: (r) => fmtNum(r.baseline_avg_daily_l, 1), csv: 'baseline_avg_daily_l' },
      { label: 'Days', num: true, value: (r) => fmtNum(r.baseline_days), csv: 'baseline_days' },
      { label: 'Pilot L/day', num: true, value: (r) => fmtNum(r.pilot_avg_daily_l, 1), csv: 'pilot_avg_daily_l' },
      { label: 'Days', num: true, value: (r) => fmtNum(r.pilot_days), csv: 'pilot_days' },
      { label: 'Saved L/day', num: true, value: (r) => fmtNum(r.saved_per_day_l, 1), csv: 'saved_per_day_l' },
      { label: 'Reduction', num: true, value: (r) => (r.reduction_pct === null || r.reduction_pct === undefined ? 'N/A' : `${fmtNum(r.reduction_pct, 1)}%`), csv: 'reduction_pct' },
      { label: 'Evidence', value: (r) => (r.meets_minimum_days ? '<span class="badge badge--verified">≥3 days each</span>' : '<span class="badge badge--demo">Insufficient days</span>'), csv: (r) => (r.meets_minimum_days ? 'meets minimum' : 'insufficient days') },
    ],
    chart: (rows) => ({ type: 'bar', yTitle: 'Litres per day', labels: rows.map((r) => `${r.location_name} (${r.measurement_method})`),
      datasets: [
        { label: 'Baseline avg/day', color: '#14532D', data: rows.map((r) => r.baseline_avg_daily_l) },
        { label: 'Pilot avg/day', color: '#38BDF8', data: rows.map((r) => r.pilot_avg_daily_l) },
      ] }),
  },
  {
    key: 'conservation_actions', title: '4. Conservation actions by status and team', icon: 'wrench',
    sql: 'report_conservation_actions',
    columns: [
      { label: 'Status', value: (r) => statusBadge(ACTION_STATUSES, r.status), csv: (r) => label(ACTION_STATUSES, r.status) },
      { label: 'Responsible team', value: (r) => `${esc(r.responsible_team)} ${demoBadge(r.includes_demo)}`, csv: 'responsible_team' },
      { label: 'Actions', num: true, value: (r) => fmtNum(r.action_count), csv: 'action_count' },
      { label: 'Linked to reports', num: true, value: (r) => fmtNum(r.linked_to_reports), csv: 'linked_to_reports' },
      { label: 'Estimated (GH₵)', num: true, value: (r) => esc(fmtGHS(r.estimated_cost_ghs)), csv: 'estimated_cost_ghs' },
      { label: 'Actual (GH₵)', num: true, value: (r) => esc(fmtGHS(r.actual_cost_ghs)), csv: 'actual_cost_ghs' },
    ],
    chart: (rows) => {
      const st = Object.keys(ACTION_STATUSES).filter((s) => rows.some((r) => r.status === s));
      return { type: 'doughnut', labels: st.map((s) => ACTION_STATUSES[s]),
        datasets: [{ label: 'Actions', backgroundColor: CHART_COLORS, borderColor: '#fff', borderWidth: 2,
          data: st.map((s) => rows.filter((r) => r.status === s).reduce((n, r) => n + Number(r.action_count), 0)) }] };
    },
  },
];

export async function render({ db, el }) {
  el.innerHTML = `
    <div class="toolbar no-print" style="justify-content:space-between">
      <p class="muted" style="margin:0">Four saved reports, calculated from the records stored on this device.</p>
      <button type="button" class="btn btn--ghost btn--sm" data-print>${icon('download', 16)}Print / save all as PDF</button>
    </div>
    <p class="small muted" style="margin:0">Generated ${esc(new Date().toLocaleString('en-GH'))}. Rows marked DEMO are demonstration records, not research findings.</p>
    ${REPORTS.map((r) => panel(r.title, `<div class="panel__body">
        ${r.note ? `<p class="small muted" style="margin-top:0">${esc(r.note)}</p>` : ''}
        <div class="chart-box" data-chart="${r.key}" data-label="${esc(r.title)}"></div></div>
        <div data-table="${r.key}">${'<div class="state state--loading"><span class="spinner"></span>Loading…</div>'}</div>`,
      { iconName: r.icon, tools: `<button type="button" class="btn btn--ghost btn--sm" data-csv="${r.key}">${icon('download', 16)}CSV</button>` })).join('')}`;
  el.querySelector('[data-print]').addEventListener('click', () => window.print());

  await Promise.all(REPORTS.map(async (r) => {
    const tableHost = el.querySelector(`[data-table="${r.key}"]`);
    const chartHost = el.querySelector(`[data-chart="${r.key}"]`);
    let rows;
    try { rows = await db.report(r.key); }
    catch (err) { tableHost.innerHTML = errorHTML(`Report could not be generated: ${err.message}`); chartHost.remove(); return; }
    el.querySelector(`[data-csv="${r.key}"]`).addEventListener('click', () => downloadCSV(`${r.sql}.csv`, rows,
      r.columns.map((c) => ({ label: c.label, ...(typeof c.csv === 'function' ? { value: c.csv } : { key: c.csv }) }))
        .concat([{ label: 'Includes demo data', value: (x) => (x.includes_demo ? 'yes' : 'no') }])));
    if (!rows.length) {
      tableHost.innerHTML = emptyHTML('No data for this report yet', '', 'chart');
      chartHost.remove();
      return;
    }
    tableHost.innerHTML = tableHTML({ caption: r.title, columns: r.columns, rows });
    await renderChart(chartHost, r.chart(rows));
  }));
}
