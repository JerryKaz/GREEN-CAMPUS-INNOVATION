# Green Campus Innovation: VVU WaterWatch

**Every Drop Counts. Every Action Matters.**

A water conservation platform for Valley View University, Ghana. WaterWatch lets students and staff report water wastage (leaking taps, broken pipes, overflowing tanks), maps campus hotspots, records water readings, tracks repairs, and compares baseline and pilot consumption to measure real improvement.

WaterWatch is a proposed campus prototype, not an official university system.

## Features

**Public website**

| Page | What it does |
|---|---|
| Home (`index.html`) | Photo hero, conservation focus areas, live impact figures, how WaterWatch works, documentary video, pledge call to action |
| Research (`research.html`) | Methodology, findings A to E, consumption charts (litres or m³), measurement log, Leaflet hotspot map, photo gallery, problem documentary |
| Our Solution (`solution.html`) | Water wastage report form (anonymous by default, optional photo, reference number), TRIZ and SCAMPER analysis, demo video, pilot results, tips |
| Implementation (`implementation.html`) | Six phase roadmap, budget calculator (GHS), water savings calculator, stakeholder roles, change management |
| Feedback (`feedback.html`) | Water conservation pledge form and general feedback form |
| Dashboard (`dashboard.html`) | Aggregated figures, charts, hotspot map, baseline versus pilot table |

**Admin area (`/admin`)**

Sign in, then manage: water reports (filter, search, status workflow, assignment, CSV export), campus locations (click the map to set coordinates), water readings, conservation actions, pledges, feedback, reports and analytics (four saved reports with charts, CSV and print), the research photo gallery, the budget, and site settings (videos, research findings, pilot results, water tariff, roadmap phase, user roles, demo data).

Roles: **Admin** (everything), **Staff** (manage reports, locations, readings, actions, gallery), **Viewer** (read only).

## Tech stack

* HTML, CSS and vanilla JavaScript (ES modules). No build step and no framework.
* Supabase: PostgreSQL, Auth, Storage, Row Level Security.
* Chart.js, Leaflet with OpenStreetMap tiles, and the Supabase client, all self hosted in `vendor/`.

## Quick start (demo mode)

The site runs without a database. With no Supabase project configured it switches to **demo mode**: sample data and all submissions are stored in your browser only.

```bash
npx http-server . -p 5173 -c-1
```

Open http://localhost:5173. Serve the folder over HTTP; opening the files directly (`file://`) will not work because the site uses ES modules.

Demo admin sign in at http://localhost:5173/admin/:

* Email: `admin@demo.local`
* Password: `waterwatch-demo`

Reset the demo database from Admin, then Settings, then Demonstration data.

## Connecting Supabase (production)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migrations in order:
   `supabase/migrations/001_schema.sql` through `006_admin_functions.sql`.
3. Optionally run `supabase/seed.sql` to load 77 clearly labelled sample records. Remove them later with `select public.delete_demo_data();` or from Admin, then Settings.
4. Copy `.env.example` to `.env` and fill in your project URL and **anon** key (Project Settings, then API).
5. Run `npm run config` to write `assets/js/config.js` from `.env`.
6. Create your first user in Supabase (Authentication, then Users, then Invite user), then make them an admin in the SQL editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
7. Set `SHOW_DEMO_DATA=false` before going live.

### Environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Your project URL, for example `https://abcd1234.supabase.co` |
| `SUPABASE_ANON_KEY` | The public anon key. Safe in the browser because Row Level Security protects the data |
| `SHOW_DEMO_DATA` | `true` shows sample records on public pages (always labelled). Use `false` in production |
| `MAP_CENTER_LAT`, `MAP_CENTER_LNG`, `MAP_ZOOM` | Map starting position. Replace the placeholder with the verified campus centre |
| `SITE_URL` | Public address of the site |

**Never** put the `service_role` key in `.env`, in `config.js`, or anywhere in the frontend. `npm run config` refuses to run if it detects one.

## Photos and videos

Every photo and video spot on the site is a named slot. Save a file in `assets/media/` with the slot's file name (for example `hero.jpg`) and it appears automatically.

* Until a real file exists, each slot shows a free placeholder photo from Unsplash. These are illustrative only and are **not** photos of Valley View University. Turn them off with `USE_STOCK = false` in `assets/js/lib/media.js`.
* Add `?media=1` to any page address to label every slot with its file name and recommended size. `?media=0` hides the labels.
* Videos can be MP4 files in `assets/media/`, or YouTube or Google Drive links saved in Admin, then Settings.

The full list of file names, sizes and photo credits is in [`assets/media/README.md`](assets/media/README.md).

## Project structure

```
├── index.html, research.html, solution.html,
│   implementation.html, feedback.html, dashboard.html
├── admin/index.html          Admin app shell
├── partials/                 Shared header and footer (copied into pages)
├── assets/
│   ├── css/                  main.css (site), admin.css
│   ├── img/                  Logo and favicon
│   ├── media/                Your photos and videos (see its README)
│   └── js/
│       ├── config.js         Generated by npm run config
│       ├── layout.js         Header, waterline, reveals, count ups
│       ├── pages/            One script per public page
│       ├── components/       Charts, map, stats, gallery, report form, video
│       ├── admin/            Admin app, shared UI and one view per section
│       ├── data/             Supabase adapter, demo (browser) adapter, demo seed
│       └── lib/              Validation, calculations, media slots, helpers
├── supabase/
│   ├── migrations/           Schema, security (RLS), functions, reports, storage
│   └── seed.sql              Generated demo records
├── scripts/                  Config, partials and seed generators
└── vendor/                   Chart.js, Leaflet, Supabase client
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Serves the site on port 5173 |
| `npm run config` | Writes `assets/js/config.js` from `.env` or the host's environment variables |
| `npm run partials` | Copies `partials/header.html` and `partials/footer.html` into every page. Run after editing either |
| `npm run seed:sql` | Regenerates `supabase/seed.sql` from `assets/js/data/demo-seed.js` |

## Deployment

The site is static, so any static host works (Netlify, Vercel, Cloudflare Pages, GitHub Pages).

* **Build command:** `npm run config`
* **Publish directory:** the project root
* Set the environment variables above in the host's dashboard.
* In Supabase, add your live domain under Authentication, then URL Configuration, so password reset links work.

## Security and data protection

* Row Level Security on every table: the public can only submit reports, pledges and feedback, and read public research data.
* Reports are submitted through a database function that validates input and rate limits; the public cannot read reports back.
* Report photos are stored privately and shown to admins through short lived signed links. Images are resized and stripped of GPS data before upload.
* Forms use validation, a honeypot field and a minimum fill time to block bots.
* Admin sessions sign out after 30 minutes of inactivity.
* Personal details (names, emails) are always optional, in line with Ghana's Data Protection Act, 2012 (Act 843).

## Content rules

This is an academic innovation project. Never publish invented measurements, tariffs, interviews, survey results, locations, pilot outcomes or savings. Sample records are flagged and labelled "Sample" everywhere they appear; delete them before presenting real research.

## Status

* Done: public site, admin area, demo mode, database schema, security policies, saved reports, seed data.
* To do: ER diagram and data dictionary (`docs/`), automated tests (`tests/`), real photos, videos and research findings.

## Licence

Released under the [MIT License](LICENSE). Copyright (c) 2026 Green Campus Innovation.

The MIT License covers this project's code only. Third party libraries in `vendor/` keep their own licences (Chart.js: MIT; Leaflet: BSD 2 Clause; supabase-js: MIT). Placeholder photos are loaded from Unsplash under the [Unsplash License](https://unsplash.com/license) and are not part of this repository.
