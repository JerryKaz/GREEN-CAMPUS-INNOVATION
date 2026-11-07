// WaterWatch admin: session guard, navigation, notification centre and guided tour.
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
const N = await import('./notify.js');
const { maybeWelcome, startTour } = await import('./tour.js');
(await import('../lib/offline.js')).enableOffline();

const ROUTES = [
  { path: 'overview', title: 'Dashboard', icon: 'dashboard', mod: 'overview' },
  { path: 'research', title: 'Research Information', icon: 'flask', mod: 'research' },
  { path: 'readings', title: 'Water Readings', icon: 'gauge', mod: 'readings' },
  { path: 'locations', title: 'Campus Hotspots', icon: 'pin', mod: 'locations' },
  { path: 'actions', title: 'Conservation Actions', icon: 'wrench', mod: 'actions' },
  { path: 'reports', title: 'Water Problem Reports', icon: 'alert', mod: 'reports', count: 'reports' },
  { path: 'media', title: 'Photos and Videos', icon: 'image', mod: 'media' },
  { path: 'community', title: 'Pledges and Feedback', icon: 'heart', mod: 'community', count: 'feedback' },
  { path: 'content', title: 'Website Content', icon: 'settings', mod: 'content' },
  { path: 'notifications', title: 'Notifications', icon: 'bell', mod: 'notifications', count: 'notifications' },
  { path: 'data', title: 'Data Backup', icon: 'database', mod: 'data' },
  { path: 'help', title: 'Help and User Guide', icon: 'help', mod: 'help' },
  // Reached from other pages, not listed in the menu:
  { path: 'analytics', title: 'Detailed Reports and Charts', icon: 'chart', mod: 'analytics', hidden: true },
  { path: 'budget', title: 'Project Budget', icon: 'coins', mod: 'budget', hidden: true },
];
const ALIASES = { settings: 'content', pledges: 'community', feedback: 'community', gallery: 'media' };

const $ = (id) => document.getElementById(id);
const signOut = (reason = 'loggedout') => { logout(); location.replace(`./index.html?reason=${reason}`); };
const navigate = (p) => { if (location.hash !== `#/${p}`) location.hash = `#/${p}`; };

hydrateIcons();
const db = await getDB();
document.addEventListener('click', (e) => { if (e.target.closest('[data-signout]')) signOut(); });

const can = { write: true, admin: true }; // one shared admin password, not user accounts
const profile = { id: 'local-admin', full_name: 'Project admin' };

$('boot').hidden = true;
$('app-view').hidden = false;

// ---- sidebar -----------------------------------------------------------------------
const nav = $('sidenav');
nav.innerHTML = ROUTES.filter((r) => !r.hidden).map((r) => `<a href="#/${r.path}" data-path="${r.path}">${icon(r.icon, 18)}<span>${esc(r.title)}</span>${r.count ? `<span class="count" data-count="${r.count}" hidden></span>` : ''}</a>`).join('')
  + `<button type="button" class="sidenav__tour" data-start-tour>${icon('compass', 18)}<span>Help / Take a Tour</span></button>
     <button type="button" class="sidenav__logout" data-signout>${icon('logout', 18)}<span>Logout</span></button>`;

const sidebar = $('sidebar');
const toggle = document.querySelector('.sidebar-toggle');
const setOpen = (open) => { sidebar.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); };
toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a, button')) setOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); closeDrawer(); } });
document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
});

const tour = () => startTour({ navigate, onDone: (done) => { if (done) N.notify('You completed the guided tour.', { body: 'Open it again any time from Help and User Guide.', route: 'help', key: 'tour' }); } });
document.addEventListener('click', (e) => { if (e.target.closest('[data-start-tour]')) { closeDrawer(); tour(); } });

