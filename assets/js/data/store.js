// =============================================================================
// Data service layer. Every page and admin view talks to the database ONLY
// through this module, so the UI is not coupled to IndexedDB. Swapping in a
// real backend later means writing another module with the same methods.
//
// Storage: IndexedDB in the visitor's browser. Records are NOT shared between
// devices or visitors and are NOT sent to any server.
// =============================================================================
import { openBackend } from './idb.js';
import { SCHEMA_VERSION, APP_ID, COLLECTIONS, validateRecord } from './schema.js';
import { statsFromRows, reportIssuesByLocationStatus, reportDailyConsumption,
  reportBaselineVsPilot, reportConservationActions } from '../lib/calc.js';

const SAMPLE_URL = new URL('../../../public/data/sample-data.json', import.meta.url);
const LEGACY_KEY = 'gci_demo_db_v2'; // previous localStorage-based demo database
const DEMO_COLLECTIONS = ['campus_locations', 'water_reports', 'water_readings', 'conservation_actions', 'pledges', 'feedback', 'budget_items'];
const REF_ALPHABET = 'BCDFGHJKMNPQRSTVWXYZ23456789';

// Settings the group edits from the admin area. Empty until real data exists.
export const DEFAULT_SETTINGS = {
  research_findings: { challenges: '', processes: '', causes: '', experiences: '', opportunities: '' },
  observations: { days_observed: null, period: '', summary: '' },
  interviews: { estates_count: null, estates_summary: '', students_count: null, students_summary: '', themes: '' },
  pilot: { location: '', testing_date: '', users: null, feedback: '', problems: '', improvements: '' },
  tariff: { value: null, unit: 'm3', source: '', verified: false },
  roadmap: { current_phase: 1 },
  contact: { email: '', phone: '', office: '', supervisor: '', team: '' },
};

const now = () => new Date().toISOString();
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const blankToNull = (v) => (v === '' || v === undefined ? null : v);

export class ValidationError extends Error {}

