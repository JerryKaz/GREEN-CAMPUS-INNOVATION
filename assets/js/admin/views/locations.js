// Campus locations: only verified places get coordinates and the "verified" flag.
import { esc, icon, fmtDate, demoBadge, panel, tableHTML, actionBtn, onActions, formModal, readOnlyNote, intro, primaryBtn } from '../ui.js';
import { emptyHTML, toast, confirmDialog, downloadCSV } from '../../lib/dom.js';
import { LOCATION_TYPES, options, label } from '../../lib/labels.js';
import { friendlyError } from '../../lib/validate.js';
import { CONFIG } from '../../data/db.js';
import { createMap } from '../../components/map.js';

const blank = (x) => x === '' || x === null || x === undefined;
const coordCheck = (min, max) => (v, all) => {
  const other = min === -90 ? all.longitude : all.latitude;
  if (blank(v) !== blank(other)) return 'Enter both latitude and longitude, or neither.';
  if (blank(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? null : `Must be between ${min} and ${max}.`;
};

const FIELDS = [
  { name: 'name', label: 'Location name', required: true, minLength: 2, maxLength: 120, hint: 'Use the name people on campus recognise, e.g. the building and floor.' },
  { name: 'location_type', label: 'Location type', type: 'select', required: true, options: options(LOCATION_TYPES), half: true },
  { name: 'is_verified', label: 'Verified: the team has confirmed this place on site (shows it on the public map)', type: 'checkbox', half: true },
  { name: 'description', label: 'What is the water problem here?', type: 'textarea', rows: 2, maxLength: 1000, optional: true, hint: 'Shown in the map pop-up, e.g. “Taps in the second washroom drip constantly.”' },
  { name: 'location_details', label: 'Directions / details', maxLength: 500, optional: true },
  { name: 'latitude', label: 'Latitude', type: 'text', nullable: true, optional: true, half: true, validate: coordCheck(-90, 90) },
  { name: 'longitude', label: 'Longitude', type: 'text', nullable: true, optional: true, half: true, validate: coordCheck(-180, 180) },
];

export async function render({ db, el, can }) {
  const [locations, reports, readings] = await Promise.all([
    db.list('campus_locations', { order: ['name', 'asc'] }),
    db.list('water_reports', { columns: 'id, location_id' }),
    db.list('water_readings', { columns: 'id, location_id' }),
  ]);
  const count = (arr, id) => arr.filter((x) => x.location_id === id).length;
  el.innerHTML = `${intro('List the places on campus where water wastage was observed or measured. Click the map to mark each one. Tick <strong>Verified</strong> once the team has confirmed it on site: only verified places appear on the public hotspot map.', primaryBtn('Add a Campus Location'))}
    <div class="notice">${icon('info', 18)}<p>Add only real places that have been checked on site. Coordinates are optional, locations without them still work in forms but do not appear on the public map.</p></div>
    ${panel('Campus locations', '<div data-table></div>', {
      iconName: 'pin',
      tools: `<button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>
`,
    })}`;
  const host = el.querySelector('[data-table]');

  const draw = () => {
    host.innerHTML = locations.length ? tableHTML({
      caption: 'Campus locations',
      columns: [
        { label: 'Name', value: (l) => `<strong>${esc(l.name)}</strong> ${demoBadge(l.is_demo)}${l.description ? `<div class="small muted truncate">${esc(l.description)}</div>` : ''}` },
        { label: 'Type', value: (l) => esc(label(LOCATION_TYPES, l.location_type)) },
        { label: 'Coordinates', value: (l) => (l.latitude === null || l.latitude === undefined ? '<span class="muted">Not mapped</span>' : `<span class="mono">${esc(Number(l.latitude).toFixed(5))}, ${esc(Number(l.longitude).toFixed(5))}</span>`) },
        { label: 'Verified', value: (l) => (l.is_verified ? '<span class="badge badge--verified">Verified</span>' : '<span class="badge">Unverified</span>') },
        { label: 'Reports', num: true, value: (l) => count(reports, l.id) },
        { label: 'Readings', num: true, value: (l) => count(readings, l.id) },
        { label: 'Added', value: (l) => esc(fmtDate(l.created_at)) },
      ],
      rows: locations,
      actions: can.write ? (l, i) => `${actionBtn('edit', i, 'edit', `Edit ${l.name}`)}${actionBtn('del', i, 'trash', `Delete ${l.name}`, true)}` : null,
    }) : emptyHTML('No campus locations yet', 'Click “Add a Campus Location” to add the first place. Locations also appear in the public problem-report form.', 'pin');
  };

  const open = (loc) => formModal({
    title: loc ? `Edit ${loc.name}` : 'Add a Campus Location',
    wide: true,
    fields: FIELDS,
    values: loc ? { ...loc, latitude: loc.latitude ?? '', longitude: loc.longitude ?? '' } : { location_type: 'other' },
    onSubmit: async (v) => {
      const row = { ...v, latitude: v.latitude === null ? null : Number(v.latitude), longitude: v.longitude === null ? null : Number(v.longitude) };
      if (loc) Object.assign(loc, await db.update('campus_locations', loc.id, row));
      else locations.push(await db.insert('campus_locations', row));
      locations.sort((a, b) => a.name.localeCompare(b.name));
      toast(loc ? 'Location updated' : 'Location added', 'success');
      draw();
    },
    afterRender: (form) => attachPicker(form, loc),
  });

  el.querySelector('[data-add]')?.addEventListener('click', () => open(null));
  el.querySelector('[data-export]').addEventListener('click', () => downloadCSV('campus-locations.csv', locations, [
    { label: 'Name', key: 'name' }, { label: 'Type', value: (l) => label(LOCATION_TYPES, l.location_type) },
    { label: 'Description', key: 'description' }, { label: 'Details', key: 'location_details' },
    { label: 'Latitude', key: 'latitude' }, { label: 'Longitude', key: 'longitude' },
    { label: 'Verified', value: (l) => (l.is_verified ? 'yes' : 'no') }, { label: 'Old record (not fieldwork)', value: (l) => (l.is_demo ? 'yes' : 'no') },
  ]));
  onActions(host, {
    edit: (i) => open(locations[i]),
    del: async (i) => {
      const l = locations[i];
      if (!(await confirmDialog(`Delete “${l.name}”? Reports at this location keep their record but lose the link.`, { confirmLabel: 'Delete', danger: true }))) return;
      try { await db.remove('campus_locations', l.id); locations.splice(i, 1); draw(); toast('Location deleted', 'success'); }
      catch (err) {
        toast(/foreign key|violates|linked/i.test(err.message) ? 'This location has readings or actions linked to it, so it cannot be deleted.' : friendlyError(err), 'error');
      }
    },
  });
  draw();
}

/** Click-to-place map under the coordinate fields. */
async function attachPicker(form, loc) {
  const holder = document.createElement('div');
  holder.className = 'field';
  holder.innerHTML = `<span class="hint">${icon('pin', 14)} Click the map to set the coordinates, or type them above. Map centre: ${CONFIG.SUPABASE_URL ? 'configured campus centre' : 'placeholder centre'}.</span>
    <div class="picker-map" aria-label="Location picker map"></div>
    <button type="button" class="btn btn--ghost btn--sm" data-clear style="justify-self:start">Clear coordinates</button>`;
  form.querySelector('[data-field="longitude"]').closest('.form-row').after(holder);
  const lat = form.elements.latitude;
  const lng = form.elements.longitude;
  try {
    const has = loc?.latitude !== null && loc?.latitude !== undefined;
    const { map, L } = await createMap(holder.querySelector('.picker-map'), {
      center: has ? [Number(loc.latitude), Number(loc.longitude)] : CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM, scrollZoom: true });
    let marker = has ? L.marker([Number(loc.latitude), Number(loc.longitude)]).addTo(map) : null;
    const place = (la, ln) => {
      if (marker) marker.setLatLng([la, ln]); else marker = L.marker([la, ln]).addTo(map);
    };
    map.on('click', (e) => {
      lat.value = e.latlng.lat.toFixed(6);
      lng.value = e.latlng.lng.toFixed(6);
      place(e.latlng.lat, e.latlng.lng);
    });
    const sync = () => {
      const la = Number(lat.value); const ln = Number(lng.value);
      if (lat.value && lng.value && Number.isFinite(la) && Number.isFinite(ln)) { place(la, ln); map.panTo([la, ln]); }
    };
    lat.addEventListener('change', sync); lng.addEventListener('change', sync);
    holder.querySelector('[data-clear]').addEventListener('click', () => {
      lat.value = ''; lng.value = '';
      if (marker) { marker.remove(); marker = null; }
    });
    setTimeout(() => map.invalidateSize(), 50);
  } catch {
    holder.querySelector('.picker-map').replaceWith(Object.assign(document.createElement('p'), { className: 'small muted', textContent: 'Map unavailable, enter coordinates manually.' }));
  }
}
