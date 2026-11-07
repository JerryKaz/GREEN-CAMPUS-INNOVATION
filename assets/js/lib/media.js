const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Photo and video slots.
//
// Every place that needs a real photograph is marked in the HTML with
//   <div class="media" data-media="hero"></div>
// and listed below. Save a file at the listed path under public/images/ and it
// appears automatically. Until then a designed placeholder is shown.
//
// Honesty rule: slots marked `decorative: true` may show a free Unsplash
// stand-in photo (atmosphere only, not presented as VVU). Slots that would
// imply project evidence (fieldwork, interviews, pilot, prototype) NEVER show
// stock photos: they keep a labelled placeholder until the group's own photo exists.
//
// Add ?media=1 to any page address to see each slot's file name and size.

export const MEDIA_DIR = 'public/images/';

export const SLOTS = {
  // Home
  hero:               { file: 'campus/hero.jpg', decorative: true, size: '2400 × 1350', alt: 'Students walking through the green Valley View University campus', caption: 'Campus landscape', tone: 'forest', stock: 'photo-1741637335289-c99652d3155f', w: 2400, credit: 'Zoshua Colah' },
  'home-intro':       { file: 'campus/home-intro.jpg', decorative: true, size: '1200 × 1500', alt: 'A student closing a tap at a campus washroom', caption: 'Water point on campus', tone: 'aqua', stock: 'photo-1780504863273-624eac16fb8f', w: 1200, credit: 'Unsplash contributor' },
  'focus-leak':       { file: 'campus/focus-leak.jpg', decorative: true, size: '1200 × 900', alt: 'Close up of a leaking tap', caption: 'Leak detection', tone: 'aqua', stock: 'photo-1495647688236-ed6ef40cb28b', w: 1200, credit: 'Luis Tosta, Marília, Brazil' },
  'focus-usage':      { file: 'campus/focus-usage.jpg', decorative: true, size: '1200 × 900', alt: 'Hands under a running tap', caption: 'Responsible use', tone: 'leaf', stock: 'photo-1574482620811-1aa16ffe3c82', w: 1200, credit: 'Unsplash contributor' },
  'focus-monitoring': { file: 'campus/focus-monitoring.jpg', decorative: true, size: '1200 × 900', alt: 'Reading a water meter', caption: 'Meter readings', tone: 'forest', stock: 'photo-1648224395403-64ccaba16e48', w: 1200, credit: 'Annie Spratt' },
  'focus-awareness':  { file: 'campus/focus-awareness.jpg', decorative: true, size: '1200 × 900', alt: 'Students at a conservation awareness session', caption: 'Awareness campaign', tone: 'aqua', stock: 'photo-1758270704625-cf6f1898853d', w: 1200, credit: 'Vitaly Gariev' },
  'moment-1':         { file: 'research/fieldwork.jpg', size: '1200 × 1200', alt: 'Fieldwork photograph', caption: 'Fieldwork', tone: 'leaf', stock: 'photo-1630386226447-af0a955c1009', w: 1400, credit: 'Ifeoluwa B., Black Star Square, Accra, Ghana' },
  'moment-2':         { file: 'interviews/interview.jpg', size: '1200 × 900', alt: 'Interview with facilities staff', caption: 'Interviews', tone: 'aqua', stock: 'photo-1758691736804-4e88c52ad58b', w: 1000, credit: 'Unsplash contributor' },
  'moment-3':         { file: 'water-hotspots/storage-tank.jpg', size: '1200 × 900', alt: 'Overhead water tank', caption: 'Storage tanks', tone: 'forest', stock: 'photo-1674578745937-c73f81bdda07', w: 1000, credit: 'Bob Brewer' },
  'moment-4':         { file: 'prototype/ideation.jpg', size: '1200 × 900', alt: 'Ideation session', caption: 'Ideation', tone: 'leaf', stock: 'photo-1758876203195-69a51e4145f0', w: 1000, credit: 'Vitaly Gariev' },
  'moment-5':         { file: 'pilot/pilot-launch.jpg', size: '1200 × 900', alt: 'Pilot launch on campus', caption: 'Pilot launch', tone: 'aqua', stock: 'photo-1769905226600-1d447fe7d020', w: 1000, credit: 'Blessfield John, Lagos, Nigeria' },
  'pledge-band':      { file: 'campus/pledge-band.jpg', decorative: true, size: '2400 × 1000', alt: 'Students together on campus', caption: 'Campus community', tone: 'forest', stock: 'photo-1605144884288-49eb7f9bb447', w: 2400, credit: 'Unsplash contributor' },

  // Inner pages
  'research-hero':    { file: 'campus/research-hero.jpg', decorative: true, size: '2400 × 1100', alt: 'Team observing a campus water point', caption: 'Field observation', tone: 'forest', stock: 'photo-1646493944189-54201cee39e0', w: 2400, credit: 'Unsplash contributor' },
  'research-field':   { file: 'research/baseline-measurement.jpg', size: '1200 × 1500', alt: 'Taking a baseline water measurement', caption: 'Baseline measurement', tone: 'aqua', stock: 'photo-1567769462911-520a38352744', w: 1400, credit: 'Alexandre Lecocq' },
  'solution-hero':    { file: 'campus/solution-hero.jpg', decorative: true, size: '2400 × 1100', alt: 'A student reporting a leak on a phone', caption: 'Reporting a leak', tone: 'forest', stock: 'photo-1526045612212-70caf35c14df', w: 2400, credit: 'Unsplash contributor' },
  'solution-app':     { file: 'prototype/waterwatch-mobile.jpg', size: '1200 × 1500', alt: 'WaterWatch report form on a mobile phone', caption: 'WaterWatch on mobile', tone: 'aqua', stock: 'photo-1689799514696-b16af9b53753', w: 1000, credit: 'Unsplash contributor' },
  'impl-hero':        { file: 'campus/implementation-hero.jpg', decorative: true, size: '2400 × 1100', alt: 'Estates and student leaders planning together', caption: 'Planning session', tone: 'forest', stock: 'photo-1758873269317-51888e824b28', w: 2400, credit: 'Vitaly Gariev' },
  'impl-team':        { file: 'pilot/corrective-action.jpg', size: '1600 × 1000', alt: 'Plumbing repair being carried out', caption: 'Corrective action', tone: 'leaf', stock: 'photo-1676210134188-4c05dd172f89', w: 1400, credit: 'Unsplash contributor' },
  'feedback-hero':    { file: 'campus/feedback-hero.jpg', decorative: true, size: '2400 × 1100', alt: 'Students signing the water pledge', caption: 'Signing the pledge', tone: 'forest', stock: 'photo-1758691736980-c619fa4203bb', w: 2400, credit: 'Unsplash contributor' },
  'feedback-side':    { file: 'campus/feedback-community.jpg', decorative: true, size: '1200 × 900', alt: 'Students discussing water conservation', caption: 'Community voices', tone: 'aqua', stock: 'photo-1598956066123-a6f006500ca4', w: 1400, credit: 'Micheal Awala, Nigeria' },

  // Video placeholders (videos are embedded from YouTube / Google Drive via public/data/video-gallery.json)
  'video-documentary': { alt: 'Video 1: problem documentary', caption: 'Video 1 · Problem documentary (3 to 5 min)', tone: 'forest', video: true },
  'video-solution-demo': { alt: 'Video 2: solution demonstration', caption: 'Video 2 · Solution demonstration (2 to 3 min)', tone: 'aqua', video: true },
  'video-interviews': { alt: 'Interview video', caption: 'Interview video', tone: 'leaf', video: true },
};

