import { initLayout } from '../layout.js';
import { quietEmpty } from '../lib/research-view.js';
import { esc, fmtGHS, fmtNum } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { budgetTotals, calcSavings, reportBaselineVsPilot } from '../lib/calc.js';
import { readForm } from '../lib/validate.js';
import { BUDGET_CATEGORIES, COST_BASIS, label } from '../lib/labels.js';
import { siteContent, galleryImages } from '../lib/content.js';
import { renderBeforeAfter } from '../components/gallery.js';
import { renderVideoSlot } from '../components/video.js';

const { db } = await initLayout();

// ---- settings: roadmap phase + tariff --------------------------------------
const settings = await siteContent(db).catch(() => ({}));
const phase = Number(settings.roadmap?.current_phase) || 0;
document.querySelectorAll('#roadmap li').forEach((li, i) => {
  if (i + 1 < phase) li.classList.add('is-done');
  if (i + 1 === phase) {
    li.classList.add('is-current');
    li.querySelector('h3').insertAdjacentHTML('beforeend', ' <span class="badge badge--verified">Current phase</span>');
  }
});

// ---- budget calculator -----------------------------------------------------
const budgetHost = document.getElementById('budget-calc');
let scenario = [];

function drawBudget() {
  const { lines, byCategory, grand } = budgetTotals(scenario);
  const cats = Object.keys(BUDGET_CATEGORIES).filter((c) => lines.some((l) => l.category === c));
  budgetHost.innerHTML = `<div class="table-wrap"><table class="data"><caption class="sr-only">Project budget</caption>
    <thead><tr><th>Item</th><th>Basis</th><th class="num">Quantity</th><th class="num">Unit cost (GH₵)</th><th class="num">Line total</th></tr></thead>
    ${cats.map((c) => `<tbody><tr><th colspan="5" style="background:#F0FAF3;color:var(--forest)">${esc(BUDGET_CATEGORIES[c])}</th></tr>
      ${lines.map((l, i) => (l.category !== c ? '' : `<tr>
        <td>${esc(l.item)}${l.notes ? `<div class="small muted">${esc(l.notes)}</div>` : ''}</td>
        <td><span class="badge badge--${l.cost_basis === 'estimate' ? 'estimate' : 'verified'}">${esc(label(COST_BASIS, l.cost_basis))}</span></td>
        <td class="num"><input type="number" min="0" step="any" value="${esc(l.quantity)}" data-i="${i}" data-k="quantity" aria-label="Quantity for ${esc(l.item)}" style="width:90px;text-align:right"></td>
        <td class="num"><input type="number" min="0" step="any" value="${esc(l.unit_cost)}" data-i="${i}" data-k="unit_cost" aria-label="Unit cost for ${esc(l.item)}" style="width:120px;text-align:right"></td>
        <td class="num">${fmtGHS(l.total)}</td></tr>`)).join('')}
      <tr><td colspan="4" class="num muted"><em>Subtotal, ${esc(BUDGET_CATEGORIES[c])}</em></td><td class="num"><strong>${fmtGHS(byCategory[c])}</strong></td></tr></tbody>`).join('')}
    <tfoot><tr><td colspan="4">Overall project cost${lines.some((l) => l.cost_basis === 'estimate') ? ' <span class="badge badge--estimate">Includes estimates</span>' : ''}</td><td class="num">${fmtGHS(grand)}</td></tr></tfoot>
    </table></div>
    <div class="btn-row" style="margin-top:12px"><button class="btn btn--ghost btn--sm" type="button" data-reset>${icon('refresh', 16)} Reset to official budget</button></div>`;
}

let official = [];
try {
  official = await db.publicList('budget_items', { order: ['category', 'asc'] });
  scenario = structuredClone(official);
  if (!scenario.length) budgetHost.innerHTML = quietEmpty('The project budget will be published here once costs have been confirmed.', 'coins');
  else drawBudget();
} catch (e) {
  budgetHost.innerHTML = quietEmpty('The project budget will be published here once costs have been confirmed.', 'coins');
}
budgetHost.addEventListener('change', (e) => {
  const inp = e.target.closest('input[data-i]');
  if (!inp) return;
  const v = Number(inp.value);
  scenario[Number(inp.dataset.i)][inp.dataset.k] = Number.isFinite(v) && v >= 0 ? v : 0;
  const focusKey = `${inp.dataset.i}-${inp.dataset.k}`;
  drawBudget();
  budgetHost.querySelector(`input[data-i="${focusKey.split('-')[0]}"][data-k="${inp.dataset.k}"]`)?.focus();
});
budgetHost.addEventListener('click', (e) => {
  if (e.target.closest('[data-reset]')) { scenario = structuredClone(official); drawBudget(); }
});

