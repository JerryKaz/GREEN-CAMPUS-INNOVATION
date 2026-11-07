import { initLayout } from '../layout.js';
import { loadPublicData, renderImpactStats, renderStatsError } from '../components/stats.js';
import { renderVideoSlot } from '../components/video.js';
import { icon } from '../lib/icons.js';

const { db } = await initLayout();

renderVideoSlot(document.getElementById('home-video'), db, 'documentary');

// The home page shows statistics only from real (non-demonstration) records.
const host = document.getElementById('impact-stats');
async function drawStats() {
  try {
    const data = await loadPublicData(db, { demo: false });
    const hasReal = data.stats.reports_total > 0 || data.readings.length > 0;
    if (!hasReal) {
      host.innerHTML = `<div class="stat" style="grid-column:1/-1"><span class="stat__label">${icon('info', 16)}Awaiting verified data</span>
        <span class="stat__value stat__value--pending">Figures appear here once the group records real reports and readings.</span>
        <span class="stat__note">The dashboard shows how it works using clearly labelled demonstration data.</span></div>`;
      document.getElementById('impact-notice').innerHTML = '';
      return;
    }
    renderImpactStats(host, document.getElementById('impact-notice'), data);
  } catch (err) {
    console.error(err);
    renderStatsError(host, err);
  }
}
drawStats();
db.onChange(drawStats);
