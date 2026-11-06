import { esc, fmtDateTime, openModal } from '../lib/dom.js';
import { GALLERY_CATEGORIES, label } from '../lib/labels.js';
import { placeholderTile } from '../lib/media.js';

export function renderGallery(filtersHost, host, photos) {
  const cats = Object.keys(GALLERY_CATEGORIES).filter((c) => photos.some((p) => p.category === c));
  let active = 'all';
  const draw = () => {
    const list = active === 'all' ? photos : photos.filter((p) => p.category === active);
    host.innerHTML = list.length
      ? `<div class="gallery">${list.map((p, i) => `<figure><button type="button" data-i="${i}" aria-label="Open photo: ${esc(p.caption)}">
          <img src="${esc(p.image_url)}" alt="${esc(p.caption)}" loading="lazy" decoding="async"></button>
          <figcaption><strong>${esc(p.caption)}</strong><span class="muted">${esc(label(GALLERY_CATEGORIES, p.category))}${p.location_text ? ` · ${esc(p.location_text)}` : ''}</span></figcaption></figure>`).join('')}</div>`
      : `<div class="gallery-slots">${Object.values(GALLERY_CATEGORIES).map((c, i) => placeholderTile(c, ['forest', 'aqua', 'leaf'][i % 3])).join('')}</div>
        <p class="small muted" style="margin-top:14px">Photographs from each stage of the project will appear here as they are published.</p>`;
    host.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
      const p = list[Number(b.dataset.i)];
      openModal({ title: p.caption, wide: true, body: `<div class="lightbox"><img src="${esc(p.image_url)}" alt="${esc(p.caption)}"></div>
        <dl class="meta"><dt>Category</dt><dd>${esc(label(GALLERY_CATEGORIES, p.category))}</dd>
        <dt>Date &amp; time</dt><dd>${esc(fmtDateTime(p.taken_at))}</dd>
        <dt>Location</dt><dd>${esc(p.location_text || 'N/A')}</dd>
        <dt>Description</dt><dd>${esc(p.description || 'N/A')}</dd></dl>` });
    }));
  };
  filtersHost.innerHTML = cats.length
    ? [['all', 'All photos'], ...cats.map((c) => [c, GALLERY_CATEGORIES[c]])]
        .map(([v, t]) => `<button type="button" class="chip" data-cat="${v}" aria-pressed="${v === active}">${esc(t)}</button>`).join('')
    : '';
  filtersHost.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    active = b.dataset.cat;
    filtersHost.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  });
  draw();
}
