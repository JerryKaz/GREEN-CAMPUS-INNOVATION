// Site content the group edits without code: research findings, observations,
// interviews, pilot results, water tariff, roadmap phase and contact details.
// Saved to this browser's database and shown on the public pages of THIS device.
import { esc, icon, panel } from '../ui.js';
import { siteContent } from '../../lib/content.js';
import { toast } from '../../lib/dom.js';
import { friendlyError } from '../../lib/validate.js';

const FINDINGS = [['challenges', 'A. Identified water challenges'], ['processes', 'B. Existing water management processes'],
  ['causes', 'C. Causes of water wastage'], ['experiences', 'D. Student and staff experiences'], ['opportunities', 'E. Opportunities for process improvement']];
const PILOT = [['location', 'Pilot location', 'text'], ['testing_date', 'Testing date', 'date'], ['users', 'Number of users', 'number'],
  ['feedback', 'User feedback', 'textarea'], ['problems', 'Identified problems', 'textarea'], ['improvements', 'Improvements made', 'textarea']];
const PHASES = ['Research and baseline measurement', 'Problem analysis and ideation', 'WaterWatch prototype development',
  'Pilot implementation', 'Measurement and evaluation', 'Improvement and wider adoption'];
const SECTIONS = ['Research findings', 'Observations', 'Interviews', 'Pilot testing', 'Water tariff', 'Roadmap', 'Contact details'];

