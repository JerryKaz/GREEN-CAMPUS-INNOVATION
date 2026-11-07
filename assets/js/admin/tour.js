// First-login welcome screen and the 10-step guided tour.
// Progress is saved in this browser so the tour does not restart on every login.
import { esc, openModal } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

const KEY = 'gci_admin_onboarding_v1';
const state = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
const save = (patch) => { try { localStorage.setItem(KEY, JSON.stringify({ ...state(), ...patch })); } catch { /* ignore */ } };

export const STEPS = [
  { route: 'overview', title: 'Dashboard overview', points: [
    'The Dashboard is your starting point. It shows which sections already have information and which are still waiting for fieldwork data.',
    'Use the menu on the left to open any section. On a phone, tap the menu button at the top left.',
    'Click "Dashboard" at the top of the menu at any time to come back here.',
    'The "Recently added" list shows the latest information you entered.'] },
  { route: 'research', title: 'Research Information', points: [
    'Enter the research background, problem statement, objectives and methodology.',
    'Add each field observation with its date and location, and a short summary of every interview.',
    'Write the verified findings and recommendations.',
    '"Save Draft" keeps your work private. "Save and Publish" puts that section on the public website. "Preview" shows how it will look.'] },
  { route: 'readings', title: 'Water Readings', points: [
    'Click "Add Water Reading" for each measurement.',
    'Choose "Baseline" for readings taken BEFORE the intervention, and "Pilot" for readings taken DURING or AFTER it.',
    'Use the same location and the same measuring method for baseline and pilot, so they can be compared fairly.',
    'Water saved and percentage reduction are calculated for you at the top of the page.'] },
  { route: 'locations', title: 'Campus Hotspots', points: [
    'Click "Add a Campus Location" for each place where water wastage was observed.',
    'Click on the map to mark exactly where it is.',
    'Tick "Verified" once the team has confirmed the location on site. Only verified locations appear on the public map.'] },
  { route: 'actions', title: 'Conservation Actions', points: [
    'Click "Add Conservation Action" to record a repair or intervention, for example replacing a tap washer.',
    'Choose the location, the team responsible, the dates and the status.',
    'When the work is finished, record the outcome and who checked it.'] },
  { route: 'media', title: 'Photos and Videos', points: [
    'Click "Upload Photo" to add a research photograph with its title, caption, date and location.',
    'Click "Add Video Link" and paste a YouTube or Google Drive link for each project video.',
    'Only use the group\'s own photos and videos.'] },
  { route: 'community', title: 'Pledges and Feedback', points: [
    'This section lists the conservation pledges and feedback messages submitted on the website.',
    'Use the search box and date filters to find a submission, and "Download CSV" to open them in Excel.',
    'Mark feedback as reviewed once the team has read it.'] },
  { route: 'data', title: 'Publishing information', points: [
    'Everything you save appears straight away on the public website on THIS computer.',
    'To show it to visitors on other phones and computers, open Data Backup → "Publish to the website" and download the files listed there.',
    'Send those files to the person who manages the website files. Visitors see the changes once the website has been updated.'] },
  { route: 'data', title: 'Backup and data management', points: [
    'Your information is stored in this browser on this computer.',
    'Click "Download Backup" after every data-entry session and before every presentation, and keep the file safe.',
    'To bring your information back, or move it to another computer, use "Restore from a Backup".'] },
  { route: 'notifications', title: 'Notifications', target: '[data-bell]', points: [
    'The bell at the top right shows reminders and guidance. A number means there are unread messages.',
    'Click a message to go straight to the page it is about.',
    'You can open this tour again at any time from "Help and User Guide" in the menu.'] },
];

let active = null;

