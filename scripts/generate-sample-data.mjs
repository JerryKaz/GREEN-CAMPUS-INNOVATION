#!/usr/bin/env node
// Writes public/data/sample-data.json from assets/js/data/demo-seed.js.
// Every record is fictional and flagged is_demo: true.
//   npm run sample-data
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoData } from '../assets/js/data/demo-seed.js';
import { CONFIG } from '../assets/js/config.js';
import { SCHEMA_VERSION, COLLECTIONS, validateRecord } from '../assets/js/data/schema.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const collections = buildDemoData(CONFIG.MAP_CENTER);

let total = 0;
const ids = {};
for (const name of COLLECTIONS) {
  const rows = collections[name] ?? [];
  ids[name] = new Set(rows.map((r) => r.id));
  total += rows.length;
}
for (const name of COLLECTIONS) {
  for (const r of collections[name] ?? []) {
    if (!r.is_demo) throw new Error(`${name}/${r.id} is not flagged is_demo`);
    const errs = validateRecord(name, r, ids);
    if (errs.length) throw new Error(`${name}/${r.id}: ${errs.join(' ')}`);
  }
}

const out = {
  notice: 'DEMONSTRATION DATA ONLY. Every record below is fictional and flagged is_demo: true. Locations are not surveyed VVU sites and coordinates are offsets around a placeholder map centre. Do not present any of it as research.',
  schema_version: SCHEMA_VERSION,
  generated_at: new Date().toISOString(),
  record_count: total,
  collections,
};
writeFileSync(join(root, 'public/data/sample-data.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`public/data/sample-data.json written: ${total} demonstration records`);
