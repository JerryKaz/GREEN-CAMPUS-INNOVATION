import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcSavings, toEmbedUrl, reportBaselineVsPilot } from '../assets/js/lib/calc.js';

test('water saved and percentage reduction', () => {
  const r = calcSavings({ baseline: 1000, pilot: 800, periodDays: 3, unit: 'L' });
  assert.equal(r.saved, 200);
  assert.equal(r.pct, 20);
  assert.equal(r.financial, null); // no tariff entered
  assert.equal(r.annualLitres, null); // 3 days is too short to annualise
});

test('financial saving needs a verified tariff', () => {
  const unverified = calcSavings({ baseline: 5000, pilot: 3000, periodDays: 7, unit: 'L', tariff: 10, tariffUnit: 'm3', tariffVerified: false });
  assert.equal(unverified.financial, null);
  const verified = calcSavings({ baseline: 5000, pilot: 3000, periodDays: 7, unit: 'L', tariff: 10, tariffUnit: 'm3', tariffVerified: true });
  assert.equal(verified.financial, 20); // 2 m³ × 10
  assert.equal(verified.annualLitres, Math.round(2000 * 365 / 7));
});

test('zero baseline gives no percentage', () => {
  assert.equal(calcSavings({ baseline: 0, pilot: 0, periodDays: 1 }).pct, null);
});

test('embed URLs only for YouTube and Google Drive over https', () => {
  assert.match(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ'), /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.match(toEmbedUrl('https://drive.google.com/file/d/1AbCdEfGhIjK/view'), /\/preview$/);
  assert.equal(toEmbedUrl('http://youtu.be/dQw4w9WgXcQ'), null);
  assert.equal(toEmbedUrl('https://evil.example/video'), null);
});

test('baseline vs pilot compares like for like and flags the 3-day minimum', () => {
  const locs = [{ id: 'a', name: 'A' }];
  const mk = (d, phase, v) => ({ location_id: 'a', reading_date: d, phase, consumption_value: v, measurement_unit: 'L', measurement_method: 'Meter' });
  const rows = reportBaselineVsPilot([mk('2026-01-01', 'baseline', 100), mk('2026-01-02', 'baseline', 100), mk('2026-01-03', 'baseline', 100),
    mk('2026-02-01', 'pilot', 80), mk('2026-02-02', 'pilot', 80)], locs);
  assert.equal(rows[0].saved_per_day_l, 20);
  assert.equal(rows[0].reduction_pct, 20);
  assert.equal(rows[0].meets_minimum_days, false);
});
