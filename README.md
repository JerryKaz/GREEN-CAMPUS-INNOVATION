# Green Campus Process Innovation: VVU WaterWatch

**Group 5 · Valley View University, Ghana · Focus area: Water Conservation**

A website showing how low-cost process innovation can reduce water wastage on campus, with **VVU WaterWatch**: a working prototype for reporting water problems, recording water readings, tracking conservation actions and measuring what changed.

WaterWatch is a student project prototype, not an official university system.

---

## What is in the site

| Page | Purpose |
|---|---|
| Home (`index.html`) | Project identity, the water challenge, objectives, how WaterWatch works. Statistics, Video 1 and photo highlights appear once real information exists |
| Research (`research.html`) | Methodology, findings A–E, baseline observations (≥3 days), interviews (Estates/Facilities + ≥5 students), consumption charts, measurement log, hotspot map, photo gallery, Video 1 |
| Solution (`solution.html`) | VVU WaterWatch features, the report form (leakage, broken pipe, overflowing tank, faulty tap, faulty flush), hotspot map, TRIZ/SCAMPER, Video 2, pilot results, recommendations |
| Implementation (`implementation.html`) | How the intervention works, timeline, baseline vs pilot measurements, before/after photo comparisons, budget and water-savings calculators, Video 2 |
| Feedback / Contact (`feedback.html`) | Pledge form, feedback form, contact details (editable placeholders) |
| Dashboard (`dashboard.html`) | All figures derived from stored records, with search, date, category, status and location filters, charts, map, recent activity |
| Admin (`/admin/`) | Password-protected panel (see below). Not linked from the public navigation |

**The site contains no demonstration data.** It starts with empty data stores; every research finding, reading, location, photo and video is entered by the administrator. Sections without information show short, calm messages (for example "No water readings have been recorded yet."), statistics stay hidden until real records exist, and video sections stay hidden until a link is added.

## How it works (no backend)

* Plain HTML, CSS and JavaScript modules. No framework, no paid services.
* **Data is stored with IndexedDB in the visitor's browser.** Every page talks to it only through the service layer in `assets/js/data/store.js`, so the UI is not tied to the storage technology.
* Chart.js and Leaflet are self-hosted in `vendor/`. The map uses OpenStreetMap tiles.
* A service worker (`sw.js`) caches the site so pages open offline once visited.

### The important limitation

IndexedDB lives **in one browser on one device**. That means:

* A pledge submitted on a phone is visible only on that phone, not on the presentation laptop.
* Data does not sync between devices, browsers or visitors, and nothing is sent to a server.
* Clearing browser data, private windows or a different browser all start empty.

So: **run the presentation from one device**, download a backup regularly (Admin → Data Backup), and keep backups with the project files. Collecting submissions from many people for real needs a backend (see "Moving to production").

## Quick start

```bash
npm install        # only needed for the tests
npm run dev        # http://localhost:5173
npm test           # data layer and calculation tests
```

Serve the folder over HTTP; opening files with `file://` will not work (ES modules, IndexedDB, service worker).

The database starts **empty**. Nothing is inserted automatically, on the first visit or later.

**Upgrading from the earlier version:** if a browser still holds demonstration records from the previous version, they are kept but hidden from every public page. The admin is told in the notification centre and on the Data Backup page, and can remove them there. A backup is downloaded first and real records are never touched.

## Admin panel

Open **`/admin/`** (e.g. `https://jerrykaz.github.io/GREEN-CAMPUS-INNOVATION/admin/`). It is not linked from the public pages.

* **Password: `VVU2026`**. Change it in `assets/js/admin-config.js` → `ADMIN_PASSWORD`, then commit and push.
* Show/hide password, Logout (menu and top bar), automatic logout after 30 minutes idle, a 30-second lock after 5 wrong attempts.

The admin panel is written for someone with basic computer skills: plain language ("Add Water Reading", "Save Changes", "Upload Photo"), a short explanation and a main button at the top of every section, field hints, confirmations and clear messages.

**First login:** a welcome screen offers a **10-step guided tour** (Dashboard, Research Information, Water Readings, Campus Hotspots, Conservation Actions, Photos and Videos, Pledges and Feedback, Publishing, Backup, Notifications) with Next, Previous, Skip, Close and a progress bar. It is shown once per browser; reopen it any time from **Help / Take a Tour** in the menu or **Help and User Guide**.

**Notification centre:** the bell in the top bar shows unread messages and opens a side panel; **Notifications** in the menu shows the full list with filters. It holds getting-started guidance, research reminders, data and publishing reminders, automatic checks (for example "Baseline readings cover 2 day(s). At least 3 are needed.", old records found, photos not yet published, no recent backup) and system messages (saves, backups, restores). Clicking a message opens the relevant page. Messages can be marked read/unread, all marked read, and system messages dismissed; guidance always stays available. Returning admins see only the bell count, not pop-ups.

| Menu | What it is for |
|---|---|
| Dashboard | Progress overview (which parts have information and which are awaiting fieldwork), quick actions, recently added information |
| Research Information | Title, background, problem statement, objectives, methodology (with collection method), observations (dates, places), interview summaries, findings, recommendations. **Save Draft**, **Save and Publish**, **Preview** per section |
| Water Readings | Add Water Reading (baseline or pilot), history, filters, automatic water-saved calculations |
| Campus Hotspots | Add a Campus Location with a map position; only locations marked **Verified** appear on the public map |
| Conservation Actions | Interventions with dates, team, status, costs and outcome |
| Water Problem Reports | Problems reported through the public form; status, assignment, edit, add, delete, CSV |
| Photos and Videos | Upload Photo (resized in the browser, location data removed) and Add Video Link (YouTube / Google Drive) |
| Pledges and Feedback | Submissions with search, date filters, review status and CSV |
| Website Content | Pilot results (draft/publish), water price, current project phase, contact details, budget |
| Notifications | The notification centre |
| Data Backup | Download Backup, Restore from a Backup, Publish to the website, CSV lists, storage status, removal of old records |
| Help and User Guide | Tour, a typical working session, what each section is for, common questions |

