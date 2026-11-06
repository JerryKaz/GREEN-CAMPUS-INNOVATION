// WaterWatch reporting form (Feature 1).
import { bindForm, rules } from '../lib/validate.js';
import { esc, compressImage, blobToDataURL, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { ISSUE_TYPES, SEVERITIES } from '../lib/labels.js';

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export async function initReportForm(form, db) {
  const locSelect = form.elements.location_id;
  const noteField = form.querySelector('[data-location-note]');
  const identity = form.querySelector('[data-identity]');
  const preview = form.querySelector('[data-photo-preview]');

  form.elements.issue_type.innerHTML = '<option value="">Select a category…</option>'
    + Object.entries(ISSUE_TYPES).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
  form.elements.observed_at.value = localNow();
  form.elements.observed_at.max = localNow();

  try {
    const locs = await db.list('campus_locations', { order: ['name', 'asc'] });
    locSelect.innerHTML = '<option value="">Select a location…</option>'
      + locs.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}${l.is_demo ? ' (demo)' : ''}</option>`).join('')
      + '<option value="__other">My location is not listed</option>';
  } catch {
    locSelect.innerHTML = '<option value="__other">Describe the location below</option>';
  }

  const syncLocation = () => { noteField.hidden = locSelect.value !== '__other'; };
  const syncIdentity = () => { identity.hidden = form.elements.is_anonymous.checked; };
  locSelect.addEventListener('change', syncLocation);
  form.elements.is_anonymous.addEventListener('change', syncIdentity);
  syncLocation(); syncIdentity();

  form.elements.photo.addEventListener('change', () => {
    const f = form.elements.photo.files[0];
    preview.innerHTML = f && f.type.startsWith('image/')
      ? `<img src="${URL.createObjectURL(f)}" alt="Selected photo preview"><span class="small">${esc(f.name)}</span>`
      : `${icon('camera', 22)}<span class="small muted">Optional. A clear photo helps Estates locate the problem. Location data in the photo is removed before upload.</span>`;
  });

  const schema = (v) => ({
    issue_type: [rules.required('Choose the type of problem.'), rules.oneOf(Object.keys(ISSUE_TYPES))],
    location_id: [rules.required('Choose a location, or select “not listed”.')],
    ...(v.location_id === '__other' ? { location_note: [rules.required('Describe where the problem is.'), rules.minLen(3), rules.maxLen(200)] } : {}),
    description: [rules.required('Describe what you saw.'), rules.minLen(10, 'Please add a little more detail (at least 10 characters).'), rules.maxLen(2000)],
    severity: [rules.required('Choose how serious it is.'), rules.oneOf(Object.keys(SEVERITIES))],
    observed_at: [rules.notFuture()],
    photo: [rules.file({ maxMB: 5 })],
    ...(!v.is_anonymous ? {
      reporter_name: [rules.maxLen(120)],
      reporter_contact: [rules.maxLen(160)],
    } : {}),
  });

  bindForm(form, schema, async (v) => {
    let photo = null;
    if (v.photo) {
      const blob = await compressImage(v.photo, 1600, 0.8);
      if (blob.size > 5 * 1024 * 1024) throw new Error('Photo is too large even after compression. Try a smaller image.');
      photo = db.mode === 'demo' ? await blobToDataURL(await compressImage(v.photo, 900, 0.7)) : blob;
    }
    const payload = { ...v, location_id: v.location_id === '__other' ? null : v.location_id,
      location_note: v.location_id === '__other' ? v.location_note : '' };
    const { reference } = await db.submitReport(payload, photo);
    showSuccess(form, reference);
  });
}

function showSuccess(form, reference) {
  const panel = document.createElement('div');
  panel.className = 'success-panel';
  panel.setAttribute('tabindex', '-1');
  panel.innerHTML = `<span class="success-icon">${icon('checkCircle', 32)}</span>
    <h3>Report received, thank you</h3>
    <p class="muted">Keep this reference number. Estates/Facilities will use it to review and track the problem.</p>
    <div class="ref" aria-label="Reference number">${esc(reference)}</div>
    <div class="btn-row" style="justify-content:center">
      <button type="button" class="btn btn--ghost" data-copy>${icon('clipboard', 18)} Copy reference</button>
      <button type="button" class="btn" data-again>${icon('plus', 18)} Report another problem</button>
    </div>`;
  form.hidden = true;
  form.after(panel);
  panel.focus();
  panel.querySelector('[data-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(reference); toast('Reference copied', 'success'); }
    catch { toast('Copy failed. Please write the reference down.', 'error'); }
  });
  panel.querySelector('[data-again]').addEventListener('click', () => {
    panel.remove();
    form.reset();
    form.hidden = false;
    form.elements.is_anonymous.dispatchEvent(new Event('change'));
    form.elements.location_id.dispatchEvent(new Event('change'));
    form.elements.photo.dispatchEvent(new Event('change'));
    form.elements.issue_type.focus();
  });
}
