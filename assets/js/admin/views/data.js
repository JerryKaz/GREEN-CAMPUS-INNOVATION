// Data management: storage status, JSON backup/restore, CSV exports, demo data,
// and exporting published site content.
import { esc, icon, panel, fmtDateTime } from '../ui.js';
import { toast, confirmDialog, downloadCSV, fmtNum } from '../../lib/dom.js';
import { friendlyError } from '../../lib/validate.js';
import { downloadJSON, readJSONFile, stamp } from '../../lib/backup.js';
import { siteContent, loadJSON } from '../../lib/content.js';
import { ISSUE_TYPES, SEVERITIES, REPORT_STATUSES, ACTION_STATUSES, LOCATION_TYPES, PHASES, COMMITMENTS,
  FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, label } from '../../lib/labels.js';
import { toLitres } from '../../lib/calc.js';

const NAMES = {
  campus_locations: 'Campus locations', water_reports: 'Water reports', water_readings: 'Water readings',
  conservation_actions: 'Conservation actions', pledges: 'Pledges', feedback: 'Feedback',
  budget_items: 'Budget items', media_items: 'Media entries (this device)',
};
const yn = (b) => (b ? 'yes' : 'no');

export async function render({ db, el, refreshCounts }) {
  const draw = async () => {
    const [counts, info, lastBackup, imports, demo, seededAt] = await Promise.all([
      db.counts(), db.storageInfo(), db.getMeta('last_backup_at'), db.getMeta('imports'), db.demoCount(), db.getMeta('demo_seeded_at'),
    ]);
    const lastImport = imports?.at(-1);
    const mb = (b) => (b === null || b === undefined ? 'unknown' : `${fmtNum(b / 1024 / 1024, 1)} MB`);
    el.innerHTML = `
      <div class="notice notice--demo">${icon('database', 18)}<div><p style="margin:0"><strong>Where this data lives.</strong>
        Every record is stored in <strong>this browser on this device</strong> (IndexedDB). It is not uploaded anywhere, not visible to other visitors
        and does not sync to other devices or browsers. Clearing browser data, using a private window or switching browsers starts empty.
        Export a backup regularly and before every presentation.</p></div></div>
      <div class="cols-2">
        ${panel('Storage status', `<div class="panel__body">
          <dl class="meta" style="margin:0">
            <dt>Storage</dt><dd>${info.persistent ? 'IndexedDB (saved between visits)' : '<strong>Temporary memory only</strong>: this browser blocks storage, changes are lost when the tab closes'}</dd>
            <dt>Protected from automatic clean-up</dt><dd>${info.persisted === null ? 'Unknown' : info.persisted ? 'Yes' : 'No'}
              ${info.persisted === false ? '<button type="button" class="btn btn--ghost btn--sm" data-persist>Request</button>' : ''}</dd>
            <dt>Space used</dt><dd>${mb(info.usage)} of ${mb(info.quota)} available to this site</dd>
            <dt>Last backup</dt><dd>${lastBackup ? esc(fmtDateTime(lastBackup)) : '<strong>Never</strong>'}</dd>
            <dt>Last import</dt><dd>${lastImport ? `${esc(fmtDateTime(lastImport.imported_at))} (${esc(lastImport.mode)}, ${lastImport.added} added, ${lastImport.skipped} skipped)` : 'None'}</dd>
            <dt>Demo data loaded</dt><dd>${seededAt ? esc(fmtDateTime(seededAt)) : 'Not on this device'}</dd>
          </dl></div>`, { iconName: 'shield' })}
        ${panel('Records on this device', `<div class="table-wrap"><table class="data"><thead><tr><th>Collection</th><th class="num">Total</th><th class="num">Demo</th><th class="num">CSV</th></tr></thead><tbody>
          ${Object.entries(counts).map(([k, c]) => `<tr><td>${esc(NAMES[k] ?? k)}</td><td class="num">${c.total}</td><td class="num">${c.demo || ''}</td>
            <td class="num">${CSV[k] ? `<button type="button" class="btn btn--ghost btn--sm" data-csv="${k}" ${c.total ? '' : 'disabled'}>${icon('download', 14)}CSV</button>` : ''}</td></tr>`).join('')}
          </tbody></table></div>`, { iconName: 'layers' })}
      </div>
      ${panel('Back up and restore', `<div class="panel__body">
        <div class="btn-row"><button type="button" class="btn" data-export>${icon('download', 16)}Export all data (JSON)</button></div>
        <p class="small muted">The backup contains every record, the site content saved on this device, the export date and the schema version. Keep it with the project files.</p>
        <hr class="rule">
        <div class="field"><label for="import-file">Import a backup</label><input id="import-file" type="file" accept=".json,application/json">
          <span class="hint">The file is checked first. Nothing changes until you confirm.</span></div>
        <div data-import-result></div>
      </div>`, { iconName: 'refresh' })}
      ${panel('Demonstration data', `<div class="panel__body">
        <p>${demo ? `<strong>${demo}</strong> demonstration records are on this device. They are labelled <span class="badge badge--demo">DEMO</span> everywhere.` : 'No demonstration records on this device.'}
          Real records are never touched by these buttons.</p>
        <div class="btn-row">
          <button type="button" class="btn btn--ghost" data-demo-load>${icon('plus', 16)}Load demonstration data</button>
          <button type="button" class="btn btn--ghost" data-demo-restore ${demo ? '' : 'disabled'}>${icon('refresh', 16)}Restore demo data to original</button>
          <button type="button" class="btn btn--danger" data-demo-clear ${demo ? '' : 'disabled'}>${icon('trash', 16)}Clear demonstration data</button>
        </div></div>`, { iconName: 'flask' })}
      ${panel('Publish site content', `<div class="panel__body">
        <p class="small" style="margin-top:0">Findings, interviews, pilot results, tariff and contact details saved in <a href="#/settings">Site Content</a> show only on this device.
          To publish them for every visitor, download the file below, replace <span class="mono">public/data/site-content.json</span> in the project with it, then commit and push.
          Photos and videos are published the same way from <a href="#/media">Media Management</a>.</p>
        <button type="button" class="btn btn--ghost" data-export-content>${icon('download', 16)}Export site-content.json</button></div>`, { iconName: 'upload' })}`;
  };

  // ---- CSV definitions (labels instead of internal codes) ----------------------
  const ctx = {};
  const loadCtx = async () => {
    const [locs, reports] = await Promise.all([db.list('campus_locations'), db.list('water_reports')]);
    ctx.loc = new Map(locs.map((l) => [l.id, l.name]));
    ctx.ref = new Map(reports.map((r) => [r.id, r.reference_number]));
  };
  const CSV = {
    campus_locations: [{ label: 'Name', key: 'name' }, { label: 'Type', value: (l) => label(LOCATION_TYPES, l.location_type) },
      { label: 'Latitude', key: 'latitude' }, { label: 'Longitude', key: 'longitude' }, { label: 'Verified', value: (l) => yn(l.is_verified) },
      { label: 'Description', key: 'description' }, { label: 'Demo record', value: (r) => yn(r.is_demo) }],
    water_reports: [{ label: 'Reference', key: 'reference_number' }, { label: 'Submitted', key: 'submitted_at' },
      { label: 'Location', value: (r) => ctx.loc.get(r.location_id) ?? r.location_note ?? '' },
      { label: 'Problem', value: (r) => label(ISSUE_TYPES, r.issue_type) }, { label: 'Severity', value: (r) => label(SEVERITIES, r.severity) },
      { label: 'Status', value: (r) => label(REPORT_STATUSES, r.status) }, { label: 'Assigned to', key: 'assigned_to' },
      { label: 'Description', key: 'description' }, { label: 'Demo record', value: (r) => yn(r.is_demo) }],
    water_readings: [{ label: 'Date', key: 'reading_date' }, { label: 'Location', value: (r) => ctx.loc.get(r.location_id) ?? '' },
      { label: 'Phase', value: (r) => label(PHASES, r.phase) }, { label: 'Consumption', key: 'consumption_value' }, { label: 'Unit', key: 'measurement_unit' },
      { label: 'Litres', value: (r) => toLitres(r.consumption_value, r.measurement_unit) }, { label: 'Method', key: 'measurement_method' },
      { label: 'Notes', key: 'notes' }, { label: 'Demo record', value: (r) => yn(r.is_demo) }],
    conservation_actions: [{ label: 'Action', key: 'action_description' }, { label: 'Location', value: (a) => ctx.loc.get(a.location_id) ?? '' },
      { label: 'Report', value: (a) => ctx.ref.get(a.report_id) ?? '' }, { label: 'Team', key: 'responsible_team' },
      { label: 'Implemented', key: 'implementation_date' }, { label: 'Completed', key: 'completion_date' },
      { label: 'Status', value: (a) => label(ACTION_STATUSES, a.status) }, { label: 'Estimated cost (GHS)', key: 'estimated_cost' },
      { label: 'Actual cost (GHS)', key: 'actual_cost' }, { label: 'Outcome', key: 'outcome' }, { label: 'Demo record', value: (r) => yn(r.is_demo) }],
    pledges: [{ label: 'Submitted', key: 'submitted_at' }, { label: 'Commitment', value: (p) => label(COMMITMENTS, p.commitment_type) },
      { label: 'Name', key: 'full_name' }, { label: 'Email', key: 'email' }, { label: 'Department', key: 'department' },
      { label: 'Comments', key: 'comments' }, { label: 'Demo record', value: (r) => yn(r.is_demo) }],
    feedback: [{ label: 'Received', key: 'submitted_at' }, { label: 'Category', value: (x) => label(FEEDBACK_CATEGORIES, x.category) },
      { label: 'Message', key: 'message' }, { label: 'Name', key: 'contact_name' }, { label: 'Email', key: 'contact_email' },
      { label: 'Status', value: (x) => label(FEEDBACK_STATUSES, x.status) }, { label: 'Demo record', value: (r) => yn(r.is_demo) }],
  };

  // ---- events --------------------------------------------------------------------
  let pending = null; // parsed backup awaiting confirmation
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.dataset.csv) {
        await loadCtx();
        const rows = await db.list(b.dataset.csv);
        downloadCSV(`waterwatch-${b.dataset.csv.replace(/_/g, '-')}-${stamp()}.csv`, rows, CSV[b.dataset.csv]);
      } else if (b.matches('[data-persist]')) {
        toast((await db.requestPersistence()) ? 'Storage is now protected from automatic clean-up.' : 'The browser declined. Keep regular backups.', 'info');
        await draw();
      } else if (b.matches('[data-export]')) {
        const data = await db.exportAll();
        downloadJSON(`waterwatch-backup-${stamp()}.json`, data);
        await db.recordBackup(data.export_id);
        toast('Backup downloaded.', 'success');
        await draw(); refreshCounts();
      } else if (b.matches('[data-import-merge], [data-import-replace]')) {
        if (!pending) return;
        const mode = b.matches('[data-import-replace]') ? 'replace' : 'merge';
        if (mode === 'replace') {
          if (!(await confirmDialog('Replace ALL records on this device with the backup? A safety backup of the current data will be downloaded first.', { confirmLabel: 'Replace everything', danger: true }))) return;
          const safety = await db.exportAll();
          downloadJSON(`waterwatch-before-restore-${stamp()}.json`, safety);
        }
        const res = await db.importBackup(pending, { mode });
        pending = null;
        toast(`Import complete: ${res.added} record(s) added${res.skipped ? `, ${res.skipped} already present and skipped` : ''}.`, 'success', 7000);
        await draw(); refreshCounts();
      } else if (b.matches('[data-import-cancel]')) {
        pending = null;
        el.querySelector('[data-import-result]').innerHTML = '';
        el.querySelector('#import-file').value = '';
      } else if (b.matches('[data-demo-load]')) {
        const added = await db.loadDemoData();
        toast(added ? `${added} demonstration record(s) added.` : 'All demonstration records are already present.', 'success');
        await draw(); refreshCounts();
      } else if (b.matches('[data-demo-restore]')) {
        if (!(await confirmDialog('Reset every demonstration record to its original state? Changes you made to demo records are lost; real records are not touched.', { confirmLabel: 'Restore demo data' }))) return;
        await db.restoreDemoData();
        toast('Demonstration data restored.', 'success');
        await draw(); refreshCounts();
      } else if (b.matches('[data-demo-clear]')) {
        if (!(await confirmDialog('Delete every demonstration record from this device? Real records are kept. You can load the demo data again later.', { confirmLabel: 'Clear demo data', danger: true }))) return;
        await db.deleteDemoData();
        toast('Demonstration data cleared.', 'success');
        await draw(); refreshCounts();
      } else if (b.matches('[data-export-content]')) {
        const [content, file] = await Promise.all([siteContent(db), loadJSON('site-content.json', {})]);
        const { __local, ...rest } = content;
        downloadJSON('site-content.json', { notice: file.notice, ...rest });
        toast('Downloaded. Replace public/data/site-content.json with it, then commit and push.', 'success', 8000);
      }
    } catch (err) {
      console.error(err);
      toast(friendlyError(err), 'error', 7000);
    }
  });

  el.addEventListener('change', async (e) => {
    if (e.target.id !== 'import-file') return;
    const out = el.querySelector('[data-import-result]');
    pending = null;
    try {
      const obj = await readJSONFile(e.target.files[0]);
      const check = await db.inspectBackup(obj);
      if (!check.ok) {
        out.innerHTML = `<div class="state state--error" role="alert"><p><strong>This backup cannot be imported.</strong></p>
          <ul class="small" style="text-align:left">${check.errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
        return;
      }
      pending = obj;
      const newTotal = Object.values(check.newIds).reduce((a, b) => a + b, 0);
      out.innerHTML = `<div class="import-summary">
        <p><strong>Backup is valid.</strong> Exported ${esc(fmtDateTime(check.exportedAt))}, ${check.total} record(s), ${newTotal} not already on this device.</p>
        ${check.alreadyImported ? `<div class="notice notice--demo">${icon('alert', 18)}<p>This exact backup was imported before. Merging again adds nothing new; only continue if you mean to.</p></div>` : ''}
        ${check.warnings.map((w) => `<p class="small muted">${esc(w)}</p>`).join('')}
        <ul class="small">${Object.entries(check.counts).filter(([, n]) => n).map(([k, n]) => `<li>${esc(NAMES[k] ?? k)}: ${n} (${check.newIds[k]} new)</li>`).join('')}</ul>
        <div class="btn-row">
          <button type="button" class="btn" data-import-merge>Merge: add ${newTotal} new record(s)</button>
          <button type="button" class="btn btn--danger" data-import-replace>Replace all data</button>
          <button type="button" class="btn btn--ghost" data-import-cancel>Cancel</button>
        </div></div>`;
    } catch (err) {
      out.innerHTML = `<div class="state state--error" role="alert"><p>${esc(friendlyError(err))}</p></div>`;
    }
  });

  await draw();
}
