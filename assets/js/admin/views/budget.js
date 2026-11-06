// Budget items (admin only edits). Totals come from the same budgetTotals() as the public calculator.
import { esc, icon, demoBadge, panel, actionBtn, onActions, formModal } from '../ui.js';
import { emptyHTML, toast, confirmDialog, downloadCSV, fmtGHS, fmtNum } from '../../lib/dom.js';
import { BUDGET_CATEGORIES, COST_BASIS, options, label } from '../../lib/labels.js';
import { friendlyError } from '../../lib/validate.js';
import { budgetTotals } from '../../lib/calc.js';

const FIELDS = [
  { name: 'category', label: 'Budget category', type: 'select', required: true, options: options(BUDGET_CATEGORIES) },
  { name: 'item', label: 'Item', required: true, minLength: 2, maxLength: 160 },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0, step: 'any', half: true },
  { name: 'unit_cost', label: 'Unit cost (GH₵)', type: 'number', required: true, min: 0, step: '0.01', half: true },
  { name: 'cost_basis', label: 'Cost basis', type: 'select', required: true, options: options(COST_BASIS),
    hint: 'Use “Quotation” only with a written quote from a supplier, and “Actual” only for money already spent.' },
  { name: 'notes', label: 'Source / notes', maxLength: 500, optional: true, hint: 'e.g. supplier name and quote date, or how the estimate was made.' },
];

export async function render({ db, el, can }) {
  const items = await db.list('budget_items', { order: ['category', 'asc'] });
  el.innerHTML = `${can.admin ? '' : `<p class="readonly-note">${icon('shield', 16)}Only administrators can change the budget.</p>`}
    ${panel('Project budget (GHS)', '<div data-table></div>', {
      iconName: 'coins',
      tools: `<button type="button" class="btn btn--ghost btn--sm" data-export>${icon('download', 16)}CSV</button>
        ${can.admin ? `<button type="button" class="btn btn--sm" data-add>${icon('plus', 16)}Add item</button>` : ''}`,
    })}`;
  const host = el.querySelector('[data-table]');

  const draw = () => {
    if (!items.length) { host.innerHTML = emptyHTML('No budget items yet', 'Add each cost line with its basis. The public Implementation page updates automatically.', 'coins'); return; }
    const { lines, byCategory, grand } = budgetTotals(items);
    const cats = Object.keys(BUDGET_CATEGORIES).filter((c) => lines.some((l) => l.category === c));
    host.innerHTML = `<div class="table-wrap"><table class="data"><caption class="sr-only">Budget</caption>
      <thead><tr><th>Item</th><th>Basis</th><th class="num">Qty</th><th class="num">Unit cost</th><th class="num">Line total</th>${can.admin ? '<th class="num"><span class="sr-only">Actions</span></th>' : ''}</tr></thead>
      ${cats.map((c) => `<tbody><tr><th colspan="${can.admin ? 6 : 5}" style="background:#F0FAF3;color:var(--forest)">${esc(BUDGET_CATEGORIES[c])}</th></tr>
        ${lines.map((l, i) => (l.category !== c ? '' : `<tr><td>${esc(l.item)} ${demoBadge(l.is_demo)}${l.notes ? `<div class="small muted">${esc(l.notes)}</div>` : ''}</td>
          <td><span class="badge ${l.cost_basis === 'estimate' ? 'badge--estimate' : 'badge--verified'}">${esc(label(COST_BASIS, l.cost_basis))}</span></td>
          <td class="num">${esc(fmtNum(l.quantity, 2))}</td><td class="num">${esc(fmtGHS(l.unit_cost))}</td><td class="num">${esc(fmtGHS(l.total))}</td>
          ${can.admin ? `<td class="num"><div class="row-actions">${actionBtn('edit', i, 'edit', `Edit ${l.item}`)}${actionBtn('del', i, 'trash', `Delete ${l.item}`, true)}</div></td>` : ''}</tr>`)).join('')}
        <tr><td colspan="4" class="num muted"><em>Subtotal</em></td><td class="num"><strong>${esc(fmtGHS(byCategory[c]))}</strong></td>${can.admin ? '<td></td>' : ''}</tr></tbody>`).join('')}
      <tfoot><tr><td colspan="4">Overall project cost${lines.some((l) => l.cost_basis === 'estimate') ? ' <span class="badge badge--estimate">Includes estimates</span>' : ''}</td><td class="num">${esc(fmtGHS(grand))}</td>${can.admin ? '<td></td>' : ''}</tr></tfoot></table></div>`;
  };

  const open = (it) => formModal({
    title: it ? 'Edit budget item' : 'Add budget item', fields: FIELDS,
    values: it ?? { quantity: 1, unit_cost: 0, cost_basis: 'estimate' },
    onSubmit: async (v) => {
      if (it) Object.assign(it, await db.update('budget_items', it.id, v));
      else items.push(await db.insert('budget_items', v));
      toast(it ? 'Budget item updated' : 'Budget item added', 'success');
      draw();
    },
  });
  el.querySelector('[data-add]')?.addEventListener('click', () => open(null));
  el.querySelector('[data-export]').addEventListener('click', () => downloadCSV('budget.csv', budgetTotals(items).lines, [
    { label: 'Category', value: (l) => label(BUDGET_CATEGORIES, l.category) }, { label: 'Item', key: 'item' },
    { label: 'Quantity', key: 'quantity' }, { label: 'Unit cost (GHS)', key: 'unit_cost' }, { label: 'Line total (GHS)', key: 'total' },
    { label: 'Cost basis', value: (l) => label(COST_BASIS, l.cost_basis) }, { label: 'Notes', key: 'notes' },
  ]));
  onActions(host, {
    edit: (i) => open(items[i]),
    del: async (i) => {
      if (!(await confirmDialog(`Delete “${items[i].item}”?`, { confirmLabel: 'Delete', danger: true }))) return;
      try { await db.remove('budget_items', items[i].id); items.splice(i, 1); draw(); toast('Item deleted', 'success'); }
      catch (err) { toast(friendlyError(err), 'error'); }
    },
  });
  draw();
}
