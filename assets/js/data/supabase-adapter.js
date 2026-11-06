// Supabase adapter — the production data layer.
// Only the anon/publishable key is used. RLS + RPCs (supabase/migrations) enforce access.
import { loadScript } from '../lib/vendor.js';

const { createClient } = await loadScript('supabase/supabase.js', 'supabase');

const REPORT_VIEWS = {
  issues_by_location_status: 'report_issues_by_location_status',
  daily_consumption: 'report_daily_consumption',
  baseline_vs_pilot: 'report_baseline_vs_pilot',
  conservation_actions: 'report_conservation_actions',
};

const TABLES = new Set(['campus_locations', 'water_reports', 'water_readings', 'conservation_actions',
  'pledges', 'feedback', 'gallery_photos', 'budget_items', 'site_settings', 'profiles']);

export function createSupabaseAdapter(config) {
  const sb = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gci-auth' },
  });
  const check = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };
  const assertTable = (t) => { if (!TABLES.has(t)) throw new Error(`Unknown table ${t}`); };

  return {
    mode: 'supabase',

    // ---- auth ------------------------------------------------------------
    async session() { return check(await sb.auth.getSession()).session; },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Invalid email or password.');
    },
    async signOut() { await sb.auth.signOut(); },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/` });
      if (error) throw new Error(error.message);
    },
    async profile() {
      const s = await this.session();
      if (!s) return null;
      const rows = check(await sb.from('profiles').select('id, full_name, role').eq('id', s.user.id).limit(1));
      return rows[0] ? { ...rows[0], email: s.user.email } : { id: s.user.id, email: s.user.email, role: null, full_name: '' };
    },
    onAuthChange(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s)); },

    // ---- public ----------------------------------------------------------
    async submitReport(values, photoBlob) {
      let photoPath = null;
      if (photoBlob) {
        photoPath = `incoming/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from('report-photos').upload(photoPath, photoBlob, {
          contentType: 'image/jpeg', upsert: false,
        });
        if (error) throw new Error('Photo upload failed. You can submit without a photo.');
      }
      const ref = check(await sb.rpc('submit_water_report', {
        p_issue_type: values.issue_type,
        p_description: values.description,
        p_severity: values.severity,
        p_location_id: values.location_id || null,
        p_location_note: values.location_note || '',
        p_observed_at: values.observed_at ? new Date(values.observed_at).toISOString() : null,
        p_is_anonymous: !!values.is_anonymous,
        p_reporter_name: values.is_anonymous ? null : values.reporter_name || null,
        p_reporter_contact: values.is_anonymous ? null : values.reporter_contact || null,
        p_photo_path: photoPath,
      }));
      return { reference: ref };
    },
    // Anon may INSERT these columns only and cannot read rows back (no .select()).
    async submitPledge(v) {
      check(await sb.from('pledges').insert({
        commitment_type: v.commitment_type, full_name: v.full_name?.trim() || null,
        email: v.email?.trim() || null, department: v.department?.trim() || null,
        comments: v.comments?.trim() || null, consent_status: v.consent_status === true,
      }));
    },
    async submitFeedback(v) {
      check(await sb.from('feedback').insert({
        category: v.category, message: v.message.trim(), contact_name: v.contact_name?.trim() || null,
        contact_email: v.contact_email?.trim() || null, consent_status: v.consent_status === true,
      }));
    },
    async publicStats(includeDemo) { return check(await sb.rpc('public_stats', { p_include_demo: includeDemo })); },
    async publicHotspots(includeDemo) { return check(await sb.rpc('public_hotspots', { p_include_demo: includeDemo })); },

    // ---- generic CRUD (RLS decides what succeeds) -------------------------
    async list(table, { eq = {}, order, limit = 1000, includeDemo = true, columns = '*' } = {}) {
      assertTable(table);
      let q = sb.from(table).select(columns);
      for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
      if (!includeDemo && !['profiles', 'site_settings', 'gallery_photos'].includes(table)) q = q.eq('is_demo', false);
      if (order) q = q.order(order[0], { ascending: order[1] !== 'desc' });
      return check(await q.limit(limit));
    },
    async insert(table, row) {
      assertTable(table);
      return check(await sb.from(table).insert(row).select().single());
    },
    async update(table, id, patch, key = 'id') {
      assertTable(table);
      return check(await sb.from(table).update(patch).eq(key, id).select().single());
    },
    async remove(table, id, key = 'id') {
      assertTable(table);
      check(await sb.from(table).delete().eq(key, id));
    },

    async settings() {
      const rows = check(await sb.from('site_settings').select('key, value'));
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },
    async saveSetting(key, value) {
      check(await sb.from('site_settings').upsert({ key, value }));
    },

    async report(name) {
      const view = REPORT_VIEWS[name];
      if (!view) throw new Error(`Unknown report ${name}`);
      return check(await sb.from(view).select('*'));
    },

    async photoUrl(path) {
      if (!path) return null;
      const { data, error } = await sb.storage.from('report-photos').createSignedUrl(path, 300);
      return error ? null : data.signedUrl;
    },
    async uploadGalleryImage(blob) {
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.jpg`;
      check(await sb.storage.from('gallery').upload(path, blob, { contentType: 'image/jpeg' }));
      return sb.storage.from('gallery').getPublicUrl(path).data.publicUrl;
    },
    async deleteDemoData() { check(await sb.rpc('delete_demo_data')); },
    async listUsers() { return check(await sb.rpc('admin_list_users')); },
  };
}
