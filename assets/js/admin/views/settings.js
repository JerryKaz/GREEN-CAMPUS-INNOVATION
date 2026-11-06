// Settings: site content the group edits without code, user access, demo data.
import { esc, icon, panel, tableHTML, fmtDateTime, readOnlyNote } from '../ui.js';
import { toast, confirmDialog, emptyHTML } from '../../lib/dom.js';
import { ROLES, label } from '../../lib/labels.js';
import { friendlyError } from '../../lib/validate.js';
import { toEmbedUrl } from '../../lib/calc.js';

const FINDINGS = [['challenges', 'A. Identified water challenges'], ['processes', 'B. Existing water management processes'],
  ['causes', 'C. Causes of water wastage'], ['experiences', 'D. Student and staff experiences'], ['opportunities', 'E. Opportunities for process improvement']];
const PILOT = [['location', 'Pilot location', 'text'], ['testing_date', 'Testing date', 'date'], ['users', 'Number of users', 'number'],
  ['feedback', 'User feedback', 'textarea'], ['problems', 'Identified problems', 'textarea'], ['improvements', 'Improvements made', 'textarea']];
const PHASES = ['Research and baseline measurement', 'Problem analysis and ideation', 'WaterWatch prototype development',
  'Pilot implementation', 'Measurement and evaluation', 'Improvement and wider adoption'];

