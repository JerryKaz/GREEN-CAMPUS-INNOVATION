// Shared page chrome: header, mobile nav, media slots, waterline, reveals, count-ups.
import { hydrateIcons } from './lib/icons.js';
import { hydrateMedia } from './lib/media.js';
import { getDB, CONFIG } from './data/db.js';
import { enableOffline } from './lib/offline.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Three layered waves: masked, horizontally repeating tiles that loop seamlessly at any width.
const WATERLINE = '<span class="waterline__layer is-back"></span><span class="waterline__layer is-mid"></span><span class="waterline__layer is-front"></span>';

export async function initLayout() {
  hydrateIcons();
  document.querySelectorAll('.waterline').forEach((el) => { el.innerHTML = WATERLINE; });
  hydrateMedia();

  // Header: transparent over a photo hero, solid once the page scrolls.
  const header = document.querySelector('.site-header');
  if (header && document.querySelector('.hero')) {
    document.body.classList.add('has-photo-hero');
    const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      header?.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
  }

  const page = document.body.dataset.page;
  document.querySelectorAll('.nav a[data-page]').forEach((a) => {
    if (a.dataset.page === page) a.setAttribute('aria-current', 'page');
  });
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

  observeReveals();
  enableOffline();
  const db = await getDB();
  return { db, config: CONFIG };
}

let io;
export function observeReveals(root = document) {
  const els = root.querySelectorAll('.reveal:not(.is-visible)');
  if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return; }
  io ??= new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -80px 0px' });
  els.forEach((el) => io.observe(el));
}

/** Count numbers up from zero when they scroll into view. */
export function countUp(root = document) {
  const els = [...root.querySelectorAll('[data-count]')];
  const fmt = (n, d) => n.toLocaleString('en-GH', { maximumFractionDigits: d });
  const run = (el) => {
    const target = Number(el.dataset.count);
    const digits = Number(el.dataset.digits || 0);
    if (reduceMotion || !Number.isFinite(target)) { el.textContent = fmt(target, digits); return; }
    const start = performance.now();
    const dur = 1400;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = fmt(target * eased, p < 1 ? 0 : digits);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  const obs = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { run(en.target); obs.unobserve(en.target); }
  }), { threshold: 0.4 });
  els.forEach((el) => { el.textContent = '0'; obs.observe(el); });
}