Changes appear immediately on the public pages and dashboard **in the same browser** (open tabs refresh automatically).

## Publishing content for every visitor

Information saved in the admin panel lives in the admin's browser, so it shows on **that computer** at once. For visitors on other devices it must be in the website files. In **Data Backup → Publish to the website** the admin downloads:

| File | Contents | Goes in |
|---|---|---|
| `site-content.json` | Research information, pilot results, water price, phase, contact details (with each section's draft/published state) | `public/data/` |
| `media-gallery.json` + photo files | Photo list and every photo uploaded on that computer, already named with its final path | `public/data/` and the folder in each photo's path (e.g. `public/images/water-hotspots/`) |
| `video-gallery.json` | Video links | `public/data/` |

The admin sends these files to whoever manages the GitHub repository, who replaces them and pushes. All four files ship **empty**.

## Photos and videos

```
public/
  images/  campus/ water-hotspots/ research/ interviews/ prototype/ pilot/ before-after/
  videos/  documentary/ solution-demo/ interviews/   (placeholders only: videos are never committed)
  data/    site-content.json  media-gallery.json  video-gallery.json
```

* **Photos:** Admin → Photos and Videos → **Upload Photo**. Give a title, caption, category, date, place and a description for screen readers. Give a "before" and an "after" photo the same pair name to create a comparison slider on the Implementation page. Only the group's own photos are used; no stock images are shown anywhere.
* **Videos:** **Add Video Link** with a YouTube link (Unlisted is fine) or a Google Drive link shared as "Anyone with the link". Video 1 (problem documentary, 3–5 min) and Video 2 (solution demonstration, 2–3 min) each have one slot; interview videos can be added freely. Video sections stay hidden on the website until a link exists.
* Fixed page photo slots (hero images etc.) are listed in [`public/images/README.md`](public/images/README.md). Until a file exists they show a designed green background, never a photo.

## Backup and restore

Admin → **Data Backup**:

* **Download Backup**: every record, photo and setting, with export date, schema version and an export ID. The last backup date is shown, and the notification centre reminds the admin when a backup is missing or over a week old.
* **Restore from a Backup**: the file is checked first (right app, schema version, required fields, allowed values, links between records, duplicate IDs). Nothing changes until the admin chooses **Add the new records, keep mine** (records already present are skipped, so restoring twice cannot create duplicates) or **Replace everything with the backup** (a safety backup is downloaded first).
* **Download lists for Excel (CSV)** for each kind of record.

## Deployment (GitHub Pages + custom domain)

Full step-by-step instructions, including DNS records: **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

Summary:

1. Push to the `main` branch on GitHub.
2. Repository **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/static.yml` runs the tests, builds `_site/` (`npm run build`) and deploys it.
3. After buying the domain: add the DNS records, put the domain in `CNAME`, set it in **Settings → Pages → Custom domain**, then tick **Enforce HTTPS** once the certificate is issued.

All links and asset paths are relative, so the site works from the domain root and from `username.github.io/repository/` (only the 404 page assumes the domain root).

## Project structure

```
├── index.html, research.html, solution.html, implementation.html,
│   feedback.html, dashboard.html, 404.html
├── admin/
│   ├── index.html            Login page (/admin/)
│   └── dashboard.html        Admin panel
├── assets/
│   ├── css/                  main.css, admin.css
│   └── js/
│       ├── config.js         Site settings (map centre, project identity)
│       ├── admin-config.js   ADMIN PASSWORD and session timeouts
│       ├── layout.js         Header, navigation, reveals
│       ├── data/             idb.js (IndexedDB), store.js (service layer), schema.js (validation)
│       ├── pages/            One script per public page
│       ├── components/       Charts, map, gallery, video, report form, stats
│       ├── admin/            auth.js, app.js, notify.js (notifications), tour.js (onboarding), ui.js, views/
│       └── lib/              Calculations, content loading, backups, validation, helpers
├── public/                   images/, videos/, data/ (see above)
├── docs/                     DEPLOYMENT.md, partials/ (shared header and footer)
├── scripts/                  build-site, build-partials
├── tests/                    node:test suites
├── vendor/                   Chart.js, Leaflet
├── sw.js                     Offline support
└── CNAME                     Custom domain placeholder
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Serves the project on port 5173 |
| `npm test` | Runs the data-layer and calculation tests |
| `npm run build` | Builds the deployable `_site/` folder (used by GitHub Actions) |
| `npm run preview` | Builds and serves `_site/` on port 5174, exactly as deployed |
| `npm run partials` | Copies `docs/partials/header.html` and `footer.html` into every page |

## Content rules

This is an academic project. The site contains no invented measurements, tariffs, interviews, findings, locations, coordinates, pilot outcomes, savings or photos, and must never be given any. Research sections stay as drafts until the group has verified them. Money saved is calculated only with a water price that the admin has confirmed from an official source. The map centre in `assets/js/config.js` is a placeholder until replaced with verified campus coordinates. The official VVU logo and crest are not used.

## Moving to production later

To collect submissions from many people in one place, add a backend and keep the same method names as `store.js` (`list`, `insert`, `update`, `remove`, `submitReport`, …). The pages and admin views then work unchanged. Add real authentication (server-verified) at the same time.

## Licence

MIT (see [LICENSE](LICENSE)). Third-party libraries in `vendor/` keep their own licences (Chart.js: MIT; Leaflet: BSD-2-Clause).
