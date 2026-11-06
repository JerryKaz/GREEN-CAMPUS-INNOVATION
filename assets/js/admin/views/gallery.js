// Research photo gallery: original photos only, each with caption, date/time, location, description.
import { esc, icon, fmtDateTime, panel, selectHTML, formModal, toLocalInput, readOnlyNote } from '../ui.js';
import { emptyHTML, toast, confirmDialog, compressImage, blobToDataURL } from '../../lib/dom.js';
import { GALLERY_CATEGORIES, options, label } from '../../lib/labels.js';
import { friendlyError, rules } from '../../lib/validate.js';

const TARGET = 25;

const fields = (isNew) => [
  ...(isNew ? [{ name: 'file', label: 'Photograph', type: 'file', accept: 'image/jpeg,image/png,image/webp', required: true,
    validate: rules.file({ maxMB: 8 }), hint: 'JPG, PNG or WebP. Resized to 1,920 px and re-encoded, which also strips GPS metadata.' }] : []),
  { name: 'category', label: 'Category', type: 'select', required: true, options: options(GALLERY_CATEGORIES), half: true },
  { name: 'taken_at', label: 'Date and time taken', type: 'datetime-local', required: true, half: true, validate: rules.notFuture() },
  { name: 'caption', label: 'Caption', required: true, minLength: 2, maxLength: 160 },
  { name: 'location_text', label: 'Location', required: true, maxLength: 160, hint: 'Where on campus the photo was taken.' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3, maxLength: 1000, required: true },
  { name: 'sort_order', label: 'Display order', type: 'number', integer: true, min: 0, required: true, half: true },
  { name: 'is_published', label: 'Publish on the Research page', type: 'checkbox', half: true },
];

export async function render({ db, el, can }) {
  const photos = await db.list('gallery_photos', { order: ['sort_order', 'asc'] });
  let cat = '';
  el.innerHTML = `${can.write ? '' : readOnlyNote()}
    <div class="notice">${icon('camera', 18)}<p>Only upload the project team's <strong>original</strong> photographs. Get consent before photographing people, and never publish images that identify a person without it.</p></div>
    ${panel('Research photo gallery', '<div class="panel__body" data-grid></div>', {
      iconName: 'image',
      tools: `${selectHTML('cat', options(GALLERY_CATEGORIES), '', 'All categories', 'Filter by category')}
        ${can.write ? `<button type="button" class="btn btn--sm" data-add>${icon('upload', 16)}Upload photo</button>` : ''}`,
    })}`;
  const grid = el.querySelector('[data-grid]');

  const draw = () => {
    const published = photos.filter((p) => p.is_published).length;
    const list = photos.filter((p) => !cat || p.category === cat);
    grid.innerHTML = `<div style="margin-bottom:16px"><div class="toolbar" style="justify-content:space-between"><strong>${published} of ${TARGET} published photographs</strong>
        <span class="small muted">${photos.length} uploaded in total</span></div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${TARGET}" aria-valuenow="${published}"><span style="width:${Math.min(100, (published / TARGET) * 100)}%"></span></div></div>
      ${list.length ? `<div class="admin-gallery">${list.map((p) => `<div class="tile">
        <img src="${esc(p.image_url)}" alt="${esc(p.caption)}" loading="lazy">
        <div class="tile__body"><strong>${esc(p.caption)}</strong>
          <span class="muted">${esc(label(GALLERY_CATEGORIES, p.category))}</span>
          <span class="muted">${esc(fmtDateTime(p.taken_at))} · ${esc(p.location_text || 'N/A')}</span>
          <span>${p.is_published ? '<span class="badge badge--verified">Published</span>' : '<span class="badge">Hidden</span>'}</span></div>
        ${can.write ? `<div class="tile__actions"><button type="button" class="btn btn--ghost btn--sm" data-edit="${esc(p.id)}">${icon('edit', 14)}Edit</button>
          <button type="button" class="btn btn--ghost btn--sm" data-del="${esc(p.id)}" aria-label="Delete ${esc(p.caption)}">${icon('trash', 14)}</button></div>` : ''}
      </div>`).join('')}</div>`
        : emptyHTML('No photographs yet', 'Upload research photos with their caption, date, time, location and description.', 'image')}`;
  };

  el.querySelector('[name="cat"]').addEventListener('change', (e) => { cat = e.target.value; draw(); });
  el.querySelector('[data-add]')?.addEventListener('click', () => formModal({
    title: 'Upload research photograph', wide: true, fields: fields(true), submitLabel: 'Upload',
    values: { sort_order: photos.length, is_published: true },
    onSubmit: async (v) => {
      const blob = await compressImage(v.file, db.mode === 'demo' ? 1200 : 1920, 0.82);
      const image_url = await db.uploadGalleryImage(db.mode === 'demo' ? await blobToDataURL(blob) : blob);
      const { file, ...meta } = v;
      photos.push(await db.insert('gallery_photos', { ...meta, sort_order: meta.sort_order ?? photos.length,
        taken_at: new Date(meta.taken_at).toISOString(), image_url }));
      photos.sort((a, b) => a.sort_order - b.sort_order);
      toast('Photo uploaded', 'success');
      draw();
    },
  }));
  grid.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) {
      const p = photos.find((x) => x.id === edit.dataset.edit);
      formModal({ title: 'Edit photo details', fields: fields(false), values: { ...p, taken_at: toLocalInput(p.taken_at) },
        onSubmit: async (v) => {
          Object.assign(p, await db.update('gallery_photos', p.id, { ...v, taken_at: new Date(v.taken_at).toISOString() }));
          photos.sort((a, b) => a.sort_order - b.sort_order);
          toast('Photo updated', 'success'); draw();
        } });
    }
    if (del) {
      const p = photos.find((x) => x.id === del.dataset.del);
      if (!(await confirmDialog(`Delete “${p.caption}”?`, { confirmLabel: 'Delete', danger: true }))) return;
      try { await db.remove('gallery_photos', p.id); photos.splice(photos.indexOf(p), 1); draw(); toast('Photo deleted', 'success'); }
      catch (err) { toast(friendlyError(err), 'error'); }
    }
  });
  draw();
}
