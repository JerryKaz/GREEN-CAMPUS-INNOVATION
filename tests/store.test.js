// Data layer tests: run with `npm test` (uses fake-indexeddb, a dev dependency).
import 'fake-indexeddb/auto';
delete globalThis.BroadcastChannel; // keeps Node's event loop alive in tests
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Serve the sample file to the store's fetch() call.
globalThis.fetch = async (url) => {
  const path = fileURLToPath(url);
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(path, 'utf8')) };
};

const { createStore } = await import('../assets/js/data/store.js');
const db = await createStore({});

test('starts with genuinely empty stores and never seeds records', async () => {
  const c = await db.counts();
  assert.equal(Object.values(c).reduce((s, x) => s + x.total, 0), 0);
  const again = await createStore({}); // second visit
  assert.equal(Object.values(await again.counts()).reduce((s, x) => s + x.total, 0), 0);
});

test('old demonstration records are hidden publicly and removed only on request', async () => {
  const loc = await db.insert('campus_locations', { name: 'Old demo tank', location_type: 'tank', latitude: 5.6, longitude: -0.18, is_verified: true, is_demo: true });
  const real = await db.insert('campus_locations', { name: 'Hostel A', location_type: 'hostel', latitude: 5.61, longitude: -0.19, is_verified: true });
  await db.insert('campus_locations', { name: 'Unverified spot', location_type: 'other', latitude: 5.62, longitude: -0.2 });
  await db.insert('pledges', { commitment_type: 'avoid_waste', is_demo: true });
  assert.equal(await db.demoCount(), 2);
  assert.equal((await db.publicList('pledges')).length, 0);
  const hot = await db.publicHotspots();
  assert.deepEqual(hot.map((h) => h.id), [real.id]); // verified, real only
  assert.equal((await db.publicStats()).pledges_total, 0);
  const removed = await db.deleteDemoData();
  assert.equal(removed, 2);
  assert.ok(!(await db.get('campus_locations', loc.id)));
  assert.ok(await db.get('campus_locations', real.id));
});

test('stores an uploaded photo entry and rejects non-image data', async () => {
  const ok = await db.insert('media_items', { kind: 'image', title: 'Tap', category: 'water-hotspots', path: 'public/images/water-hotspots/tap.jpg', data_url: 'data:image/jpeg;base64,AAAA' });
  assert.ok(ok.id);
  await assert.rejects(db.insert('media_items', { kind: 'image', title: 'Bad', data_url: 'data:text/html;base64,AAAA' }), /valid image/);
});

test('validates records and relationships', async () => {
  await assert.rejects(db.insert('water_readings', { location_id: 'nope', reading_date: '2026-10-01', consumption_value: 5,
    measurement_unit: 'L', measurement_method: 'Meter', phase: 'baseline' }), /does not exist/);
  await assert.rejects(db.insert('pledges', { commitment_type: 'bogus' }), /Invalid commitment_type/);
});

test('prevents duplicate submissions', async () => {
  const v = { issue_type: 'leaking_tap', location_id: '', description: 'Tap in block C drips all night', severity: 'low', is_anonymous: true };
  const { reference } = await db.submitReport(v);
  assert.match(reference, /^WW-\d{6}-[A-Z0-9]{5}$/);
  await assert.rejects(db.submitReport(v), /already submitted/);
  await db.submitFeedback({ category: 'general', message: 'Great idea for the campus' });
  await assert.rejects(db.submitFeedback({ category: 'general', message: 'great idea for the  campus' }), /already submitted/);
});

test('export / import round trip with duplicate protection', async () => {
  const [loc] = await db.list('campus_locations');
  await db.insert('water_readings', { location_id: loc.id, reading_date: '2026-10-01', consumption_value: 500, measurement_unit: 'L', measurement_method: 'Meter', phase: 'baseline' });
  const backup = await db.exportAll();
  assert.equal(backup.schema_version, 1);
  assert.ok(backup.exported_at && backup.export_id);
  const check = await db.inspectBackup(backup);
  assert.ok(check.ok, check.errors.join('; '));
  const merged = await db.importBackup(backup, { mode: 'merge' });
  assert.equal(merged.added, 0);
  assert.equal((await db.inspectBackup(backup)).alreadyImported, true);

  const bad = structuredClone(backup);
  bad.collections.water_readings[0].phase = 'someday';
  assert.equal((await db.inspectBackup(bad)).ok, false);

  await db.remove('water_readings', backup.collections.water_readings[0].id);
  await db.importBackup(backup, { mode: 'replace' });
  assert.equal((await db.counts()).water_readings.total, 1);
});

test('location delete is blocked while readings reference it', async () => {
  const [w] = await db.list('water_readings');
  await assert.rejects(db.remove('campus_locations', w.location_id), /linked/);
});
