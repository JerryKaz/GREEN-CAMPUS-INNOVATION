// Water readings (Feature 2): daily consumption by location, phase and method.
import { esc, icon, fmtDate, demoBadge, panel, tableHTML, actionBtn, onActions, selectHTML, formModal, today, readOnlyNote, intro, primaryBtn } from '../ui.js';
import { emptyHTML, downloadCSV, toast, confirmDialog, fmtNum } from '../../lib/dom.js';
import { PHASES, UNITS, options, label } from '../../lib/labels.js';
import { friendlyError, rules } from '../../lib/validate.js';
import { toLitres, reportBaselineVsPilot } from '../../lib/calc.js';
import { fmtGHS } from '../../lib/dom.js';

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

  el.innerHTML = `${intro('Record each water measurement here. Use <strong>Baseline</strong> for readings taken before the intervention and <strong>Pilot</strong> for readings taken during or after it, at the same place and with the same measuring method. Water saved is calculated for you.', primaryBtn('Add Water Reading'))}
    ${panel('Water saved (calculated automatically)', '<div data-calc></div>', { iconName: 'chart' })}
    ${panel('Water readings', '<div data-table></div>', {
      iconName: 'gauge',
      tools: `${selectHTML('loc', locations.map((l) => ({ value: l.id, text: l.name })), '', 'All locations', 'Filter by location')}
        ${selectHTML('phase', options(PHASES), '', 'All phases', 'Filter by phase')}
        <button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>
`,
    })}`;
  const host = el.querySelector('[data-table]');
  const calcHost = el.querySelector('[data-calc]');
  const tariff = (await db.settings()).tariff ?? {};
  const tariffOk = tariff.verified && Number(tariff.value) > 0;

  // Recomputed from the stored readings after every add, edit or delete.
  const drawCalc = () => {
    const rows = reportBaselineVsPilot(readings, locations).filter((r) => r.baseline_days && r.pilot_days);
    const money = (litresPerDay) => (tariffOk && litresPerDay > 0
      ? (tariff.unit === 'L' ? litresPerDay : litresPerDay / 1000) * Number(tariff.value) : null);
    calcHost.innerHTML = `<div class="panel__body">
      <p class="small muted" style="margin-top:0">For each place, the average daily baseline is compared with the average daily pilot reading (same measuring method).
        <strong>Water saved</strong> = baseline − pilot. <strong>Reduction</strong> = water saved ÷ baseline × 100.
        <strong>Money saved</strong> uses the checked water price ${tariffOk ? `(<strong>${esc(fmtGHS(tariff.value))} per ${tariff.unit === 'L' ? 'litre' : 'm³'}</strong>${tariff.source ? `, ${esc(tariff.source)}` : ''})` : '(<strong>not entered yet</strong>: add it in <a href="#/content">Website Content</a>)'}.
        A yearly estimate appears only when both phases have at least 7 days of readings.</p>
      ${rows.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Location</th><th>Method</th><th class="num">Days (B/P)</th>
        <th class="num">Baseline L/day</th><th class="num">Pilot L/day</th><th class="num">Saved L/day</th><th class="num">Reduction</th>
        <th class="num">GH₵/day</th><th class="num">Est. annual L</th></tr></thead><tbody>
        ${rows.map((r) => {
          const annual = r.baseline_days >= 7 && r.pilot_days >= 7 && r.saved_per_day_l > 0 ? r.saved_per_day_l * 365 : null;
          const m = money(r.saved_per_day_l);
          return `<tr><td>${esc(r.location_name)} ${demoBadge(r.includes_demo)}</td><td>${esc(r.measurement_method)}</td>
            <td class="num">${r.baseline_days}/${r.pilot_days}${r.meets_minimum_days ? '' : ' <span class="badge badge--estimate" title="Needs at least 3 days in each phase">&lt;3</span>'}</td>
            <td class="num">${fmtNum(r.baseline_avg_daily_l, 1)}</td><td class="num">${fmtNum(r.pilot_avg_daily_l, 1)}</td>
            <td class="num"><strong>${fmtNum(r.saved_per_day_l, 1)}</strong></td>
            <td class="num">${r.reduction_pct === null ? 'N/A' : `${fmtNum(r.reduction_pct, 1)}%`}</td>
            <td class="num">${m === null ? 'N/A' : esc(fmtGHS(m))}</td><td class="num">${annual === null ? 'N/A' : fmtNum(annual)}</td></tr>`;
        }).join('')}</tbody></table></div>`
        : emptyHTML('Nothing to compare yet', 'Water saved appears here once a place has both baseline and pilot readings.', 'chart')}</div>`;
  };

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
      : emptyHTML('No water readings yet', locations.length ? 'Click “Add Water Reading”. Record baseline readings on at least three days for each location.' : 'First add a place in Campus Hotspots, then click “Add Water Reading”.', 'gauge');
    drawCalc();
  };

  const fields = [
    { name: 'location_id', label: 'Where was it measured?', type: 'select', required: true, hint: 'Add the place in Campus Hotspots first if it is not listed.', options: locations.map((l) => ({ value: l.id, text: l.name })) },
    { name: 'reading_date', label: 'Measurement date', type: 'date', required: true, half: true, validate: rules.notFuture('Measurement date cannot be in the future.') },
    { name: 'phase', label: 'Phase', type: 'select', required: true, options: options(PHASES), half: true, hint: 'Baseline = before the intervention. Pilot = during or after it.' },
    { name: 'consumption_value', label: 'Amount of water used', type: 'number', required: true, min: 0, step: 'any', half: true, hint: 'For the whole day at this location.' },
    { name: 'measurement_unit', label: 'Unit', type: 'select', required: true, options: options(UNITS), half: true },
    { name: 'measurement_method', label: 'How was it measured?', required: true, hint: 'Pick from the list or type your own. Keep it the same for baseline and pilot.', minLength: 2, maxLength: 120, list: methods, half: true },
    { name: 'meter_reading', label: 'Meter reading (where available)', type: 'number', min: 0, step: 'any', nullable: true, optional: true, half: true },
    { name: 'notes', label: 'Notes (what you noticed)', type: 'textarea', rows: 3, maxLength: 1000, optional: true },
  ];

  const open = (r) => formModal({
    title: r ? 'Edit Water Reading' : 'Add Water Reading',
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
  el.querySelector('[data-add]')?.addEventListener('click', () => (locations.length ? open(null) : toast('First add the place in Campus Hotspots, then come back to add readings.', 'error', 7000)));
  el.querySelector('[data-export]').addEventListener('click', () => downloadCSV('water-readings.csv', visible, [
    { label: 'Date', key: 'reading_date' }, { label: 'Location', value: (r) => locName.get(r.location_id) ?? '' },
    { label: 'Phase', key: 'phase' }, { label: 'Consumption', key: 'consumption_value' }, { label: 'Unit', key: 'measurement_unit' },
    { label: 'Litres', value: (r) => toLitres(r.consumption_value, r.measurement_unit) },
    { label: 'Method', key: 'measurement_method' }, { label: 'Meter reading', key: 'meter_reading' }, { label: 'Notes', key: 'notes' },
    { label: 'Old record (not fieldwork)', value: (r) => (r.is_demo ? 'yes' : 'no') },
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
