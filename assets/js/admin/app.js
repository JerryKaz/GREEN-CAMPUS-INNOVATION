// WaterWatch admin: session guard, sidebar navigation and hash router.
// Unauthenticated visitors are redirected to the login page (admin/index.html).
import { isAuthenticated, logout, touch, IDLE_MINUTES } from './auth.js';

if (!isAuthenticated()) {
  const next = location.hash && /^#\/[a-z-]+/.test(location.hash) ? `&next=${encodeURIComponent(location.hash.split('?')[0])}` : '';
  location.replace(`./index.html?reason=required${next}`);
  await new Promise(() => {}); // halt this module while the browser navigates away
}

const { getDB } = await import('../data/db.js');
const { hydrateIcons, icon } = await import('../lib/icons.js');
const { esc, toast, loadingHTML, errorHTML, fmtDateTime } = await import('../lib/dom.js');
const { friendlyError } = await import('../lib/validate.js');
(await import('../lib/offline.js')).enableOffline();

const ROUTES = [
  { group: 'Operations' },
  { path: 'overview', title: 'Dashboard', icon: 'dashboard', mod: 'overview' },
  { path: 'reports', title: 'Water Reports', icon: 'alert', mod: 'reports', count: 'reports' },
  { path: 'readings', title: 'Water Readings', icon: 'gauge', mod: 'readings' },
  { path: 'actions', title: 'Conservation Actions', icon: 'wrench', mod: 'actions' },
  { path: 'locations', title: 'Campus Locations', icon: 'pin', mod: 'locations' },
  { group: 'Community' },
  { path: 'pledges', title: 'Pledges', icon: 'heart', mod: 'pledges' },
  { path: 'feedback', title: 'Feedback', icon: 'message', mod: 'feedback', count: 'feedback' },
  { group: 'Content & insight' },
  { path: 'media', title: 'Media Management', icon: 'image', mod: 'media' },
  { path: 'analytics', title: 'Reports & Analytics', icon: 'chart', mod: 'analytics' },
  { path: 'budget', title: 'Budget', icon: 'coins', mod: 'budget' },
  { path: 'settings', title: 'Site Content', icon: 'settings', mod: 'settings' },
  { group: 'System' },
  { path: 'data', title: 'Data Management', icon: 'database', mod: 'data' },
];

const $ = (id) => document.getElementById(id);
const signOut = (reason = 'loggedout') => { logout(); location.replace(`./index.html?reason=${reason}`); };

hydrateIcons();
const db = await getDB();
document.addEventListener('click', (e) => { if (e.target.closest('[data-signout]')) signOut(); });

// Every admin view has full rights: there is a single shared demo password, not user accounts.
const can = { write: true, admin: true };
const profile = { id: 'local-admin', full_name: 'Project admin' };

$('boot').hidden = true;
$('app-view').hidden = false;
$('storage-badge').textContent = db.persistent ? 'Local data' : 'Temporary data';

async function drawRibbon() {
  const last = await db.getMeta('last_backup_at');
  const stale = !last || Date.now() - new Date(last).getTime() > 7 * 86_400_000;
  $('admin-ribbon').innerHTML = `<div class="demo-ribbon">${icon('database', 16)}
    <span>${db.persistent
      ? 'Records are stored in this browser on this device only. They are not shared with other visitors or devices.'
      : 'This browser is not allowing local storage, so changes will be lost when the tab closes.'}
    ${stale ? `<strong>${last ? `Last backup ${esc(fmtDateTime(last))}.` : 'No backup yet.'}</strong>` : ''}
    <a href="#/data">Back up or restore</a></span></div>`;
}

const nav = $('sidenav');
nav.innerHTML = ROUTES.map((r) => (r.group ? `<span class="group">${esc(r.group)}</span>`
  : `<a href="#/${r.path}" data-path="${r.path}">${icon(r.icon, 18)}<span>${esc(r.title)}</span>${r.count ? `<span class="count" data-count="${r.count}" hidden></span>` : ''}</a>`)).join('')
  + `<button type="button" class="sidenav__logout" data-signout>${icon('logout', 18)}<span>Log out</span></button>`;

const sidebar = $('sidebar');
const toggle = document.querySelector('.sidebar-toggle');
const setOpen = (open) => { sidebar.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
});

async function refreshCounts() {
  try {
    const [reports, feedback] = await Promise.all([
      db.list('water_reports', { eq: { status: 'submitted' } }),
      db.list('feedback', { eq: { status: 'new' } }),
    ]);
    for (const [key, n] of [['reports', reports.length], ['feedback', feedback.length]]) {
      const el = document.querySelector(`[data-count="${key}"]`);
      if (el) { el.hidden = !n; el.textContent = n; el.title = key === 'reports' ? `${n} new report(s)` : `${n} unread`; }
    }
  } catch { /* counts are a convenience */ }
  drawRibbon();
}

const ctx = { db, profile, can, refreshCounts, navigate: (p) => { location.hash = `#/${p}`; } };
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
    if (seq !== renderSeq) return;
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
db.onChange(() => refreshCounts());
route();
refreshCounts();

// Session upkeep: activity extends the idle timer; expiry returns to the login page.
let idleTimer;
const resetIdle = () => {
  touch();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    toast(`Signed out after ${IDLE_MINUTES} minutes of inactivity.`, 'info', 6000);
    setTimeout(() => signOut('expired'), 1200);
  }, IDLE_MINUTES * 60_000);
};
['pointerdown', 'keydown', 'scroll'].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));
resetIdle();
setInterval(() => { if (!isAuthenticated()) signOut('expired'); }, 60_000);
