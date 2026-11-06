// Photo and video slots.
//
// Every place that needs a real photograph or video is marked in the HTML with
//   <div class="media" data-media="hero"></div>
// and listed below. Drop a file with the listed name into assets/media/ and it
// appears automatically. Until then a designed placeholder is shown.
//
// Add ?media=1 to any page address to see each slot's file name and size.

export const MEDIA_DIR = 'assets/media/';

export const SLOTS = {
  // Home
  hero:               { file: 'hero.jpg', size: '2400 × 1350', alt: 'Students walking through the green Valley View University campus', caption: 'Campus landscape', tone: 'forest', stock: 'photo-1741637335289-c99652d3155f', w: 2400, credit: 'Zoshua Colah' },
  'home-intro':       { file: 'home-intro.jpg', size: '1200 × 1500', alt: 'A student closing a tap at a campus washroom', caption: 'Water point on campus', tone: 'aqua', stock: 'photo-1780504863273-624eac16fb8f', w: 1200, credit: 'Unsplash contributor' },
  'focus-leak':       { file: 'focus-leak.jpg', size: '1200 × 900', alt: 'Close up of a leaking tap', caption: 'Leak detection', tone: 'aqua', stock: 'photo-1495647688236-ed6ef40cb28b', w: 1200, credit: 'Luis Tosta, Marília, Brazil' },
  'focus-usage':      { file: 'focus-usage.jpg', size: '1200 × 900', alt: 'Hands under a running tap', caption: 'Responsible use', tone: 'leaf', stock: 'photo-1574482620811-1aa16ffe3c82', w: 1200, credit: 'Unsplash contributor' },
  'focus-monitoring': { file: 'focus-monitoring.jpg', size: '1200 × 900', alt: 'Reading a water meter', caption: 'Meter readings', tone: 'forest', stock: 'photo-1648224395403-64ccaba16e48', w: 1200, credit: 'Annie Spratt' },
  'focus-awareness':  { file: 'focus-awareness.jpg', size: '1200 × 900', alt: 'Students at a conservation awareness session', caption: 'Awareness campaign', tone: 'aqua', stock: 'photo-1758270704625-cf6f1898853d', w: 1200, credit: 'Vitaly Gariev' },
  'moment-1':         { file: 'moment-1.jpg', size: '1200 × 1200', alt: 'Fieldwork photograph', caption: 'Fieldwork', tone: 'leaf', stock: 'photo-1630386226447-af0a955c1009', w: 1400, credit: 'Ifeoluwa B., Black Star Square, Accra, Ghana' },
  'moment-2':         { file: 'moment-2.jpg', size: '1200 × 900', alt: 'Interview with facilities staff', caption: 'Interviews', tone: 'aqua', stock: 'photo-1758691736804-4e88c52ad58b', w: 1000, credit: 'Unsplash contributor' },
  'moment-3':         { file: 'moment-3.jpg', size: '1200 × 900', alt: 'Overhead water tank', caption: 'Storage tanks', tone: 'forest', stock: 'photo-1674578745937-c73f81bdda07', w: 1000, credit: 'Bob Brewer' },
  'moment-4':         { file: 'moment-4.jpg', size: '1200 × 900', alt: 'Ideation session', caption: 'Ideation', tone: 'leaf', stock: 'photo-1758876203195-69a51e4145f0', w: 1000, credit: 'Vitaly Gariev' },
  'moment-5':         { file: 'moment-5.jpg', size: '1200 × 900', alt: 'Pilot launch on campus', caption: 'Pilot launch', tone: 'aqua', stock: 'photo-1769905226600-1d447fe7d020', w: 1000, credit: 'Blessfield John, Lagos, Nigeria' },
  'pledge-band':      { file: 'pledge-band.jpg', size: '2400 × 1000', alt: 'Students together on campus', caption: 'Campus community', tone: 'forest', stock: 'photo-1605144884288-49eb7f9bb447', w: 2400, credit: 'Unsplash contributor' },

  // Inner pages
  'research-hero':    { file: 'research-hero.jpg', size: '2400 × 1100', alt: 'Team observing a campus water point', caption: 'Field observation', tone: 'forest', stock: 'photo-1646493944189-54201cee39e0', w: 2400, credit: 'Unsplash contributor' },
  'research-field':   { file: 'research-field.jpg', size: '1200 × 1500', alt: 'Taking a baseline water measurement', caption: 'Baseline measurement', tone: 'aqua', stock: 'photo-1567769462911-520a38352744', w: 1400, credit: 'Alexandre Lecocq' },
  'solution-hero':    { file: 'solution-hero.jpg', size: '2400 × 1100', alt: 'A student reporting a leak on a phone', caption: 'Reporting a leak', tone: 'forest', stock: 'photo-1526045612212-70caf35c14df', w: 2400, credit: 'Unsplash contributor' },
  'solution-app':     { file: 'solution-app.jpg', size: '1200 × 1500', alt: 'WaterWatch report form on a mobile phone', caption: 'WaterWatch on mobile', tone: 'aqua', stock: 'photo-1689799514696-b16af9b53753', w: 1000, credit: 'Unsplash contributor' },
  'impl-hero':        { file: 'implementation-hero.jpg', size: '2400 × 1100', alt: 'Estates and student leaders planning together', caption: 'Planning session', tone: 'forest', stock: 'photo-1758873269317-51888e824b28', w: 2400, credit: 'Vitaly Gariev' },
  'impl-team':        { file: 'implementation-team.jpg', size: '1600 × 1000', alt: 'Plumbing repair being carried out', caption: 'Corrective action', tone: 'leaf', stock: 'photo-1676210134188-4c05dd172f89', w: 1400, credit: 'Unsplash contributor' },
  'feedback-hero':    { file: 'feedback-hero.jpg', size: '2400 × 1100', alt: 'Students signing the water pledge', caption: 'Signing the pledge', tone: 'forest', stock: 'photo-1758691736980-c619fa4203bb', w: 2400, credit: 'Unsplash contributor' },
  'feedback-side':    { file: 'feedback-community.jpg', size: '1200 × 900', alt: 'Students discussing water conservation', caption: 'Community voices', tone: 'aqua', stock: 'photo-1598956066123-a6f006500ca4', w: 1400, credit: 'Micheal Awala, Nigeria' },

  // Videos (an mp4 file, or a YouTube / Google Drive link saved in admin Settings)
  'video-problem':    { file: 'video-problem.mp4', poster: 'video-problem-poster.jpg', size: '1920 × 1080, 3 to 5 min', alt: 'Documentary: water wastage on campus', caption: 'Documentary premieres soon', tone: 'forest', video: true, stockPoster: 'photo-1600093652298-e57ee8aba769' },
  'video-solution':   { file: 'video-solution.mp4', poster: 'video-solution-poster.jpg', size: '1920 × 1080, 2 to 3 min', alt: 'WaterWatch demonstration', caption: 'Product walkthrough premieres soon', tone: 'aqua', video: true, stockPoster: 'photo-1521931961826-fe48677230a5' },
};

