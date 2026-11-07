// Pledges and Feedback: everything visitors submitted on the public website.
import { icon, intro } from '../ui.js';

const TABS = [['pledges', 'Pledges', 'heart'], ['feedback', 'Feedback messages', 'message']];

export async function render(ctx) {
  const { el } = ctx;
  const start = new URLSearchParams(location.hash.split('?')[1] ?? '').get('tab') === 'feedback' ? 'feedback' : 'pledges';
  el.innerHTML = `${intro('Read the water conservation pledges and feedback messages people submitted on the website. Search, filter by date, mark feedback as reviewed, and use <strong>CSV</strong> to open the list in Excel. Submissions made on this computer appear here.')}
    <div class="tabs" role="tablist">${TABS.map(([k, t, ic]) => `<button type="button" role="tab" id="tab-${k}" aria-controls="tabpanel" aria-selected="${k === start}" data-tab="${k}">${icon(ic, 16)} ${t}</button>`).join('')}</div>
    <div id="tabpanel" role="tabpanel"></div>`;
  const panelEl = el.querySelector('#tabpanel');
  const show = async (k) => {
    el.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
    panelEl.setAttribute('aria-labelledby', `tab-${k}`);
    const host = document.createElement('div');
    panelEl.replaceChildren(host);
    const mod = await import(`./${k}.js`);
    await mod.render({ ...ctx, el: host });
  };
  el.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  await show(start);
}
