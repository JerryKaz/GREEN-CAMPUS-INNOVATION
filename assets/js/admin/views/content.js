// Website Content: pilot results, water tariff, implementation phase, contact
// details and the project budget. Research findings live in Research Information.
import { esc, icon, panel, intro, statusChip } from '../ui.js';
import { toast } from '../../lib/dom.js';
import { friendlyError } from '../../lib/validate.js';
import { siteContent } from '../../lib/content.js';

const PILOT = [['location', 'Pilot location', 'text', 'Where WaterWatch was tested'], ['testing_date', 'Testing date', 'date', ''],
  ['users', 'Number of people who used it', 'number', ''], ['feedback', 'What users said', 'textarea', ''],
  ['problems', 'Problems found during the pilot', 'textarea', ''], ['improvements', 'Improvements made', 'textarea', '']];
const PHASES = ['Research and baseline measurement', 'Problem analysis and ideation', 'WaterWatch prototype development',
  'Pilot implementation', 'Measurement and evaluation', 'Improvement and wider adoption'];

export async function render({ db, el }) {
  const s = await siteContent(db);
  const v = (o, k) => esc(o?.[k] ?? '');
  const field = (name, lbl, val, type = 'text', hint = '') => `<div class="field"><label for="s-${name}">${esc(lbl)}</label>${type === 'textarea'
    ? `<textarea id="s-${name}" name="${name}" rows="3" maxlength="4000">${val}</textarea>`
    : `<input id="s-${name}" name="${name}" type="${type}" value="${val}" ${type === 'number' ? 'min="0" step="any"' : ''}>`}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
  const filled = (x) => x !== null && x !== undefined && String(x).trim() !== '';
  const pilotHas = PILOT.some(([k]) => filled(s.pilot?.[k]));

  el.innerHTML = `${intro('Edit the general information shown on the public website: pilot results, the water price used for savings, the current project phase, contact details and the budget. Research findings are entered in <a href="#/research">Research Information</a>.')}
    <form class="form" data-key="pilot">${panel('Pilot results (shown on the Solution page)', `<div class="panel__body form">
      <div class="section-card__head"><p class="small muted" style="margin:0;flex:1 1 300px">Fill this in after the pilot. Leave a box empty if you have nothing to report for it.</p>
        ${statusChip(!pilotHas ? 'empty' : s.pilot?.published ? 'published' : 'draft')}</div>
      ${PILOT.map(([k, t, type, hint]) => field(k, t, v(s.pilot, k), type, hint)).join('')}
      <div class="form-actions"><button class="btn btn--ghost" type="submit" data-mode="draft">Save Draft</button><button class="btn" type="submit" data-mode="publish">Save and Publish</button></div></div>`, { iconName: 'target' })}</form>
    <form class="form" data-key="tariff">${panel('Water price (used to estimate money saved)', `<div class="panel__body form">
      <p class="small muted" style="margin:0">Money saved is only shown when a price is entered <strong>and</strong> confirmed from an official source, such as a water bill.</p>
      <div class="form-row">${field('value', 'Price in GH₵', v(s.tariff, 'value'), 'number')}
        <div class="field"><label for="s-unit">Per</label><select id="s-unit" name="unit">
          <option value="m3" ${s.tariff?.unit !== 'L' ? 'selected' : ''}>cubic metre (m³ = 1,000 litres)</option><option value="L" ${s.tariff?.unit === 'L' ? 'selected' : ''}>litre</option></select></div></div>
      ${field('source', 'Where the price comes from', v(s.tariff, 'source'), 'text', 'e.g. VVU water bill, October 2026')}
      <label class="check"><input type="checkbox" name="verified" ${s.tariff?.verified ? 'checked' : ''}>I have checked this price against an official source</label>
      <div class="form-actions"><button class="btn" type="submit">Save Changes</button></div></div>`, { iconName: 'coins' })}</form>
    <form class="form" data-key="roadmap">${panel('Current project phase (shown on the Implementation page)', `<div class="panel__body form">
      <div class="field"><label for="s-phase">Which phase is the project in?</label><select id="s-phase" name="current_phase">
        <option value="">Not shown</option>
        ${PHASES.map((t, i) => `<option value="${i + 1}" ${Number(s.roadmap?.current_phase) === i + 1 ? 'selected' : ''}>Phase ${i + 1}: ${esc(t)}</option>`).join('')}</select></div>
      <div class="form-actions"><button class="btn" type="submit">Save Changes</button></div></div>`, { iconName: 'route' })}</form>
    <form class="form" data-key="contact">${panel('Contact details (shown on the Feedback page)', `<div class="panel__body form">
      <p class="small muted" style="margin:0">Only fill in details the group has agreed to publish. Empty boxes are simply not shown.</p>
      <div class="form-row">${field('email', 'Project email', v(s.contact, 'email'), 'email')}${field('phone', 'Phone number', v(s.contact, 'phone'), 'tel')}</div>
      <div class="form-row">${field('office', 'Office or meeting place', v(s.contact, 'office'))}${field('supervisor', 'Course or supervisor', v(s.contact, 'supervisor'))}</div>
      ${field('team', 'Group members', v(s.contact, 'team'), 'textarea', 'One name per line, only if the members agree.')}
      <div class="form-actions"><button class="btn" type="submit">Save Changes</button></div></div>`, { iconName: 'mail' })}</form>
    ${panel('Project budget', `<div class="panel__body"><p style="margin-top:0">List the project costs with whether each is an estimate, a quotation or an actual cost. They appear in the budget calculator on the Implementation page.</p>
      <a class="btn btn--ghost" href="#/budget">${icon('coins', 16)}Manage the Budget</a></div>`, { iconName: 'coins' })}`;

  let mode = '';
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); mode = b ? b.dataset.mode : ''; });
  const num = (x) => (x.value === '' ? null : Math.max(0, Math.round(Number(x.value))));
  const collect = {
    pilot: (f) => {
      const out = Object.fromEntries(PILOT.map(([k, , t]) => [k, t === 'number' ? num(f[k]) : f[k].value.trim()]));
      const has = PILOT.some(([k]) => filled(out[k]));
      if (mode === 'publish' && !has) throw new Error('Add some pilot information before publishing.');
      return { ...out, published: mode === 'publish' ? true : mode === 'draft' ? false : !!s.pilot?.published };
    },
    tariff: (f) => {
      const value = f.value.value === '' ? null : Number(f.value.value);
      if (value !== null && !(value > 0)) throw new Error('The price must be a number above zero.');
      if (f.verified.checked && (!value || !f.source.value.trim())) throw new Error('To mark the price as checked, enter both the price and where it comes from.');
      return { value, unit: f.unit.value, source: f.source.value.trim(), verified: f.verified.checked };
    },
    roadmap: (f) => ({ current_phase: f.current_phase.value ? Number(f.current_phase.value) : null }),
    contact: (f) => {
      const email = f.email.value.trim();
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');
      return { email, phone: f.phone.value.trim(), office: f.office.value.trim(), supervisor: f.supervisor.value.trim(), team: f.team.value.trim() };
    },
  };
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = e.target.dataset.key;
    try {
      const value = collect[key](e.target.elements);
      await db.saveSetting(key, value);
      toast(key === 'pilot' && mode === 'draft' ? 'Draft saved. It is not on the public website.' : 'Saved. The website now shows this information.', 'success');
      const fresh = el.cloneNode(false); // fresh element: no duplicate listeners
      el.replaceWith(fresh);
      render({ db, el: fresh });
    } catch (err) { toast(friendlyError(err), 'error'); }
  });
}
