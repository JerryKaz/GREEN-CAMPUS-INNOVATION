// Help and User Guide: the tour, a step-by-step guide and common questions.
import { icon, intro, panel } from '../ui.js';
import { STEPS } from '../tour.js';

const FAQ = [
  ['Why can\'t other people see what I entered?', 'Your information is saved in this browser on this computer. Visitors on other phones and computers see the published website files. To update those, go to <a href="#/data">Data Backup → Publish to the website</a>, download the files and give them to the person who manages the website.'],
  ['Someone submitted a pledge on their phone. Why is it not here?', 'Submissions are saved on the device used to submit them. For a presentation, let people use this computer (or a tablet logged in here), so their pledges and feedback appear in this admin panel.'],
  ['What is the difference between Baseline and Pilot readings?', '<strong>Baseline</strong> readings are taken BEFORE the intervention, to show normal water use. <strong>Pilot</strong> readings are taken DURING or AFTER the intervention at the same place with the same method. The website compares the two to calculate water saved.'],
  ['What does "Save Draft" do?', 'It saves your work without putting it on the public website. Use it for unfinished or unchecked information. Click "Save and Publish" (or "Publish") when it is ready.'],
  ['How do I make a backup?', 'Go to <a href="#/data">Data Backup</a> and click "Download Backup". Keep the file somewhere safe, such as Google Drive or a USB stick. Do this after every data-entry session.'],
  ['I am moving to another computer. What do I do?', 'On the old computer, download a backup. On the new computer, open the admin panel, go to Data Backup and use "Restore from a Backup" with that file.'],
  ['A photo shows "On this computer". Is that a problem?', 'No. It means the photo is saved in this browser and shows on this computer. To show it to everyone, publish it from Data Backup.'],
  ['How do I change the admin password?', 'The password is set in the website files (assets/js/admin-config.js). Ask the person who manages the website to change it. This password only keeps casual visitors out; it is not strong security, so never store private information here.'],
  ['How do I log out?', 'Click "Logout" at the bottom of the menu or at the top right. You are also logged out automatically after 30 minutes without activity, or when you close the browser.'],
];

export async function render({ el, startTour }) {
  el.innerHTML = `${intro('Everything you need to use the admin panel. Start with the guided tour, then use the guide below whenever you need a reminder.',
      `<button type="button" class="btn" data-tour-now>${icon('compass', 18)}Take the Guided Tour</button>`)}
    ${panel('A typical working session', `<div class="panel__body"><ol class="help-steps">
      <li>Log in at the admin address with the project password.</li>
      <li>Check the <a href="#/overview">Dashboard</a> to see what is still awaiting fieldwork data, and the bell for reminders.</li>
      <li>Enter what you collected today: <a href="#/readings">Water Readings</a>, <a href="#/research">observations or interviews</a>, <a href="#/locations">locations</a>, <a href="#/actions">actions</a>, <a href="#/media">photos</a>.</li>
      <li>Use <strong>Save Draft</strong> for unchecked information and <strong>Save and Publish</strong> once the group has verified it.</li>
      <li>Open the public website (link at the bottom of the menu) to check how it looks.</li>
      <li>Go to <a href="#/data">Data Backup</a> and click <strong>Download Backup</strong>.</li>
      <li>Click <strong>Logout</strong> when you finish.</li></ol></div>`, { iconName: 'route' })}
    ${panel('What each section is for', `<div class="panel__body">${STEPS.map((s) => `<details class="faq"><summary>${s.title}</summary><div><ul>${s.points.map((p) => `<li>${p}</li>`).join('')}</ul></div></details>`).join('')}</div>`, { iconName: 'book' })}
    ${panel('Common questions', `<div class="panel__body">${FAQ.map(([q, a]) => `<details class="faq"><summary>${q}</summary><div><p>${a}</p></div></details>`).join('')}</div>`, { iconName: 'help' })}`;
  el.querySelector('[data-tour-now]').addEventListener('click', () => startTour());
}
