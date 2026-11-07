import { esc, icon, fmtDateTime, statusBadge, demoBadge, panel, tableHTML, actionBtn, onActions, selectHTML } from '../ui.js';
import { emptyHTML, downloadCSV, toast, confirmDialog, openModal } from '../../lib/dom.js';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, options, label } from '../../lib/labels.js';
import { friendlyError } from '../../lib/validate.js';

export async function render({ db, el, can, refreshCounts }) {
  const items = await db.list('feedback', { order: ['submitted_at', 'desc'] });
  const f = { status: '', category: '', q: '', from: '', to: '' };
  let visible = [];
  el.innerHTML = panel('Feedback', '<div data-table></div>', {
    iconName: 'message',
    tools: `<input type="search" name="q" placeholder="Search" aria-label="Search">
      <label class="date-filter">From <input type="date" name="from" aria-label="From date"></label>
      <label class="date-filter">To <input type="date" name="to" aria-label="To date"></label>
      ${selectHTML('status', options(FEEDBACK_STATUSES), '', 'All statuses', 'Filter by status')}
      ${selectHTML('category', options(FEEDBACK_CATEGORIES), '', 'All categories', 'Filter by category')}
      <button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>`,
  });
  const host = el.querySelector('[data-table]');
  const draw = () => {
    visible = items.filter((x) => (!f.status || x.status === f.status) && (!f.category || x.category === f.category) && (!f.q || [x.message, x.contact_name, x.contact_email].some((s) => String(s ?? '').toLowerCase().includes(f.q.trim().toLowerCase()))) && (!f.from || String(x.submitted_at).slice(0, 10) >= f.from) && (!f.to || String(x.submitted_at).slice(0, 10) <= f.to));
    host.innerHTML = visible.length ? tableHTML({
      caption: 'Feedback messages',
      columns: [
        { label: 'Received', value: (x) => `${esc(fmtDateTime(x.submitted_at))} ${demoBadge(x.is_demo)}` },
        { label: 'Category', value: (x) => esc(label(FEEDBACK_CATEGORIES, x.category)) },
        { label: 'Message', value: (x) => `<span class="truncate" style="display:block">${esc(x.message)}</span>` },
        { label: 'Contact', value: (x) => esc([x.contact_name, x.contact_email].filter(Boolean).join(' · ') || 'N/A') },
        { label: 'Status', value: (x) => statusBadge(FEEDBACK_STATUSES, x.status) },
      ],
      rows: visible,
      actions: (x, i) => `${actionBtn('open', i, 'edit', 'Open message')}${can.admin ? actionBtn('del', i, 'trash', 'Delete message', true) : ''}`,
    }) : emptyHTML('No feedback', 'Messages from the public Feedback page appear here.', 'message');
  };
  el.querySelector('.toolbar').addEventListener('input', (e) => { if (e.target.name in f) { f[e.target.name] = e.target.value; draw(); } });
  el.querySelector('[data-export]').addEventListener('click', () => downloadCSV('feedback.csv', visible, [
    { label: 'Received', key: 'submitted_at' }, { label: 'Category', value: (x) => label(FEEDBACK_CATEGORIES, x.category) },
    { label: 'Message', key: 'message' }, { label: 'Name', key: 'contact_name' }, { label: 'Email', key: 'contact_email' },
    { label: 'Status', key: 'status' }, { label: 'Demo record', value: (x) => (x.is_demo ? 'yes' : 'no') },
  ]));

  async function setStatus(x, status) {
    try { Object.assign(x, await db.update('feedback', x.id, { status })); draw(); refreshCounts(); }
    catch (err) { toast(friendlyError(err), 'error'); }
  }
  onActions(host, {
    open: (i) => {
      const x = visible[i];
      const m = openModal({ title: label(FEEDBACK_CATEGORIES, x.category), body: `
        <dl class="meta" style="margin:0 0 16px"><dt>Received</dt><dd>${esc(fmtDateTime(x.submitted_at))}</dd>
          <dt>Contact</dt><dd>${esc([x.contact_name, x.contact_email].filter(Boolean).join(' · ') || 'Not provided')}</dd>
          <dt>Status</dt><dd>${statusBadge(FEEDBACK_STATUSES, x.status)}</dd></dl>
        <p class="prose-block">${esc(x.message)}</p>
        ${can.write ? `<div class="form-actions">${Object.entries(FEEDBACK_STATUSES).filter(([k]) => k !== x.status)
          .map(([k, t]) => `<button type="button" class="btn ${k === 'reviewed' ? '' : 'btn--ghost'}" data-set="${k}">Mark ${esc(t.toLowerCase())}</button>`).join('')}</div>` : ''}` });
      m.el.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => { m.close(); setStatus(x, b.dataset.set); }));
      if (can.write && x.status === 'new') setStatus(x, 'reviewed');
    },
    del: async (i) => {
      if (!(await confirmDialog('Delete this message permanently?', { confirmLabel: 'Delete', danger: true }))) return;
      try { await db.remove('feedback', visible[i].id); items.splice(items.indexOf(visible[i]), 1); draw(); refreshCounts(); toast('Message deleted', 'success'); }
      catch (err) { toast(friendlyError(err), 'error'); }
    },
  });
  draw();
}
