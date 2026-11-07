// Registers the service worker so visited pages keep working offline.
const root = new URL('../../../', import.meta.url);

export function enableOffline() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw\b/.test(location.search)) {
    navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.pathname })
      .catch((e) => console.warn('Offline support unavailable:', e));
  }
}
