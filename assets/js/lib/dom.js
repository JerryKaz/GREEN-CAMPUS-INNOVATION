// DOM + formatting helpers. Every piece of user-supplied text goes through esc().
import { icon } from './icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => (v === null || v === undefined ? '' : String(v).replace(/[&<>"']/g, (c) => ESC[c]));

const LOCALE = 'en-GH';
export const fmtNum = (n, digits = 0) =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? 'N/A'
    : Number(n).toLocaleString(LOCALE, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const fmtGHS = (n) =>
  n === null || n === undefined || n === '' ? 'N/A'
    : `GH₵ ${Number(n).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => {
  if (!d) return 'N/A';
  const dt = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return Number.isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
};
export const fmtDateTime = (d) => {
  if (!d) return 'N/A';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? 'N/A'
    : dt.toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function toast(message, type = 'info', ms = 4500) {
  let host = $('#toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'success' ? 'checkCircle' : 'info', 18)}<span>${esc(message)}</span>`;
  host.append(el);
  setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 300); }, ms);
}

export const loadingHTML = (label = 'Loading…') =>
  `<div class="state state--loading" role="status"><span class="spinner" aria-hidden="true"></span>${esc(label)}</div>`;

export const emptyHTML = (title, body = '', iconName = 'info') =>
  `<div class="state state--empty">${icon(iconName, 28)}<p class="state__title">${esc(title)}</p>${body ? `<p class="state__body">${esc(body)}</p>` : ''}</div>`;

export const errorHTML = (message) =>
  `<div class="state state--error" role="alert">${icon('alert', 24)}<p>${esc(message)}</p></div>`;

export const demoBadge = (on = true) => (on ? '<span class="badge badge--demo" title="Created by an earlier version of the site, not by fieldwork. Hidden from the public website. Remove it in Data Backup.">Not fieldwork</span>' : '');

/** Downscale + re-encode an image file to JPEG. Also strips EXIF/GPS metadata. */
export async function compressImage(file, maxDim = 1600, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function downloadCSV(filename, rows, columns) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []);
  const cell = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.map((c) => cell(c.label)).join(','),
    ...rows.map((r) => cols.map((c) => cell(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Accessible modal. Returns { el, close }. */
export function openModal({ title, body, wide = false, onClose }) {
  const prev = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="modal__backdrop" data-close></div>
    <div class="modal__dialog ${wide ? 'modal__dialog--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal__head"><h2 id="modal-title">${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Close">${icon('x', 20)}</button></header>
      <div class="modal__body"></div></div>`;
  const bodyEl = wrap.querySelector('.modal__body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.append(body);
  document.body.append(wrap);
  document.body.classList.add('has-modal');
  const close = () => {
    wrap.remove();
    document.body.classList.remove('has-modal');
    document.removeEventListener('keydown', onKey);
    prev?.focus?.();
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // simple focus trap
      const f = [...wrap.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  (wrap.querySelector('input, select, textarea') ?? wrap.querySelector('.modal__dialog button'))?.focus();
  return { el: wrap, body: bodyEl, close };
}

export function confirmDialog(message, { confirmLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const m = openModal({
      title: 'Please confirm',
      body: `<p>${esc(message)}</p><div class="form-actions"><button class="btn btn--ghost" data-no>Cancel</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-yes>${esc(confirmLabel)}</button></div>`,
      onClose: () => { if (!answered) resolve(false); },
    });
    m.el.querySelector('[data-yes]').addEventListener('click', () => { answered = true; m.close(); resolve(true); });
    m.el.querySelector('[data-no]').addEventListener('click', () => { answered = true; m.close(); resolve(false); });
  });
}
