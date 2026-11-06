import { esc, icon, fmtDateTime, statusBadge, sevBadge, demoBadge, panel, tableHTML } from '../ui.js';
import { fmtNum, emptyHTML } from '../../lib/dom.js';
import { REPORT_STATUSES, SEVERITIES, ISSUE_TYPES, CHART_COLORS, label } from '../../lib/labels.js';
import { renderChart } from '../../components/charts.js';

const PENDING = ['submitted', 'under_review'];
const ACTIVE = ['assigned', 'in_progress'];
const DONE = ['resolved', 'closed'];

export async function render({ db, el, navigate }) {
  const [reports, readings, actions, pledges, feedback, locations] = await Promise.all([
    db.list('water_reports', { order: ['submitted_at', 'desc'] }),
    db.list('water_readings'),
    db.list('conservation_actions'),
    db.list('pledges'),
    db.list('feedback'),
    db.list('campus_locations'),
  ]);
  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const n = (arr, set) => arr.filter((r) => set.includes(r.status)).length;
  const kpi = (ic, t, v, note = '', href = '') => `<a class="stat" ${href ? `href="#/${href}"` : ''} style="text-decoration:none;color:inherit">
    <span class="stat__label">${icon(ic, 16)}${esc(t)}</span><span class="stat__value">${fmtNum(v)}</span>${note ? `<span class="stat__note">${esc(note)}</span>` : ''}</a>`;
  const demoCount = [reports, readings, actions, pledges, feedback].reduce((s, a) => s + a.filter((r) => r.is_demo).length, 0);

  el.innerHTML = `
    ${demoCount ? `<div class="notice notice--demo">${icon('info', 18)}<p><strong>${demoCount} demonstration records</strong> are in the database. Delete them in <a href="#/settings">Settings</a> before publishing real research.</p></div>` : ''}
    <div class="kpis">
      ${kpi('clipboard', 'Total water reports', reports.length, '', 'reports')}
      ${kpi('alert', 'Pending reports', n(reports, PENDING), 'Submitted or under review', 'reports')}
      ${kpi('route', 'Issues in progress', n(reports, ACTIVE), 'Assigned or in progress', 'reports')}
      ${kpi('checkCircle', 'Resolved issues', n(reports, DONE), 'Resolved or closed', 'reports')}
      ${kpi('gauge', 'Water readings', readings.length, '', 'readings')}
      ${kpi('wrench', 'Conservation actions', actions.length, `${actions.filter((a) => ['completed', 'verified'].includes(a.status)).length} completed`, 'actions')}
      ${kpi('heart', 'Pledges received', pledges.length, '', 'pledges')}
      ${kpi('message', 'Feedback messages', feedback.length, `${feedback.filter((f) => f.status === 'new').length} unread`, 'feedback')}
    </div>
    <div class="cols-2">
      ${panel('Reports by status', '<div class="panel__body"><div class="chart-box" id="ov-status" data-label="Reports by status"></div></div>', { iconName: 'chart' })}
      ${panel('Open issues by severity', '<div class="panel__body"><div class="chart-box" id="ov-sev" data-label="Open issues by severity"></div></div>', { iconName: 'alert' })}
    </div>
    ${panel('Latest reports', reports.length ? tableHTML({
      caption: 'Latest water reports',
      columns: [
        { label: 'Reference', value: (r) => `<span class="mono">${esc(r.reference_number)}</span> ${demoBadge(r.is_demo)}` },
        { label: 'Submitted', value: (r) => esc(fmtDateTime(r.submitted_at)) },
        { label: 'Location', value: (r) => esc(locName.get(r.location_id) ?? r.location_note ?? 'N/A') },
        { label: 'Problem', value: (r) => esc(label(ISSUE_TYPES, r.issue_type)) },
        { label: 'Severity', value: (r) => sevBadge(SEVERITIES, r.severity) },
        { label: 'Status', value: (r) => statusBadge(REPORT_STATUSES, r.status) },
      ],
      rows: reports.slice(0, 6),
    }) : emptyHTML('No reports yet', 'Reports submitted on the public site appear here.', 'clipboard'),
    { tools: '<a class="btn btn--ghost btn--sm" href="#/reports">View all</a>', iconName: 'clipboard' })}`;

  el.querySelectorAll('tbody tr').forEach((tr) => {
    tr.classList.add('is-clickable');
    tr.addEventListener('click', () => navigate(`reports?ref=${encodeURIComponent(reports[Number(tr.dataset.row)].reference_number)}`));
  });

  {
    const byStatus = Object.keys(REPORT_STATUSES).map((k) => reports.filter((r) => r.status === k).length);
    const status = el.querySelector('#ov-status');
    if (!reports.length) status.innerHTML = emptyHTML('No data yet', '', 'chart');
    else await renderChart(status, { type: 'doughnut', labels: Object.values(REPORT_STATUSES),
      datasets: [{ label: 'Reports', data: byStatus, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: '#fff' }] });
    const open = reports.filter((r) => !DONE.includes(r.status));
    const sev = el.querySelector('#ov-sev');
    if (!open.length) sev.innerHTML = emptyHTML('No open issues', '', 'checkCircle');
    else await renderChart(sev, { type: 'bar', labels: Object.values(SEVERITIES),
      datasets: [{ label: 'Open issues', data: Object.keys(SEVERITIES).map((k) => open.filter((r) => r.severity === k).length),
        backgroundColor: ['#38BDF8', '#0891B2', '#D97706', '#B91C1C'] }] });
  }
}
