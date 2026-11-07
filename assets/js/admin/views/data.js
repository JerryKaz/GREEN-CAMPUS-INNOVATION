// Data Backup: download/restore backups, download lists for Excel, publish to the
// website, and (only when present) review records left by an earlier version.
import { esc, icon, panel, fmtDateTime, intro } from '../ui.js';
import { toast, confirmDialog, downloadCSV, fmtNum } from '../../lib/dom.js';
import { friendlyError } from '../../lib/validate.js';
import { downloadJSON, readJSONFile, stamp } from '../../lib/backup.js';
import { siteContent, loadJSON, galleryImages, galleryVideos } from '../../lib/content.js';
import { ISSUE_TYPES, SEVERITIES, REPORT_STATUSES, ACTION_STATUSES, LOCATION_TYPES, PHASES, COMMITMENTS,
  FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, label } from '../../lib/labels.js';
import { toLitres } from '../../lib/calc.js';

const NAMES = {
  campus_locations: 'Campus locations', water_reports: 'Water reports', water_readings: 'Water readings',
  conservation_actions: 'Conservation actions', pledges: 'Pledges', feedback: 'Feedback',
  budget_items: 'Budget items', media_items: 'Photos and video links',
};
const yn = (b) => (b ? 'yes' : 'no');

export async function render({ db, el, refreshCounts, notify }) {
  const draw = async () => {
    const [counts, info, lastBackup, imports, demo, images] = await Promise.all([
      db.counts(), db.storageInfo(), db.getMeta('last_backup_at'), db.getMeta('imports'), db.demoCount(), galleryImages(db),
    ]);
    const lastImport = imports?.at(-1);
    const localPhotos = images.filter((m) => m.data_url).length;
    const mb = (b) => (b === null || b === undefined ? 'unknown' : `${fmtNum(b / 1024 / 1024, 1)} MB`);
    el.innerHTML = `
      ${intro('Keep your work safe and share it. Your information is saved in this browser on this computer, so <strong>download a backup after every session</strong>. Use “Publish to the website” to send your information to visitors on other devices.',
        `<button type="button" class="btn" data-export>${icon('download', 18)}Download Backup</button>`,
        `<p class="small muted" style="margin-top:6px">Last backup: <strong>${lastBackup ? esc(fmtDateTime(lastBackup)) : 'never'}</strong></p>`)}
      ${demo ? panel('Old records from an earlier version of the site', `<div class="panel__body">
        <p style="margin-top:0"><strong>${demo} record(s)</strong> marked “Not fieldwork” were created by an earlier version of the website for demonstration. They are already <strong>hidden from the public website</strong>.</p>
        <p>Remove them so only your fieldwork remains. A backup of everything is downloaded first, and your own records are not touched.</p>
        <div class="btn-row"><a class="btn btn--ghost" href="#/readings">Review them first</a>
          <button type="button" class="btn btn--danger" data-demo-clear>${icon('trash', 16)}Remove old records</button></div></div>`, { iconName: 'info' }) : ''}
      ${panel('Restore from a Backup', `<div class="panel__body">
        <div class="field"><label for="import-file">Choose a backup file (.json)</label><input id="import-file" type="file" accept=".json,application/json">
          <span class="hint">The file is checked first. Nothing changes until you confirm.</span></div>
        <div data-import-result></div>
        <p class="small muted">Last restore: ${lastImport ? `${esc(fmtDateTime(lastImport.imported_at))} (${lastImport.added} added, ${lastImport.skipped} already present)` : 'none'}</p>
      </div>`, { iconName: 'refresh' })}
      ${panel('Publish to the website', `<div class="panel__body">
        <p style="margin-top:0">Everything you save shows on <strong>this computer's</strong> public website straight away. To show it to visitors on other phones and computers:</p>
        <ol class="help-steps">
          <li>Download the files below${localPhotos ? `, including the ${localPhotos} photo(s) stored on this computer` : ''}.</li>
          <li>Send them to the person who manages the website files (the GitHub repository).</li>
          <li>They place the <span class="mono">.json</span> files in <span class="mono">public/data/</span> and each photo in the folder shown in its file name, then publish. Visitors see the update a few minutes later.</li>
        </ol>
        <div class="btn-row" style="margin-top:14px">
          <button type="button" class="btn btn--ghost" data-export-content>${icon('download', 16)}Research and website text</button>
          <button type="button" class="btn btn--ghost" data-export-media>${icon('download', 16)}Photo list${localPhotos ? ` + ${localPhotos} photo file(s)` : ''}</button>
          <button type="button" class="btn btn--ghost" data-export-videos>${icon('download', 16)}Video list</button>
        </div></div>`, { iconName: 'upload' })}
      ${panel('Download lists for Excel (CSV)', `<div class="table-wrap"><table class="data"><thead><tr><th>Information</th><th class="num">Records</th><th class="num">Download</th></tr></thead><tbody>
        ${Object.entries(counts).filter(([k]) => CSV[k]).map(([k, c]) => `<tr><td>${esc(NAMES[k] ?? k)}</td><td class="num">${c.total - c.demo}</td>
          <td class="num"><button type="button" class="btn btn--ghost btn--sm" data-csv="${k}" ${c.total ? '' : 'disabled'}>${icon('download', 14)}CSV</button></td></tr>`).join('')}
        </tbody></table></div>`, { iconName: 'layers' })}
      ${panel('Storage on this computer', `<div class="panel__body"><dl class="meta" style="margin:0">
        <dt>Saved between visits</dt><dd>${info.persistent ? 'Yes, in this browser' : '<strong>No</strong>: this browser is blocking storage, so changes are lost when the tab closes. Use a normal (not private) window.'}</dd>
        <dt>Protected from automatic clean-up</dt><dd>${info.persisted === null ? 'Unknown' : info.persisted ? 'Yes' : 'No'}
          ${info.persisted === false ? '<button type="button" class="btn btn--ghost btn--sm" data-persist>Ask the browser to protect it</button>' : ''}</dd>
        <dt>Space used</dt><dd>${mb(info.usage)} of ${mb(info.quota)}</dd></dl>
        <p class="small muted" style="margin-bottom:0">Clearing browser data, using a private window or a different browser starts with an empty admin panel. Restore a backup to bring your information back.</p></div>`, { iconName: 'shield' })}`;
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
      { label: 'Description', key: 'description' }, { label: 'Old record (not fieldwork)', value: (r) => yn(r.is_demo) }],
    water_reports: [{ label: 'Reference', key: 'reference_number' }, { label: 'Submitted', key: 'submitted_at' },
      { label: 'Location', value: (r) => ctx.loc.get(r.location_id) ?? r.location_note ?? '' },
      { label: 'Problem', value: (r) => label(ISSUE_TYPES, r.issue_type) }, { label: 'Severity', value: (r) => label(SEVERITIES, r.severity) },
      { label: 'Status', value: (r) => label(REPORT_STATUSES, r.status) }, { label: 'Assigned to', key: 'assigned_to' },
      { label: 'Description', key: 'description' }, { label: 'Old record (not fieldwork)', value: (r) => yn(r.is_demo) }],
    water_readings: [{ label: 'Date', key: 'reading_date' }, { label: 'Location', value: (r) => ctx.loc.get(r.location_id) ?? '' },
      { label: 'Phase', value: (r) => label(PHASES, r.phase) }, { label: 'Consumption', key: 'consumption_value' }, { label: 'Unit', key: 'measurement_unit' },
      { label: 'Litres', value: (r) => toLitres(r.consumption_value, r.measurement_unit) }, { label: 'Method', key: 'measurement_method' },
      { label: 'Notes', key: 'notes' }, { label: 'Old record (not fieldwork)', value: (r) => yn(r.is_demo) }],
    conservation_actions: [{ label: 'Action', key: 'action_description' }, { label: 'Location', value: (a) => ctx.loc.get(a.location_id) ?? '' },
      { label: 'Report', value: (a) => ctx.ref.get(a.report_id) ?? '' }, { label: 'Team', key: 'responsible_team' },
      { label: 'Implemented', key: 'implementation_date' }, { label: 'Completed', key: 'completion_date' },
      { label: 'Status', value: (a) => label(ACTION_STATUSES, a.status) }, { label: 'Estimated cost (GHS)', key: 'estimated_cost' },
      { label: 'Actual cost (GHS)', key: 'actual_cost' }, { label: 'Outcome', key: 'outcome' }, { label: 'Old record (not fieldwork)', value: (r) => yn(r.is_demo) }],
    pledges: [{ label: 'Submitted', key: 'submitted_at' }, { label: 'Commitment', value: (p) => label(COMMITMENTS, p.commitment_type) },
      { label: 'Name', key: 'full_name' }, { label: 'Email', key: 'email' }, { label: 'Department', key: 'department' },
      { label: 'Comments', key: 'comments' }, { label: 'Old record (not fieldwork)', value: (r) => yn(r.is_demo) }],
    feedback: [{ label: 'Received', key: 'submitted_at' }, { label: 'Category', value: (x) => label(FEEDBACK_CATEGORIES, x.category) },
      { label: 'Message', key: 'message' }, { label: 'Name', key: 'contact_name' }, { label: 'Email', key: 'contact_email' },
      { label: 'Status', value: (x) => label(FEEDBACK_STATUSES, x.status) }, { label: 'Old record (not fieldwork)', value: (r) => yn(r.is_demo) }],
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
        toast('Backup downloaded. Keep the file somewhere safe.', 'success');
        notify?.('Backup downloaded.', { route: 'data', key: 'backup' });
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
        notify?.(`Backup restored: ${res.added} record(s) added.`, { route: 'data', key: 'import' });
        toast(`Import complete: ${res.added} record(s) added${res.skipped ? `, ${res.skipped} already present and skipped` : ''}.`, 'success', 7000);
        await draw(); refreshCounts();
      } else if (b.matches('[data-import-cancel]')) {
        pending = null;
        el.querySelector('[data-import-result]').innerHTML = '';
        el.querySelector('#import-file').value = '';
      } else if (b.matches('[data-demo-clear]')) {
        if (!(await confirmDialog('Remove the old records that are not fieldwork? A backup of everything will be downloaded first. Your own records are kept.', { confirmLabel: 'Remove old records', danger: true }))) return;
        const safety = await db.exportAll();
        downloadJSON(`waterwatch-before-cleanup-${stamp()}.json`, safety);
        const n = await db.deleteDemoData();
        toast(`${n} old record(s) removed. A backup was downloaded first.`, 'success', 7000);
        await draw(); refreshCounts();
      } else if (b.matches('[data-export-content]')) {
        const [content, file] = await Promise.all([siteContent(db), loadJSON('site-content.json', {})]);
        const { __local, ...rest } = content;
        downloadJSON('site-content.json', { notice: file.notice, ...rest });
        toast('Downloaded site-content.json. It goes in public/data/.', 'success', 7000);
      } else if (b.matches('[data-export-media]')) {
        const [images, file] = await Promise.all([galleryImages(db), loadJSON('media-gallery.json', {})]);
        const strip = ({ id, __source, kind, is_demo, created_at, updated_at, data_url, ...rest }) => rest;
        downloadJSON('media-gallery.json', { notice: file.notice, images: images.map(strip) });
        // Each photo stored on this computer is downloaded with its final file name.
        for (const m of images.filter((x) => x.data_url)) {
          const a = Object.assign(document.createElement('a'), { href: m.data_url, download: m.path.split('/').pop() });
          document.body.append(a); a.click(); a.remove();
          await new Promise((r) => setTimeout(r, 350)); // browsers block bursts of downloads
        }
        toast('Downloaded the photo list and photo files. Photo folders are named in each entry.', 'success', 8000);
        notify?.('Photos prepared for publishing.', { body: 'Send media-gallery.json and the photo files to the person who manages the website.', route: 'data', category: 'publish', key: 'publish-media' });
      } else if (b.matches('[data-export-videos]')) {
        const [videos, file] = await Promise.all([galleryVideos(db), loadJSON('video-gallery.json', {})]);
        const strip = ({ id, __source, kind, is_demo, created_at, updated_at, ...rest }) => rest;
        downloadJSON('video-gallery.json', { notice: file.notice, videos: videos.map(strip) });
        toast('Downloaded video-gallery.json. It goes in public/data/.', 'success', 7000);
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
        out.innerHTML = `<div class="state state--error" role="alert"><p><strong>This file cannot be restored.</strong></p>
          <ul class="small" style="text-align:left">${check.errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
        return;
      }
      pending = obj;
      const newTotal = Object.values(check.newIds).reduce((a, b) => a + b, 0);
      out.innerHTML = `<div class="import-summary">
        <p><strong>This backup can be restored.</strong> Exported ${esc(fmtDateTime(check.exportedAt))}, ${check.total} record(s), ${newTotal} not already on this device.</p>
        ${check.alreadyImported ? `<div class="notice notice--demo">${icon('alert', 18)}<p>You have restored this exact backup before. Adding again changes nothing; only continue if you mean to.</p></div>` : ''}
        ${check.warnings.map((w) => `<p class="small muted">${esc(w)}</p>`).join('')}
        <ul class="small">${Object.entries(check.counts).filter(([, n]) => n).map(([k, n]) => `<li>${esc(NAMES[k] ?? k)}: ${n} (${check.newIds[k]} new)</li>`).join('')}</ul>
        <div class="btn-row">
          <button type="button" class="btn" data-import-merge>Add ${newTotal} new record(s), keep mine</button>
          <button type="button" class="btn btn--danger" data-import-replace>Replace everything with the backup</button>
          <button type="button" class="btn btn--ghost" data-import-cancel>Cancel</button>
        </div></div>`;
    } catch (err) {
      out.innerHTML = `<div class="state state--error" role="alert"><p>${esc(friendlyError(err))}</p></div>`;
    }
  });

  await draw();
}
