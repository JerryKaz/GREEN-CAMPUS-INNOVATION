// Demonstration-level admin gate (see assets/js/admin-config.js for the caveats).
// The session lives in sessionStorage: it ends when the tab/browser closes,
// after the idle timeout, after the maximum session length, or on logout.
import { ADMIN_CONFIG } from '../admin-config.js';

const SESSION_KEY = 'gci_admin_session';
const LOCK_KEY = 'gci_admin_lock';
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

const read = (store, key) => { try { return JSON.parse(store.getItem(key) ?? 'null'); } catch { return null; } };
const write = (store, key, v) => { try { store.setItem(key, JSON.stringify(v)); } catch { /* storage disabled */ } };

/** Compare without exiting early on the first mismatch. */
function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

export function isAuthenticated() {
  const s = read(sessionStorage, SESSION_KEY);
  if (!s) return false;
  const t = Date.now();
  if (t - s.last > ADMIN_CONFIG.IDLE_TIMEOUT_MINUTES * 60_000 || t - s.started > ADMIN_CONFIG.MAX_SESSION_HOURS * 3_600_000) {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

export function touch() {
  const s = read(sessionStorage, SESSION_KEY);
  if (s) write(sessionStorage, SESSION_KEY, { ...s, last: Date.now() });
}

/** Seconds remaining on a lockout after too many wrong passwords (0 = not locked). */
export function lockRemaining() {
  const l = read(localStorage, LOCK_KEY);
  return l?.until ? Math.max(0, Math.ceil((l.until - Date.now()) / 1000)) : 0;
}

export function login(password) {
  if (lockRemaining()) throw new Error(`Too many attempts. Try again in ${lockRemaining()} seconds.`);
  if (!ADMIN_CONFIG.ADMIN_PASSWORD) throw new Error('No admin password is configured in assets/js/admin-config.js.');
  if (!safeEqual(password, ADMIN_CONFIG.ADMIN_PASSWORD)) {
    const l = read(localStorage, LOCK_KEY) ?? { fails: 0 };
    const fails = (l.fails ?? 0) + 1;
    write(localStorage, LOCK_KEY, fails >= MAX_ATTEMPTS ? { fails: 0, until: Date.now() + LOCK_SECONDS * 1000 } : { fails });
    throw new Error(fails >= MAX_ATTEMPTS ? `Incorrect password. Locked for ${LOCK_SECONDS} seconds.` : 'Incorrect password.');
  }
  localStorage.removeItem(LOCK_KEY);
  write(sessionStorage, SESSION_KEY, { started: Date.now(), last: Date.now() });
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export const IDLE_MINUTES = ADMIN_CONFIG.IDLE_TIMEOUT_MINUTES;
