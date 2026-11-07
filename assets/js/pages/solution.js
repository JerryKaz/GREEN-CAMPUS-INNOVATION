import { initLayout } from '../layout.js';
import { CONFIG } from '../data/db.js';
import { esc, fmtDate, fmtNum } from '../lib/dom.js';
import { initReportForm } from '../components/report-form.js';
import { renderVideoSlot } from '../components/video.js';
import { plotHotspots, MAP_LEGEND } from '../components/map.js';
import { quietEmpty } from '../lib/research-view.js';
import { siteContent } from '../lib/content.js';

const { db } = await initLayout();

initReportForm(document.getElementById('report-form'), db);
renderVideoSlot(document.getElementById('video-solution'), db, 'solution-demo')
  .then((ok) => { document.getElementById('watch-demo').hidden = !ok; });

const PILOT_FIELDS = [
  ['location', 'Pilot location'], ['testing_date', 'Testing date'], ['users', 'Number of users'],
  ['feedback', 'User feedback'], ['problems', 'Identified problems'], ['improvements', 'Improvements made'],
];

const pilotEmpty = quietEmpty('Pilot results will be published here after the pilot has been carried out.', 'target');
siteContent(db).then((s) => {
  const p = s.pilot ?? {};
  const has = (k) => p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== '';
  const fields = PILOT_FIELDS.filter(([k]) => has(k));
  if (!p.published || !fields.length) { document.getElementById('pilot').innerHTML = pilotEmpty; return; }
  const value = (k) => (k === 'testing_date' ? fmtDate(p[k]) : k === 'users' ? fmtNum(p[k]) : p[k]);
  document.getElementById('pilot').innerHTML = `<div class="grid grid--3">${fields.map(([k, title]) => `
    <div class="card"><h3>${esc(title)}</h3><p class="prose-block">${esc(value(k))}</p></div>`).join('')}</div>`;
}).catch(() => { document.getElementById('pilot').innerHTML = pilotEmpty; });

(async () => {
  const mapEl = document.getElementById('sol-map');
  try {
    const rows = await db.publicHotspots();
    if (!rows.length) { mapEl.outerHTML = quietEmpty('No verified water conservation hotspots have been added yet.', 'pin'); return; }
    await plotHotspots(mapEl, rows, { center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM });
    document.getElementById('sol-map-legend').innerHTML = MAP_LEGEND;
  } catch (err) {
    console.error(err);
    mapEl.outerHTML = quietEmpty('The map needs an internet connection to load.', 'pin');
  }
})();
