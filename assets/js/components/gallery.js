// Dynamic image gallery driven by public/data/media-gallery.json (+ entries the
// admin added on this device). Responsive grid, category filters, lightbox with
// keyboard navigation, before/after comparison sliders and designed empty states.
import { esc, fmtDate, openModal } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { MEDIA_FOLDERS, label } from '../lib/labels.js';
import { siteURL } from '../lib/content.js';
import { quietEmpty } from '../lib/research-view.js';

const src = (m) => m.data_url || siteURL(m.path);



function figure(m, i) {
  return `<figure>
    <button type="button" data-i="${i}" aria-label="Open photo: ${esc(m.title || m.caption)}">
      <img src="${esc(src(m))}" alt="${esc(m.alt || m.caption)}" loading="lazy" decoding="async" data-img>
    </button>
    <figcaption><strong>${esc(m.title || m.caption)}</strong>
      <span class="muted">${esc(label(MEDIA_FOLDERS, m.category))}${m.location ? ` · ${esc(m.location)}` : ''}${m.date ? ` · ${esc(fmtDate(m.date))}` : ''}</span>
      ${m.caption && m.title ? `<span class="small">${esc(m.caption)}</span>` : ''}</figcaption></figure>`;
}

function openLightbox(list, start) {
  let i = start;
  const body = document.createElement('div');
  const draw = () => {
    const m = list[i];
    body.innerHTML = `<div class="lightbox"><img src="${esc(src(m))}" alt="${esc(m.alt || m.caption)}"></div>
      <p style="margin:12px 0 4px">${esc(m.caption || '')}</p>
      <dl class="meta"><dt>Category</dt><dd>${esc(label(MEDIA_FOLDERS, m.category))}</dd>
        <dt>Date</dt><dd>${esc(fmtDate(m.date))}</dd><dt>Location</dt><dd>${esc(m.location || 'N/A')}</dd></dl>
      ${list.length > 1 ? `<div class="lightbox__nav"><button type="button" class="btn btn--ghost btn--sm" data-prev>← Previous</button>
        <span class="small muted">${i + 1} of ${list.length}</span><button type="button" class="btn btn--ghost btn--sm" data-next>Next →</button></div>` : ''}`;
    const title = modal?.el.querySelector('#modal-title');
    if (title) title.textContent = m.title || m.caption || 'Photo';
  };
  const step = (d) => { i = (i + d + list.length) % list.length; draw(); };
  body.addEventListener('click', (e) => { if (e.target.closest('[data-prev]')) step(-1); if (e.target.closest('[data-next]')) step(1); });
  const onKey = (e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); };
  document.addEventListener('keydown', onKey);
  let modal = null;
  draw();
  modal = openModal({ title: list[i].title || 'Photo', wide: true, body, onClose: () => document.removeEventListener('keydown', onKey) });
}

/** Group images that share a pair_id into before/after pairs. */
export function beforeAfterPairs(images) {
  const groups = new Map();
  for (const m of images) {
    if (!m.pair_id || !['before', 'after'].includes(m.pair_role)) continue;
    const g = groups.get(m.pair_id) ?? {};
    g[m.pair_role] = m;
    groups.set(m.pair_id, g);
  }
  return [...groups.entries()].filter(([, g]) => g.before && g.after).map(([id, g]) => ({ id, ...g }));
}

/** Before/after sliders. Returns false (and renders nothing) when there are no complete pairs. */
export function renderBeforeAfter(host, images) {
  const pairs = beforeAfterPairs(images);
  if (!pairs.length) { host.innerHTML = ''; return false; }
  host.innerHTML = `<div class="ba-grid">${pairs.map((p) => `<figure class="ba">
      <div class="ba__stage">
        <img src="${esc(src(p.before))}" alt="Before: ${esc(p.before.alt || p.before.caption)}" loading="lazy">
        <img class="ba__after" src="${esc(src(p.after))}" alt="After: ${esc(p.after.alt || p.after.caption)}" loading="lazy">
        <span class="ba__divider" aria-hidden="true"></span>
        <span class="ba__label ba__label--before">Before · ${esc(fmtDate(p.before.date))}</span>
        <span class="ba__label ba__label--after">After · ${esc(fmtDate(p.after.date))}</span>
      </div>
      <input type="range" min="0" max="100" value="50" aria-label="Compare before and after: ${esc(p.after.title || p.id)}">
      <figcaption><strong>${esc(p.after.title || p.before.title || p.id)}</strong>
        <span class="muted"> · ${esc(p.after.location || p.before.location || '')}</span>
        ${p.after.caption ? `<br><span class="small">${esc(p.after.caption)}</span>` : ''}</figcaption></figure>`).join('')}</div>`;
  host.querySelectorAll('.ba').forEach((fig) => {
    const stage = fig.querySelector('.ba__stage');
    fig.querySelector('input').addEventListener('input', (e) => stage.style.setProperty('--pos', `${e.target.value}%`));
  });
  return true;
}

export function renderGallery(filtersHost, host, images) {
  const cats = Object.keys(MEDIA_FOLDERS).filter((c) => images.some((p) => p.category === c));
  let active = 'all';
  const draw = () => {
    const list = active === 'all' ? images : images.filter((p) => p.category === active);
    host.innerHTML = list.length
      ? `<div class="gallery">${list.map(figure).join('')}</div>`
      : quietEmpty('Research photographs will appear here after they have been uploaded and published.', 'camera');
    host.querySelectorAll('img[data-img]').forEach((img) => img.addEventListener('error', () => {
      img.closest('figure').remove();
    }, { once: true }));
    host.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => openLightbox(list, Number(b.dataset.i))));
  };
  filtersHost.innerHTML = cats.length > 1
    ? [['all', 'All photos'], ...cats.map((c) => [c, MEDIA_FOLDERS[c]])]
      .map(([v, t]) => `<button type="button" class="chip" data-cat="${v}" aria-pressed="${v === active}">${esc(t)}</button>`).join('')
    : '';
  filtersHost.onclick = (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    active = b.dataset.cat;
    filtersHost.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  };
  draw();
}
