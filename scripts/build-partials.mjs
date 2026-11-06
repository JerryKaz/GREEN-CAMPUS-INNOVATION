#!/usr/bin/env node
// Copies partials/header.html and partials/footer.html into every public page
// between the <!-- @header --> / <!-- @footer --> markers. Idempotent.
//   npm run partials
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const parts = {
  header: readFileSync(join(root, 'partials/header.html'), 'utf8').trim(),
  footer: readFileSync(join(root, 'partials/footer.html'), 'utf8').trim(),
};
for (const file of readdirSync(root).filter((f) => f.endsWith('.html'))) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  for (const [name, content] of Object.entries(parts)) {
    const re = new RegExp(`(<!-- @${name}:start -->)[\\s\\S]*?(<!-- @${name}:end -->)`);
    html = html.replace(re, `$1\n${content}\n$2`);
  }
  writeFileSync(path, html);
  console.log(`updated ${file}`);
}
