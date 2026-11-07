// Conservation actions (Feature 4): corrective work, cost in GHS, verification.
import { esc, icon, fmtDate, statusBadge, demoBadge, panel, tableHTML, actionBtn, onActions, selectHTML,
  formModal, today, readOnlyNote, intro, primaryBtn } from '../ui.js';
import { emptyHTML, downloadCSV, toast, confirmDialog, fmtGHS } from '../../lib/dom.js';
import { ACTION_STATUSES, ISSUE_TYPES, options, label } from '../../lib/labels.js';
import { friendlyError } from '../../lib/validate.js';

const TEAMS = ['Estates/Facilities', 'Estates/Facilities, Plumbing', "Students' Representative Council", 'Project team'];

export function actionFields({ locations, reports, lockReport = false }) {
  return [
    { name: 'report_id', label: 'Identified issue (water report)', type: 'select', nullable: true, optional: true,
      options: reports.map((r) => ({ value: r.id, text: `${r.reference_number}, ${label(ISSUE_TYPES, r.issue_type)}` })),
      hint: lockReport ? 'Linked to the report you opened.' : 'Link the report this action responds to, if any.' },
    { name: 'location_id', label: 'Location', type: 'select', required: true,
      options: locations.map((l) => ({ value: l.id, text: l.name })) },
    { name: 'action_description', label: 'What was done (or is planned)?', hint: 'e.g. Replaced worn washers on four taps', type: 'textarea', required: true, minLength: 5, maxLength: 1000, rows: 3 },
    { name: 'responsible_team', label: 'Responsible office or team', required: true, minLength: 2, maxLength: 160, list: TEAMS, half: true },
    { name: 'implementation_date', label: 'Implementation date', type: 'date', nullable: true, optional: true, half: true },
    { name: 'estimated_cost', label: 'Estimated cost (GH₵)', type: 'number', min: 0, step: '0.01', required: true, half: true,
      hint: 'Label as an estimate until a quotation exists.' },
    { name: 'actual_cost', label: 'Actual cost (GH₵)', type: 'number', min: 0, step: '0.01', nullable: true, optional: true, half: true },
    { name: 'status', label: 'Implementation status', type: 'select', required: true, options: options(ACTION_STATUSES), half: true },
    { name: 'completion_date', label: 'Completion date', type: 'date', nullable: true, optional: true, half: true,
      validate: (v, all) => (v && all.implementation_date && v < all.implementation_date ? 'Completion cannot be before implementation.' : null) },
    { name: 'outcome', label: 'Outcome (what changed afterwards)', type: 'textarea', maxLength: 1000, rows: 2, optional: true,
      hint: 'What changed afterwards, e.g. leak stopped at follow-up check. Record measured savings as water readings.' },
    { name: 'verification_notes', label: 'Verification notes', type: 'textarea', maxLength: 2000, rows: 3, optional: true,
      hint: 'Who checked the work, when, and what they observed.',
      validate: (v, all) => (all.status === 'verified' && !String(v ?? '').trim() ? 'Add verification notes before marking an action as Verified.' : null) },
  ];
}

