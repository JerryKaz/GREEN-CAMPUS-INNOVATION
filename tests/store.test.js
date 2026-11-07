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
const cfg = { SEED_DEMO_DATA: true };
const db = await createStore(cfg);

test('seeds at least 50 labelled demo records exactly once', async () => {
  const c = await db.counts();
  const total = Object.values(c).reduce((s, x) => s + x.total, 0);
  const demo = Object.values(c).reduce((s, x) => s + x.demo, 0);
  assert.ok(total >= 50, `expected ≥50, got ${total}`);
  assert.equal(total, demo);
  const again = await createStore(cfg); // simulates a second visit
  const c2 = await again.counts();
  assert.deepEqual(c2, c);
});

test('clearing demo data does not re-seed on the next visit', async () => {
  await db.deleteDemoData();
  assert.equal(await db.demoCount(), 0);
  const next = await createStore(cfg);
  assert.equal(await next.demoCount(), 0);
  const added = await db.loadDemoData();
  assert.ok(added >= 50);
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
  const backup = await db.exportAll();
  assert.equal(backup.schema_version, 1);
  assert.ok(backup.exported_at && backup.export_id);
  const check = await db.inspectBackup(backup);
  assert.ok(check.ok, check.errors.join('; '));
  const merged = await db.importBackup(backup, { mode: 'merge' });
  assert.equal(merged.added, 0); // every id already present
  const again = await db.inspectBackup(backup);
  assert.equal(again.alreadyImported, true);

  const bad = structuredClone(backup);
  bad.collections.water_reports[0].severity = 'apocalyptic';
  assert.equal((await db.inspectBackup(bad)).ok, false);

  await db.deleteDemoData();
  const before = (await db.counts()).water_reports.total;
  await db.importBackup(backup, { mode: 'replace' });
  assert.ok((await db.counts()).water_reports.total > before);
});

test('location delete is blocked while readings reference it', async () => {
  const [w] = await db.list('water_readings');
  await assert.rejects(db.remove('campus_locations', w.location_id), /linked/);
});
