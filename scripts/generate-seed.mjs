#!/usr/bin/env node
// Generates supabase/seed.sql from assets/js/data/demo-seed.js so the demo
// mode and the database seed can never drift apart.
//
//   node scripts/generate-seed.mjs            (uses MAP_CENTER_LAT/LNG env or defaults)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDemoData } from '../assets/js/data/demo-seed.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lat = Number(process.env.MAP_CENTER_LAT ?? 5.6037);
const lng = Number(process.env.MAP_CENTER_LNG ?? -0.187);
const data = buildDemoData([lat, lng]);

const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const ORDER = ['campus_locations', 'water_reports', 'water_readings', 'conservation_actions',
  'pledges', 'feedback', 'budget_items'];

let sql = `-- =============================================================================
-- seed.sql — DEMONSTRATION RECORDS ONLY (generated; do not edit by hand)
-- Every row has is_demo = true. Remove with:  select public.delete_demo_data();  (defined in migration 006)
-- Regenerate: node scripts/generate-seed.mjs
-- =============================================================================
begin;
`;
let total = 0;
for (const table of ORDER) {
  const rows = data[table];
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  sql += `\n-- ${table} (${rows.length})\ninsert into public.${table} (${cols.join(', ')}) values\n`;
  sql += rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(', ')})`).join(',\n');
  sql += '\non conflict (id) do nothing;\n';
  total += rows.length;
}

sql += `\n-- default settings (empty until Group 5 supplies real content)\n`;
for (const s of data.site_settings) {
  sql += `insert into public.site_settings (key, value) values (${lit(s.key)}, ${lit(s.value)}) on conflict (key) do nothing;\n`;
}

sql += `
commit;
-- ${total} demo records
`;

writeFileSync(join(root, 'supabase', 'seed.sql'), sql);
console.log(`seed.sql written: ${total} demo records`);
