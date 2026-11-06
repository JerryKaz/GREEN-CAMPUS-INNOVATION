import { initLayout } from '../layout.js';
import { loadPublicData, renderImpactStats, renderStatsError } from '../components/stats.js';
import { renderVideo } from '../components/video.js';

const { db } = await initLayout();

db.settings()
  .then((s) => renderVideo(document.getElementById('home-video'), s.videos?.problem_url, 'video-problem'))
  .catch(() => renderVideo(document.getElementById('home-video'), '', 'video-problem'));

const host = document.getElementById('impact-stats');
try {
  renderImpactStats(host, document.getElementById('impact-notice'), await loadPublicData(db));
} catch (err) {
  console.error(err);
  renderStatsError(host, err);
}
