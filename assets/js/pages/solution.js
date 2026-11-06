import { initLayout } from '../layout.js';
import { esc, fmtDate, fmtNum, errorHTML } from '../lib/dom.js';
import { initReportForm } from '../components/report-form.js';
import { renderVideo } from '../components/video.js';

const { db } = await initLayout();

initReportForm(document.getElementById('report-form'), db);

const PILOT_FIELDS = [
  ['location', 'Pilot location'], ['testing_date', 'Testing date'], ['users', 'Number of users'],
  ['feedback', 'User feedback'], ['problems', 'Identified problems'], ['improvements', 'Improvements made'],
];

db.settings().then((s) => {
  renderVideo(document.getElementById('video-solution'), s.videos?.solution_url, 'video-solution');

  const p = s.pilot ?? {};
  const has = (k) => p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== '';
  const value = (k) => (k === 'testing_date' ? fmtDate(p[k]) : k === 'users' ? fmtNum(p[k]) : p[k]);
  document.getElementById('pilot').innerHTML = `<div class="grid grid--3">${PILOT_FIELDS.map(([k, title]) => `
    <div class="card"><h3>${esc(title)}</h3>${has(k)
      ? `<p class="prose-block">${esc(value(k))}</p>`
      : '<div class="placeholder">Results will be published after the pilot.</div>'}</div>`).join('')}</div>`;
}).catch((e) => { document.getElementById('pilot').innerHTML = errorHTML(e.message); });
