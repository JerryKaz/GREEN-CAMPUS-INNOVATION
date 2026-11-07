// Admin login page: password check, visibility toggle, redirect to the dashboard.
import { hydrateIcons, icon } from '../lib/icons.js';
import { isAuthenticated, login, lockRemaining } from './auth.js';

const DASHBOARD = 'dashboard.html';
const params = new URLSearchParams(location.search);
// Only allow returning to an in-panel hash route, never an arbitrary URL.
const next = /^#\/[a-z-]+$/.test(params.get('next') ?? '') ? params.get('next') : '';

if (isAuthenticated()) location.replace(DASHBOARD + next);

hydrateIcons();
const form = document.getElementById('login-form');
const input = form.elements.password;
const status = form.querySelector('[data-form-status]');
const err = form.querySelector('[data-error-for="password"]');

const reason = params.get('reason');
if (reason) {
  const text = { expired: 'Your session ended. Please sign in again.', loggedout: 'You have signed out.', required: 'Please sign in to open the admin panel.' }[reason];
  if (text) document.getElementById('login-reason').innerHTML = `<div class="notice">${icon('info', 18)}<p>${text}</p></div>`;
}

const toggle = document.getElementById('toggle-password');
toggle.addEventListener('click', () => {
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  toggle.innerHTML = icon(show ? 'eyeOff' : 'eye', 18);
  input.focus();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  err.textContent = '';
  input.removeAttribute('aria-invalid');
  if (!input.value) { err.textContent = 'Enter the admin password.'; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
  try {
    login(input.value);
    status.className = 'form-status form-status--success';
    status.textContent = 'Signed in. Opening the dashboard…';
    location.replace(DASHBOARD + next);
  } catch (ex) {
    status.className = 'form-status form-status--error';
    status.textContent = ex.message;
    input.setAttribute('aria-invalid', 'true');
    input.select();
  }
});

if (lockRemaining()) { status.className = 'form-status form-status--error'; status.textContent = `Too many attempts. Try again in ${lockRemaining()} seconds.`; }
input.focus();
