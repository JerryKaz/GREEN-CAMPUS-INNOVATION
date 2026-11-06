// Demo adapter — runs the whole app in the browser (localStorage) when no
// Supabase project is configured. Same interface as supabase-adapter.js.
// Data lives only in this browser and is clearly labelled as demo data.
import { buildDemoData } from './demo-seed.js';
import { statsFromRows, reportIssuesByLocationStatus, reportDailyConsumption,
  reportBaselineVsPilot, reportConservationActions } from '../lib/calc.js';

const KEY = 'gci_demo_db_v2';
const SESSION_KEY = 'gci_demo_session';
export const DEMO_CREDENTIALS = { email: 'admin@demo.local', password: 'waterwatch-demo' };
const DEMO_ADMIN = { id: '00000000-0000-4000-8000-000000000001', full_name: 'Demo Administrator', role: 'admin', email: DEMO_CREDENTIALS.email };

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms)); // makes loading states visible & realistic

export function createLocalAdapter(config) {
  let db;
  const load = () => {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
    if (!db || !db.campus_locations) {
      db = buildDemoData(config.MAP_CENTER);
      db.profiles = [{ ...DEMO_ADMIN, created_at: new Date().toISOString() }];
      persist();
    }
  };
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch { throw new Error('Browser storage is full. Remove photos or reset the demo data in Settings.'); }
  };
  load();

  const authed = () => sessionStorage.getItem(SESSION_KEY) === '1';
  const requireAuth = () => { if (!authed()) throw new Error('permission denied'); };
  const listeners = [];
  const now = () => new Date().toISOString();
  const table = (t) => { if (!db[t]) throw new Error(`Unknown table ${t}`); return db[t]; };
  const nonDemo = (rows, includeDemo) => (includeDemo ? rows : rows.filter((r) => !r.is_demo));
  const refAlphabet = 'BCDFGHJKMNPQRSTVWXYZ23456789';

  return {
    mode: 'demo',

    async session() { return authed() ? { user: { id: DEMO_ADMIN.id, email: DEMO_ADMIN.email } } : null; },
    async signIn(email, password) {
      await delay(300);
      if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
        throw new Error('Invalid email or password.');
      }
      sessionStorage.setItem(SESSION_KEY, '1');
      listeners.forEach((cb) => cb({}));
    },
    async signOut() { sessionStorage.removeItem(SESSION_KEY); listeners.forEach((cb) => cb(null)); },
    async resetPassword() { throw new Error('Password reset is not available in demo mode.'); },
    async profile() { return authed() ? db.profiles.find((p) => p.id === DEMO_ADMIN.id) ?? DEMO_ADMIN : null; },
    onAuthChange(cb) { listeners.push(cb); },

    async submitReport(values, photoDataUrl) {
      await delay(400);
      const d = new Date();
      const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      let ref;
      do {
        ref = `WW-${ymd}-${Array.from({ length: 5 }, () => refAlphabet[Math.floor(Math.random() * refAlphabet.length)]).join('')}`;
      } while (db.water_reports.some((r) => r.reference_number === ref));
      const anon = !!values.is_anonymous;
      db.water_reports.push({
        id: crypto.randomUUID(), reference_number: ref,
        location_id: values.location_id || null, location_note: (values.location_note || '').trim(),
        issue_type: values.issue_type, description: values.description.trim(), severity: values.severity,
        status: 'submitted', observed_at: values.observed_at ? new Date(values.observed_at).toISOString() : null,
        photo_path: photoDataUrl ?? null, is_anonymous: anon,
        reporter_name: anon ? null : values.reporter_name?.trim() || null,
        reporter_contact: anon ? null : values.reporter_contact?.trim() || null,
        assigned_to: '', admin_notes: '', is_demo: false, submitted_at: now(), updated_at: now(),
      });
      persist();
      return { reference: ref };
    },

    async submitPledge(v) {
      await delay(300);
      db.pledges.push({ id: crypto.randomUUID(), commitment_type: v.commitment_type,
        full_name: v.full_name?.trim() || null, email: v.email?.trim() || null,
        department: v.department?.trim() || null, comments: v.comments?.trim() || null,
        consent_status: true, is_demo: false, submitted_at: now() });
      persist();
    },
    async submitFeedback(v) {
      await delay(300);
      db.feedback.push({ id: crypto.randomUUID(), category: v.category, message: v.message.trim(),
        contact_name: v.contact_name?.trim() || null, contact_email: v.contact_email?.trim() || null,
        consent_status: true, status: 'new', is_demo: false, submitted_at: now() });
      persist();
    },

    async publicStats(includeDemo) {
      await delay();
      return statsFromRows({
        reports: nonDemo(db.water_reports, includeDemo),
        pledges: nonDemo(db.pledges, includeDemo),
        actions: nonDemo(db.conservation_actions, includeDemo),
      });
    },
    async publicHotspots(includeDemo) {
      await delay();
      const locs = new Map(db.campus_locations.map((l) => [l.id, l]));
      return nonDemo(db.water_reports, includeDemo)
        .map((r) => ({ r, l: locs.get(r.location_id) }))
        .filter(({ l }) => l && l.latitude !== null && (includeDemo || !l.is_demo))
        .map(({ r, l }) => ({
          location_id: l.id, location_name: l.name, location_type: l.location_type,
          latitude: l.latitude, longitude: l.longitude, location_verified: l.is_verified, location_demo: l.is_demo,
          issue_type: r.issue_type, severity: r.severity, status: r.status, submitted_at: r.submitted_at, is_demo: r.is_demo,
        }));
    },

    async list(t, { eq = {}, order, limit = 1000, includeDemo = true } = {}) {
      await delay();
      const PUBLIC = ['campus_locations', 'water_readings', 'budget_items', 'site_settings', 'gallery_photos'];
      if (!PUBLIC.includes(t)) requireAuth();
      let rows = table(t).filter((r) => Object.entries(eq).every(([k, v]) => r[k] === v));
      if (t === 'gallery_photos' && !authed()) rows = rows.filter((r) => r.is_published);
      if (!includeDemo) rows = rows.filter((r) => !r.is_demo);
      if (order) {
        const [k, dir] = order;
        rows = [...rows].sort((a, b) => (a[k] ?? '') < (b[k] ?? '') ? -1 : (a[k] ?? '') > (b[k] ?? '') ? 1 : 0);
        if (dir === 'desc') rows.reverse();
      }
      return structuredClone(rows.slice(0, limit));
    },
    async insert(t, row) {
      requireAuth(); await delay();
      const rec = { id: crypto.randomUUID(), is_demo: false, created_at: now(), ...row };
      if (t === 'water_readings' && db.water_readings.some((w) => w.location_id === rec.location_id
        && w.reading_date === rec.reading_date && w.phase === rec.phase && w.measurement_method === rec.measurement_method)) {
        throw new Error('A reading for this location, date, phase and method already exists.');
      }
      if (t === 'campus_locations' && db.campus_locations.some((l) => l.name.toLowerCase() === String(rec.name).toLowerCase())) {
        throw new Error('A location with this name already exists.');
      }
      table(t).push(rec); persist();
      return structuredClone(rec);
    },
    async update(t, id, patch, key = 'id') {
      requireAuth(); await delay();
      const rec = table(t).find((r) => r[key] === id);
      if (!rec) throw new Error('Record not found.');
      if (t === 'profiles' && rec.role === 'admin' && patch.role && patch.role !== 'admin'
        && db.profiles.filter((p) => p.role === 'admin').length <= 1) throw new Error('At least one admin must remain');
      Object.assign(rec, patch, 'updated_at' in rec ? { updated_at: now() } : {});
      persist();
      return structuredClone(rec);
    },
    async remove(t, id, key = 'id') {
      requireAuth(); await delay();
      if (t === 'campus_locations' && (db.water_readings.some((w) => w.location_id === id) || db.conservation_actions.some((a) => a.location_id === id))) {
        throw new Error('This location has readings or actions linked to it and cannot be deleted.');
      }
      db[t] = table(t).filter((r) => r[key] !== id);
      if (t === 'campus_locations') db.water_reports.forEach((r) => { if (r.location_id === id) r.location_id = null; });
      if (t === 'water_reports') db.conservation_actions.forEach((a) => { if (a.report_id === id) a.report_id = null; });
      persist();
    },

    async settings() { return Object.fromEntries(db.site_settings.map((s) => [s.key, structuredClone(s.value)])); },
    async saveSetting(key, value) {
      requireAuth();
      const s = db.site_settings.find((x) => x.key === key);
      if (s) s.value = value; else db.site_settings.push({ key, value });
      persist();
    },

    async report(name) {
      requireAuth(); await delay();
      switch (name) {
        case 'issues_by_location_status': return reportIssuesByLocationStatus(db.water_reports, db.campus_locations);
        case 'daily_consumption': return reportDailyConsumption(db.water_readings, db.campus_locations);
        case 'baseline_vs_pilot': return reportBaselineVsPilot(db.water_readings, db.campus_locations);
        case 'conservation_actions': return reportConservationActions(db.conservation_actions);
        default: throw new Error(`Unknown report ${name}`);
      }
    },

    async photoUrl(path) { return path?.startsWith('data:image/') ? path : null; },
    async uploadGalleryImage(dataUrl) { return dataUrl; },
    async deleteDemoData() {
      requireAuth();
      for (const t of ['water_reports', 'water_readings', 'conservation_actions', 'pledges', 'feedback', 'budget_items']) {
        db[t] = db[t].filter((r) => !r.is_demo);
      }
      db.campus_locations = db.campus_locations.filter((l) => !l.is_demo
        || db.water_readings.some((w) => w.location_id === l.id) || db.conservation_actions.some((a) => a.location_id === l.id));
      persist();
    },
    async resetDemo() { localStorage.removeItem(KEY); load(); },
    async listUsers() {
      requireAuth(); await delay();
      return db.profiles.map((p) => ({ ...p, email: p.email ?? 'N/A', last_sign_in_at: null }));
    },
  };
}
