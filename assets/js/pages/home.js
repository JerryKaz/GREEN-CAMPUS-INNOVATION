import { initLayout } from '../layout.js';
import { loadPublicData, renderImpactStats } from '../components/stats.js';
import { renderVideoSlot } from '../components/video.js';
import { galleryImages } from '../lib/content.js';
import { esc } from '../lib/dom.js';

const { db } = await initLayout();
const $ = (id) => document.getElementById(id);

renderVideoSlot($('home-video'), db, 'documentary');

// Statistics appear only once real reports or readings have been recorded.
async function drawStats() {
  try {
    const data = await loadPublicData(db);
    const has = data.stats.reports_total > 0 || data.readings.length > 0;
    $('impact-section').hidden = !has;
    if (has) renderImpactStats($('impact-stats'), null, data);
  } catch (err) {
    console.error(err);
    $('impact-section').hidden = true;
  }
}
drawStats();
db.onChange(drawStats);

// "Moments from the field": the latest published photos, or nothing at all.
galleryImages(db).then((images) => {
  const pick = [...images].reverse().slice(0, 5);
  if (!pick.length) return;
  $('home-moments').innerHTML = pick.map((m) => `<figure class="frame reveal is-visible" style="margin:0">
    <img src="${esc(m.data_url || new URL(m.path, document.baseURI).href)}" alt="${esc(m.alt || m.caption || m.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"></figure>`).join('');
  $('moments-section').hidden = false;
}).catch(() => {});