export async function render({ db, el }) {
  const s = await siteContent(db);
  const v = (o, k) => esc(o?.[k] ?? '');
  const field = (name, lbl, val, type = 'text', hint = '') => type === 'textarea'
    ? `<div class="field"><label for="s-${name}">${esc(lbl)}</label><textarea id="s-${name}" name="${name}" rows="4" maxlength="4000">${val}</textarea>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`
    : `<div class="field"><label for="s-${name}">${esc(lbl)}</label><input id="s-${name}" name="${name}" type="${type}" value="${val}" ${type === 'number' ? 'min="0" step="1"' : ''}>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
  const save = (key) => `<div class="form-actions"><button class="btn" type="submit" data-key="${key}">Save</button></div>`;

  el.innerHTML = `
    <div class="notice">${icon('info', 18)}<p>Publish only <strong>verified</strong> findings. Empty fields show a clear “awaiting data” message on the public site, so leave a field blank rather than guessing.
      Content saved here is stored in this browser; to publish it for every visitor, export a backup and keep it with the project files (see <a href="#/data">Data Management</a>).</p></div>
    <nav class="settings-nav" aria-label="Sections">${SECTIONS.map((t, i) => `<a class="chip" href="#/settings" data-jump="set-${i}">${t}</a>`).join('')}</nav>
    <form id="set-0" class="form">${panel('Research findings (Research page, sections A to E)', `<div class="panel__body form">
      ${FINDINGS.map(([k, t]) => field(k, t, v(s.research_findings, k), 'textarea')).join('')}${save('research_findings')}</div>`, { iconName: 'flask' })}</form>
    <form id="set-1" class="form">${panel('Baseline observations (Research page)', `<div class="panel__body form">
      <div class="form-row">${field('days_observed', 'Number of days observed', v(s.observations, 'days_observed'), 'number', 'The brief requires at least three days.')}
        ${field('period', 'Observation period', v(s.observations, 'period'), 'text', 'e.g. 6 to 8 October 2026')}</div>
      ${field('summary', 'Summary of observations', v(s.observations, 'summary'), 'textarea', 'What was seen at each location. Individual measurements belong in Water Readings.')}
      ${save('observations')}</div>`, { iconName: 'search' })}</form>
    <form id="set-2" class="form">${panel('Interview findings (Research page)', `<div class="panel__body form">
      <div class="form-row">${field('estates_count', 'Estates/Facilities staff interviewed', v(s.interviews, 'estates_count'), 'number')}
        ${field('students_count', 'Students interviewed', v(s.interviews, 'students_count'), 'number', 'The brief requires at least five.')}</div>
      ${field('estates_summary', 'What Estates/Facilities staff said', v(s.interviews, 'estates_summary'), 'textarea', 'Summarise; do not name interviewees without their consent.')}
      ${field('students_summary', 'What students said', v(s.interviews, 'students_summary'), 'textarea')}
      ${field('themes', 'Common themes across interviews', v(s.interviews, 'themes'), 'textarea')}
      ${save('interviews')}</div>`, { iconName: 'users' })}</form>
    <form id="set-3" class="form">${panel('Pilot testing (Our Solution page)', `<div class="panel__body form">
      ${PILOT.map(([k, t, type]) => field(k, t, v(s.pilot, k), type)).join('')}${save('pilot')}</div>`, { iconName: 'target' })}</form>
    <form id="set-4" class="form">${panel('Water tariff (savings calculations)', `<div class="panel__body form">
      <div class="form-row">${field('value', 'Tariff (GH₵ per unit)', v(s.tariff, 'value'), 'number')}
        <div class="field"><label for="s-unit">Per</label><select id="s-unit" name="unit">
          <option value="m3" ${s.tariff?.unit !== 'L' ? 'selected' : ''}>cubic metre (m³)</option><option value="L" ${s.tariff?.unit === 'L' ? 'selected' : ''}>litre (L)</option></select></div></div>
      ${field('source', 'Source', v(s.tariff, 'source'), 'text', 'e.g. the VVU water bill for a named month, or the published utility tariff.')}
      <label class="check"><input type="checkbox" name="verified" ${s.tariff?.verified ? 'checked' : ''}>This tariff has been verified against an official source</label>
      <p class="small muted" style="margin:0">Financial savings are calculated only when a tariff is entered <strong>and</strong> marked verified.</p>
      ${save('tariff')}</div>`, { iconName: 'coins' })}</form>
    <form id="set-5" class="form">${panel('Implementation roadmap', `<div class="panel__body form">
      <div class="field"><label for="s-phase">Current phase</label><select id="s-phase" name="current_phase">
        ${PHASES.map((t, i) => `<option value="${i + 1}" ${Number(s.roadmap?.current_phase) === i + 1 ? 'selected' : ''}>Phase ${i + 1}: ${esc(t)}</option>`).join('')}</select></div>
      ${save('roadmap')}</div>`, { iconName: 'route' })}</form>
    <form id="set-6" class="form">${panel('Project contact details (Feedback page)', `<div class="panel__body form">
      <p class="small muted" style="margin:0">Only publish contact details the group has agreed to share. The defaults for every visitor live in <span class="mono">public/data/site-content.json</span>.</p>
      <div class="form-row">${field('email', 'Project email', v(s.contact, 'email'), 'email')}${field('phone', 'Phone', v(s.contact, 'phone'), 'tel')}</div>
      <div class="form-row">${field('office', 'Office / location', v(s.contact, 'office'))}${field('supervisor', 'Course / supervisor', v(s.contact, 'supervisor'))}</div>
      ${field('team', 'Group members', v(s.contact, 'team'), 'textarea', 'One name per line, if the group wants names published.')}
      ${save('contact')}</div>`, { iconName: 'mail' })}</form>`;

  el.querySelector('.settings-nav').addEventListener('click', (e) => {
    const a = e.target.closest('[data-jump]');
    if (!a) return;
    e.preventDefault();
    el.querySelector(`#${a.dataset.jump}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const int = (x) => (x.value === '' ? null : Math.max(0, Math.round(Number(x.value))));
  const collect = {
    research_findings: (f) => Object.fromEntries(FINDINGS.map(([k]) => [k, f[k].value.trim()])),
    observations: (f) => ({ days_observed: int(f.days_observed), period: f.period.value.trim(), summary: f.summary.value.trim() }),
    interviews: (f) => ({ estates_count: int(f.estates_count), students_count: int(f.students_count),
      estates_summary: f.estates_summary.value.trim(), students_summary: f.students_summary.value.trim(), themes: f.themes.value.trim() }),
    pilot: (f) => Object.fromEntries(PILOT.map(([k, , t]) => [k, t === 'number' ? int(f[k]) : f[k].value.trim()])),
    tariff: (f) => {
      const value = f.value.value === '' ? null : Number(f.value.value);
      if (value !== null && !(value > 0)) throw new Error('Tariff must be a positive number.');
      if (f.verified.checked && (!value || !f.source.value.trim())) throw new Error('A verified tariff needs both a value and a source.');
      return { value, unit: f.unit.value, source: f.source.value.trim(), verified: f.verified.checked };
    },
    roadmap: (f) => ({ current_phase: Number(f.current_phase.value) }),
    contact: (f) => {
      const email = f.email.value.trim();
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');
      return { email, phone: f.phone.value.trim(), office: f.office.value.trim(), supervisor: f.supervisor.value.trim(), team: f.team.value.trim() };
    },
  };
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = e.target.querySelector('[data-key]')?.dataset.key;
    if (!key) return;
    try { await db.saveSetting(key, collect[key](e.target)); toast('Saved. Public pages on this device now show it.', 'success'); }
    catch (err) { toast(friendlyError(err), 'error'); }
  });
}
