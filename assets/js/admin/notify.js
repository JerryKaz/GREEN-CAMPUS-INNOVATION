// Admin notification centre: guidance, reminders, checks and system events.
// Stored in this browser (localStorage). Guidance can be marked read but is never
// deleted, so it stays available; system messages can be dismissed.
const KEY = 'gci_admin_notifications_v1';
const MAX_SYSTEM = 40;
const listeners = new Set();

export const CATEGORIES = {
  start: { label: 'Getting started', icon: 'flag' },
  research: { label: 'Research reminders', icon: 'flask' },
  data: { label: 'Data management', icon: 'database' },
  publish: { label: 'Publishing reminders', icon: 'upload' },
  check: { label: 'Needs attention', icon: 'clipboard' },
  system: { label: 'System messages', icon: 'checkCircle' },
};

// Permanent guidance (ids are stable so they are created only once).
const GUIDANCE = [
  ['g-welcome', 'start', 'Welcome! Start by entering your research information.', 'Open Research Information and add your background, methodology and first observations. You can save drafts and publish later.', 'research'],
  ['g-baseline', 'start', 'Record baseline water readings before the intervention starts.', 'Baseline readings show how much water was used before WaterWatch. Without them, savings cannot be measured.', 'readings'],
  ['g-locations', 'start', 'Add your verified campus locations to the hotspot map.', 'Only locations marked as verified appear on the public map.', 'locations'],
  ['g-3days', 'research', 'Baseline observations should cover at least three days.', 'Record readings on at least three different days for each location, using the same method each time.', 'readings'],
  ['g-datestamp', 'research', 'Record the date and location for every water reading.', 'Each reading needs a date, a location, a value and the method used.', 'readings'],
  ['g-interviews', 'research', 'Interview findings should reflect actual responses.', 'Summarise what people really said. Do not add opinions that were not expressed.', 'research'],
  ['g-verified', 'research', 'Only publish verified fieldwork findings.', 'Keep a section as a draft until the group has checked it.', 'research'],
  ['g-backup', 'data', 'Back up your research data regularly.', 'Download a backup after every data-entry session and before every presentation.', 'data'],
  ['g-local', 'data', 'Your information is stored in this browser on this computer.', 'It does not appear on other computers or phones, and is lost if the browser data is cleared.', 'data'],
  ['g-devices', 'data', 'Export your data before changing devices or clearing browser data.', 'Download a backup, then use Restore on the new device.', 'data'],
  ['g-photos', 'publish', 'New photos must be added to the website files and published before visitors on other devices can see them.', 'Use Data Backup → Publish to the website, and send the files to the person who manages the website files.', 'data'],
  ['g-checkfindings', 'publish', 'Check that all published research findings have been verified.', 'Review Research Information before every presentation.', 'research'],
  ['g-videos', 'publish', 'Make sure your videos are viewable before publishing their links.', 'YouTube videos can be "Unlisted". Google Drive files must be shared as "Anyone with the link".', 'media'],
];

const now = () => new Date().toISOString();
function read() { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } }
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or disabled */ }
  listeners.forEach((cb) => cb());
}

export function ensureGuidance() {
  const list = read();
  const have = new Set(list.map((n) => n.id));
  let added = false;
  GUIDANCE.forEach(([id, category, title, body, route]) => {
    if (!have.has(id)) { list.push({ id, kind: 'guide', category, title, body, route, created_at: now(), read: false }); added = true; }
  });
  if (added) write(list);
}

export function all() {
  return read().sort((a, b) => (a.read === b.read ? String(b.created_at).localeCompare(String(a.created_at)) : a.read ? 1 : -1));
}
export const unreadCount = () => read().filter((n) => !n.read).length;

/** Add a system message. Repeats of the same key within a minute are merged. */
export function notify(title, { body = '', route = '', category = 'system', key = title } = {}) {
  const list = read();
  const recent = list.find((n) => n.kind === 'system' && n.key === key && Date.now() - new Date(n.created_at).getTime() < 60_000);
  if (recent) { recent.created_at = now(); recent.read = false; recent.count = (recent.count ?? 1) + 1; }
  else list.push({ id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind: 'system', key, category, title, body, route, created_at: now(), read: false });
  const system = list.filter((n) => n.kind === 'system').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const drop = new Set(system.slice(MAX_SYSTEM).map((n) => n.id));
  write(list.filter((n) => !drop.has(n.id)));
}

