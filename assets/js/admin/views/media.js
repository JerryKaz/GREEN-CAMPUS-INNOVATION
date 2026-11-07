// Photos and Videos: upload research photographs and add video links.
// Uploaded photos are stored in this browser and appear on this computer's website
// at once; Data Backup → "Publish to the website" prepares them for everyone else.
import { esc, icon, panel, intro, selectHTML, formModal, fmtDate, tableHTML, actionBtn, onActions } from '../ui.js';
import { toast, confirmDialog, compressImage, blobToDataURL } from '../../lib/dom.js';
import { MEDIA_FOLDERS, VIDEO_SLOTS, options, label } from '../../lib/labels.js';
import { rules } from '../../lib/validate.js';
import { toEmbedUrl } from '../../lib/calc.js';
import { galleryImages, galleryVideos, siteURL } from '../../lib/content.js';

const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 50) || 'photo';

export async function render({ db, el, notify }) {
  let images = await galleryImages(db);
  let videos = await galleryVideos(db);
  let cat = '';

  el.innerHTML = `${intro('Add the group\'s own research photographs and project videos. Photos you upload show on the public website on this computer straight away. To show them to everyone, use <a href="#/data">Data Backup → Publish to the website</a>.',
      `<button type="button" class="btn" data-add>${icon('upload', 18)}Upload Photo</button><button type="button" class="btn btn--ghost" data-add-video>${icon('video', 18)}Add Video Link</button>`)}
    ${panel('Research photographs', '<div data-images></div>', {
      iconName: 'image',
      tools: selectHTML('cat', options(MEDIA_FOLDERS), '', 'All categories', 'Show photos in category'),
    })}
    ${panel('Project videos', '<div data-videos></div>', { iconName: 'video' })}
    <p class="small muted">Videos are not uploaded here. Put them on YouTube (choose “Unlisted” if you prefer) or Google Drive (share as “Anyone with the link”), then paste the link.</p>`;

  const imgHost = el.querySelector('[data-images]');
  const vidHost = el.querySelector('[data-videos]');
  const where = (m) => (m.data_url
    ? '<span class="chip-status chip-status--draft" title="Stored in this browser. Publish it from Data Backup so visitors on other devices can see it.">On this computer</span>'
    : '<span class="chip-status chip-status--live">Published</span>');

  const drawImages = () => {
    const list = images.filter((m) => !cat || m.category === cat);
    imgHost.innerHTML = list.length ? `<div class="panel__body"><div class="admin-gallery">${list.map((m, i) => `<div class="tile">
        <div class="tile__img">${m.data_url ? `<img src="${esc(m.data_url)}" alt="">` : `<img src="${esc(siteURL(m.path))}" alt="" data-check>`}</div>
        <div class="tile__body"><strong>${esc(m.title || m.caption)}</strong>
          <span class="muted small">${esc(label(MEDIA_FOLDERS, m.category))} · ${esc(fmtDate(m.date))}${m.location ? ` · ${esc(m.location)}` : ''}</span>
          ${m.pair_id ? `<span class="small">Before/after pair “${esc(m.pair_id)}” (${esc(m.pair_role)})</span>` : ''}
          <span>${where(m)}</span></div>
        <div class="tile__actions"><button type="button" class="btn btn--ghost btn--sm" data-edit="${i}">${icon('edit', 14)}Edit</button>
          ${m.__source === 'local' ? `<button type="button" class="btn btn--ghost btn--sm" data-del="${i}" aria-label="Delete ${esc(m.title)}">${icon('trash', 14)}</button>` : ''}</div>
      </div>`).join('')}</div></div>`
      : `<div class="panel__body"><p class="muted" style="margin:0">${images.length ? 'No photos in this category.' : 'No photos yet. Click “Upload Photo” to add the first one.'}</p></div>`;
    imgHost.querySelectorAll('img[data-check]').forEach((img) => img.addEventListener('error', () => {
      img.replaceWith(Object.assign(document.createElement('span'), { className: 'small muted', textContent: 'The photo file has not been added to the website files yet.' }));
    }, { once: true }));
    imgHost.onclick = async (e) => {
      const ed = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-del]');
      if (ed) openImage(list[Number(ed.dataset.edit)]);
      if (del) {
        const m = list[Number(del.dataset.del)];
        if (!(await confirmDialog(`Delete the photo “${m.title}”?`, { confirmLabel: 'Delete', danger: true }))) return;
        await db.remove('media_items', m.id);
        images = await galleryImages(db); drawImages(); toast('Photo deleted.', 'success');
      }
    };
  };

  const imageFields = (isNew) => [
    ...(isNew ? [{ name: 'file', label: 'Choose a photo', type: 'file', accept: 'image/jpeg,image/png,image/webp', required: true,
      validate: rules.file({ maxMB: 15 }), hint: 'JPG, PNG or WebP. It is resized automatically, and location data stored in the photo is removed.' }] : []),
    { name: 'title', label: 'Title', required: true, maxLength: 160, hint: 'Short name, e.g. “Dripping tap in Hostel A”' },
    { name: 'caption', label: 'Caption', type: 'textarea', rows: 2, required: true, maxLength: 500, hint: 'One or two sentences explaining what the photo shows.' },
    { name: 'category', label: 'Category', type: 'select', required: true, options: options(MEDIA_FOLDERS), half: true },
    { name: 'date', label: 'Date taken', type: 'date', required: true, half: true, validate: rules.notFuture('This date is in the future.') },
    { name: 'location', label: 'Where on campus', maxLength: 160, required: true },
    { name: 'alt', label: 'Describe the photo for people who cannot see it', required: true, maxLength: 300, hint: 'e.g. “A chrome tap with water dripping into a white sink”' },
    { name: 'pair_id', label: 'Before/after pair name (optional)', maxLength: 60, optional: true, half: true, hint: 'Give a “before” and an “after” photo the same name, e.g. tank-1.' },
    { name: 'pair_role', label: 'This photo is the…', type: 'select', options: [{ value: 'before', text: 'Before photo' }, { value: 'after', text: 'After photo' }], optional: true, half: true,
      validate: (v, all) => (all.pair_id && !v ? 'Choose “Before photo” or “After photo”.' : null) },
  ];
  function openImage(m) {
    const isNew = !m;
    formModal({
      title: isNew ? 'Upload Photo' : 'Edit Photo Details', wide: true, fields: imageFields(isNew), submitLabel: isNew ? 'Upload Photo' : 'Save Changes',
      values: m ?? { category: cat || 'research' },
      intro: m?.__source === 'published' ? `<p class="small muted">This photo is already published. Saving creates an updated copy on this computer; publish again from Data Backup to update it for everyone.</p>` : '',
      onSubmit: async (v) => {
        const { file, ...rest } = v;
        let rec = { ...rest, kind: 'image', pair_role: v.pair_id ? v.pair_role : '' };
        if (file) {
          const blob = await compressImage(file, 1600, 0.82);
          if (blob.size > 3.5 * 1024 * 1024) throw new Error('This photo is too large even after resizing. Try a smaller photo.');
          const base = `public/images/${v.category}/${v.date}-${slug(v.title)}`;
          let path = `${base}.jpg`;
          for (let n = 2; images.some((x) => x.path === path); n++) path = `${base}-${n}.jpg`;
          rec = { ...rec, data_url: await blobToDataURL(blob), path };
        } else if (m) {
          rec = { ...rec, path: m.path, ...(m.data_url ? { data_url: m.data_url } : {}) };
        }
        if (m?.__source === 'local') await db.update('media_items', m.id, rec);
        else await db.insert('media_items', rec);
        images = await galleryImages(db); drawImages();
        toast(isNew ? 'Photo uploaded. It now shows on this computer\'s website.' : 'Photo details saved.', 'success');
      },
    });
  }

  const drawVideos = () => {
    vidHost.innerHTML = videos.length ? tableHTML({
      caption: 'Videos',
      columns: [
        { label: 'Video', value: (v) => `<strong>${esc(v.title)}</strong><div class="small muted">${esc(label(VIDEO_SLOTS, v.slot))}</div>` },
        { label: 'Length', value: (v) => esc(v.duration || '') },
        { label: 'Link', value: (v) => (toEmbedUrl(v.url) ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">Watch ${icon('external', 12)}</a>` : '<span class="muted">Link not added</span>') },
        { label: 'Status', value: (v) => (v.__source === 'local' ? '<span class="chip-status chip-status--draft">On this computer</span>' : '<span class="chip-status chip-status--live">Published</span>') },
      ],
      rows: videos,
      actions: (v, i) => `${actionBtn('edit', i, 'edit', `Edit ${v.title}`)}${v.__source === 'local' ? actionBtn('del', i, 'trash', `Delete ${v.title}`, true) : ''}`,
    }) : `<div class="panel__body"><p class="muted" style="margin:0">No videos yet. The project needs <strong>Video 1</strong> (problem documentary, 3 to 5 minutes) and <strong>Video 2</strong> (solution demonstration, 2 to 3 minutes). Video sections stay hidden on the website until a link is added.</p></div>`;
  };
  onActions(vidHost, {
    edit: (i) => openVideo(videos[i]),
    del: async (i) => {
      const v = videos[i];
      if (!(await confirmDialog(`Delete the video link “${v.title}”?`, { confirmLabel: 'Delete', danger: true }))) return;
      await db.remove('media_items', v.id);
      videos = await galleryVideos(db); drawVideos(); toast('Video link deleted.', 'success');
    },
  });
  const videoFields = [
    { name: 'slot', label: 'Which video is this?', type: 'select', required: true, options: options(VIDEO_SLOTS) },
    { name: 'title', label: 'Title', required: true, maxLength: 160 },
    { name: 'url', label: 'YouTube or Google Drive link', type: 'url', required: true, maxLength: 500, hint: 'Copy the link from the Share button and paste it here.',
      validate: (v) => (v && !toEmbedUrl(v) ? 'This does not look like a YouTube or Google Drive link. Copy it from the Share button and try again.' : null) },
    { name: 'duration', label: 'Length', maxLength: 40, optional: true, half: true, hint: 'e.g. 4 minutes' },
    { name: 'description', label: 'Short description', type: 'textarea', rows: 2, maxLength: 1000, optional: true },
  ];
  function openVideo(v) {
    formModal({
      title: v ? 'Edit Video Link' : 'Add Video Link', wide: true, fields: videoFields, submitLabel: v ? 'Save Changes' : 'Add Video',
      values: v ?? { slot: videos.some((x) => x.slot === 'documentary') ? 'solution-demo' : 'documentary', title: '' },
      onSubmit: async (val) => {
        const rec = { ...val, kind: 'video' };
        const same = videos.find((x) => x.__source === 'local' && x.slot === val.slot && val.slot !== 'interviews' && x !== v);
        if (v?.__source === 'local') await db.update('media_items', v.id, rec);
        else if (same) await db.update('media_items', same.id, rec);
        else await db.insert('media_items', rec);
        videos = await galleryVideos(db); drawVideos();
        toast('Video link saved. Check it plays on the public page.', 'success');
      },
    });
  }

  el.querySelector('[name="cat"]').addEventListener('change', (e) => { cat = e.target.value; drawImages(); });
  el.querySelector('[data-add]').addEventListener('click', () => openImage(null));
  el.querySelector('[data-add-video]').addEventListener('click', () => openVideo(null));
  drawImages();
  drawVideos();
}