export async function createStore(config) {
  const be = await openBackend();
  const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel('gci-data') : null;
  const listeners = new Set();
  const changed = (what) => {
    listeners.forEach((cb) => { try { cb(what); } catch (e) { console.error(e); } });
    channel?.postMessage({ what, at: Date.now() });
  };
  channel?.addEventListener('message', (e) => listeners.forEach((cb) => cb(e.data?.what)));

  const getMeta = async (key) => (await be.get('meta', key))?.value;
  const setMeta = (key, value) => be.put('meta', { key, value, updated_at: now() });

  async function idSets(stores) {
    const out = {};
    for (const s of stores) out[s] = new Set((await be.getAll(s)).map((r) => r.id));
    return out;
  }
  const assertValid = (store, rec, existing) => {
    const errs = validateRecord(store, rec, existing);
    if (errs.length) throw new ValidationError(errs[0]);
  };

  // ---- first-run initialisation ---------------------------------------------
  let sampleCache;
  async function loadSample() {
    if (!sampleCache) {
      const res = await fetch(SAMPLE_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Could not load sample data (${res.status}).`);
      const json = await res.json();
      if (!json?.collections) throw new Error('Sample data file is malformed.');
      sampleCache = json;
    }
    return structuredClone(sampleCache.collections);
  }

  async function migrateLegacy() {
    let legacy;
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null'); } catch { legacy = null; }
    if (!legacy?.campus_locations) return false;
    for (const s of DEMO_COLLECTIONS) {
      const rows = (legacy[s] ?? []).filter((r) => r && r.id);
      if (rows.length) await be.putMany(s, rows.map((r) => ({ created_at: r.submitted_at ?? now(), ...r })));
    }
    await setMeta('migrated_from_localstorage', now());
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
    return true;
  }

  async function init() {
    if (!(await getMeta('initialised'))) {
      const migrated = await migrateLegacy().catch((e) => { console.warn('Legacy migration skipped', e); return false; });
      const empty = (await Promise.all(COLLECTIONS.map((s) => be.count(s)))).every((n) => n === 0);
      if (!migrated && empty && config.SEED_DEMO_DATA) {
        // Seed only when the database is empty. If the sample file cannot be fetched
        // (e.g. offline on a first visit) we leave the flag unset and try next time.
        const sample = await loadSample();
        for (const s of DEMO_COLLECTIONS) if (sample[s]?.length) await be.putMany(s, sample[s]);
        await setMeta('demo_seeded_at', now());
      }
      await setMeta('initialised', now());
    }
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (!(await be.get('settings', key))) await be.put('settings', { key, value, updated_at: now(), is_default: true });
    }
  }
  try { await init(); } catch (e) { console.error('Initialisation incomplete:', e); }

  // ---- generic CRUD -----------------------------------------------------------
  async function list(t, { eq = {}, order, limit = 5000, includeDemo = true } = {}) {
    let rows = await be.getAll(t);
    rows = rows.filter((r) => Object.entries(eq).every(([k, v]) => r[k] === v));
    if (!includeDemo) rows = rows.filter((r) => !r.is_demo);
    if (order) {
      const [k, dir] = order;
      rows.sort((a, b) => String(a[k] ?? '').localeCompare(String(b[k] ?? ''), undefined, { numeric: true }));
      if (dir === 'desc') rows.reverse();
    }
    return rows.slice(0, limit);
  }

  async function checkDuplicates(t, rec) {
    if (t === 'campus_locations') {
      const all = await be.getAll(t);
      if (all.some((l) => l.id !== rec.id && norm(l.name) === norm(rec.name))) throw new ValidationError('A location with this name already exists.');
    }
    if (t === 'water_readings') {
      const all = await be.getAll(t);
      if (all.some((w) => w.id !== rec.id && w.location_id === rec.location_id && w.reading_date === rec.reading_date
        && w.phase === rec.phase && norm(w.measurement_method) === norm(rec.measurement_method))) {
        throw new ValidationError('A reading for this location, date, phase and method already exists.');
      }
    }
    if (t === 'water_reports') {
      const all = await be.getAll(t);
      if (all.some((r) => r.id !== rec.id && r.reference_number === rec.reference_number)) throw new ValidationError('That reference number is already in use.');
    }
  }

  const refStores = (t) => {
    const map = { water_reports: ['campus_locations'], water_readings: ['campus_locations'], conservation_actions: ['campus_locations', 'water_reports'] };
    return map[t] ?? [];
  };

  async function insert(t, row) {
    const rec = { id: uuid(), is_demo: false, created_at: now(), updated_at: now(), ...row };
    Object.keys(rec).forEach((k) => { rec[k] = clean(rec[k]); });
    if (t === 'water_reports') {
      rec.reference_number ??= await newReference();
      rec.submitted_at ??= now();
      rec.status ??= 'submitted';
    }
    if ((t === 'pledges' || t === 'feedback') && !rec.submitted_at) rec.submitted_at = now();
    if (t === 'feedback') rec.status ??= 'new';
    assertValid(t, rec, await idSets(refStores(t)));
    await checkDuplicates(t, rec);
    await be.put(t, rec);
    changed(t);
    return structuredClone(rec);
  }

  async function update(t, id, patch) {
    const cur = await be.get(t, id);
    if (!cur) throw new Error('Record not found. It may have been deleted in another tab.');
    const rec = { ...cur, ...patch, id: cur.id, created_at: cur.created_at, updated_at: now() };
    Object.keys(patch).forEach((k) => { rec[k] = clean(rec[k]); });
    assertValid(t, rec, await idSets(refStores(t)));
    await checkDuplicates(t, rec);
    await be.put(t, rec);
    changed(t);
    return structuredClone(rec);
  }

  async function remove(t, id) {
    if (t === 'campus_locations') {
      const [readings, actions, reports] = await Promise.all([be.getAll('water_readings'), be.getAll('conservation_actions'), be.getAll('water_reports')]);
      if (readings.some((w) => w.location_id === id) || actions.some((a) => a.location_id === id)) {
        throw new ValidationError('This location has readings or actions linked to it. Delete or move those first.');
      }
      const linked = reports.filter((r) => r.location_id === id).map((r) => ({ ...r, location_id: null, updated_at: now() }));
      await be.atomic(['campus_locations', 'water_reports'], (s) => { s.campus_locations.delete(id); linked.forEach((r) => s.water_reports.put(r)); });
    } else if (t === 'water_reports') {
      const linked = (await be.getAll('conservation_actions')).filter((a) => a.report_id === id).map((a) => ({ ...a, report_id: null, updated_at: now() }));
      await be.atomic(['water_reports', 'conservation_actions'], (s) => { s.water_reports.delete(id); linked.forEach((a) => s.conservation_actions.put(a)); });
    } else {
      await be.delete(t, id);
    }
    changed(t);
  }

  async function newReference() {
    const d = new Date();
    const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const used = new Set((await be.getAll('water_reports')).map((r) => r.reference_number));
    let ref;
    do {
      const rnd = crypto.getRandomValues(new Uint8Array(5));
      ref = `WW-${ymd}-${[...rnd].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('')}`;
    } while (used.has(ref));
    return ref;
  }

  const withinMinutes = (iso, min) => Date.now() - new Date(iso).getTime() < min * 60 * 1000;

  // ---- public submissions -----------------------------------------------------
  async function submitReport(values, photoDataUrl) {
    const anon = !!values.is_anonymous;
    const recent = (await be.getAll('water_reports')).find((r) => !r.is_demo && withinMinutes(r.submitted_at, 10)
      && r.issue_type === values.issue_type && (r.location_id ?? '') === (values.location_id ?? '')
      && norm(r.description) === norm(values.description));
    if (recent) throw new ValidationError(`This looks like a report already submitted a few minutes ago (reference ${recent.reference_number}).`);
    const rec = await insert('water_reports', {
      location_id: blankToNull(values.location_id), location_note: (values.location_note || '').trim(),
      issue_type: values.issue_type, description: values.description, severity: values.severity,
      status: 'submitted', observed_at: values.observed_at ? new Date(values.observed_at).toISOString() : null,
      photo_path: photoDataUrl ?? null, is_anonymous: anon,
      reporter_name: anon ? null : blankToNull(values.reporter_name?.trim()),
      reporter_contact: anon ? null : blankToNull(values.reporter_contact?.trim()),
      assigned_to: '', admin_notes: '', submitted_at: now(),
    });
    return { reference: rec.reference_number };
  }

  async function submitPledge(v) {
    const all = await be.getAll('pledges');
    const email = norm(v.email);
    if (email && all.some((p) => !p.is_demo && norm(p.email) === email && p.commitment_type === v.commitment_type)) {
      throw new ValidationError('A pledge with this email and commitment has already been recorded on this device.');
    }
    if (all.some((p) => !p.is_demo && withinMinutes(p.submitted_at, 2) && p.commitment_type === v.commitment_type
      && norm(p.full_name) === norm(v.full_name) && norm(p.comments) === norm(v.comments))) {
      throw new ValidationError('This pledge was already submitted a moment ago.');
    }
    return insert('pledges', { commitment_type: v.commitment_type, full_name: blankToNull(v.full_name?.trim()),
      email: blankToNull(v.email?.trim()), department: blankToNull(v.department?.trim()),
      comments: blankToNull(v.comments?.trim()), consent_status: true, submitted_at: now() });
  }

  async function submitFeedback(v) {
    const all = await be.getAll('feedback');
    if (all.some((f) => !f.is_demo && withinMinutes(f.submitted_at, 10) && norm(f.message) === norm(v.message))) {
      throw new ValidationError('This message was already submitted a few minutes ago.');
    }
    return insert('feedback', { category: v.category, message: v.message, contact_name: blankToNull(v.contact_name?.trim()),
      contact_email: blankToNull(v.contact_email?.trim()), consent_status: true, status: 'new', submitted_at: now() });
  }

  // ---- aggregates for public pages ------------------------------------------
  async function publicStats(includeDemo) {
    const f = (rows) => (includeDemo ? rows : rows.filter((r) => !r.is_demo));
    const [reports, pledges, actions] = await Promise.all([be.getAll('water_reports'), be.getAll('pledges'), be.getAll('conservation_actions')]);
    return statsFromRows({ reports: f(reports), pledges: f(pledges), actions: f(actions) });
  }

  /** Locations that have coordinates, each with a public summary of linked reports. */
  async function publicHotspots(includeDemo) {
    const [locs, reports] = await Promise.all([be.getAll('campus_locations'), be.getAll('water_reports')]);
    return locs
      .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude) && (includeDemo || !l.is_demo))
      .map((l) => ({
        id: l.id, name: l.name, location_type: l.location_type, description: l.description ?? '',
        latitude: l.latitude, longitude: l.longitude, is_verified: !!l.is_verified, is_demo: !!l.is_demo,
        reports: reports.filter((r) => r.location_id === l.id && (includeDemo || !r.is_demo))
          .map((r) => ({ issue_type: r.issue_type, severity: r.severity, status: r.status, submitted_at: r.submitted_at, is_demo: !!r.is_demo })),
      }));
  }

  // ---- settings ---------------------------------------------------------------
  async function settings() {
    const rows = await be.getAll('settings');
    const out = structuredClone(DEFAULT_SETTINGS);
    for (const r of rows) out[r.key] = { ...(DEFAULT_SETTINGS[r.key] ?? {}), ...r.value };
    return out;
  }
  /** Keys an admin has saved on this device (as opposed to untouched defaults). */
  async function savedSettingKeys() {
    return (await be.getAll('settings')).filter((r) => !r.is_default).map((r) => r.key);
  }
  async function saveSetting(key, value) {
    await be.put('settings', { key, value, updated_at: now() });
    changed('settings');
  }

  async function report(name) {
    const [reports, readings, locations, actions] = await Promise.all(['water_reports', 'water_readings', 'campus_locations', 'conservation_actions'].map((s) => be.getAll(s)));
    switch (name) {
      case 'issues_by_location_status': return reportIssuesByLocationStatus(reports, locations);
      case 'daily_consumption': return reportDailyConsumption(readings, locations);
      case 'baseline_vs_pilot': return reportBaselineVsPilot(readings, locations);
      case 'conservation_actions': return reportConservationActions(actions);
      default: throw new Error(`Unknown report ${name}`);
    }
  }

  // ---- demonstration data -----------------------------------------------------
  async function demoCount() {
    let n = 0;
    for (const s of DEMO_COLLECTIONS) n += (await be.getAll(s)).filter((r) => r.is_demo).length;
    return n;
  }

  async function deleteDemoData() {
    const all = Object.fromEntries(await Promise.all(DEMO_COLLECTIONS.map(async (s) => [s, await be.getAll(s)])));
    const keepLoc = new Set([...all.water_readings, ...all.conservation_actions].filter((r) => !r.is_demo).map((r) => r.location_id));
    const delLocs = new Set(all.campus_locations.filter((l) => l.is_demo && !keepLoc.has(l.id)).map((l) => l.id));
    const delReports = new Set(all.water_reports.filter((r) => r.is_demo).map((r) => r.id));
    await be.atomic(DEMO_COLLECTIONS, (s) => {
      for (const name of DEMO_COLLECTIONS) {
        for (const r of all[name]) {
          if (name === 'campus_locations') { if (delLocs.has(r.id)) s[name].delete(r.id); continue; }
          if (r.is_demo) { s[name].delete(r.id); continue; }
          if (name === 'water_reports' && delLocs.has(r.location_id)) s[name].put({ ...r, location_id: null });
          if (name === 'conservation_actions' && delReports.has(r.report_id)) s[name].put({ ...r, report_id: null });
        }
      }
    });
    await setMeta('demo_cleared_at', now());
    changed('demo');
  }

  /** Add demonstration records that are missing (does not touch edited ones). */
  async function loadDemoData() {
    const sample = await loadSample();
    let added = 0;
    for (const s of DEMO_COLLECTIONS) {
      const have = new Set((await be.getAll(s)).map((r) => r.id));
      const missing = (sample[s] ?? []).filter((r) => !have.has(r.id));
      added += missing.length;
      if (missing.length) await be.putMany(s, missing);
    }
    await setMeta('demo_seeded_at', now());
    changed('demo');
    return added;
  }

  /** Reset every demonstration record to its original state. Real records are untouched. */
  async function restoreDemoData() {
    const sample = await loadSample();
    const current = Object.fromEntries(await Promise.all(DEMO_COLLECTIONS.map(async (s) => [s, await be.getAll(s)])));
    await be.atomic(DEMO_COLLECTIONS, (st) => {
      for (const s of DEMO_COLLECTIONS) {
        current[s].filter((r) => r.is_demo).forEach((r) => st[s].delete(r.id));
        (sample[s] ?? []).forEach((r) => st[s].put(r));
      }
    });
    await setMeta('demo_seeded_at', now());
    changed('demo');
  }

  // ---- backup and restore -----------------------------------------------------
  async function exportAll() {
    const collections = {};
    for (const s of COLLECTIONS) collections[s] = await be.getAll(s);
    const settingsRows = await be.getAll('settings');
    return {
      app: APP_ID,
      schema_version: SCHEMA_VERSION,
      export_id: uuid(),
      exported_at: now(),
      record_counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length])),
      collections,
      settings: Object.fromEntries(settingsRows.filter((r) => !r.is_default).map((r) => [r.key, r.value])),
    };
  }
  async function recordBackup(exportId) {
    await setMeta('last_backup_at', now());
    await setMeta('last_backup_id', exportId);
  }

  /** Check a backup without changing anything. */
  async function inspectBackup(obj) {
    const errors = [];
    const warnings = [];
    if (!obj || typeof obj !== 'object') return { ok: false, errors: ['The file is not a JSON backup.'] };
    if (obj.app !== APP_ID) errors.push('This file is not a Green Campus WaterWatch backup.');
    if (!Number.isInteger(obj.schema_version)) errors.push('Missing schema version.');
    else if (obj.schema_version > SCHEMA_VERSION) errors.push(`Backup uses schema version ${obj.schema_version}, newer than this site (${SCHEMA_VERSION}). Update the site first.`);
    if (!obj.collections || typeof obj.collections !== 'object') errors.push('Missing record collections.');
    if (errors.length) return { ok: false, errors, warnings };

    const unknown = Object.keys(obj.collections).filter((k) => !COLLECTIONS.includes(k));
    if (unknown.length) warnings.push(`Ignored unknown collection(s): ${unknown.join(', ')}.`);
    const fileIds = {};
    const counts = {};
    for (const s of COLLECTIONS) {
      const rows = obj.collections[s] ?? [];
      if (!Array.isArray(rows)) { errors.push(`${s} is not a list.`); continue; }
      counts[s] = rows.length;
      fileIds[s] = new Set();
      for (const r of rows) {
        if (fileIds[s].has(r?.id)) errors.push(`${s}: duplicate id ${r?.id} in the file.`);
        fileIds[s].add(r?.id);
      }
    }
    const existing = await idSets(COLLECTIONS);
    const refs = Object.fromEntries(COLLECTIONS.map((s) => [s, new Set([...(fileIds[s] ?? []), ...existing[s]])]));
    for (const s of COLLECTIONS) {
      for (const r of obj.collections[s] ?? []) {
        const errs = validateRecord(s, r, refs);
        if (errs.length) errors.push(`${s} ${r?.id ?? '(no id)'}: ${errs[0]}`);
        if (errors.length >= 20) break;
      }
      if (errors.length >= 20) { errors.push('Further errors not shown.'); break; }
    }
    const newIds = Object.fromEntries(COLLECTIONS.map((s) => [s, [...(fileIds[s] ?? [])].filter((id) => !existing[s].has(id)).length]));
    const imports = (await getMeta('imports')) ?? [];
    return {
      ok: errors.length === 0, errors, warnings, counts, newIds,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      exportId: obj.export_id ?? null, exportedAt: obj.exported_at ?? null,
      alreadyImported: !!obj.export_id && imports.some((i) => i.export_id === obj.export_id),
    };
  }

  /** mode: 'merge' adds records whose id is not already present; 'replace' swaps the whole database. */
  async function importBackup(obj, { mode = 'merge' } = {}) {
    const check = await inspectBackup(obj);
    if (!check.ok) throw new ValidationError(check.errors[0]);
    let added = 0;
    let skipped = 0;
    const stores = [...COLLECTIONS, 'settings'];
    const existing = mode === 'merge' ? await idSets(COLLECTIONS) : null;
    await be.atomic(stores, (s) => {
      if (mode === 'replace') COLLECTIONS.forEach((c) => s[c].clear());
      for (const c of COLLECTIONS) {
        for (const r of obj.collections[c] ?? []) {
          if (existing && existing[c].has(r.id)) { skipped++; continue; }
          s[c].put(r); added++;
        }
      }
      if (mode === 'replace' && obj.settings && typeof obj.settings === 'object') {
        for (const [key, value] of Object.entries(obj.settings)) {
          if (key in DEFAULT_SETTINGS && value && typeof value === 'object') s.settings.put({ key, value: { ...DEFAULT_SETTINGS[key], ...value }, updated_at: now() });
        }
      }
    });
    const imports = (await getMeta('imports')) ?? [];
    imports.push({ export_id: check.exportId, exported_at: check.exportedAt, imported_at: now(), mode, added, skipped });
    await setMeta('imports', imports.slice(-50));
    changed('import');
    return { added, skipped };
  }

  async function counts() {
    const out = {};
    for (const s of COLLECTIONS) {
      const rows = await be.getAll(s);
      out[s] = { total: rows.length, demo: rows.filter((r) => r.is_demo).length };
    }
    return out;
  }

  async function storageInfo() {
    let usage = null;
    let quota = null;
    let persisted = null;
    try { ({ usage, quota } = await navigator.storage.estimate()); } catch { /* unsupported */ }
    try { persisted = await navigator.storage.persisted(); } catch { /* unsupported */ }
    return { persistent: be.persistent, usage, quota, persisted };
  }
  async function requestPersistence() {
    try { return await navigator.storage.persist(); } catch { return false; }
  }

  async function photoUrl(path) { return typeof path === 'string' && path.startsWith('data:image/') ? path : null; }

  return {
    mode: 'local',
    persistent: be.persistent,
    list, get: (t, id) => be.get(t, id), insert, update, remove,
    submitReport, submitPledge, submitFeedback,
    publicStats, publicHotspots, settings, saveSetting, savedSettingKeys, report, photoUrl,
    demoCount, deleteDemoData, loadDemoData, restoreDemoData,
    exportAll, recordBackup, inspectBackup, importBackup,
    counts, storageInfo, requestPersistence, getMeta,
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };
}
