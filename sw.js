// Service worker: lets the site's static content open offline once it has been
// visited/cached. Data lives in IndexedDB, which works offline anyway.
// The deploy script (scripts/build-site.mjs) fills in VERSION and PRECACHE.
const VERSION = 'dev';
const PRECACHE = [];
const CACHE = `gci-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Add one by one so a single missing file does not abort the install.
    await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('gci-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isPageOrData = (req, url) => req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')
  || url.pathname.includes('/public/data/') || url.pathname.endsWith('/sw.js');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // map tiles, fonts, video embeds: network only

  if (isPageOrData(req, url)) {
    // Network first so published updates appear immediately; cache as offline fallback.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req, { ignoreSearch: true }))
          ?? (req.mode === 'navigate' ? (await cache.match(new URL('404.html', self.registration.scope).href)) : undefined)
          ?? Response.error();
      }
    })());
    return;
  }

  // Static assets: serve from cache, refresh in the background.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => undefined);
    return cached ?? (await network) ?? Response.error();
  })());
});
