import { initLayout } from '../layout.js';
import { esc } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { bindForm, rules } from '../lib/validate.js';
import { COMMITMENTS, FEEDBACK_CATEGORIES } from '../lib/labels.js';
import { siteContent } from '../lib/content.js';

const { db } = await initLayout();

document.getElementById('commitments').innerHTML = Object.entries(COMMITMENTS).map(([v, t], i) =>
  `<label class="choice"><input type="radio" name="commitment_type" value="${v}" ${i === 0 ? '' : ''}>${esc(t)}</label>`).join('');
document.getElementById('f-category').innerHTML = '<option value="">Select a category…</option>'
  + Object.entries(FEEDBACK_CATEGORIES).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');

function success(form, title, body) {
  const panel = document.createElement('div');
  panel.className = 'success-panel';
  panel.tabIndex = -1;
  panel.innerHTML = `<span class="success-icon">${icon('checkCircle', 32)}</span><h3>${esc(title)}</h3><p class="muted">${esc(body)}</p>
    <button type="button" class="btn btn--ghost">Submit another</button>`;
  form.hidden = true;
  form.after(panel);
  panel.focus();
  panel.querySelector('button').addEventListener('click', () => { panel.remove(); form.reset(); form.hidden = false; });
}

const pledgeForm = document.getElementById('pledge-form');
bindForm(pledgeForm, {
  commitment_type: [rules.required('Choose a commitment.'), rules.oneOf(Object.keys(COMMITMENTS))],
  full_name: [rules.maxLen(120)],
  email: [rules.email(), rules.maxLen(160)],
  department: [rules.maxLen(160)],
  comments: [rules.maxLen(1000)],
  consent_status: [rules.isTrue('Please give consent so we can store your pledge.')],
}, async (v) => {
  await db.submitPledge(v);
  success(pledgeForm, 'Thank you for your pledge!', 'Every commitment counts. Share the pledge with friends to multiply the impact.');
});

const feedbackForm = document.getElementById('feedback-form');
bindForm(feedbackForm, {
  category: [rules.required('Choose a category.'), rules.oneOf(Object.keys(FEEDBACK_CATEGORIES))],
  message: [rules.required('Please write a message.'), rules.minLen(10), rules.maxLen(2000)],
  contact_name: [rules.maxLen(120)],
  contact_email: [rules.email(), rules.maxLen(160)],
  consent_status: [rules.isTrue('Please give consent so we can store your feedback.')],
}, async (v) => {
  await db.submitFeedback(v);
  success(feedbackForm, 'Feedback saved, thank you', 'Your message has been recorded for the project team. Thank you for helping improve WaterWatch.');
});

if (location.hash === '#pledge') document.getElementById('pledge').querySelector('input')?.focus({ preventScroll: true });

// ---- contact details: only what the administrator has entered ------------------
siteContent(db).then(({ contact = {} }) => {
  const rows = [
    ['mail', 'Email', contact.email, contact.email ? `mailto:${contact.email}` : ''],
    ['phone', 'Phone', contact.phone, contact.phone ? `tel:${contact.phone.replace(/\s+/g, '')}` : ''],
    ['pin', 'Office', contact.office],
    ['flask', 'Course / supervisor', contact.supervisor],
    ['users', 'Group 5 members', contact.team ? contact.team.split(/\n+/).map((x) => x.trim()).filter(Boolean).join(', ') : ''],
  ].filter(([, , v]) => v);
  document.getElementById('contact-details').innerHTML = rows.length
    ? rows.map(([ic, t, v, href]) => `<li>${icon(ic, 18)}<span><strong>${esc(t)}:</strong> ${href ? `<a href="${esc(href)}">${esc(v)}</a>` : esc(v)}</span></li>`).join('')
    : `<li>${icon('message', 18)}<span>To reach the project team, please use the feedback form on this page.</span></li>`;
}).catch(() => {});
