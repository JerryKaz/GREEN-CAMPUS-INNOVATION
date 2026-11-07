// Admin dashboard: progress overview (what has been entered, what is still awaiting
// fieldwork), quick actions and recently added information. No invented figures.
import { esc, icon, fmtDateTime, panel, intro } from '../ui.js';
import { fmtNum } from '../../lib/dom.js';
import { ISSUE_TYPES, PHASES, label } from '../../lib/labels.js';
import { siteContent } from '../../lib/content.js';
import { galleryImages, galleryVideos } from '../../lib/content.js';

export async function render({ db, el, navigate }) {
  const [reports, readings, actions, pledges, feedback, locations, content, images, videos] = await Promise.all([
    db.list('water_reports'), db.list('water_readings'), db.list('conservation_actions'), db.list('pledges'),
    db.list('feedback'), db.list('campus_locations'), siteContent(db), galleryImages(db), galleryVideos(db),
  ]);
  const real = (a) => a.filter((r) => !r.is_demo);
  const R = { reports: real(reports), readings: real(readings), actions: real(actions), pledges: real(pledges), feedback: real(feedback), locations: real(locations) };
  const r = content.research ?? {};
  const pub = r.published ?? {};
  const baselineDays = new Set(R.readings.filter((w) => w.phase === 'baseline').map((w) => w.reading_date)).size;
  const filled = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const st = (has, published) => (!has ? 'Awaiting fieldwork data' : published === false ? 'Saved as a draft' : 'Information added');

  const items = [
    { route: 'research', t: 'Research background and objectives', has: [r.background, r.problem, r.objectives].some(filled), pub: pub.overview },
    { route: 'research', t: 'Research methodology', has: filled(r.methodology), pub: pub.methodology },
    { route: 'research', t: 'Field observations', has: (r.observations ?? []).length > 0, pub: pub.observations, note: (r.observations ?? []).length ? `${r.observations.length} recorded` : '' },
    { route: 'research', t: 'Interview summaries', has: (r.interviews ?? []).length > 0, pub: pub.interviews, note: (r.interviews ?? []).length ? `${r.interviews.length} recorded` : '' },
    { route: 'research', t: 'Findings and recommendations', has: Object.values(r.findings ?? {}).some(filled) || filled(r.recommendations), pub: pub.findings || pub.recommendations },
    { route: 'readings', t: 'Baseline water readings', has: baselineDays > 0, note: baselineDays ? `${baselineDays} day(s)${baselineDays < 3 ? ', at least 3 needed' : ''}` : '' },
    { route: 'readings', t: 'Pilot water readings', has: R.readings.some((w) => w.phase === 'pilot') },
    { route: 'locations', t: 'Verified campus hotspots', has: R.locations.some((l) => l.is_verified), note: R.locations.length ? `${R.locations.filter((l) => l.is_verified).length} of ${R.locations.length} verified` : '' },
    { route: 'actions', t: 'Conservation actions', has: R.actions.length > 0, note: R.actions.length ? `${R.actions.length} recorded` : '' },
    { route: 'media', t: 'Research photographs', has: images.length > 0, note: images.length ? `${images.length} photo(s)` : '' },
    { route: 'media', t: 'Project videos', has: videos.some((v) => v.url), note: videos.filter((v) => v.url).length ? `${videos.filter((v) => v.url).length} link(s)` : '' },
    { route: 'content', t: 'Contact details', has: Object.values(content.contact ?? {}).some(filled) },
  ];
  const done = items.filter((i) => i.has).length;

  // Recently added: newest records across collections (real records only).
  const recent = [
    ...R.readings.map((w) => ({ at: w.created_at, ic: 'gauge', t: `${label(PHASES, w.phase)} water reading for ${w.reading_date}`, route: 'readings' })),
    ...R.locations.map((l) => ({ at: l.created_at, ic: 'pin', t: `Campus location: ${l.name}`, route: 'locations' })),
    ...R.actions.map((a) => ({ at: a.created_at, ic: 'wrench', t: `Conservation action: ${a.action_description}`, route: 'actions' })),
    ...R.reports.map((x) => ({ at: x.submitted_at, ic: 'alert', t: `Water problem report ${x.reference_number}: ${label(ISSUE_TYPES, x.issue_type)}`, route: 'reports' })),
    ...R.pledges.map((p) => ({ at: p.submitted_at, ic: 'heart', t: 'New pledge received', route: 'community' })),
    ...R.feedback.map((f) => ({ at: f.submitted_at, ic: 'message', t: 'New feedback received', route: 'community' })),
    ...images.filter((m) => m.__source === 'local').map((m) => ({ at: m.created_at, ic: 'image', t: `Photo: ${m.title}`, route: 'media' })),
  ].filter((x) => x.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);

  const hasRecords = Object.values(R).some((a) => a.length);
  const kpi = (ic, t, v, href) => `<a class="stat" href="#/${href}" style="text-decoration:none;color:inherit"><span class="stat__label">${icon(ic, 16)}${esc(t)}</span><span class="stat__value">${fmtNum(v)}</span></a>`;

  el.innerHTML = `
    ${intro('This is your starting point. See which parts of the project already have information, jump straight to a task, and check what was added most recently.',
      `<button type="button" class="btn btn--ghost" data-start-tour>${icon('compass', 18)}Take the Tour</button>`)}
    <div class="cols-2">
      ${panel('Progress overview', `<p class="small muted" style="padding:12px 20px 0;margin:0">${done} of ${items.length} parts have information. Items marked “Awaiting fieldwork data” are completed as the group collects it.</p>
        <ul class="progress-list">${items.map((i) => `<li class="${i.has ? 'is-done' : ''}"><span class="tick">${icon(i.has ? 'check' : 'clipboard', 14)}</span>
          <span class="label">${esc(i.t)}<small>${esc(st(i.has, i.has && i.pub === false ? false : undefined))}${i.note ? ` · ${esc(i.note)}` : ''}</small></span>
          <a class="btn btn--ghost btn--sm" href="#/${i.route}">${i.has ? 'Open' : 'Add'}</a></li>`).join('')}</ul>`, { iconName: 'clipboard' })}
      <div>
        ${panel('Quick actions', `<div class="quick-actions">
          <a class="btn btn--ghost" href="#/readings?add=1">${icon('gauge', 18)}Add Water Reading</a>
          <a class="btn btn--ghost" href="#/locations?add=1">${icon('pin', 18)}Add a Campus Location</a>
          <a class="btn btn--ghost" href="#/actions?add=1">${icon('wrench', 18)}Add Conservation Action</a>
          <a class="btn btn--ghost" href="#/media?add=1">${icon('upload', 18)}Upload Photo</a>
          <a class="btn btn--ghost" href="#/research">${icon('flask', 18)}Edit Research Information</a>
          <a class="btn btn--ghost" href="#/data">${icon('download', 18)}Download Backup</a></div>`, { iconName: 'plus' })}
        ${panel('Recently added', recent.length ? `<ul class="activity" style="padding:0 20px">${recent.map((x) => `<li>${icon(x.ic, 18)}<a href="#/${x.route}">${esc(x.t)}</a><span class="when">${esc(fmtDateTime(x.at))}</span></li>`).join('')}</ul>`
          : '<p class="muted" style="padding:16px 20px;margin:0">Nothing has been added yet. Use the quick actions to enter your first information.</p>', { iconName: 'refresh' })}
      </div>
    </div>
    ${hasRecords ? `<div class="kpis">
      ${kpi('gauge', 'Water readings', R.readings.length, 'readings')}
      ${kpi('pin', 'Campus locations', R.locations.length, 'locations')}
      ${kpi('wrench', 'Conservation actions', R.actions.length, 'actions')}
      ${kpi('alert', 'Water problem reports', R.reports.length, 'reports')}
      ${kpi('heart', 'Pledges', R.pledges.length, 'community')}
      ${kpi('message', 'Feedback messages', R.feedback.length, 'community')}
    </div>
    <p><a class="btn btn--ghost btn--sm" href="#/analytics">${icon('chart', 16)}Detailed reports and charts</a></p>` : ''}`;
}
