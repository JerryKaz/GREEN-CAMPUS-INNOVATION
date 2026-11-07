// Notification centre page: guidance, reminders, checks and system messages.
import { icon, intro } from '../ui.js';
import * as N from '../notify.js';

export async function render({ el, renderNotificationList, onNoteClick }) {
  let filter = 'all';
  el.innerHTML = `${intro('Reminders, guidance and messages about your work. Click a message to go to the page it is about. Guidance stays here even after you have read it.',
      `<button type="button" class="btn btn--ghost" data-read-all>${icon('check', 18)}Mark all as read</button>`)}
    <div class="filters" role="toolbar" aria-label="Show">${[['all', 'All'], ['unread', 'Unread'], ...Object.entries(N.CATEGORIES).map(([k, c]) => [k, c.label])]
      .map(([k, t]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="${k === filter}">${t}</button>`).join('')}</div>
    <section class="panel" style="margin-top:14px"><div data-list></div></section>`;
  const list = el.querySelector('[data-list]');
  const draw = () => {
    renderNotificationList(list, { filter });
    el.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === filter)));
  };
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; draw(); return; }
    if (e.target.closest('[data-read-all]')) { N.markAllRead(); return; }
    if (e.target.closest('.note')) onNoteClick(e);
  });
  const off = N.onNotifications(() => { if (el.isConnected) draw(); else off(); });
  draw();
}
