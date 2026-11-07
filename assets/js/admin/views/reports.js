// Water Reports: filter, search, review, status workflow, assignment, CSV.
import { esc, icon, fmtDateTime, statusBadge, sevBadge, demoBadge, panel, tableHTML, actionBtn, onActions,
  selectHTML, formModal, readOnlyNote, toLocalInput } from '../ui.js';
import { emptyHTML, downloadCSV, toast, confirmDialog, openModal } from '../../lib/dom.js';
import { REPORT_STATUSES, SEVERITIES, ISSUE_TYPES, options, label } from '../../lib/labels.js';
import { friendlyError, rules } from '../../lib/validate.js';
import { actionFields } from './actions.js';

const TEAMS = ['Estates/Facilities', 'Estates/Facilities, Plumbing', "Students' Representative Council", 'Project team'];

export async function render(ctx) {
  const { db, el, can, refreshCounts } = ctx;
  const [reports, locations] = await Promise.all([
    db.list('water_reports', { order: ['submitted_at', 'desc'] }),
    db.list('campus_locations', { order: ['name', 'asc'] }),
  ]);
  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const where = (r) => locName.get(r.location_id) ?? (r.location_note ? `Not listed: ${r.location_note}` : 'N/A');
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const f = { q: params.get('ref') ?? '', status: params.get('status') ?? '', severity: '', issue: '', loc: '', from: '', to: '' };
  const day = (iso) => String(iso ?? '').slice(0, 10);

  el.innerHTML = `${can.write ? '' : readOnlyNote()}${panel(`Water reports`, '<div data-table></div>', {
    iconName: 'clipboard',
    tools: `<input type="search" name="q" placeholder="Search reference, location or description" aria-label="Search reports" value="${esc(f.q)}">
      ${selectHTML('status', options(REPORT_STATUSES), f.status, 'All statuses', 'Filter by status')}
      ${selectHTML('severity', options(SEVERITIES), '', 'All severities', 'Filter by severity')}
      ${selectHTML('issue', options(ISSUE_TYPES), '', 'All problem types', 'Filter by problem type')}
      ${selectHTML('loc', locations.map((l) => ({ value: l.id, text: l.name })), '', 'All locations', 'Filter by location')}
      <label class="date-filter">From <input type="date" name="from" aria-label="Submitted from"></label>
      <label class="date-filter">To <input type="date" name="to" aria-label="Submitted to"></label>
      <button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>
      ${can.write ? `<button type="button" class="btn btn--sm" data-add>${icon('plus', 16)}Add report</button>` : ''}`,
  })}`;
  const tableHost = el.querySelector('[data-table]');
  let visible = [];

  const draw = () => {
    const q = f.q.trim().toLowerCase();
    visible = reports.filter((r) => (!f.status || r.status === f.status) && (!f.severity || r.severity === f.severity)
      && (!f.issue || r.issue_type === f.issue) && (!f.loc || r.location_id === f.loc)
      && (!f.from || day(r.submitted_at) >= f.from) && (!f.to || day(r.submitted_at) <= f.to)
      && (!q || [r.reference_number, where(r), r.description, r.assigned_to].some((s) => String(s ?? '').toLowerCase().includes(q))));
    tableHost.innerHTML = visible.length ? tableHTML({
      caption: 'Water reports',
      columns: [
        { label: 'Reference', value: (r) => `<span class="mono">${esc(r.reference_number)}</span> ${demoBadge(r.is_demo)}` },
        { label: 'Submitted', value: (r) => esc(fmtDateTime(r.submitted_at)) },
        { label: 'Location', value: (r) => esc(where(r)) },
        { label: 'Problem', value: (r) => esc(label(ISSUE_TYPES, r.issue_type)) },
        { label: 'Severity', value: (r) => sevBadge(SEVERITIES, r.severity) },
        { label: 'Status', value: (r) => statusBadge(REPORT_STATUSES, r.status) },
        { label: 'Assigned to', value: (r) => esc(r.assigned_to || 'N/A') },
      ],
      rows: visible,
      actions: (r, i) => actionBtn('open', i, 'edit', `Open ${r.reference_number}`),
    }) + `<p class="small muted" style="padding:10px 20px;margin:0">${visible.length} of ${reports.length} report(s)</p>`
      : emptyHTML(reports.length ? 'No reports match these filters' : 'No reports yet',
        reports.length ? 'Clear the search or filters to see more.' : 'Reports submitted on the public site appear here.', 'clipboard');
    tableHost.querySelectorAll('tbody tr').forEach((tr) => {
      tr.classList.add('is-clickable');
      tr.addEventListener('click', (e) => { if (!e.target.closest('button')) openReport(visible[Number(tr.dataset.row)]); });
    });
  };

  el.querySelector('.toolbar').addEventListener('input', (e) => {
    if (!e.target.name || !(e.target.name in f)) return;
    f[e.target.name] = e.target.value;
    draw();
  });
  el.querySelector('[data-export]').addEventListener('click', () => {
    downloadCSV(`waterwatch-reports-${new Date().toISOString().slice(0, 10)}.csv`, visible, [
      { label: 'Reference', key: 'reference_number' }, { label: 'Submitted', key: 'submitted_at' },
      { label: 'Observed', key: 'observed_at' }, { label: 'Location', value: where },
      { label: 'Problem type', value: (r) => label(ISSUE_TYPES, r.issue_type) },
      { label: 'Severity', value: (r) => label(SEVERITIES, r.severity) },
      { label: 'Status', value: (r) => label(REPORT_STATUSES, r.status) },
      { label: 'Assigned to', key: 'assigned_to' }, { label: 'Description', key: 'description' },
      { label: 'Anonymous', value: (r) => (r.is_anonymous ? 'yes' : 'no') },
      { label: 'Demo record', value: (r) => (r.is_demo ? 'yes' : 'no') },
    ]);
  });
  onActions(tableHost, { open: (i) => openReport(visible[i]) });

  // Add or edit the reported details (admin-entered reports, e.g. from a phone call or walk-through).
  const detailFields = (isNew) => [
    { name: 'issue_type', label: 'Problem category', type: 'select', required: true, options: options(ISSUE_TYPES), half: true },
    { name: 'severity', label: 'Severity', type: 'select', required: true, options: options(SEVERITIES), half: true },
    { name: 'location_id', label: 'Campus location', type: 'select', options: locations.map((l) => ({ value: l.id, text: l.name })), nullable: true, placeholder: 'Not listed' , half: true },
    { name: 'location_note', label: 'Location note', maxLength: 200, optional: true, half: true, hint: 'Use when the location is not listed.' },
    { name: 'description', label: 'Description', type: 'textarea', required: true, minLength: 10, maxLength: 2000 },
    { name: 'observed_at', label: 'Date and time observed', type: 'datetime-local', optional: true, half: true, validate: rules.notFuture() },
    ...(isNew ? [{ name: 'status', label: 'Status', type: 'select', required: true, options: options(REPORT_STATUSES), half: true },
      { name: 'assigned_to', label: 'Assigned to', maxLength: 160, list: TEAMS, optional: true }] : []),
  ];
  const toRow = (v) => ({ ...v, observed_at: v.observed_at ? new Date(v.observed_at).toISOString() : null, location_id: v.location_id || null });
  el.querySelector('[data-add]')?.addEventListener('click', () => formModal({
    title: 'Add water report', wide: true, fields: detailFields(true), submitLabel: 'Add report',
    values: { severity: 'medium', status: 'submitted' },
    onSubmit: async (v) => {
      const rec = await db.insert('water_reports', { ...toRow(v), is_anonymous: true, admin_notes: 'Entered by admin.' });
      reports.unshift(rec);
      toast(`Report ${rec.reference_number} added`, 'success');
      draw(); refreshCounts();
    },
  }));
  const editDetails = (r) => formModal({
    title: `Edit details of ${r.reference_number}`, wide: true, fields: detailFields(false),
    values: { ...r, observed_at: toLocalInput(r.observed_at), location_id: r.location_id ?? '' },
    onSubmit: async (v) => { Object.assign(r, await db.update('water_reports', r.id, toRow(v))); toast('Report updated', 'success'); draw(); },
  });

  async function openReport(r) {
    const photo = r.photo_path ? await db.photoUrl(r.photo_path).catch(() => null) : null;
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="detail-grid">
        <div>
          <dl class="meta" style="margin:0">
            <dt>Reference</dt><dd class="mono">${esc(r.reference_number)} ${demoBadge(r.is_demo)}</dd>
            <dt>Problem</dt><dd>${esc(label(ISSUE_TYPES, r.issue_type))}</dd>
            <dt>Severity</dt><dd>${sevBadge(SEVERITIES, r.severity)}</dd>
            <dt>Location</dt><dd>${esc(where(r))}</dd>
            <dt>Observed</dt><dd>${esc(fmtDateTime(r.observed_at))}</dd>
            <dt>Submitted</dt><dd>${esc(fmtDateTime(r.submitted_at))}</dd>
            <dt>Reporter</dt><dd>${r.is_anonymous ? '<em>Anonymous</em>' : esc([r.reporter_name, r.reporter_contact].filter(Boolean).join(' · ') || 'N/A')}</dd>
          </dl>
          <h3 style="margin-top:18px;font-size:.95rem">Description</h3>
          <p class="prose-block">${esc(r.description)}</p>
        </div>
        <div class="detail-photo">${photo ? `<a href="${esc(photo)}" target="_blank" rel="noopener"><img src="${esc(photo)}" alt="Photo submitted with report ${esc(r.reference_number)}"></a>`
          : `<div class="placeholder">${icon('camera', 18)} ${r.photo_path ? 'Photo could not be loaded.' : 'No photo submitted.'}</div>`}</div>
      </div>
      <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">
      <form class="form" novalidate data-update>
        <div class="form-row">
          <div class="field"><label for="r-status">Status</label><select id="r-status" name="status" ${can.write ? '' : 'disabled'}>
            ${Object.entries(REPORT_STATUSES).map(([v, t]) => `<option value="${v}" ${v === r.status ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><label for="r-assigned">Assigned to (maintenance responsibility)</label>
            <input id="r-assigned" name="assigned_to" list="r-teams" maxlength="160" value="${esc(r.assigned_to)}" ${can.write ? '' : 'disabled'}>
            <datalist id="r-teams">${TEAMS.map((t) => `<option value="${esc(t)}">`).join('')}</datalist></div>
        </div>
        <div class="field"><label for="r-notes">Internal notes</label>
          <textarea id="r-notes" name="admin_notes" rows="3" maxlength="2000" ${can.write ? '' : 'disabled'}>${esc(r.admin_notes)}</textarea>
          <span class="hint">Visible to the admin area only.</span></div>
        <p class="form-status" data-form-status aria-live="polite"></p>
        <div class="form-actions">
          ${can.admin ? `<button type="button" class="btn btn--ghost" data-delete style="margin-right:auto">${icon('trash', 16)}Delete</button>` : ''}
          ${can.write ? `<button type="button" class="btn btn--ghost" data-edit-details>${icon('edit', 16)}Edit details</button>
          <button type="button" class="btn btn--ghost" data-action>${icon('wrench', 16)}Record conservation action</button>
          <button type="submit" class="btn">Save changes</button>` : ''}
        </div>
      </form>`;
    const m = openModal({ title: `Report ${r.reference_number}`, body, wide: true });
    const form = body.querySelector('[data-update]');
    const status = form.querySelector('[data-form-status]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patch = { status: form.elements.status.value, assigned_to: form.elements.assigned_to.value.trim(), admin_notes: form.elements.admin_notes.value.trim() };
      if (patch.status === 'assigned' && !patch.assigned_to) {
        status.className = 'form-status form-status--error';
        status.textContent = 'Say who the issue is assigned to before setting the status to Assigned.';
        return;
      }
      try {
        Object.assign(r, await db.update('water_reports', r.id, patch));
        toast(`Report ${r.reference_number} updated`, 'success');
        m.close(); draw(); refreshCounts();
      } catch (err) { status.className = 'form-status form-status--error'; status.textContent = friendlyError(err); }
    });
    form.querySelector('[data-edit-details]')?.addEventListener('click', () => { m.close(); editDetails(r); });
    form.querySelector('[data-action]')?.addEventListener('click', () => {
      m.close();
      formModal({
        title: `Conservation action for ${r.reference_number}`,
        fields: actionFields({ locations, reports, lockReport: true }),
        values: { report_id: r.id, location_id: r.location_id ?? '', responsible_team: r.assigned_to || 'Estates/Facilities', status: 'planned', estimated_cost: 0 },
        onSubmit: async (v) => {
          await db.insert('conservation_actions', v);
          toast('Conservation action recorded', 'success');
        },
      });
    });
    form.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!(await confirmDialog(`Delete report ${r.reference_number}? Linked actions keep their record but lose the link.`, { confirmLabel: 'Delete', danger: true }))) return;
      try {
        await db.remove('water_reports', r.id);
        reports.splice(reports.indexOf(r), 1);
        toast('Report deleted', 'success'); m.close(); draw(); refreshCounts();
      } catch (err) { toast(friendlyError(err), 'error'); }
    });
  }

  draw();
  if (f.q && visible.length === 1) openReport(visible[0]);
}
