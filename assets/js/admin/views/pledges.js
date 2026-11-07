import { esc, icon, fmtDateTime, demoBadge, panel, tableHTML, actionBtn, onActions, selectHTML } from '../ui.js';
import { emptyHTML, downloadCSV, toast, confirmDialog } from '../../lib/dom.js';
import { COMMITMENTS, options, label } from '../../lib/labels.js';
import { friendlyError } from '../../lib/validate.js';
import { renderChart } from '../../components/charts.js';

export async function render({ db, el, can }) {
  const pledges = await db.list('pledges', { order: ['submitted_at', 'desc'] });
  const f = { type: '', q: '', from: '', to: '' };
  let visible = [];
  el.innerHTML = `
    <div class="notice">${icon('shield', 18)}<p>Names, emails and comments are personal data under Ghana's Data Protection Act, 2012 (Act 843). Use them only for this project and delete them when the project ends.</p></div>
    ${panel('Pledges by commitment', '<div class="panel__body"><div class="chart-box" data-chart data-label="Pledges by commitment"></div></div>', { iconName: 'chart' })}
    ${panel('Pledges received', '<div data-table></div>', {
      iconName: 'heart',
      tools: `<input type="search" name="q" placeholder="Search" aria-label="Search">
      <label class="date-filter">From <input type="date" name="from" aria-label="From date"></label>
      <label class="date-filter">To <input type="date" name="to" aria-label="To date"></label>
      ${selectHTML('type', options(COMMITMENTS), '', 'All commitments', 'Filter by commitment')}
        <button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>`,
    })}`;
  const host = el.querySelector('[data-table]');
  const draw = () => {
    visible = pledges.filter((p) => (!f.type || p.commitment_type === f.type) && (!f.q || [p.full_name, p.email, p.department, p.comments].some((s) => String(s ?? '').toLowerCase().includes(f.q.trim().toLowerCase()))) && (!f.from || String(p.submitted_at).slice(0, 10) >= f.from) && (!f.to || String(p.submitted_at).slice(0, 10) <= f.to));
    host.innerHTML = visible.length ? tableHTML({
      caption: 'Pledges',
      columns: [
        { label: 'Submitted', value: (p) => `${esc(fmtDateTime(p.submitted_at))} ${demoBadge(p.is_demo)}` },
        { label: 'Commitment', value: (p) => esc(label(COMMITMENTS, p.commitment_type)) },
        { label: 'Name', value: (p) => esc(p.full_name || 'N/A') },
        { label: 'Email', value: (p) => esc(p.email || 'N/A') },
        { label: 'Department / programme', value: (p) => esc(p.department || 'N/A') },
        { label: 'Comments', value: (p) => `<span class="truncate" style="display:block">${esc(p.comments || 'N/A')}</span>` },
      ],
      rows: visible,
      actions: can.admin ? (p, i) => actionBtn('del', i, 'trash', 'Delete pledge', true) : null,
    }) + `<p class="small muted" style="padding:10px 20px;margin:0">${visible.length} pledge(s)</p>`
      : emptyHTML('No pledges yet', 'Pledges from the public Feedback page appear here.', 'heart');
  };
  el.querySelector('.toolbar').addEventListener('input', (e) => { if (e.target.name in f) { f[e.target.name] = e.target.value; draw(); } });
  el.querySelector('[data-export]').addEventListener('click', () => downloadCSV('pledges.csv', visible, [
    { label: 'Submitted', key: 'submitted_at' }, { label: 'Commitment', value: (p) => label(COMMITMENTS, p.commitment_type) },
    { label: 'Name', key: 'full_name' }, { label: 'Email', key: 'email' }, { label: 'Department', key: 'department' },
    { label: 'Comments', key: 'comments' }, { label: 'Old record (not fieldwork)', value: (p) => (p.is_demo ? 'yes' : 'no') },
  ]));
  onActions(host, {
    del: async (i) => {
      if (!(await confirmDialog('Delete this pledge permanently?', { confirmLabel: 'Delete', danger: true }))) return;
      try { await db.remove('pledges', visible[i].id); pledges.splice(pledges.indexOf(visible[i]), 1); draw(); toast('Pledge deleted', 'success'); }
      catch (err) { toast(friendlyError(err), 'error'); }
    },
  });
  draw();
  const chart = el.querySelector('[data-chart]');
  if (!pledges.length) chart.innerHTML = emptyHTML('No pledges yet', '', 'chart');
  else await renderChart(chart, { type: 'bar', horizontal: true, labels: Object.values(COMMITMENTS).map((t) => t.replace(/^I will /, '').replace(/\.$/, '')),
    datasets: [{ label: 'Pledges', data: Object.keys(COMMITMENTS).map((k) => pledges.filter((p) => p.commitment_type === k).length), color: '#15803D' }] });
}
