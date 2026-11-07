// Media management: gallery image entries and video links.
// The site is static, so a photo becomes public only when (1) the file is in
// public/images/<folder>/ in the repository and (2) its entry is in
// public/data/media-gallery.json, and the site has been published again.
import { esc, icon, panel, selectHTML, formModal, fmtDate, tableHTML, actionBtn, onActions } from '../ui.js';
import { emptyHTML, toast, confirmDialog } from '../../lib/dom.js';
import { MEDIA_FOLDERS, VIDEO_SLOTS, options, label } from '../../lib/labels.js';
import { rules } from '../../lib/validate.js';
import { toEmbedUrl } from '../../lib/calc.js';
import { galleryImages, galleryVideos, loadJSON, siteURL } from '../../lib/content.js';
import { downloadJSON } from '../../lib/backup.js';

const FILE_RE = /^[a-z0-9][a-z0-9._-]*\.(jpe?g|png|webp)$/i;
const strip = ({ id, __source, kind, is_demo, created_at, updated_at, ...rest }) => rest;

export async function render({ db, el }) {
  let images = await galleryImages(db);
  let videos = await galleryVideos(db);
  let cat = '';

  el.innerHTML = `
    <div class="notice">${icon('info', 18)}<div>
      <p style="margin:0 0 6px"><strong>How a photo reaches the public website</strong></p>
      <ol class="small" style="margin:0;padding-left:18px">
        <li>Save the original photo (JPG, PNG or WebP, ideally under 500 KB, about 1600 px wide) in the right folder of the project, e.g. <span class="mono">public/images/water-hotspots/</span>.</li>
        <li>Add its entry here (file name, title, caption, date, location, alternative text). It shows on <strong>this device</strong> straight away.</li>
        <li>Click <strong>Export media-gallery.json</strong>, replace <span class="mono">public/data/media-gallery.json</span> with the downloaded file, then commit and push. Visitors see the photo only after the site is published again.</li>
      </ol></div></div>
    <div class="folder-guide">${Object.entries(MEDIA_FOLDERS).map(([k, t]) => `<span class="chip chip--static">${icon('folder', 14)}<span class="mono">public/images/${k}/</span> ${esc(t)}</span>`).join('')}</div>
    ${panel('Gallery images', '<div data-images></div>', {
      iconName: 'image',
      tools: `${selectHTML('cat', options(MEDIA_FOLDERS), '', 'All folders', 'Filter by folder')}
        <button type="button" class="btn btn--ghost btn--sm" data-export-images>${icon('download', 16)}Export media-gallery.json</button>
        <button type="button" class="btn btn--sm" data-add-image>${icon('plus', 16)}Add image entry</button>`,
    })}
    ${panel('Videos', '<div data-videos></div>', {
      iconName: 'video',
      tools: `<button type="button" class="btn btn--ghost btn--sm" data-export-videos>${icon('download', 16)}Export video-gallery.json</button>
        <button type="button" class="btn btn--sm" data-add-video>${icon('plus', 16)}Add or replace video link</button>`,
    })}
    <p class="small muted">Do not commit video files to GitHub: upload them to YouTube (unlisted is fine) or Google Drive (“Anyone with the link”) and paste the link here.</p>`;

  const imgHost = el.querySelector('[data-images]');
  const vidHost = el.querySelector('[data-videos]');
  const sourceBadge = (m) => (m.__source === 'local'
    ? '<span class="badge badge--estimate" title="Saved on this device only. Export and commit media-gallery.json to publish.">This device only</span>'
    : '<span class="badge badge--verified">Published</span>');

  const drawImages = () => {
    const list = images.filter((m) => !cat || m.category === cat);
    imgHost.innerHTML = list.length ? `<div class="admin-gallery">${list.map((m, i) => `<div class="tile">
        <div class="tile__img" data-src="${esc(siteURL(m.path))}"><span class="small muted">${icon('image', 16)} Checking file…</span></div>
        <div class="tile__body"><strong>${esc(m.title || m.caption)}</strong>
          <span class="mono small">${esc(m.path)}</span>
          <span class="muted small">${esc(label(MEDIA_FOLDERS, m.category))} · ${esc(fmtDate(m.date))}${m.location ? ` · ${esc(m.location)}` : ''}</span>
          ${m.pair_id ? `<span class="small">Before/after pair <strong>${esc(m.pair_id)}</strong> (${esc(m.pair_role)})</span>` : ''}
          <span>${sourceBadge(m)}</span></div>
        <div class="tile__actions"><button type="button" class="btn btn--ghost btn--sm" data-edit="${i}">${icon('edit', 14)}Edit</button>
          ${m.__source === 'local' ? `<button type="button" class="btn btn--ghost btn--sm" data-del="${i}" aria-label="Remove entry ${esc(m.title)}">${icon('trash', 14)}</button>` : ''}</div>
      </div>`).join('')}</div>`
      : emptyHTML('No image entries yet', 'Add an entry for each original project photo you place in public/images/. Until then the public gallery shows labelled placeholders.', 'image');
    // Show whether each file actually exists in the deployed/served site.
    imgHost.querySelectorAll('[data-src]').forEach((box) => {
      const img = new Image();
      img.alt = '';
      img.onload = () => { box.replaceChildren(img); };
      img.onerror = () => { box.innerHTML = `<span class="small" style="color:var(--danger,#B91C1C)">${icon('alert', 16)} File not found at this path yet</span>`; };
      img.src = box.dataset.src;
    });
    imgHost.onclick = async (e) => {
      const ed = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-del]');
      if (ed) openImage(list[Number(ed.dataset.edit)]);
      if (del) {
        const m = list[Number(del.dataset.del)];
        if (!(await confirmDialog(`Remove the entry “${m.title}”? The image file itself is not deleted.`, { confirmLabel: 'Remove', danger: true }))) return;
        await db.remove('media_items', m.id);
        images = await galleryImages(db); drawImages(); toast('Entry removed', 'success');
      }
    };
  };

  const imageFields = [
    { name: 'category', label: 'Folder / category', type: 'select', required: true, options: options(MEDIA_FOLDERS), half: true },
    { name: 'file', label: 'File name', required: true, maxLength: 120, half: true, hint: 'e.g. hostel-a-tap.jpg (lower case, no spaces)',
      validate: (v) => (v && !FILE_RE.test(v) ? 'Use letters, numbers, dots, dashes or underscores, ending .jpg, .png or .webp.' : null) },
    { name: 'title', label: 'Title', required: true, maxLength: 160 },
    { name: 'caption', label: 'Caption', type: 'textarea', rows: 2, required: true, maxLength: 500 },
    { name: 'date', label: 'Date taken', type: 'date', required: true, half: true, validate: rules.notFuture() },
    { name: 'location', label: 'Location on campus', maxLength: 160, required: true, half: true },
    { name: 'alt', label: 'Alternative text', required: true, maxLength: 300, hint: 'Describe what the photo shows for screen-reader users.' },
    { name: 'pair_id', label: 'Before/after pair ID', maxLength: 60, optional: true, half: true, hint: 'Same ID on both photos, e.g. tank-t1.' },
    { name: 'pair_role', label: 'Pair role', type: 'select', options: [{ value: 'before', text: 'Before' }, { value: 'after', text: 'After' }], optional: true, half: true,
      validate: (v, all) => (all.pair_id && !v ? 'Choose before or after.' : null) },
  ];
  function openImage(m) {
    const values = m ? { ...m, file: m.path?.split('/').pop() } : { category: cat || 'campus' };
    formModal({
      title: m ? 'Edit image entry' : 'Add image entry', wide: true, fields: imageFields, values,
      intro: m?.__source === 'published' ? `<div class="notice">${icon('info', 18)}<p>This entry is published. Saving creates an edited copy on this device; export media-gallery.json to publish the change.</p></div>` : '',
      onSubmit: async (v) => {
        const { file, ...rest } = v;
        const rec = { ...rest, kind: 'image', path: `public/images/${v.category}/${file}`, pair_role: v.pair_id ? v.pair_role : '' };
        const clash = images.find((x) => x.path === rec.path && x !== m && !(m?.__source === 'published' && x.__source === 'local' && x.path === m.path));
        if (clash) throw new Error('Another entry already uses this file path.');
        if (m?.__source === 'local') await db.update('media_items', m.id, rec);
        else await db.insert('media_items', rec);
        images = await galleryImages(db); drawImages();
        toast('Saved on this device. Export media-gallery.json to publish.', 'success');
      },
    });
  }

  const drawVideos = () => {
    vidHost.innerHTML = videos.length ? tableHTML({
      caption: 'Videos',
      columns: [
        { label: 'Slot', value: (v) => esc(label(VIDEO_SLOTS, v.slot)) },
        { label: 'Title', value: (v) => `<strong>${esc(v.title)}</strong><div class="small muted">${esc(v.description || '')}</div>` },
        { label: 'Duration', value: (v) => esc(v.duration || 'N/A') },
        { label: 'Link', value: (v) => (v.url ? (toEmbedUrl(v.url) ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">Open ${icon('external', 12)}</a>` : '<span class="badge badge--estimate">Unsupported link</span>') : '<span class="muted">Not added yet</span>') },
        { label: 'Status', value: sourceBadge },
      ],
      rows: videos,
      actions: (v, i) => `${actionBtn('edit', i, 'edit', `Edit ${v.title}`)}${v.__source === 'local' ? actionBtn('del', i, 'trash', `Remove ${v.title}`, true) : ''}`,
    }) : emptyHTML('No video slots', '', 'video');
  };
  onActions(vidHost, {
    edit: (i) => openVideo(videos[i]),
    del: async (i) => {
      const v = videos[i];
      if (!(await confirmDialog(`Remove the local entry “${v.title}”? The published version (if any) shows again.`, { confirmLabel: 'Remove', danger: true }))) return;
      await db.remove('media_items', v.id);
      videos = await galleryVideos(db); drawVideos(); toast('Removed', 'success');
    },
  });
  const videoFields = [
    { name: 'slot', label: 'Video slot', type: 'select', required: true, options: options(VIDEO_SLOTS), half: true },
    { name: 'duration', label: 'Duration', maxLength: 40, optional: true, half: true, hint: 'e.g. 4 min 10 s' },
    { name: 'title', label: 'Title', required: true, maxLength: 160 },
    { name: 'url', label: 'YouTube or Google Drive link', type: 'url', maxLength: 500, optional: true,
      validate: (v) => (v && !toEmbedUrl(v) ? 'Paste an https YouTube or Google Drive share link.' : null) },
    { name: 'description', label: 'Description', type: 'textarea', rows: 2, maxLength: 1000, optional: true },
  ];
  function openVideo(v) {
    formModal({
      title: v ? `Edit ${v.title}` : 'Add or replace a video link', wide: true, fields: videoFields,
      values: v ?? { slot: 'interviews', title: 'Interview' },
      intro: `<p class="small muted">Video 1 and Video 2 have one slot each: saving replaces the current link on this device. Interview videos can be added as many times as needed.</p>`,
      onSubmit: async (val) => {
        const rec = { ...val, kind: 'video' };
        const localSame = videos.find((x) => x.__source === 'local' && x.slot === val.slot && val.slot !== 'interviews');
        if (v?.__source === 'local') await db.update('media_items', v.id, rec);
        else if (localSame) await db.update('media_items', localSame.id, rec);
        else await db.insert('media_items', rec);
        videos = await galleryVideos(db); drawVideos();
        toast('Saved on this device. Export video-gallery.json to publish.', 'success');
      },
    });
  }

  el.querySelector('[name="cat"]').addEventListener('change', (e) => { cat = e.target.value; drawImages(); });
  el.querySelector('[data-add-image]').addEventListener('click', () => openImage(null));
  el.querySelector('[data-add-video]').addEventListener('click', () => openVideo(null));
  el.querySelector('[data-export-images]').addEventListener('click', async () => {
    const file = await loadJSON('media-gallery.json', {});
    downloadJSON('media-gallery.json', { ...file, images: images.map(strip) });
    toast('Downloaded. Replace public/data/media-gallery.json with it, then commit and push.', 'success', 8000);
  });
  el.querySelector('[data-export-videos]').addEventListener('click', async () => {
    const file = await loadJSON('video-gallery.json', {});
    downloadJSON('video-gallery.json', { ...file, videos: videos.map(strip) });
    toast('Downloaded. Replace public/data/video-gallery.json with it, then commit and push.', 'success', 8000);
  });

  drawImages();
  drawVideos();
}