const root = new URL('../../../', import.meta.url);
export const mediaURL = (file) => new URL(MEDIA_DIR + file, root).href;

// Stand-in photos from Unsplash (free to use under the Unsplash License) shown
// until the project's own file exists in assets/media/. Set USE_STOCK to false
// to show the designed placeholders instead.
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
    </div>
    ${showSlots ? `<span class="media__tag">${MEDIA_DIR}${slot.file}<br>${slot.size}</span>` : ''}`;
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
      if (USE_STOCK && slot.stock && !triedStock) {
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
 * Video slot: an embed URL (YouTube/Drive) wins; otherwise a local mp4;
 * otherwise the designed poster placeholder.
 */
export async function mountVideo(el, key, embedSrc) {
  const slot = SLOTS[key];
  el.classList.add('video-frame');
  if (embedSrc) {
    el.innerHTML = `<iframe src="${embedSrc}" title="${slot.alt}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    return;
  }
  el.dataset.media = key;
  fillSlot(el);
  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.className = 'media__video';
  video.setAttribute('aria-label', slot.alt);
  const poster = new Image();
  // Poster: own file first, then a stand-in photo behind the play button.
  poster.onload = () => {
    video.poster = poster.src;
    if (!el.classList.contains('has-image')) {
      const bg = Object.assign(document.createElement('img'), { className: 'media__img media__img--poster', alt: '', src: poster.src });
      el.prepend(bg);
      el.classList.add('has-poster');
    }
  };
  let posterStock = false;
  poster.onerror = () => {
    if (USE_STOCK && slot.stockPoster && !posterStock) { posterStock = true; poster.src = stockURL(slot.stockPoster, 1600); }
  };
  poster.src = mediaURL(slot.poster);
  video.addEventListener('loadedmetadata', () => { el.querySelector('.media__img--poster')?.remove(); el.prepend(video); el.classList.add('has-image'); }, { once: true });
  video.src = mediaURL(slot.file);
}

/** A standalone designed placeholder tile (used where photos come from the admin area). */
export function placeholderTile(caption, tone = 'forest') {
  return `<div class="frame media media--${tone}">${placeholder({ caption, video: false, file: '', size: '' }, '')
    .replace(/<span class="media__tag">[\s\S]*?<\/span>/, '')}</div>`;
}
