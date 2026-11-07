// Registers the service worker (offline support) and shows a small banner while offline.
import { icon } from './icons.js';

const root = new URL('../../../', import.meta.url);

export function enableOffline() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw\b/.test(location.search)) {
    navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.pathname })
      .catch((e) => console.warn('Offline support unavailable:', e));
  }
  let banner;
  const update = () => {
    if (navigator.onLine) { banner?.remove(); banner = null; return; }
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `${icon('wifiOff', 16)}<span>You are offline. Saved pages and your local data still work; maps and videos need a connection.</span>`;
    document.body.append(banner);
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}