const root = new URL('../../../', import.meta.url);
export const mediaURL = (file) => new URL(MEDIA_DIR + file, root).href;

// Stand-in photos from Unsplash (free to use under the Unsplash License) shown
// in DECORATIVE slots only, until the project's own file exists. Set USE_STOCK
// to false to show the designed placeholders everywhere.
export const USE_STOCK = true;
export const stockURL = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

const showSlots = (() => {
  try {
    const q = new URLSearchParams(location.search).get('media');
    if (q === '1') localStorage.setItem('gci_media_slots', '1');
    if (q === '0') localStorage.removeItem('gci_media_slots');
    return localStorage.getItem('gci_media_slots') === '1';
  } catch { return false; }
})();

const ICONS = {
  photo: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
};

function placeholder(slot, key) {
  const kind = slot.video ? 'play' : 'photo';
  return `<div class="media__ph" aria-hidden="true">
      <svg class="media__rings" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor">
        <circle cx="300" cy="120" r="40"/><circle cx="300" cy="120" r="90"/><circle cx="300" cy="120" r="150"/><circle cx="300" cy="120" r="220"/></g></svg>
      <span class="media__glyph ${slot.video ? 'media__glyph--play' : ''}"><svg viewBox="0 0 24 24" width="26" height="26" fill="${slot.video ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">${ICONS[kind]}</svg></span>
      <span class="media__caption">${slot.caption}</span>
      ${!slot.decorative && !slot.video ? '<span class="media__pending">Project photo coming soon</span>' : ''}
    </div>
    ${showSlots && slot.file ? `<span class="media__tag">${MEDIA_DIR}${slot.file}<br>${slot.size}</span>` : ''}`;
}