// ---- savings calculator ----------------------------------------------------
const form = document.getElementById('savings-form');
const out = document.getElementById('savings-result');
const tariff = settings.tariff ?? {};
if (tariff.value && tariff.verified) {
  form.elements.tariff.value = tariff.value;
  form.elements.tariffUnit.value = tariff.unit ?? 'm3';
  form.elements.tariffVerified.checked = !!tariff.verified;
  const src = document.getElementById('tariff-source');
  src.hidden = false;
  src.textContent = `Tariff pre-filled from project settings${tariff.source ? ` (source: ${tariff.source})` : ''}${tariff.verified ? '' : ', not yet verified'}.`;
}

function recalc() {
  const v = readForm(form);
  const r = calcSavings({ ...v, tariffVerified: v.tariffVerified === true });
  const u = v.unit === 'm3' ? 'm³' : 'L';
  if (r.saved === null) {
    out.innerHTML = `<ul class="notes-list">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
    return;
  }
  out.innerHTML = `<div class="result-grid">
      <div class="result"><span>Water saved</span><strong>${fmtNum(r.saved, 2)} ${u}</strong></div>
      <div class="result"><span>Reduction</span><strong>${r.pct === null ? 'N/A' : `${fmtNum(r.pct, 1)}%`}</strong></div>
      <div class="result"><span>Est. financial saving</span><strong>${r.financial === null ? 'N/A' : fmtGHS(r.financial)}</strong></div>
      <div class="result"><span>Est. annual water</span><strong>${r.annualLitres === null ? 'N/A' : `${fmtNum(r.annualLitres)} L`}</strong></div>
      <div class="result"><span>Est. annual saving</span><strong>${r.annualFinancial === null ? 'N/A' : fmtGHS(r.annualFinancial)}</strong></div>
    </div>
    ${r.notes.length ? `<ul class="notes-list">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
}
form.addEventListener('input', recalc);
form.addEventListener('submit', (e) => e.preventDefault());
recalc();

// Offer to fill from recorded like-for-like readings (daily averages).
try {
  const [readings, locations] = await Promise.all([
    db.publicList('water_readings'), db.publicList('campus_locations'),
  ]);
  const comparable = reportBaselineVsPilot(readings, locations).filter((r) => r.meets_minimum_days);
  if (comparable.length) {
    const btn = document.getElementById('use-recorded');
    btn.hidden = false;
    btn.addEventListener('click', () => {
      form.elements.baseline.value = comparable.reduce((s, r) => s + r.baseline_avg_daily_l, 0).toFixed(2);
      form.elements.pilot.value = comparable.reduce((s, r) => s + r.pilot_avg_daily_l, 0).toFixed(2);
      form.elements.unit.value = 'L';
      form.elements.periodDays.value = 1;
      recalc();
      out.insertAdjacentHTML('afterbegin', `<p class="small muted">Filled with average <strong>daily</strong> litres across ${comparable.length} comparable location/method group(s).</p>`);
    });
  }
} catch { /* calculator still works manually */ }

// ---- baseline vs pilot measurements -------------------------------------------
(async () => {
  const host = document.getElementById('results-table');
  try {
    const [readings, locations] = await Promise.all([
      db.publicList('water_readings'), db.publicList('campus_locations'),
    ]);
    const rows = reportBaselineVsPilot(readings, locations);
    host.innerHTML = !rows.length ? quietEmpty('No water readings have been recorded yet. Baseline and pilot measurements will be compared here once they are available.', 'gauge')
      : `<table class="data"><caption class="sr-only">Baseline versus pilot measurements</caption><thead><tr><th>Location</th><th>Method</th>
        <th class="num">Baseline L/day</th><th class="num">Days</th><th class="num">Pilot L/day</th><th class="num">Days</th>
        <th class="num">Saved L/day</th><th class="num">Reduction</th><th>Evidence</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${esc(r.location_name)}</td><td>${esc(r.measurement_method)}</td>
          <td class="num">${fmtNum(r.baseline_avg_daily_l, 1)}</td><td class="num">${r.baseline_days}</td>
          <td class="num">${r.pilot_avg_daily_l === null ? 'Not yet' : fmtNum(r.pilot_avg_daily_l, 1)}</td><td class="num">${r.pilot_days}</td>
          <td class="num">${r.saved_per_day_l === null ? 'N/A' : fmtNum(r.saved_per_day_l, 1)}</td>
          <td class="num">${r.reduction_pct === null ? 'N/A' : `${fmtNum(r.reduction_pct, 1)}%`}</td>
          <td>${r.meets_minimum_days ? '<span class="badge badge--verified">≥3 days each phase</span>' : '<span class="badge badge--estimate">Not enough days yet</span>'}</td></tr>`).join('')}
        </tbody></table>`;
  } catch (e) { host.innerHTML = quietEmpty('Measurements could not be loaded right now. Please refresh the page.', 'gauge'); }
})();

galleryImages(db).then((imgs) => { document.getElementById('ba-block').hidden = !renderBeforeAfter(document.getElementById('before-after'), imgs); })
  .catch(() => {});
renderVideoSlot(document.getElementById('impl-video'), db, 'solution-demo');
