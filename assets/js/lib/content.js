// Published content files in public/data/ + local admin changes.
//
// Publishing model (static site, no server):
//   public/data/*.json  = what EVERY visitor sees (committed to GitHub).
//   IndexedDB (admin)   = drafts/changes on THIS device only.
// Pages show the JSON content, overridden by anything the admin saved on this
// device. The admin panel exports updated JSON files to commit and publish.

const base = new URL('../../../', import.meta.url);
export const siteURL = (path) => new URL(path, base).href;
const cache = new Map();

export async function loadJSON(name, fallback) {
  if (!cache.has(name)) {
    cache.set(name, fetch(siteURL(`public/data/${name}`), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${name}: HTTP ${r.status}`))))
      .catch((e) => { console.warn(`Could not load ${name}`, e); return fallback; }));
  }
  return structuredClone(await cache.get(name));
}

/** Site content: published JSON merged with settings saved by the admin on this device. */
export async function siteContent(db) {
  const [published, local, savedKeys] = await Promise.all([
    loadJSON('site-content.json', {}),
    db.settings(),
    db.savedSettingKeys(),
  ]);
  const out = {};
  for (const key of Object.keys(local)) {
    out[key] = savedKeys.includes(key) ? local[key] : { ...local[key], ...(published[key] ?? {}) };
  }
  out.__local = savedKeys;
  return out;
}

const isLocal = (item) => item.__source === 'local';

/** Images: media-gallery.json entries plus admin-added entries on this device. */
export async function galleryImages(db) {
  const [file, local] = await Promise.all([loadJSON('media-gallery.json', { images: [] }), db.list('media_items', { eq: { kind: 'image' } })]);
  const published = (file.images ?? []).map((m, i) => ({ id: `published-${i}`, ...m, __source: 'published' }));
  const localItems = local.map((m) => ({ ...m, __source: 'local' }));
  // A local entry with the same path replaces the published one (an edit made on this device).
  const paths = new Set(localItems.map((m) => m.path));
  return [...published.filter((m) => !paths.has(m.path)), ...localItems]
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
}

/** Videos: video-gallery.json slots plus admin-added or edited entries on this device. */
export async function galleryVideos(db) {
  const [file, local] = await Promise.all([loadJSON('video-gallery.json', { videos: [] }), db.list('media_items', { eq: { kind: 'video' } })]);
  const published = (file.videos ?? []).map((v, i) => ({ id: `published-${v.slot}-${i}`, ...v, __source: 'published' }));
  const localItems = local.map((v) => ({ ...v, __source: 'local' }));
  const overridden = new Set(localItems.filter((v) => v.slot !== 'interviews').map((v) => v.slot));
  return [...published.filter((v) => v.slot === 'interviews' || !overridden.has(v.slot)), ...localItems];
}

export { isLocal };
