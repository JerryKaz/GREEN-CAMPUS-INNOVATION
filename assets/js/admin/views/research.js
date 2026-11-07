// Research Information: background, methodology, observations, interviews,
// findings and recommendations. Each section can be saved as a draft or published.
import { esc, icon, panel, intro, statusChip, formModal, fmtDate } from '../ui.js';
import { toast, confirmDialog, openModal } from '../../lib/dom.js';
import { friendlyError, rules } from '../../lib/validate.js';
import { siteContent } from '../../lib/content.js';
import { DEFAULT_SETTINGS } from '../../data/store.js';
import { FINDINGS, INTERVIEW_GROUPS, overviewHTML, methodologyHTML, findingsHTML, observationsHTML, interviewsHTML, recommendationsHTML } from '../../lib/research-view.js';

const filled = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const uid = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const TEXT_SECTIONS = {
  overview: {
    title: 'Background, problem and objectives', icon: 'book',
    help: 'Explain why the research matters, the problem the group investigated, and what it set out to find.',
    fields: [
      ['title', 'Research title', 'text', 'e.g. Reducing water wastage in VVU hostels'],
      ['background', 'Research background', 'textarea', 'The situation on campus before the project, in a few sentences.'],
      ['problem', 'Problem statement', 'textarea', 'The specific water problem the group investigated.'],
      ['objectives', 'Research objectives', 'textarea', 'One objective per line.'],
    ],
    has: (r) => [r.title, r.background, r.problem, r.objectives].some(filled), html: overviewHTML,
  },
  methodology: {
    title: 'Research methodology', icon: 'route',
    help: 'Describe how the information was collected: where, when, how often and with what tools.',
    fields: [
      ['methodology', 'How the research was carried out', 'textarea', 'e.g. Water use was measured daily at four locations for three days using the bucket-and-stopwatch method…'],
      ['methodology_source', 'Collection method (short)', 'text', 'e.g. Direct observation, meter readings and interviews'],
    ],
    has: (r) => filled(r.methodology), html: methodologyHTML,
  },
  findings: {
    title: 'Findings', icon: 'flask',
    help: 'Write only findings the group has checked. Leave a box empty if you have nothing verified for it yet.',
    fields: FINDINGS.map(([k, t]) => [`findings.${k}`, t, 'textarea', '']),
    has: (r) => FINDINGS.some(([k]) => filled(r.findings?.[k])), html: findingsHTML,
  },
  recommendations: {
    title: 'Recommendations', icon: 'bulb',
    help: 'What the group recommends Valley View University should do, based on the findings.',
    fields: [['recommendations', 'Recommendations', 'textarea', 'One recommendation per line.']],
    has: (r) => filled(r.recommendations), html: recommendationsHTML,
  },
};