export async function render({ db, el, can }) {
  const [actions, locations, reports] = await Promise.all([
    db.list('conservation_actions', { order: ['implementation_date', 'desc'] }),
    db.list('campus_locations', { order: ['name', 'asc'] }),
    db.list('water_reports', { order: ['submitted_at', 'desc'] }),
  ]);
  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const refOf = new Map(reports.map((r) => [r.id, r.reference_number]));
  let status = '';
  let visible = [];

  el.innerHTML = `${intro('Record each repair or water-saving step, for example fixing a leaking tap or adding a float valve. Note who did it, when, and what changed afterwards.', primaryBtn('Add Conservation Action'))}${panel('Conservation actions', '<div data-table></div>', {
    iconName: 'wrench',
    tools: `${selectHTML('status', options(ACTION_STATUSES), '', 'All statuses', 'Filter by status')}
      <button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>
`,
  })}`;
  const host = el.querySelector('[data-table]');

  const draw = () => {
    visible = actions.filter((a) => !status || a.status === status);
    const est = visible.reduce((s, a) => s + Number(a.estimated_cost || 0), 0);
    const act = visible.reduce((s, a) => s + Number(a.actual_cost || 0), 0);
    host.innerHTML = visible.length ? tableHTML({
      caption: 'Conservation actions',
      columns: [
        { label: 'Action', value: (a) => `${esc(a.action_description)} ${demoBadge(a.is_demo)}` },
        { label: 'Location', value: (a) => esc(locName.get(a.location_id) ?? 'N/A') },
        { label: 'Report', value: (a) => (a.report_id ? `<a class="mono" href="#/reports?ref=${encodeURIComponent(refOf.get(a.report_id) ?? '')}">${esc(refOf.get(a.report_id) ?? 'linked')}</a>` : 'N/A') },
        { label: 'Team', value: (a) => esc(a.responsible_team) },
        { label: 'Date', value: (a) => esc(fmtDate(a.implementation_date)) + (a.completion_date ? `<div class="small muted">Done ${esc(fmtDate(a.completion_date))}</div>` : '') },
        { label: 'Outcome', value: (a) => `<span class="truncate" style="display:block">${esc(a.outcome || 'N/A')}</span>` },
        { label: 'Est. cost', num: true, value: (a) => esc(fmtGHS(a.estimated_cost)) },
        { label: 'Actual', num: true, value: (a) => esc(fmtGHS(a.actual_cost)) },
        { label: 'Status', value: (a) => statusBadge(ACTION_STATUSES, a.status) },
      ],
      rows: visible,
      actions: can.write ? (a, i) => `${actionBtn('edit', i, 'edit', 'Edit action')}${can.admin ? actionBtn('del', i, 'trash', 'Delete action', true) : ''}` : null,
    }) + `<p class="small muted" style="padding:10px 20px;margin:0">${visible.length} action(s) · Estimated ${esc(fmtGHS(est))} · Actual to date ${esc(fmtGHS(act))}</p>`
      : emptyHTML('No conservation actions yet', 'Record repairs and water-saving initiatives here, ideally linked to the report they resolve.', 'wrench');
  };

  const open = (a) => formModal({
    title: a ? 'Edit Conservation Action' : 'Add Conservation Action',
    fields: actionFields({ locations, reports }),
    values: a ?? { status: 'planned', estimated_cost: 0, implementation_date: today(), responsible_team: 'Estates/Facilities' },
    onSubmit: async (v) => {
      if (a) Object.assign(a, await db.update('conservation_actions', a.id, v));
      else actions.unshift(await db.insert('conservation_actions', v));
      toast(a ? 'Action updated' : 'Action recorded', 'success');
      draw();
    },
  });

  el.querySelector('.toolbar').addEventListener('change', (e) => { if (e.target.name === 'status') { status = e.target.value; draw(); } });
  el.querySelector('[data-add]')?.addEventListener('click', () => {
    if (!locations.length) { toast('Add a campus location first.', 'error'); return; }
    open(null);
  });
  el.querySelector('[data-export]').addEventListener('click', () => downloadCSV('conservation-actions.csv', visible, [
    { label: 'Action', key: 'action_description' }, { label: 'Location', value: (a) => locName.get(a.location_id) ?? '' },
    { label: 'Report reference', value: (a) => refOf.get(a.report_id) ?? '' }, { label: 'Responsible team', key: 'responsible_team' },
    { label: 'Implementation date', key: 'implementation_date' }, { label: 'Estimated cost (GHS)', key: 'estimated_cost' },
    { label: 'Actual cost (GHS)', key: 'actual_cost' }, { label: 'Status', value: (a) => label(ACTION_STATUSES, a.status) },
    { label: 'Completion date', key: 'completion_date' }, { label: 'Outcome', key: 'outcome' },
    { label: 'Verification notes', key: 'verification_notes' }, { label: 'Old record (not fieldwork)', value: (a) => (a.is_demo ? 'yes' : 'no') },
  ]));
  onActions(host, {
    edit: (i) => open(visible[i]),
    del: async (i) => {
      const a = visible[i];
      if (!(await confirmDialog('Delete this conservation action?', { confirmLabel: 'Delete', danger: true }))) return;
      try { await db.remove('conservation_actions', a.id); actions.splice(actions.indexOf(a), 1); draw(); toast('Action deleted', 'success'); }
      catch (err) { toast(friendlyError(err), 'error'); }
    },
  });
  draw();
}
