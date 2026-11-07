# Project photos

Save the group's **original** photos here, in the folder that matches the category:

| Folder | Use for |
|---|---|
| `campus/` | General campus photos (also used by the page hero slots, see below) |
| `water-hotspots/` | Leaks, broken pipes, overflowing tanks, faulty taps and flushes |
| `research/` | Observation walk-throughs and baseline measurement |
| `interviews/` | Interviews (only with the person's consent) |
| `prototype/` | WaterWatch screens and ideation sessions |
| `pilot/` | The pilot: signage, repairs, launch |
| `before-after/` | Matching before and after photos of the same spot |

Rules: JPG, PNG or WebP, about 1600 px wide, ideally under 500 KB. Lower-case file names with dashes, no spaces (`hostel-a-tap.jpg`). Never upload stock or AI-generated images as research evidence.

A photo appears in the gallery only when it also has an entry in `public/data/media-gallery.json`. The easiest way is Admin → Media Management → Add image entry → Export media-gallery.json.

## Page photo slots

These fixed slots fill automatically when a file with exactly this path exists. Add `?media=1` to any page address to see each slot's path on the page.

| Path | Where it shows |
|---|---|
| `campus/hero.jpg` | Home hero (2400 × 1350) |
| `campus/home-intro.jpg` | Home intro (1200 × 1500) |
| `campus/focus-leak.jpg`, `focus-usage.jpg`, `focus-monitoring.jpg`, `focus-awareness.jpg` | Home focus cards (1200 × 900) |
| `research/fieldwork.jpg`, `interviews/interview.jpg`, `water-hotspots/storage-tank.jpg`, `prototype/ideation.jpg`, `pilot/pilot-launch.jpg` | Home "Moments from the field" |
| `campus/pledge-band.jpg` | Home pledge band (2400 × 1000) |
| `campus/research-hero.jpg`, `research/baseline-measurement.jpg` | Research page |
| `campus/solution-hero.jpg`, `prototype/waterwatch-mobile.jpg` | Solution page |
| `campus/implementation-hero.jpg`, `pilot/corrective-action.jpg` | Implementation page |
| `campus/feedback-hero.jpg`, `campus/feedback-community.jpg` | Feedback page |

Until a file exists, decorative `campus/` slots show a free Unsplash stand-in photo (not of VVU). Evidence slots (research, interviews, hotspots, prototype, pilot) show a labelled placeholder instead, never a stock photo.
