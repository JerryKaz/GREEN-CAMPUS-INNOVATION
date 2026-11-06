// Loads third-party libraries from /vendor (self-hosted: no CDN dependency,
// works on restricted campus networks and keeps versions pinned).
const base = new URL('../../../vendor/', import.meta.url);
const pending = new Map();

/** Inject a classic <script> once and resolve with window[globalName]. */
export function loadScript(path, globalName) {
  if (globalThis[globalName]) return Promise.resolve(globalThis[globalName]);
  if (!pending.has(path)) {
    pending.set(path, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL(path, base).href;
      s.async = true;
      s.onload = () => (globalThis[globalName] ? resolve(globalThis[globalName])
        : reject(new Error(`${globalName} did not load`)));
      s.onerror = () => { pending.delete(path); reject(new Error(`Could not load ${path}`)); };
      document.head.append(s);
    }));
  }
  return pending.get(path);
}

export function loadStyle(path) {
  const href = new URL(path, base).href;
  if (document.querySelector(`link[href="${href}"]`)) return;
  document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href }));
}

export const vendorURL = (path) => new URL(path, base).href;
