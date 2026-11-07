// Shared admin building blocks: schema-driven form modals, tables, badges.
import { esc, openModal, fmtDate, fmtDateTime, demoBadge } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { bindForm, rules } from '../lib/validate.js';
import { label } from '../lib/labels.js';

export { esc, icon, fmtDate, fmtDateTime, demoBadge, label };

export const statusBadge = (map, v) => `<span class="badge badge--status-${esc(v)}">${esc(label(map, v))}</span>`;
export const sevBadge = (map, v) => `<span class="badge badge--sev-${esc(v)}">${esc(label(map, v))}</span>`;

const optionsHTML = (opts, value, placeholder) =>
  (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : '')
  + opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value ?? '') ? 'selected' : ''}>${esc(o.text)}</option>`).join('');

/** Render one field from a spec. */
function fieldHTML(f, value) {
  const id = `f-${f.name}`;
  const req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const hint = f.hint ? `<span class="hint" id="${id}-hint">${esc(f.hint)}</span>` : '';
  const desc = f.hint ? ` aria-describedby="${id}-hint"` : '';
  const err = `<span class="field-error" data-error-for="${esc(f.name)}"></span>`;
  const attrs = [f.min !== undefined && `min="${f.min}"`, f.max !== undefined && `max="${f.max}"`,
    f.step !== undefined && `step="${f.step}"`, f.maxLength && `maxlength="${f.maxLength}"`,
    f.list && `list="${id}-list"`, f.accept && `accept="${f.accept}"`, f.required && 'required'].filter(Boolean).join(' ');
  let control;
  switch (f.type) {
    case 'textarea':
      control = `<textarea id="${id}" name="${esc(f.name)}" rows="${f.rows ?? 4}" ${attrs}${desc}>${esc(value ?? '')}</textarea>`; break;
    case 'select':
      control = `<select id="${id}" name="${esc(f.name)}" ${attrs}${desc}>${optionsHTML(f.options, value, f.placeholder ?? (f.required ? 'Select…' : 'None'))}</select>`; break;
    case 'checkbox':
      return `<div class="field ${f.full ? 'field--full' : ''}"><label class="check"><input type="checkbox" name="${esc(f.name)}" ${value ? 'checked' : ''}>${esc(f.label)}</label>${hint}${err}</div>`;
    case 'file':
      control = `<input id="${id}" name="${esc(f.name)}" type="file" ${attrs}${desc}>`; break;
    default:
      control = `<input id="${id}" name="${esc(f.name)}" type="${f.type ?? 'text'}" value="${esc(value ?? '')}" ${attrs}${desc}>`;
  }
  const list = f.list ? `<datalist id="${id}-list">${f.list.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>` : '';
  return `<div class="field" data-field="${esc(f.name)}"><label for="${id}">${esc(f.label)}${req}${f.optional ? ' <span class="opt">(optional)</span>' : ''}</label>${control}${list}${hint}${err}</div>`;
}

/** Turn field specs into validator rules. */
function schemaFor(fields) {
  const schema = {};
  for (const f of fields) {
    const checks = [];
    if (f.required && f.type !== 'checkbox') checks.push(rules.required(`${f.label} is required.`));
    if (f.type === 'number') checks.push(rules.number({ min: f.min, max: f.max, integer: f.integer }));
    if (f.type === 'email') checks.push(rules.email());
    if (f.minLength) checks.push(rules.minLen(f.minLength));
    if (f.maxLength) checks.push(rules.maxLen(f.maxLength));
    if (f.type === 'select' && f.options) checks.push(rules.oneOf(f.options.map((o) => String(o.value))));
    if (f.validate) checks.push(f.validate);
    schema[f.name] = checks;
  }
  return schema;
}

/** Coerce raw form strings into typed values per the spec. */
function coerce(fields, raw) {
  const out = {};
  for (const f of fields) {
    if (f.type === 'file') { out[f.name] = raw[f.name] ?? null; continue; }
    let v = raw[f.name];
    if (f.type === 'checkbox') v = v === true;
    else if (f.type === 'number') v = v === '' || v === undefined ? null : Number(v);
    else if (typeof v === 'string') v = v.trim();
    if ((v === '' || v === undefined) && f.nullable) v = null;
    out[f.name] = v;
  }
  return out;
}

/**
 * Modal with a validated form. `layout` groups field names into rows of two.
 * onSubmit(values) may throw; the message appears in the form.
 */
export function formModal({ title, fields, values = {}, submitLabel = 'Save Changes', onSubmit, wide = false, intro = '', afterRender }) {
  const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
  const rows = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const next = fields[i + 1];
    if (f.half && next?.half) { rows.push(`<div class="form-row">${fieldHTML(f, values[f.name])}${fieldHTML(next, values[next.name])}</div>`); i++; }
    else rows.push(fieldHTML(f, values[f.name]));
  }
  const form = document.createElement('form');
  form.className = 'form';
  form.noValidate = true;
  form.innerHTML = `${intro}${rows.join('')}<p class="form-status" data-form-status aria-live="polite"></p>
    <div class="form-actions"><button type="button" class="btn btn--ghost" data-cancel>Cancel</button>
    <button type="submit" class="btn">${esc(submitLabel)}</button></div>`;
  const m = openModal({ title, body: form, wide });
  form.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  bindForm(form, (raw) => schemaFor(fields.filter((f) => !f.when || f.when(raw))), async (raw) => {
    const v = coerce(fields, raw);
    await onSubmit(v, form);
    m.close();
  }, { minFillMs: 0 });
  afterRender?.(form, m, byName);
  return m;
}

/**
 * Table with optional row click + per-row action buttons.
 * columns: [{ label, value(row) -> html, num, cls }]
 */
export function tableHTML({ columns, rows, actions, caption = '' }) {
  return `<div class="table-wrap"><table class="data">${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ''}
    <thead><tr>${columns.map((c) => `<th class="${c.num ? 'num' : ''}" scope="col">${esc(c.label)}</th>`).join('')}${actions ? '<th class="num"><span class="sr-only">Actions</span></th>' : ''}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr data-row="${i}">${columns.map((c) => `<td class="${c.num ? 'num' : ''} ${c.cls ?? ''}">${c.value(r)}</td>`).join('')}
      ${actions ? `<td class="num"><div class="row-actions">${actions(r, i)}</div></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}

export const actionBtn = (act, i, iconName, text, danger = false) =>
  `<button type="button" class="icon-btn icon-btn--sm ${danger ? 'icon-btn--danger' : ''}" data-act="${act}" data-i="${i}" aria-label="${esc(text)}" title="${esc(text)}">${icon(iconName, 16)}</button>`;

/** Delegate clicks on [data-act] buttons inside host to handlers[act](index). */
export function onActions(host, handlers) {
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !host.contains(b)) return;
    handlers[b.dataset.act]?.(Number(b.dataset.i), b);
  });
}

export const panel = (title, body, { tools = '', iconName } = {}) =>
  `<section class="panel"><div class="panel__head"><h2>${iconName ? icon(iconName, 18) : ''}${esc(title)}</h2>${tools ? `<div class="toolbar">${tools}</div>` : ''}</div>${body}</section>`;

export const selectHTML = (name, opts, value = '', placeholder = 'All', aria = name) =>
  `<select name="${esc(name)}" aria-label="${esc(aria)}">${optionsHTML(opts, value, placeholder)}</select>`;

export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export const readOnlyNote = () => `<p class="readonly-note">${icon('shield', 16)}Your role is read-only. Ask an administrator for Staff access to make changes.</p>`;

/**
 * Plain-language header for every admin section: what it is for, plus the main action.
 * `action` is HTML for the primary button (give it data-add so "?add=1" links can open it).
 */
export const intro = (text, action = '', extra = '') =>
  `<div class="page-intro"><div class="page-intro__text"><p>${text}</p>${extra}</div>${action ? `<div class="page-intro__action">${action}</div>` : ''}</div>`;

export const primaryBtn = (label, iconName = 'plus', attrs = 'data-add') =>
  `<button type="button" class="btn" ${attrs}>${icon(iconName, 18)}${esc(label)}</button>`;

/** Draft / published status chip used by Research Information and Website Content. */
export const statusChip = (state) => ({
  empty: '<span class="chip-status chip-status--empty">Not started</span>',
  draft: '<span class="chip-status chip-status--draft">Draft: not on the website</span>',
  published: '<span class="chip-status chip-status--live">Published on the website</span>',
}[state]);
