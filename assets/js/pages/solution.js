import { initLayout } from '../layout.js';
import { CONFIG, includeDemo } from '../data/db.js';
import { esc, fmtDate, fmtNum, errorHTML, emptyHTML } from '../lib/dom.js';
import { initReportForm } from '../components/report-form.js';
import { renderVideoSlot } from '../components/video.js';
import { plotHotspots, MAP_LEGEND } from '../components/map.js';
import { SAMPLE_CHIP } from '../components/stats.js';
import { siteContent } from '../lib/content.js';

const { db } = await initLayout();

initReportForm(document.getElementById('report-form'), db);
renderVideoSlot(document.getElementById('video-solution'), db, 'solution-demo');

const PILOT_FIELDS = [
  ['location', 'Pilot location'], ['testing_date', 'Testing date'], ['users', 'Number of users'],
  ['feedback', 'User feedback'], ['problems', 'Identified problems'], ['improvements', 'Improvements made'],
];

siteContent(db).then((s) => {
  const p = s.pilot ?? {};
  const has = (k) => p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== '';
  const value = (k) => (k === 'testing_date' ? fmtDate(p[k]) : k === 'users' ? fmtNum(p[k]) : p[k]);
  document.getElementById('pilot').innerHTML = `<div class="grid grid--3">${PILOT_FIELDS.map(([k, title]) => `
    <div class="card"><h3>${esc(title)}</h3>${has(k)
      ? `<p class="prose-block">${esc(value(k))}</p>`
      : '<div class="placeholder">Results will be published after the pilot.</div>'}</div>`).join('')}</div>`;
}).catch((e) => { document.getElementById('pilot').innerHTML = errorHTML(e.message); });

(async () => {
  const mapEl = document.getElementById('sol-map');
  try {
    const rows = await db.publicHotspots(includeDemo());
    if (rows.some((r) => r.is_demo)) document.getElementById('sol-map-notice').innerHTML = SAMPLE_CHIP;
    if (!rows.length) {
      mapEl.outerHTML = `<div class="placeholder">${emptyHTML('No mapped hotspots yet', 'Locations appear once the group adds verified places with coordinates.', 'pin')}</div>`;
      return;
    }
    await plotHotspots(mapEl, rows, { center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM });
    document.getElementById('sol-map-legend').innerHTML = MAP_LEGEND;
  } catch (err) {
    console.error(err);
    mapEl.innerHTML = errorHTML('The map could not be loaded (it needs an internet connection for map tiles).');
  }
})();