/** Replace the set of automatic checks (incomplete sections, missing information). */
export function setChecks(checks) {
  const list = read();
  const current = new Map(list.filter((n) => n.kind === 'check').map((n) => [n.id, n]));
  const next = checks.map((c) => {
    const old = current.get(c.id);
    // Keep "read" if the message is unchanged; a changed message becomes unread again.
    return { kind: 'check', category: 'check', created_at: old?.created_at ?? now(), read: old ? old.read && old.title === c.title : false, ...c };
  });
  write([...list.filter((n) => n.kind !== 'check'), ...next]);
}

export function markRead(id, value = true) { write(read().map((n) => (n.id === id ? { ...n, read: value } : n))); }
export function markAllRead() { write(read().map((n) => ({ ...n, read: true }))); }
/** Guidance and open checks are only marked read (they stay available); system messages are removed. */
export function dismiss(id) {
  const list = read();
  const n = list.find((x) => x.id === id);
  if (!n) return;
  write(n.kind === 'guide' || n.kind === 'check' ? list.map((x) => (x.id === id ? { ...x, read: true } : x)) : list.filter((x) => x.id !== id));
}
export function onNotifications(cb) { listeners.add(cb); return () => listeners.delete(cb); }

/** Automatic checks computed from the stored records. */
export async function runChecks(db) {
  const { siteContent } = await import('../lib/content.js');
  const [readings, locations, actions, media, content, lastBackup, demo] = await Promise.all([
    db.list('water_readings'), db.list('campus_locations'), db.list('conservation_actions'), db.list('media_items'),
    siteContent(db), db.getMeta('last_backup_at'), db.demoCount(),
  ]);
  const r = content.research ?? {};
  const checks = [];
  const realReadings = readings.filter((w) => !w.is_demo);
  const baselineDays = new Set(realReadings.filter((w) => w.phase === 'baseline').map((w) => w.reading_date)).size;
  if (demo) checks.push({ id: 'c-demo', title: `${demo} old record(s) from an earlier version of the site were found.`, body: 'They are not fieldwork and are hidden from the public website. Review and remove them in Data Backup. Nothing is deleted without your confirmation.', route: 'data' });
  if (!r.background && !r.problem && !r.methodology) checks.push({ id: 'c-research', title: 'Research Information has not been started.', body: 'Add the research background, problem statement and methodology.', route: 'research' });
  else if (!Object.values(r.published ?? {}).some(Boolean)) checks.push({ id: 'c-research-draft', title: 'Your research information is saved as a draft.', body: 'Nothing from Research Information is on the public website yet. Publish each section when it has been checked.', route: 'research' });
  if (baselineDays < 3) checks.push({ id: 'c-baseline', title: baselineDays ? `Baseline readings cover ${baselineDays} day(s). At least 3 are needed.` : 'No baseline water readings have been recorded.', body: 'Add baseline readings for at least three days at each location.', route: 'readings' });
  if (!locations.some((l) => !l.is_demo && l.is_verified)) checks.push({ id: 'c-locations', title: 'No verified campus locations yet.', body: 'The public hotspot map stays empty until at least one location is marked as verified.', route: 'locations' });
  const noCoords = locations.filter((l) => !l.is_demo && (l.latitude === null || l.latitude === undefined)).length;
  if (noCoords) checks.push({ id: 'c-coords', title: `${noCoords} location(s) have no map position.`, body: 'Open the location and click the map to set its position.', route: 'locations' });
  if (actions.some((a) => !a.is_demo && a.status === 'verified' && !a.verification_notes)) checks.push({ id: 'c-verify', title: 'A verified action has no verification notes.', body: 'Add who checked the work and what they found.', route: 'actions' });
  const localPhotos = media.filter((m) => m.kind === 'image' && m.data_url).length;
  if (localPhotos) checks.push({ id: 'c-photos', title: `${localPhotos} photo(s) are only on this computer.`, body: 'Publish them so visitors on other devices can see them.', route: 'data' });
  if (!lastBackup) checks.push({ id: 'c-backup', title: 'You have not downloaded a backup yet.', body: 'Download one now from Data Backup.', route: 'data' });
  else if (Date.now() - new Date(lastBackup).getTime() > 7 * 86_400_000) checks.push({ id: 'c-backup', title: 'Your last backup is more than a week old.', body: 'Download a fresh backup from Data Backup.', route: 'data' });
  setChecks(checks);
}