export function startTour({ navigate, onDone } = {}) {
  endTour(false);
  let i = 0;
  const box = document.createElement('div');
  box.className = 'tour';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'false');
  box.setAttribute('aria-labelledby', 'tour-title');
  document.body.append(box);
  const prevFocus = document.activeElement;

  const highlight = (step) => {
    document.querySelectorAll('.tour-target').forEach((x) => x.classList.remove('tour-target'));
    const el = document.querySelector(step.target ?? `.sidenav a[data-path="${step.route}"]`);
    if (el && el.offsetParent !== null) { el.classList.add('tour-target'); el.scrollIntoView?.({ block: 'nearest' }); }
  };
  const draw = () => {
    const s = STEPS[i];
    navigate?.(s.route);
    box.innerHTML = `<div class="tour__head"><span class="tour__step">Step ${i + 1} of ${STEPS.length}</span>
        <button type="button" class="icon-btn icon-btn--sm" data-tour="close" aria-label="Close the tour">${icon('x', 18)}</button></div>
      <div class="tour__bar" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${i + 1}" aria-label="Tour progress"><span style="width:${((i + 1) / STEPS.length) * 100}%"></span></div>
      <h2 id="tour-title">${esc(s.title)}</h2>
      <ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <div class="tour__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-tour="skip">Skip tour</button>
        <span class="tour__spacer"></span>
        <button type="button" class="btn btn--ghost btn--sm" data-tour="prev" ${i === 0 ? 'disabled' : ''}>Previous</button>
        <button type="button" class="btn btn--sm" data-tour="next">${i === STEPS.length - 1 ? 'Finish' : 'Next'}</button>
      </div>`;
    setTimeout(() => highlight(s), 250); // after the page for this step has rendered
    box.querySelector('[data-tour="next"]').focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') endTour(false);
    if (e.key === 'ArrowRight' && !e.target.closest('input, textarea, select')) go(1);
    if (e.key === 'ArrowLeft' && !e.target.closest('input, textarea, select')) go(-1);
  };
  const go = (d) => {
    if (d > 0 && i === STEPS.length - 1) { endTour(true); return; }
    i = Math.max(0, Math.min(STEPS.length - 1, i + d));
    draw();
  };
  box.addEventListener('click', (e) => {
    const a = e.target.closest('[data-tour]')?.dataset.tour;
    if (a === 'next') go(1);
    if (a === 'prev') go(-1);
    if (a === 'skip' || a === 'close') endTour(false);
  });
  document.addEventListener('keydown', onKey);
  active = { box, onKey, prevFocus, onDone };
  draw();
}

export function endTour(completed) {
  if (!active) return;
  const { box, onKey, prevFocus, onDone } = active;
  active = null;
  box.remove();
  document.removeEventListener('keydown', onKey);
  document.querySelectorAll('.tour-target').forEach((x) => x.classList.remove('tour-target'));
  save({ tourSeen: true, ...(completed ? { tourCompleted: new Date().toISOString() } : {}) });
  prevFocus?.focus?.();
  onDone?.(completed);
}

/** Show the welcome screen once (first login on this browser). */
export function maybeWelcome({ navigate, onDone }) {
  if (state().welcomed) return false;
  save({ welcomed: new Date().toISOString() });
  const m = openModal({
    title: 'Welcome to the Green Campus Innovation Admin Panel',
    body: `<div class="welcome">
      <span class="welcome__icon">${icon('leaf', 30)}</span>
      <p>Use this dashboard to add and manage the information collected during your campus water conservation research.
        You do not need technical knowledge to use this system. Follow the steps provided, enter your information, and save your work.</p>
      <p class="small muted">The tour takes about two minutes. You can open it again any time from <strong>Help and User Guide</strong>.</p>
      <div class="form-actions"><button type="button" class="btn btn--ghost" data-later>Maybe later</button>
        <button type="button" class="btn" data-start>${icon('compass', 18)}Start Guided Tour</button></div></div>`,
  });
  m.el.querySelector('[data-later]').addEventListener('click', () => m.close());
  m.el.querySelector('[data-start]').addEventListener('click', () => { m.close(); startTour({ navigate, onDone }); });
  m.el.querySelector('[data-start]').focus();
  return true;
}

export const onboardingState = state;
