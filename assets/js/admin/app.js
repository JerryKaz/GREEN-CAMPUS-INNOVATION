// WaterWatch admin: session gate, role-based navigation and hash router.
// The UI hides what a role cannot do; the database (RLS) is what actually enforces it.
import { getDB } from '../data/db.js';
import { hydrateIcons, icon } from '../lib/icons.js';
import { esc, toast, loadingHTML, errorHTML } from '../lib/dom.js';
import { bindForm, rules, friendlyError } from '../lib/validate.js';
import { ROLES, label } from '../lib/labels.js';

const ROUTES = [
  { group: 'Operations' },
  { path: 'overview', title: 'Overview', icon: 'dashboard', mod: 'overview' },
  { path: 'reports', title: 'Water Reports', icon: 'alert', mod: 'reports', count: 'reports' },
  { path: 'locations', title: 'Campus Locations', icon: 'pin', mod: 'locations' },
  { path: 'readings', title: 'Water Readings', icon: 'gauge', mod: 'readings' },
  { path: 'actions', title: 'Conservation Actions', icon: 'wrench', mod: 'actions' },
  { group: 'Community' },
  { path: 'pledges', title: 'Pledges', icon: 'heart', mod: 'pledges' },
  { path: 'feedback', title: 'Feedback', icon: 'message', mod: 'feedback', count: 'feedback' },
  { group: 'Insight & content' },
  { path: 'analytics', title: 'Reports & Analytics', icon: 'chart', mod: 'analytics' },
  { path: 'gallery', title: 'Photo Gallery', icon: 'image', mod: 'gallery' },
  { path: 'budget', title: 'Budget', icon: 'coins', mod: 'budget' },
  { path: 'settings', title: 'Settings', icon: 'settings', mod: 'settings' },
];
const IDLE_MINUTES = 30;

const $ = (id) => document.getElementById(id);
const show = (id) => ['boot', 'login-view', 'norole-view', 'app-view'].forEach((v) => ($(v).hidden = v !== id));

hydrateIcons();
const db = await getDB();
let profile = null;

document.addEventListener('click', async (e) => {
  if (!e.target.closest('[data-signout]')) return;
  await db.signOut();
  location.hash = '';
  location.reload();
});

async function boot() {
  try {
    profile = (await db.session()) ? await db.profile() : null;
  } catch (err) {
    console.error(err);
    profile = null;
  }
  if (!profile) return showLogin();
  if (!profile.role) {
    $('norole-email').textContent = profile.email ?? '';
    return show('norole-view');
  }
  startApp();
}

// ---- sign-in -----------------------------------------------------------------
async function showLogin() {
  show('login-view');
  if (db.mode === 'demo') {
    const { DEMO_CREDENTIALS } = await import('../data/local-adapter.js');
    const box = $('login-demo');
    box.hidden = false;
    box.innerHTML = `<div class="notice notice--demo" style="margin-bottom:16px">${icon('info', 18)}<p><strong>Demo mode.</strong> No Supabase project is configured, so this is a browser-only demonstration.<br>
      Email <code>${esc(DEMO_CREDENTIALS.email)}</code> · Password <code>${esc(DEMO_CREDENTIALS.password)}</code></p></div>`;
  }
  const form = $('login-form');
  bindForm(form, { email: [rules.required('Enter your email.'), rules.email()], password: [rules.required('Enter your password.')] },
    async (v) => {
      await db.signIn(v.email.trim(), v.password);
      form.reset();
      await boot();
    }, { minFillMs: 0 });
  $('forgot').addEventListener('click', async () => {
    const email = form.elements.email.value.trim();
    const status = form.querySelector('[data-form-status]');
    if (!email) { status.className = 'form-status form-status--error'; status.textContent = 'Enter your email above first.'; return; }
    try {
      await db.resetPassword(email);
      status.className = 'form-status form-status--success';
      status.textContent = 'If that account exists, a reset link has been sent.';
    } catch (err) {
      status.className = 'form-status form-status--error';
      status.textContent = friendlyError(err);
    }
  });
  form.elements.email.focus();
}

// ---- app shell -----------------------------------------------------------------
function startApp() {
  show('app-view');
  const role = profile.role;
  const can = { write: role === 'admin' || role === 'staff', admin: role === 'admin' };
  $('user-name').textContent = profile.full_name || profile.email || 'Signed in';
  $('user-role').textContent = label(ROLES, role);
  if (db.mode === 'demo') {
    $('admin-demo-ribbon').innerHTML = '<div class="demo-ribbon">Demo mode. Data is stored only in this browser. Configure Supabase for real, shared, secured data.</div>';
  }

  const nav = $('sidenav');
  nav.innerHTML = ROUTES.map((r) => (r.group ? `<span class="group">${esc(r.group)}</span>`
    : `<a href="#/${r.path}" data-path="${r.path}">${icon(r.icon, 18)}<span>${esc(r.title)}</span>${r.count ? `<span class="count" data-count="${r.count}" hidden></span>` : ''}</a>`)).join('');

  const sidebar = $('sidebar');
  const toggle = document.querySelector('.sidebar-toggle');
  const setOpen = (open) => { sidebar.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });

  const ctx = { db, profile, can, refreshCounts, navigate: (p) => (location.hash = `#/${p}`) };
  let renderSeq = 0;
  async function route() {
    const path = location.hash.replace(/^#\/?/, '').split('?')[0] || 'overview';
    const r = ROUTES.find((x) => x.path === path) ?? ROUTES[1];
    nav.querySelectorAll('a').forEach((a) => (a.dataset.path === r.path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('view-title').textContent = r.title;
    document.title = `${r.title} · WaterWatch Admin`;
    const el = $('admin-main');
    el.innerHTML = loadingHTML();
    const seq = ++renderSeq;
    try {
      const mod = await import(`./views/${r.mod}.js`);
      if (seq !== renderSeq) return; // user navigated away meanwhile
      const host = document.createElement('div');
      host.className = 'view-inner';
      host.innerHTML = loadingHTML();
      el.replaceChildren(host); // attached first: charts and maps need real dimensions
      el.focus({ preventScroll: true });
      await mod.render({ ...ctx, el: host, isCurrent: () => seq === renderSeq });
    } catch (err) {
      console.error(err);
      if (seq === renderSeq) el.innerHTML = errorHTML(friendlyError(err));
    }
  }
  window.addEventListener('hashchange', route);
  route();
  refreshCounts();
  armIdleTimeout();
}

async function refreshCounts() {
  try {
    const [reports, feedback] = await Promise.all([
      db.list('water_reports', { eq: { status: 'submitted' }, columns: 'id' }),
      db.list('feedback', { eq: { status: 'new' }, columns: 'id' }),
    ]);
    for (const [key, n] of [['reports', reports.length], ['feedback', feedback.length]]) {
      const el = document.querySelector(`[data-count="${key}"]`);
      if (el) { el.hidden = !n; el.textContent = n; el.title = key === 'reports' ? `${n} new report(s)` : `${n} unread`; }
    }
  } catch { /* counts are a convenience */ }
}

function armIdleTimeout() {
  let timer;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await db.signOut();
      toast('Signed out after 30 minutes of inactivity.', 'info', 8000);
      setTimeout(() => location.reload(), 1500);
    }, IDLE_MINUTES * 60 * 1000);
  };
  ['pointerdown', 'keydown', 'scroll'].forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
  reset();
}

boot();
