// Renders the administrator's research information. Shared by the public
// Research page and the admin "Preview" so both always look the same.
import { esc, fmtDate } from './dom.js';
import { icon } from './icons.js';

export const FINDINGS = [
  ['challenges', 'Identified water challenges'],
  ['processes', 'Existing water management processes'],
  ['causes', 'Causes of water wastage'],
  ['experiences', 'Student and staff experiences'],
  ['opportunities', 'Opportunities for process improvement'],
];
export const INTERVIEW_GROUPS = { estates: 'Estates/Facilities staff', student: 'Students', other: 'Other stakeholders' };

const filled = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const para = (t) => `<p class="prose-block">${esc(t)}</p>`;
const range = (a, b) => (b && b !== a ? `${fmtDate(a)} to ${fmtDate(b)}` : fmtDate(a));

/** A calm, professional empty state (no warning colours). */
export const quietEmpty = (text, iconName = 'leaf') =>
  `<div class="empty-note">${icon(iconName, 22)}<p>${esc(text)}</p></div>`;

/** Which sections have content AND are published (or, with { drafts: true }, have content). */
export function researchSections(r = {}, { drafts = false } = {}) {
  const pub = r.published ?? {};
  const show = (key, has) => has && (drafts || pub[key]);
  return {
    overview: show('overview', [r.title, r.background, r.problem, r.objectives].some(filled)),
    methodology: show('methodology', filled(r.methodology)),
    findings: show('findings', FINDINGS.some(([k]) => filled(r.findings?.[k]))),
    observations: show('observations', (r.observations ?? []).length > 0),
    interviews: show('interviews', (r.interviews ?? []).length > 0),
    recommendations: show('recommendations', filled(r.recommendations)),
  };
}

export function overviewHTML(r) {
  return `<div class="research-block">
    ${filled(r.title) ? `<h3 class="research-title">${esc(r.title)}</h3>` : ''}
    <div class="grid grid--2">
      ${filled(r.background) ? `<div><h4>Background</h4>${para(r.background)}</div>` : ''}
      ${filled(r.problem) ? `<div><h4>Problem statement</h4>${para(r.problem)}</div>` : ''}
    </div>
    ${filled(r.objectives) ? `<h4>Research objectives</h4>${para(r.objectives)}` : ''}
  </div>`;
}

export function methodologyHTML(r) {
  return `${para(r.methodology)}${filled(r.methodology_source) ? `<p class="small muted">Collection method: ${esc(r.methodology_source)}</p>` : ''}`;
}

export function findingsHTML(r) {
  return `<div class="findings">${FINDINGS.filter(([k]) => filled(r.findings?.[k])).map(([k, title], i) => `
    <article class="finding"><h3><span class="letter">${String.fromCharCode(65 + i)}.</span>${esc(title)}</h3>${para(r.findings[k])}</article>`).join('')}</div>`;
}

export function observationsHTML(r) {
  const list = [...(r.observations ?? [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const days = new Set(list.map((o) => o.date)).size;
  return `<p class="small muted">${list.length} observation${list.length === 1 ? '' : 's'} across ${days} day${days === 1 ? '' : 's'}.</p>
    <ol class="entry-list">${list.map((o) => `<li><div class="entry-list__meta">${icon('calendar', 16)}<strong>${esc(range(o.date, o.end_date))}</strong>${o.location ? ` · ${esc(o.location)}` : ''}</div>
      ${para(o.description)}${o.method ? `<p class="small muted">Method: ${esc(o.method)}</p>` : ''}</li>`).join('')}</ol>`;
}

export function interviewsHTML(r) {
  const list = r.interviews ?? [];
  const total = (g) => list.filter((i) => i.group === g).reduce((s, i) => s + (Number(i.participants) || 0), 0);
  const counts = Object.entries(INTERVIEW_GROUPS).map(([g, t]) => [t, total(g)]).filter(([, n]) => n > 0);
  return `${counts.length ? `<p class="small muted">${counts.map(([t, n]) => `${esc(t)}: ${n}`).join(' · ')}</p>` : ''}
    <div class="grid grid--2">${list.map((i) => `<article class="card"><span class="badge">${esc(INTERVIEW_GROUPS[i.group] ?? 'Interview')}</span>
      <p class="small muted" style="margin:10px 0 0">${i.date ? esc(fmtDate(i.date)) : ''}${i.participants ? ` · ${esc(i.participants)} participant${Number(i.participants) === 1 ? '' : 's'}` : ''}${i.method ? ` · ${esc(i.method)}` : ''}</p>
      ${para(i.summary)}</article>`).join('')}</div>`;
}

export function recommendationsHTML(r) { return para(r.recommendations); }

/** Full research block as it appears on the public site. */
export function researchHTML(r, opts) {
  const s = researchSections(r, opts);
  const part = (on, title, body) => (on ? `<section class="research-part"><h3>${esc(title)}</h3>${body}</section>` : '');
  return [
    s.overview ? overviewHTML(r) : '',
    part(s.methodology, 'How the research was carried out', methodologyHTML(r)),
    part(s.findings, 'Findings', findingsHTML(r)),
    part(s.observations, 'Field observations', observationsHTML(r)),
    part(s.interviews, 'Interview summaries', interviewsHTML(r)),
    part(s.recommendations, 'Recommendations', recommendationsHTML(r)),
  ].join('');
}

export const RESEARCH_EMPTY = 'Field research information will be published here once observations and measurements have been recorded.';
