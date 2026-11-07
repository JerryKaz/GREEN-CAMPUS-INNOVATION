// Minimal promise wrapper around IndexedDB. No dependencies.
// If IndexedDB is unavailable (some private-browsing modes), an in-memory
// fallback keeps the site usable for the session and reports persistent=false.

export const DB_NAME = 'green-campus-waterwatch';
export const DB_VERSION = 1;

/** Object stores and their indexes. Changing this requires bumping DB_VERSION. */
export const STORES = {
  campus_locations: { keyPath: 'id', indexes: ['name', 'location_type', 'is_demo'] },
  water_reports: { keyPath: 'id', indexes: ['status', 'issue_type', 'location_id', 'submitted_at', 'is_demo', ['reference_number', { unique: true }]] },
  water_readings: { keyPath: 'id', indexes: ['location_id', 'reading_date', 'phase', 'is_demo'] },
  conservation_actions: { keyPath: 'id', indexes: ['status', 'location_id', 'report_id', 'is_demo'] },
  pledges: { keyPath: 'id', indexes: ['commitment_type', 'submitted_at', 'is_demo'] },
  feedback: { keyPath: 'id', indexes: ['category', 'status', 'submitted_at', 'is_demo'] },
  // Supporting stores (not research records):
  budget_items: { keyPath: 'id', indexes: ['category', 'is_demo'] },
  media_items: { keyPath: 'id', indexes: ['kind', 'category'] },
  settings: { keyPath: 'key', indexes: [] },
  meta: { keyPath: 'key', indexes: [] },
};

const reqP = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

function openNative() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) { reject(new Error('IndexedDB not supported')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, spec] of Object.entries(STORES)) {
        const store = db.objectStoreNames.contains(name)
          ? req.transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: spec.keyPath });
        for (const ix of spec.indexes) {
          const [field, opts] = Array.isArray(ix) ? ix : [ix, {}];
          if (!store.indexNames.contains(field)) store.createIndex(field, field, opts);
        }
      }
    };
    req.onblocked = () => reject(new Error('The database is open in another tab with an older version. Close other tabs of this site and reload.'));
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close(); // let a newer tab upgrade
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Native IndexedDB backend. */
function nativeBackend(db) {
  const tx = (names, mode = 'readonly') => db.transaction(names, mode);
  const done = (t) => new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('Transaction aborted'));
  });
  return {
    persistent: true,
    getAll: (store) => reqP(tx(store).objectStore(store).getAll()),
    get: (store, key) => reqP(tx(store).objectStore(store).get(key)),
    count: (store) => reqP(tx(store).objectStore(store).count()),
    async put(store, value) { const t = tx(store, 'readwrite'); t.objectStore(store).put(value); await done(t); return value; },
    async putMany(store, values) { const t = tx(store, 'readwrite'); const s = t.objectStore(store); values.forEach((v) => s.put(v)); await done(t); },
    async delete(store, key) { const t = tx(store, 'readwrite'); t.objectStore(store).delete(key); await done(t); },
    async deleteMany(store, keys) { const t = tx(store, 'readwrite'); const s = t.objectStore(store); keys.forEach((k) => s.delete(k)); await done(t); },
    async clear(stores) { const t = tx(stores, 'readwrite'); stores.forEach((s) => t.objectStore(s).clear()); await done(t); },
    /** Run fn(stores) inside one readwrite transaction across several stores (all-or-nothing). */
    async atomic(stores, fn) {
      const t = tx(stores, 'readwrite');
      const handles = Object.fromEntries(stores.map((s) => [s, t.objectStore(s)]));
      try { fn(handles); } catch (e) { t.abort(); throw e; }
      await done(t);
    },
  };
}

/** In-memory fallback with the same interface. Data is lost on reload. */
function memoryBackend() {
  const data = Object.fromEntries(Object.keys(STORES).map((s) => [s, new Map()]));
  const key = (s, v) => v[STORES[s].keyPath];
  const clone = (v) => structuredClone(v);
  return {
    persistent: false,
    getAll: async (s) => [...data[s].values()].map(clone),
    get: async (s, k) => clone(data[s].get(k)),
    count: async (s) => data[s].size,
    put: async (s, v) => { data[s].set(key(s, v), clone(v)); return v; },
    putMany: async (s, vs) => { vs.forEach((v) => data[s].set(key(s, v), clone(v))); },
    delete: async (s, k) => { data[s].delete(k); },
    deleteMany: async (s, ks) => { ks.forEach((k) => data[s].delete(k)); },
    clear: async (ss) => { ss.forEach((s) => data[s].clear()); },
    async atomic(stores, fn) {
      const snapshot = Object.fromEntries(stores.map((s) => [s, new Map(data[s])]));
      const handles = Object.fromEntries(stores.map((s) => [s, {
        put: (v) => data[s].set(key(s, v), clone(v)), delete: (k) => data[s].delete(k), clear: () => data[s].clear(),
      }]));
      try { fn(handles); } catch (e) { stores.forEach((s) => { data[s] = snapshot[s]; }); throw e; }
    },
  };
}

let backendPromise;
export function openBackend() {
  backendPromise ??= openNative().then(nativeBackend).catch((err) => {
    console.warn('IndexedDB unavailable, using in-memory storage for this session:', err);
    return memoryBackend();
  });
  return backendPromise;
}
