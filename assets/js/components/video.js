// Video slots driven by public/data/video-gallery.json (+ admin entries on this device).
import { toEmbedUrl } from '../lib/calc.js';
import { mountVideo } from '../lib/media.js';
import { galleryVideos } from '../lib/content.js';
import { esc } from '../lib/dom.js';

let videosPromise;
const videos = (db) => (videosPromise ??= galleryVideos(db).catch(() => []));

/**
 * Fill an element with the video configured for `slot` ('documentary' | 'solution-demo').
 * The enclosing [data-video-section] stays hidden until a valid link has been added,
 * so visitors never see an empty video frame.
 */
export async function renderVideoSlot(el, db, slot) {
  const v = (await videos(db)).find((x) => x.slot === slot && toEmbedUrl(x.url));
  const section = el.closest('[data-video-section]');
  if (!v) { if (section) section.hidden = true; return false; }
  if (section) section.hidden = false;
  mountVideo(el, `video-${slot}`, toEmbedUrl(v.url), v);
  if (v.title && el.nextElementSibling?.matches?.('[data-video-caption]')) {
    el.nextElementSibling.innerHTML = `<strong>${esc(v.title)}</strong>${v.duration ? ` · ${esc(v.duration)}` : ''}`;
  }
  return true;
}

/** Interview videos (any number). Renders nothing when there are none. */
export async function renderInterviewVideos(host, db) {
  const list = (await videos(db)).filter((v) => v.slot === 'interviews' && toEmbedUrl(v.url));
  if (!list.length) { host.hidden = true; return; }
  host.hidden = false;
  host.innerHTML = `<h3 style="margin-top:40px">Interview videos</h3><div class="grid grid--2">${list.map(() => '<div><div data-v></div><p class="small" data-video-caption></p></div>').join('')}</div>`;
  host.querySelectorAll('[data-v]').forEach((el, i) => {
    mountVideo(el, 'video-interviews', toEmbedUrl(list[i].url), list[i]);
    el.nextElementSibling.innerHTML = `<strong>${esc(list[i].title)}</strong>${list[i].description ? ` · ${esc(list[i].description)}` : ''}`;
  });
}
