#!/usr/bin/env node
// Copies docs/partials/header.html and docs/partials/footer.html into every public page
// between the <!-- @header --> / <!-- @footer --> markers. Idempotent.
//   npm run partials
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const parts = {
  header: readFileSync(join(root, 'docs/partials/header.html'), 'utf8').trim(),
  footer: readFileSync(join(root, 'docs/partials/footer.html'), 'utf8').trim(),
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