export async function render({ db, el }) {
  const content = await siteContent(db);
  let r = structuredClone({ ...DEFAULT_SETTINGS.research, ...(content.research ?? {}) });
  r.published = { ...DEFAULT_SETTINGS.research.published, ...(r.published ?? {}) };
  r.findings = { ...DEFAULT_SETTINGS.research.findings, ...(r.findings ?? {}) };
  r.observations ??= [];
  r.interviews ??= [];

  const get = (path) => path.split('.').reduce((o, k) => o?.[k], r);
  const set = (path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], r)[last] = v; };
  const state = (key, has) => (!has ? 'empty' : r.published[key] ? 'published' : 'draft');
  const persist = async (msg) => { await db.saveSetting('research', structuredClone(r)); toast(msg, 'success'); draw(); };

  const preview = (key) => {
    const html = key === 'observations' ? observationsHTML(r) : key === 'interviews' ? interviewsHTML(r) : TEXT_SECTIONS[key].html(r);
    openModal({ title: 'Preview: how this will look on the website', wide: true, body: `<div class="preview-frame">${html}</div>` });
  };
  const sectionButtons = (key, has) => `<div class="section-card__actions">
    ${has ? `<button type="button" class="btn btn--ghost btn--sm" data-preview="${key}">${icon('eye', 16)}Preview</button>` : ''}
    ${has && r.published[key] ? `<button type="button" class="btn btn--ghost btn--sm" data-unpublish="${key}">Hide from website</button>` : ''}
    ${has && !r.published[key] ? `<button type="button" class="btn btn--sm" data-publish="${key}">${icon('upload', 16)}Publish</button>` : ''}</div>`;

  const textPanel = (key) => {
    const s = TEXT_SECTIONS[key];
    const has = s.has(r);
    return panel(s.title, `<form class="panel__body form" data-text="${key}" novalidate>
      <div class="section-card__head"><p class="small muted" style="margin:0;flex:1 1 300px">${esc(s.help)}</p>${statusChip(state(key, has))}</div>
      ${s.fields.map(([path, labelText, type, hint]) => {
        const id = `rs-${path.replace('.', '-')}`;
        const v = esc(get(path) ?? '');
        return `<div class="field"><label for="${id}">${esc(labelText)}</label>${type === 'textarea'
          ? `<textarea id="${id}" name="${path}" rows="4" maxlength="6000">${v}</textarea>`
          : `<input id="${id}" name="${path}" type="text" maxlength="200" value="${v}">`}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
      }).join('')}
      <div class="form-actions" style="justify-content:space-between;flex-wrap:wrap">
        ${sectionButtons(key, has)}
        <span style="display:flex;gap:8px;flex-wrap:wrap"><button type="submit" class="btn btn--ghost" data-mode="draft">Save Draft</button>
        <button type="submit" class="btn" data-mode="publish">Save and Publish</button></span></div>
    </form>`, { iconName: s.icon });
  };

  const listPanel = (key) => {
    const isObs = key === 'observations';
    const list = isObs ? [...r.observations].sort((a, b) => String(a.date).localeCompare(String(b.date))) : r.interviews;
    const has = list.length > 0;
    const days = new Set(r.observations.map((o) => o.date)).size;
    const help = isObs
      ? `Add one entry for each day or visit: the date, where you observed and what you saw. ${days ? `<strong>${days} day(s) recorded${days < 3 ? ' (at least 3 are recommended)' : ''}.</strong>` : ''}`
      : 'Add a short summary for each interview or group of interviews. Summarise what people actually said.';
    return panel(isObs ? 'Field observations' : 'Interview summaries', `<div class="panel__body">
      <div class="section-card__head" style="margin-bottom:12px"><p class="small muted" style="margin:0;flex:1 1 300px">${help}</p>${statusChip(state(key, has))}</div>
      ${has ? `<ul class="item-list">${list.map((x) => `<li><span class="note__icon">${icon(isObs ? 'calendar' : 'users', 16)}</span><div class="item-body">
          <strong>${isObs ? `${esc(fmtDate(x.date))}${x.end_date && x.end_date !== x.date ? ` to ${esc(fmtDate(x.end_date))}` : ''}${x.location ? ` · ${esc(x.location)}` : ''}`
            : `${esc(INTERVIEW_GROUPS[x.group] ?? 'Interview')}${x.participants ? ` · ${esc(x.participants)} person(s)` : ''}${x.date ? ` · ${esc(fmtDate(x.date))}` : ''}`}</strong>
          <p>${esc(isObs ? x.description : x.summary)}</p>${x.method ? `<span class="small muted">Method: ${esc(x.method)}</span>` : ''}</div>
          <span class="row-actions"><button type="button" class="icon-btn icon-btn--sm" data-edit-${key}="${esc(x.id)}" aria-label="Edit">${icon('edit', 16)}</button>
          <button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-del-${key}="${esc(x.id)}" aria-label="Delete">${icon('trash', 16)}</button></span></li>`).join('')}</ul>`
        : `<p class="muted" style="margin:0">Nothing added yet.</p>`}
      <div class="form-actions" style="justify-content:space-between;flex-wrap:wrap">${sectionButtons(key, has)}
        <button type="button" class="btn" data-add-${key}>${icon('plus', 16)}${isObs ? 'Add Observation' : 'Add Interview Summary'}</button></div>
    </div>`, { iconName: isObs ? 'search' : 'users' });
  };

  const draw = () => {
    el.innerHTML = `${intro('Enter the information collected during your fieldwork. Nothing appears on the public website until you choose <strong>Save and Publish</strong> (or <strong>Publish</strong>) for that part. Use <strong>Save Draft</strong> to keep unfinished work private, and <strong>Preview</strong> to see how it will look.')}
      ${textPanel('overview')}${textPanel('methodology')}${listPanel('observations')}${listPanel('interviews')}${textPanel('findings')}${textPanel('recommendations')}`;
  };

  // ---- events --------------------------------------------------------------
  let submitMode = 'draft';
  el.addEventListener('click', (e) => { const m = e.target.closest('[data-mode]'); if (m) submitMode = m.dataset.mode; });
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = e.target.dataset.text;
    if (!key) return;
    try {
      for (const [path] of TEXT_SECTIONS[key].fields) set(path, e.target.elements[path].value.trim());
      const has = TEXT_SECTIONS[key].has(r);
      if (submitMode === 'publish' && !has) throw new Error('Add some information before publishing this part.');
      r.published[key] = submitMode === 'publish' ? true : r.published[key] && has;
      await persist(submitMode === 'publish' ? 'Saved and published on the website.' : 'Draft saved. It is not on the public website.');
    } catch (err) { toast(friendlyError(err), 'error'); }
  });

  const obsFields = [
    { name: 'date', label: 'Date of observation', type: 'date', required: true, half: true, validate: rules.notFuture('This date is in the future.') },
    { name: 'end_date', label: 'End date (if it covered several days)', type: 'date', optional: true, half: true,
      validate: (v, all) => (v && all.date && v < all.date ? 'The end date must be after the start date.' : null) },
    { name: 'location', label: 'Where', maxLength: 160, required: true, hint: 'e.g. Hostel A washrooms, ground floor' },
    { name: 'description', label: 'What was observed', type: 'textarea', rows: 4, required: true, minLength: 5, maxLength: 3000 },
    { name: 'method', label: 'How it was observed (source / collection method)', maxLength: 160, optional: true, hint: 'e.g. Walk-through, photos, bucket-and-stopwatch' },
  ];
  const intFields = [
    { name: 'group', label: 'Who was interviewed', type: 'select', required: true, options: Object.entries(INTERVIEW_GROUPS).map(([value, text]) => ({ value, text })), half: true },
    { name: 'participants', label: 'Number of people', type: 'number', min: 1, max: 500, integer: true, required: true, half: true },
    { name: 'date', label: 'Interview date', type: 'date', optional: true, half: true, validate: rules.notFuture('This date is in the future.') },
    { name: 'method', label: 'Interview method', maxLength: 160, optional: true, half: true, hint: 'e.g. Face to face, phone, questionnaire' },
    { name: 'summary', label: 'Summary of what they said', type: 'textarea', rows: 5, required: true, minLength: 10, maxLength: 4000,
      hint: 'Do not include names unless the person agreed to be named.' },
  ];
  const openItem = (key, item) => formModal({
    title: `${item ? 'Edit' : 'Add'} ${key === 'observations' ? 'Observation' : 'Interview Summary'}`, wide: true,
    fields: key === 'observations' ? obsFields : intFields, values: item ?? (key === 'interviews' ? { group: 'student', participants: 1 } : {}),
    onSubmit: async (v) => {
      if (item) Object.assign(item, v); else r[key].push({ id: uid(), ...v });
      await persist(r.published[key] ? 'Saved. The website shows the updated list.' : 'Saved as a draft. Publish this part when it is ready.');
    },
  });

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    try {
      if (d.preview) preview(d.preview);
      if (d.publish) { r.published[d.publish] = true; await persist('Published on the website.'); }
      if (d.unpublish) { r.published[d.unpublish] = false; await persist('Hidden from the website. Your information is still saved.'); }
      for (const key of ['observations', 'interviews']) {
        if (t.hasAttribute(`data-add-${key}`)) openItem(key, null);
        const editId = t.getAttribute(`data-edit-${key}`);
        if (editId) openItem(key, r[key].find((x) => x.id === editId));
        const delId = t.getAttribute(`data-del-${key}`);
        if (delId && await confirmDialog('Delete this entry? This cannot be undone (unless you restore a backup).', { confirmLabel: 'Delete', danger: true })) {
          r[key] = r[key].filter((x) => x.id !== delId);
          if (!r[key].length) r.published[key] = false;
          await persist('Entry deleted.');
        }
      }
    } catch (err) { toast(friendlyError(err), 'error'); }
  });

  draw();
}
