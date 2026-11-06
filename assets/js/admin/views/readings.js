// Water readings (Feature 2): daily consumption by location, phase and method.
import { esc, icon, fmtDate, demoBadge, panel, tableHTML, actionBtn, onActions, selectHTML, formModal, today, readOnlyNote } from '../ui.js';
import { emptyHTML, downloadCSV, toast, confirmDialog, fmtNum } from '../../lib/dom.js';
import { PHASES, UNITS, options, label } from '../../lib/labels.js';
import { friendlyError, rules } from '../../lib/validate.js';
import { toLitres } from '../../lib/calc.js';

const METHODS = ['Water meter reading', 'Sub-meter reading', 'Bucket-and-stopwatch estimate', 'Tank level gauge', 'Utility bill (daily average)'];

export async function render({ db, el, can, profile }) {
  const [readings, locations] = await Promise.all([
    db.list('water_readings', { order: ['reading_date', 'desc'] }),
    db.list('campus_locations', { order: ['name', 'asc'] }),
  ]);
  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const methods = [...new Set([...METHODS, ...readings.map((r) => r.measurement_method)])];
  const f = { loc: '', phase: '' };
  let visible = [];

  el.innerHTML = `${can.write ? '' : readOnlyNote()}
    <div class="notice">${icon('info', 18)}<p>Record one reading per location, date, phase and method. Keep the <strong>same method</strong> for baseline and pilot at a location, reports only compare like with like. Values in m³ are converted to litres (1 m³ = 1,000 L) for charts.</p></div>
    ${panel('Water readings', '<div data-table></div>', {
      iconName: 'gauge',
      tools: `${selectHTML('loc', locations.map((l) => ({ value: l.id, text: l.name })), '', 'All locations', 'Filter by location')}
        ${selectHTML('phase', options(PHASES), '', 'All phases', 'Filter by phase')}
        <button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>
        ${can.write ? `<button type="button" class="btn btn--sm" data-add>${icon('plus', 16)}Enter reading</button>` : ''}`,
    })}`;
  const host = el.querySelector('[data-table]');

  const draw = () => {
    visible = readings.filter((r) => (!f.loc || r.location_id === f.loc) && (!f.phase || r.phase === f.phase));
    const litres = visible.reduce((s, r) => s + (toLitres(r.consumption_value, r.measurement_unit) ?? 0), 0);
    host.innerHTML = visible.length ? tableHTML({
      caption: 'Water readings',
      columns: [
        { label: 'Date', value: (r) => esc(fmtDate(r.reading_date)) },
        { label: 'Location', value: (r) => `${esc(locName.get(r.location_id) ?? 'N/A')} ${demoBadge(r.is_demo)}` },
        { label: 'Phase', value: (r) => `<span class="badge ${r.phase === 'pilot' ? 'badge--draft' : r.phase === 'baseline' ? 'badge--verified' : ''}">${esc(label(PHASES, r.phase))}</span>` },
        { label: 'Consumption', num: true, value: (r) => `${esc(fmtNum(r.consumption_value, 3))} ${r.measurement_unit === 'm3' ? 'm³' : 'L'}` },
        { label: 'Meter reading', num: true, value: (r) => esc(fmtNum(r.meter_reading, 3)) },
        { label: 'Method', value: (r) => esc(r.measurement_method) },
        { label: 'Notes', value: (r) => `<span class="truncate" style="display:block">${esc(r.notes || 'N/A')}</span>` },
      ],
      rows: visible,
      actions: can.write ? (r, i) => `${actionBtn('edit', i, 'edit', 'Edit reading')}${actionBtn('del', i, 'trash', 'Delete reading', true)}` : null,
    }) + `<p class="small muted" style="padding:10px 20px;margin:0">${visible.length} reading(s) · ${esc(fmtNum(litres))} L in total</p>`
      : emptyHTML('No readings recorded', locations.length ? 'Enter baseline readings for at least three days per location.' : 'Add a campus location first, then record readings for it.', 'gauge');
  };

  const fields = [
    { name: 'location_id', label: 'Location', type: 'select', required: true, options: locations.map((l) => ({ value: l.id, text: l.name })) },
    { name: 'reading_date', label: 'Measurement date', type: 'date', required: true, half: true, validate: rules.notFuture('Measurement date cannot be in the future.') },
    { name: 'phase', label: 'Phase', type: 'select', required: true, options: options(PHASES), half: true },
    { name: 'consumption_value', label: 'Water consumption', type: 'number', required: true, min: 0, step: 'any', half: true },
    { name: 'measurement_unit', label: 'Unit', type: 'select', required: true, options: options(UNITS), half: true },
    { name: 'measurement_method', label: 'Measurement method', required: true, minLength: 2, maxLength: 120, list: methods, half: true },
    { name: 'meter_reading', label: 'Meter reading (where available)', type: 'number', min: 0, step: 'any', nullable: true, optional: true, half: true },
    { name: 'notes', label: 'Notes / wastage observations', type: 'textarea', rows: 3, maxLength: 1000, optional: true },
  ];

  const open = (r) => formModal({
    title: r ? 'Edit water reading' : 'Enter water reading',
    fields,
    values: r ?? { reading_date: today(), phase: 'baseline', measurement_unit: 'L', location_id: f.loc },
    onSubmit: async (v) => {
      const dup = readings.find((x) => x !== r && x.location_id === v.location_id && x.reading_date === v.reading_date
        && x.phase === v.phase && x.measurement_method === v.measurement_method);
      if (dup) throw new Error('A reading for this location, date, phase and method already exists, edit that one instead.');
      try {
        if (r) Object.assign(r, await db.update('water_readings', r.id, v));
        else readings.unshift(await db.insert('water_readings', { ...v, recorded_by: profile.id ?? null }));
      } catch (err) {
        if (/duplicate|unique/i.test(err.message)) throw new Error('A reading for this location, date, phase and method already exists.');
        throw err;
      }
      readings.sort((a, b) => b.reading_date.localeCompare(a.reading_date));
      toast(r ? 'Reading updated' : 'Reading saved', 'success');
      draw();
    },
  });

  el.querySelector('.toolbar').addEventListener('change', (e) => { if (e.target.name in f) { f[e.target.name] = e.target.value; draw(); } });
  el.querySelector('[data-add]')?.addEventListener('click', () => (locations.length ? open(null) : toast('Add a campus location first.', 'error')));
  el.querySelector('[data-export]').addEventListener('click', () => downloadCSV('water-readings.csv', visible, [
    { label: 'Date', key: 'reading_date' }, { label: 'Location', value: (r) => locName.get(r.location_id) ?? '' },
    { label: 'Phase', key: 'phase' }, { label: 'Consumption', key: 'consumption_value' }, { label: 'Unit', key: 'measurement_unit' },
    { label: 'Litres', value: (r) => toLitres(r.consumption_value, r.measurement_unit) },
    { label: 'Method', key: 'measurement_method' }, { label: 'Meter reading', key: 'meter_reading' }, { label: 'Notes', key: 'notes' },
    { label: 'Demo record', value: (r) => (r.is_demo ? 'yes' : 'no') },
  ]));
  onActions(host, {
    edit: (i) => open(visible[i]),
    del: async (i) => {
      const r = visible[i];
      if (!(await confirmDialog(`Delete the ${fmtDate(r.reading_date)} reading for ${locName.get(r.location_id) ?? 'this location'}?`, { confirmLabel: 'Delete', danger: true }))) return;
      try { await db.remove('water_readings', r.id); readings.splice(readings.indexOf(r), 1); draw(); toast('Reading deleted', 'success'); }
      catch (err) { toast(friendlyError(err), 'error'); }
    },
  });
  draw();
}
