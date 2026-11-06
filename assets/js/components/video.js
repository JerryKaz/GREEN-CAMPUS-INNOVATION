import { toEmbedUrl } from '../lib/calc.js';
import { mountVideo } from '../lib/media.js';

/** A YouTube/Drive link from Settings wins; else assets/media/<slot>.mp4; else a designed poster. */
export function renderVideo(el, url, slotKey) {
  return mountVideo(el, slotKey, toEmbedUrl(url));
}