/** Fill one slot element. Resolves true when a real photo loaded. */
export function fillSlot(el) {
  const key = el.dataset.media;
  const slot = SLOTS[key];
  if (!slot || el.dataset.mediaReady) return Promise.resolve(false);
  el.dataset.mediaReady = '1';
  el.classList.add('media', `media--${slot.tone}`);
  el.innerHTML = placeholder(slot, key);
  if (slot.video) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    img.alt = el.dataset.alt || slot.alt;
    img.decoding = 'async';
    img.onload = () => {
      img.className = 'media__img';
      el.prepend(img);
      el.classList.add('has-image');
      resolve(true);
    };
    let triedStock = false;
    img.onerror = () => {
      if (USE_STOCK && slot.decorative && slot.stock && !triedStock) {
        triedStock = true;
        el.classList.add('is-stock');
        img.alt = ''; // stand-in photo, not of this campus: treat as decorative
        img.src = stockURL(slot.stock, slot.w);
        return;
      }
      resolve(false);
    };
    img.src = mediaURL(slot.file);
  });
}

// Eager slots (heroes) load at once; the rest start loading as they near the viewport.
export function hydrateMedia(root = document) {
  const slots = [...root.querySelectorAll('[data-media]')];
  const lazy = slots.filter((el) => !el.hasAttribute('data-eager'));
  slots.filter((el) => el.hasAttribute('data-eager')).forEach(fillSlot);
  if (!('IntersectionObserver' in window)) { lazy.forEach(fillSlot); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { io.unobserve(en.target); fillSlot(en.target); }
  }), { rootMargin: '400px 0px' });
  lazy.forEach((el) => {
    const slot = SLOTS[el.dataset.media];
    if (slot) { el.classList.add('media', `media--${slot.tone}`); el.innerHTML = placeholder(slot); }
    io.observe(el);
  });
}

/**
 * Video slot: an embed URL (YouTube/Drive) when one is configured, otherwise a
 * designed placeholder that says which video belongs here.
 */
export function mountVideo(el, key, embedSrc, info = {}) {
  const slot = SLOTS[key] ?? SLOTS['video-interviews'];
  el.classList.add('video-frame');
  if (embedSrc) {
    el.innerHTML = `<iframe src="${embedSrc}" title="${esc(info.title || slot.alt)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    return;
  }
  el.classList.add('media', `media--${slot.tone}`);
  el.innerHTML = placeholder({ ...slot, caption: info.title || slot.caption }, key)
    .replace('</div>', `<span class="media__pending">${esc(info.description ? `Coming soon: ${info.description}` : 'Video coming soon')}</span></div>`);
}

/** A standalone designed placeholder tile (used where photos come from the admin area). */
export function placeholderTile(caption, tone = 'forest') {
  return `<div class="frame media media--${tone}">${placeholder({ caption, video: false, file: '', size: '' }, '')
    .replace(/<span class="media__tag">[\s\S]*?<\/span>/, '')}</div>`;
}