// ---- notification bell and drawer ----------------------------------------------------
const bell = $('bell');
const drawer = $('drawer');
let drawerFilter = 'all';
function renderNotificationList(host, { filter = 'all', compact = false } = {}) {
  const list = N.all().filter((n) => filter === 'all' || (filter === 'unread' ? !n.read : n.category === filter));
  host.innerHTML = list.length ? `<ul class="notes">${list.map((n) => {
    const c = N.CATEGORIES[n.category] ?? N.CATEGORIES.system;
    return `<li class="note ${n.read ? '' : 'is-unread'}" data-id="${esc(n.id)}">
      <button type="button" class="note__main" data-open="${esc(n.id)}">
        <span class="note__icon note__icon--${esc(n.category)}">${icon(c.icon, 16)}</span>
        <span class="note__text"><span class="note__cat">${esc(c.label)}${n.count > 1 ? ` · ${n.count}×` : ''}</span>
          <strong>${esc(n.title)}</strong>${n.body && !compact ? `<span>${esc(n.body)}</span>` : ''}
          <span class="note__time">${esc(fmtDateTime(n.created_at))}</span></span></button>
      <span class="note__tools">
        <button type="button" class="icon-btn icon-btn--sm" data-toggle-read="${esc(n.id)}" title="${n.read ? 'Mark as unread' : 'Mark as read'}" aria-label="${n.read ? 'Mark as unread' : 'Mark as read'}">${icon(n.read ? 'mail' : 'check', 15)}</button>
        ${n.kind !== 'system' ? '' : `<button type="button" class="icon-btn icon-btn--sm" data-dismiss="${esc(n.id)}" title="Dismiss" aria-label="Dismiss">${icon('x', 15)}</button>`}
      </span></li>`;
  }).join('')}</ul>` : `<p class="muted" style="padding:16px">${filter === 'unread' ? 'You have read everything. Nice work.' : 'No notifications.'}</p>`;
}
function onNoteClick(e, after) {
  const open = e.target.closest('[data-open]');
  const tog = e.target.closest('[data-toggle-read]');
  const dis = e.target.closest('[data-dismiss]');
  if (open) {
    const n = N.all().find((x) => x.id === open.dataset.open);
    N.markRead(n.id);
    if (n.route) { closeDrawer(); navigate(n.route); }
  } else if (tog) {
    const n = N.all().find((x) => x.id === tog.dataset.toggleRead);
    N.markRead(n.id, !n.read);
  } else if (dis) N.dismiss(dis.dataset.dismiss);
  after?.();
}
function drawDrawer() {
  drawer.querySelector('[data-list]').innerHTML = '';
  renderNotificationList(drawer.querySelector('[data-list]'), { filter: drawerFilter, compact: false });
  drawer.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === drawerFilter)));
}
function openDrawer() { drawer.hidden = false; bell.setAttribute('aria-expanded', 'true'); drawDrawer(); drawer.querySelector('[data-close-drawer]').focus(); }
function closeDrawer() { if (drawer.hidden) return; drawer.hidden = true; bell.setAttribute('aria-expanded', 'false'); bell.focus(); }
bell.addEventListener('click', () => (drawer.hidden ? openDrawer() : closeDrawer()));
drawer.addEventListener('click', (e) => {
  if (e.target.closest('[data-close-drawer]') || e.target === drawer) { closeDrawer(); return; }
  const f = e.target.closest('[data-filter]');
  if (f) { drawerFilter = f.dataset.filter; drawDrawer(); return; }
  if (e.target.closest('[data-read-all]')) { N.markAllRead(); return; }
  if (e.target.closest('[data-view-all]')) { closeDrawer(); navigate('notifications'); return; }
  onNoteClick(e);
});
function drawBell() {
  const n = N.unreadCount();
  const dot = bell.querySelector('.bell__count');
  dot.hidden = !n;
  dot.textContent = n > 9 ? '9+' : n;
  bell.setAttribute('aria-label', n ? `Notifications, ${n} unread` : 'Notifications');
  const side = document.querySelector('[data-count="notifications"]');
  if (side) { side.hidden = !n; side.textContent = n; }
  if (!drawer.hidden) drawDrawer();
}
N.onNotifications(drawBell);
window.addEventListener('storage', (e) => { if (e.key?.startsWith('gci_admin_notifications')) drawBell(); });

// ---- counts and checks ---------------------------------------------------------------
async function refreshCounts() {
  try {
    const [reports, feedback] = await Promise.all([db.list('water_reports', { eq: { status: 'submitted' } }), db.list('feedback', { eq: { status: 'new' } })]);
    for (const [key, n] of [['reports', reports.length], ['feedback', feedback.length]]) {
      const el = document.querySelector(`[data-count="${key}"]`);
      if (el) { el.hidden = !n; el.textContent = n; el.title = key === 'reports' ? `${n} new report(s)` : `${n} new message(s)`; }
    }
  } catch { /* counts are a convenience */ }
  N.runChecks(db).catch((e) => console.warn(e));
}

// Turn saves into notification-centre messages (the toast already confirms on screen).
const SAVED = {
  water_readings: ['Water reading saved.', 'readings'], campus_locations: ['Campus location saved.', 'locations'],
  conservation_actions: ['Conservation action saved.', 'actions'], water_reports: ['Water problem report updated.', 'reports'],
  media_items: ['Photo or video saved.', 'media'], settings: ['Website information saved.', 'research'],
  budget_items: ['Budget updated.', 'budget'], import: ['Backup restored successfully.', 'data'], demo: ['Old records removed.', 'data'],
};
db.onChange((what) => {
  const s = SAVED[what];
  if (s) N.notify(s[0], { route: s[1], key: `saved-${what}` });
  refreshCounts();
});

// ---- router ----------------------------------------------------------------------------
const ctx = { db, profile, can, refreshCounts, navigate, notify: N.notify, renderNotificationList, onNoteClick, startTour: tour };
let renderSeq = 0;
async function route() {
  let [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  path = ALIASES[path] ?? path;
  const r = ROUTES.find((x) => x.path === path) ?? ROUTES[0];
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
    el.replaceChildren(host);
    el.focus({ preventScroll: true });
    await mod.render({ ...ctx, el: host, isCurrent: () => seq === renderSeq });
    // Quick-action links like #/readings?add=1 open the section's main form.
    if (new URLSearchParams(query).get('add') === '1') host.querySelector('[data-add]')?.click();
  } catch (err) {
    console.error(err);
    if (seq === renderSeq) el.innerHTML = errorHTML(friendlyError(err));
  }
}
window.addEventListener('hashchange', route);

N.ensureGuidance();
drawBell();
await route();
refreshCounts();
if (!maybeWelcome({ navigate, onDone: (done) => { if (done) N.notify('You completed the guided tour.', { route: 'help', key: 'tour' }); } }) && N.unreadCount()) {
  // Returning admin: a gentle pulse on the bell instead of pop-ups.
  bell.classList.add('has-news');
  setTimeout(() => bell.classList.remove('has-news'), 4000);
}

// ---- session upkeep -------------------------------------------------------------------
let idleTimer;
const resetIdle = () => {
  touch();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    toast(`You were logged out after ${IDLE_MINUTES} minutes without activity.`, 'info', 6000);
    setTimeout(() => signOut('expired'), 1200);
  }, IDLE_MINUTES * 60_000);
};
['pointerdown', 'keydown', 'scroll'].forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));
resetIdle();
setInterval(() => { if (!isAuthenticated()) signOut('expired'); }, 60_000);
