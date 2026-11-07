# Green Campus Process Innovation: VVU WaterWatch

**Group 5 · Valley View University, Ghana · Focus area: Water Conservation**

A website showing how low-cost process innovation can reduce water wastage on campus, with **VVU WaterWatch**: a working prototype for reporting water problems, recording water readings, tracking conservation actions and measuring what changed.

WaterWatch is a student project prototype, not an official university system.

---

## What is in the site

| Page | Purpose |
|---|---|
| Home (`index.html`) | Project identity, the water challenge, objectives, how WaterWatch works, Video 1, photo highlights. Statistics appear **only from real records** |
| Research (`research.html`) | Methodology, findings A–E, baseline observations (≥3 days), interviews (Estates/Facilities + ≥5 students), consumption charts, measurement log, hotspot map, photo gallery, Video 1 |
| Solution (`solution.html`) | VVU WaterWatch features, the report form (leakage, broken pipe, overflowing tank, faulty tap, faulty flush), hotspot map, TRIZ/SCAMPER, Video 2, pilot results, recommendations |
| Implementation (`implementation.html`) | How the intervention works, timeline, baseline vs pilot measurements, before/after photo comparisons, budget and water-savings calculators, Video 2 |
| Feedback / Contact (`feedback.html`) | Pledge form, feedback form, contact details (editable placeholders) |
| Dashboard (`dashboard.html`) | All figures derived from stored records, with search, date, category, status and location filters, charts, map, recent activity |
| Admin (`/admin/`) | Password-protected panel (see below). Not linked from the public navigation |

Demonstration records are labelled **DEMO** / **DEMO DATA** everywhere they appear.

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

So: **run the demonstration from one device**, export a backup regularly (Admin → Data Management), and keep backups with the project files. Collecting submissions from many people for real needs a backend (see "Moving to production").

## Quick start

```bash
npm install        # only needed for the tests
npm run dev        # http://localhost:5173
npm test           # data layer and calculation tests
```

Serve the folder over HTTP; opening files with `file://` will not work (ES modules, IndexedDB, service worker).

On first visit the site loads **77 demonstration records** from `public/data/sample-data.json` (only when the database is empty, and only once per device). Clearing them does not bring them back on the next visit; use Admin → Data Management → Load demonstration data if you want them again.

## Admin panel

Open **`/admin/`** (e.g. `https://your-domain/admin/`). It is deliberately not linked from the public pages.

* **Default password: `VVU2026`**
* **Change it in one place:** `assets/js/admin-config.js` → `ADMIN_PASSWORD`. Commit and redeploy.
* Show/hide password toggle, log out button, automatic sign-out after 30 minutes idle (configurable), lock-out for 30 seconds after 5 wrong attempts.

| Section | What you can do |
|---|---|
| Dashboard | Summary figures, charts, latest reports |
| Water Reports | View, add, edit, delete; change status and assignment; filter by category, status, severity, location and date; CSV |
| Water Readings | Add/edit baseline and pilot readings; history with filters; live water-saving calculations (saved, % reduction, GH₵ with a verified tariff, annual only with ≥7 days) |
| Conservation Actions | Create and manage interventions: status, implementation and completion dates, description, outcome, costs |
| Campus Locations | Add, edit and remove hotspots; click the map to set coordinates; mark as verified |
| Pledges / Feedback | Search, filter by type and date, review, delete, CSV |
| Media Management | Gallery image entries (path, title, caption, date, location, category, alt text, before/after pairs) and video links |
| Reports & Analytics | Four saved reports with charts, CSV and print |
| Budget | Budget lines with cost basis (estimate, quotation, actual) |
| Site Content | Research findings, observations, interviews, pilot results, water tariff, roadmap phase, contact details |
| Data Management | Export/import JSON backups, CSV exports, load/restore/clear demo data, last backup date, storage status |

Changes made in the admin panel update IndexedDB immediately and show on the public pages and dashboard of the **same browser** (open tabs refresh automatically).

### Security: what the password does and does not do

The password is a **demonstration-level access gate**. Because GitHub Pages has no server, the check runs in the browser, and `admin-config.js` is downloadable by anyone who looks at the page source. It keeps casual visitors out of the admin screens during a presentation. It does **not** protect data, and there is nothing secret to protect: the data is on the user's own device anyway.

* Do not store passwords, ID numbers or other sensitive personal information in WaterWatch.
* Names and emails on forms are optional; collect only what the project needs (Data Protection Act, 2012, Act 843).
* Proper authentication needs a backend or an external identity provider (for example Supabase Auth, Firebase Auth, Auth0 or Microsoft Entra ID with server-side rules). Until then, treat the admin panel as a convenience for the project team, not as security.

## Publishing content for every visitor

Because data is local, anything the group wants **all visitors** to see must be in the repository. Three files in `public/data/` hold published content:

| File | Contents | How to update |
|---|---|---|
| `site-content.json` | Findings, observations, interviews, pilot results, tariff, roadmap phase, contact details | Admin → Site Content → save → Data Management → **Export site-content.json** → replace the file → commit and push |
| `media-gallery.json` | Gallery photo entries | Admin → Media Management → add entries → **Export media-gallery.json** → replace the file → commit and push |
| `video-gallery.json` | Video 1, Video 2 and interview video links | Admin → Media Management → video links → **Export video-gallery.json** → replace → commit and push |
| `sample-data.json` | The demonstration records | Generated by `npm run sample-data` from `assets/js/data/demo-seed.js` |

Leave fields empty until they are verified. Empty fields show an "awaiting data" message, never an invented value.

## Photos and videos

```
public/
  images/  campus/ water-hotspots/ research/ interviews/ prototype/ pilot/ before-after/
  videos/  documentary/ solution-demo/ interviews/
  data/    sample-data.json  media-gallery.json  video-gallery.json  site-content.json
```

**Photos**

1. Save the original photo in the right folder, e.g. `public/images/water-hotspots/hostel-a-tap.jpg` (JPG/PNG/WebP, ~1600 px wide, ideally under 500 KB, lower-case name with dashes).
2. Add its entry (Admin → Media Management → Add image entry). The admin shows whether the file is found.
3. Export `media-gallery.json`, replace the file, commit and push.

For before-and-after comparisons, give both photos the same **pair ID** and set one to *before* and one to *after*; they appear as a slider on the Implementation page.

Page photo slots (hero images etc.) and their exact paths are listed in [`public/images/README.md`](public/images/README.md). Add `?media=1` to any page address to see slot paths on the page. Decorative campus slots show a free Unsplash stand-in until your photo exists; **evidence slots (research, interviews, hotspots, prototype, pilot) never show stock photos**, only a labelled placeholder.

**Videos**: do not commit video files (they are git-ignored). Upload to YouTube (unlisted is fine) or Google Drive (share as "Anyone with the link") and paste the link in Admin → Media Management, or directly into `video-gallery.json`.

* Video 1, Problem documentary, 3–5 min → slot `documentary`
* Video 2, Solution demonstration, 2–3 min → slot `solution-demo`
* Optional interview videos → slot `interviews`

## Backup and restore

Admin → **Data Management**:

* **Export all data (JSON)**: every record, site content saved on the device, export timestamp, schema version and a unique export ID. The last backup date is shown in the admin header.
* **Import a backup**: the file is validated first (app, schema version, required fields, allowed values, relationships, duplicate IDs). Nothing changes until you choose:
  * **Merge**: adds only records that are not already present (re-importing the same file adds nothing; you are warned if that exact backup was imported before).
  * **Replace all data**: downloads a safety backup of the current data first, then swaps everything.
* **CSV** per collection, with readable labels.
* **Load / Restore / Clear demonstration data**: clear asks for confirmation; real records are never touched.

Do a backup before every presentation and after every data-entry session.

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
│       ├── config.js         Site settings (map centre, demo data switches)
│       ├── admin-config.js   ADMIN PASSWORD and session timeouts
│       ├── layout.js         Header, navigation, reveals
│       ├── data/             idb.js (IndexedDB), store.js (service layer), schema.js (validation), demo-seed.js
│       ├── pages/            One script per public page
│       ├── components/       Charts, map, gallery, video, report form, stats
│       ├── admin/            auth.js, app.js, ui.js, views/
│       └── lib/              Calculations, content loading, backups, validation, helpers
├── public/                   images/, videos/, data/ (see above)
├── docs/                     DEPLOYMENT.md, partials/ (shared header and footer)
├── scripts/                  build-site, generate-sample-data, build-partials
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
| `npm run sample-data` | Regenerates `public/data/sample-data.json` |
| `npm run partials` | Copies `docs/partials/header.html` and `footer.html` into every page |

## Content rules

This is an academic project. Never publish invented measurements, tariffs, interviews, survey results, locations, coordinates, pilot outcomes or savings. Demonstration records are flagged `is_demo` and labelled everywhere; clear them before presenting real research, and set `SEED_DEMO_DATA` and `SHOW_DEMO_DATA` to `false` in `assets/js/config.js` once real data is in use. The map centre in `config.js` is a placeholder until replaced with verified campus coordinates. The official VVU logo and crest are not used.

## Moving to production later

To collect submissions from many people in one place, add a backend and keep the same method names as `store.js` (`list`, `insert`, `update`, `remove`, `submitReport`, …). The pages and admin views then work unchanged. Add real authentication (server-verified) at the same time.

## Licence

MIT (see [LICENSE](LICENSE)). Third-party libraries in `vendor/` keep their own licences (Chart.js: MIT; Leaflet: BSD-2-Clause). Stand-in photos load from Unsplash under the Unsplash License and are not part of this repository.