export async function render({ db, el, can, profile }) {
  const s = await db.settings();
  const dis = can.admin ? '' : 'disabled';
  const v = (o, k) => esc(o?.[k] ?? '');
  const field = (name, lbl, val, type = 'text', hint = '') => type === 'textarea'
    ? `<div class="field"><label for="s-${name}">${esc(lbl)}</label><textarea id="s-${name}" name="${name}" rows="4" maxlength="4000" ${dis}>${val}</textarea>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`
    : `<div class="field"><label for="s-${name}">${esc(lbl)}</label><input id="s-${name}" name="${name}" type="${type}" value="${val}" ${type === 'number' ? 'min="0" step="1"' : ''} ${dis}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
  const save = (key) => (can.admin ? `<div class="form-actions"><button class="btn" type="submit" data-key="${key}">Save</button></div>` : '');

  el.innerHTML = `${can.admin ? '' : readOnlyNote()}
    <nav class="settings-nav" aria-label="Settings sections">${['Videos', 'Research findings', 'Pilot testing', 'Water tariff', 'Roadmap', 'Users & access', 'Demo data']
      .map((t, i) => `<a class="chip" href="#/settings" data-jump="set-${i}">${t}</a>`).join('')}</nav>
    <form id="set-0" class="form">${panel('Videos (YouTube or Google Drive links)', `<div class="panel__body form">
      ${field('problem_url', 'Video 1, Problem documentary (3 to 5 min)', v(s.videos, 'problem_url'), 'url', 'Paste a YouTube or Google Drive share link. Drive files must be shared as “Anyone with the link”.')}
      ${field('solution_url', 'Video 2, Solution demonstration (2 to 3 min)', v(s.videos, 'solution_url'), 'url')}
      ${save('videos')}</div>`, { iconName: 'play' })}</form>
    <form id="set-1" class="form">${panel('Research findings (Research page, sections A to E)', `<div class="panel__body form">
      <p class="small muted" style="margin:0">Publish only verified findings from the project team's observations, measurements and interviews. Empty sections show “Awaiting the project team findings”.</p>
      ${FINDINGS.map(([k, t]) => field(k, t, v(s.research_findings, k), 'textarea')).join('')}${save('research_findings')}</div>`, { iconName: 'flask' })}</form>
    <form id="set-2" class="form">${panel('Pilot testing (Our Solution page)', `<div class="panel__body form">
      ${PILOT.map(([k, t, type]) => field(k, t, v(s.pilot, k), type)).join('')}${save('pilot')}</div>`, { iconName: 'target' })}</form>
    <form id="set-3" class="form">${panel('Water tariff (savings calculator)', `<div class="panel__body form">
      <div class="form-row">${field('value', 'Tariff (GH₵ per unit)', v(s.tariff, 'value'), 'number')}
        <div class="field"><label for="s-unit">Per</label><select id="s-unit" name="unit" ${dis}>
          <option value="m3" ${s.tariff?.unit !== 'L' ? 'selected' : ''}>cubic metre (m³)</option><option value="L" ${s.tariff?.unit === 'L' ? 'selected' : ''}>litre (L)</option></select></div></div>
      ${field('source', 'Source', v(s.tariff, 'source'), 'text', 'e.g. VVU Estates water bill for a named month, or the published utility tariff.')}
      <label class="check"><input type="checkbox" name="verified" ${s.tariff?.verified ? 'checked' : ''} ${dis}>This tariff has been verified against an official source</label>
      ${save('tariff')}</div>`, { iconName: 'coins' })}</form>
    <form id="set-4" class="form">${panel('Implementation roadmap', `<div class="panel__body form">
      <div class="field"><label for="s-phase">Current phase</label><select id="s-phase" name="current_phase" ${dis}>
        ${PHASES.map((t, i) => `<option value="${i + 1}" ${Number(s.roadmap?.current_phase) === i + 1 ? 'selected' : ''}>Phase ${i + 1}: ${esc(t)}</option>`).join('')}</select></div>
      ${save('roadmap')}</div>`, { iconName: 'route' })}</form>
    <section id="set-5">${panel('Users & access', '<div data-users></div>', { iconName: 'users' })}</section>
    <section id="set-6">${panel('Demonstration data', `<div class="panel__body">
      <p>Demo records are labelled everywhere they appear. Remove them before presenting real research. Set <span class="mono">SHOW_DEMO_DATA=false</span> in the deployment environment to hide them from public pages.</p>
      ${can.admin ? `<div class="btn-row"><button type="button" class="btn btn--danger" data-wipe>${icon('trash', 16)}Delete all demo records</button>
        ${db.mode === 'demo' ? `<button type="button" class="btn btn--ghost" data-reset>${icon('refresh', 16)}Reset demo database</button>` : ''}</div>` : ''}</div>`, { iconName: 'layers' })}</section>`;

  el.querySelector('.settings-nav').addEventListener('click', (e) => {
    const a = e.target.closest('[data-jump]');
    if (!a) return;
    e.preventDefault();
    el.querySelector(`#${a.dataset.jump}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const collect = {
    videos: (f) => {
      const out = { problem_url: f.problem_url.value.trim(), solution_url: f.solution_url.value.trim() };
      for (const [k, url] of Object.entries(out)) if (url && !toEmbedUrl(url)) throw new Error(`${k === 'problem_url' ? 'Video 1' : 'Video 2'} must be an https YouTube or Google Drive link.`);
      return out;
    },
    research_findings: (f) => Object.fromEntries(FINDINGS.map(([k]) => [k, f[k].value.trim()])),
    pilot: (f) => Object.fromEntries(PILOT.map(([k, , t]) => [k, t === 'number' ? (f[k].value === '' ? null : Math.max(0, Math.round(Number(f[k].value)))) : f[k].value.trim()])),
    tariff: (f) => {
      const value = f.value.value === '' ? null : Number(f.value.value);
      if (value !== null && !(value > 0)) throw new Error('Tariff must be a positive number.');
      if (f.verified.checked && (!value || !f.source.value.trim())) throw new Error('A verified tariff needs both a value and a source.');
      return { value, unit: f.unit.value, source: f.source.value.trim(), verified: f.verified.checked };
    },
    roadmap: (f) => ({ current_phase: Number(f.current_phase.value) }),
  };
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = e.target.querySelector('[data-key]')?.dataset.key;
    if (!key) return;
    try { await db.saveSetting(key, collect[key](e.target)); toast('Saved, the public site now shows this content.', 'success'); }
    catch (err) { toast(friendlyError(err), 'error'); }
  });

  el.querySelector('[data-wipe]')?.addEventListener('click', async () => {
    if (!(await confirmDialog('Delete every demonstration record (reports, readings, actions, pledges, feedback, budget lines and unused demo locations)? This cannot be undone.', { confirmLabel: 'Delete demo data', danger: true }))) return;
    try { await db.deleteDemoData(); toast('Demo data deleted', 'success'); } catch (err) { toast(friendlyError(err), 'error'); }
  });
  el.querySelector('[data-reset]')?.addEventListener('click', async () => {
    if (!(await confirmDialog('Reset the browser demo database to its original sample data? Anything you entered in demo mode is lost.', { confirmLabel: 'Reset' }))) return;
    await db.resetDemo(); toast('Demo database reset', 'success'); setTimeout(() => location.reload(), 600);
  });

  const usersHost = el.querySelector('[data-users]');
  if (!can.admin) { usersHost.innerHTML = '<div class="panel__body"><p class="muted" style="margin:0">Only administrators manage user access.</p></div>'; return; }
  const draw = async () => {
    let users;
    try { users = await db.listUsers(); } catch (err) { usersHost.innerHTML = `<div class="panel__body">${esc(friendlyError(err))}</div>`; return; }
    usersHost.innerHTML = (users.length ? tableHTML({
      caption: 'Users', rows: users,
      columns: [
        { label: 'Name', value: (u) => esc(u.full_name || 'N/A') },
        { label: 'Email', value: (u) => esc(u.email) },
        { label: 'Role', value: (u) => `<select data-role="${esc(u.id)}" aria-label="Role for ${esc(u.email)}" ${u.id === profile.id ? 'disabled title="You cannot change your own role"' : ''}>
          ${Object.entries(ROLES).map(([k, t]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` },
        { label: 'Last sign-in', value: (u) => esc(fmtDateTime(u.last_sign_in_at)) },
      ],
    }) : emptyHTML('No users', '', 'users')) + `<div class="panel__body small muted">
      <strong>Adding someone:</strong> invite them in Supabase → Authentication → Users → “Invite user”. They appear here as a Viewer; choose their role.
      Roles: <strong>${label(ROLES, 'admin')}</strong>, everything incl. budget, settings and users · <strong>${label(ROLES, 'staff')}</strong>, manage reports, locations, readings, actions, gallery · <strong>${label(ROLES, 'viewer')}</strong>, read-only.</div>`;
  };
  usersHost.addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-role]');
    if (!sel) return;
    try { await db.update('profiles', sel.dataset.role, { role: sel.value }); toast('Role updated', 'success'); }
    catch (err) { toast(friendlyError(err), 'error'); draw(); }
  });
  draw();
}
