#!/usr/bin/env node
// Assembles the deployable site into _site/ (used by the GitHub Pages workflow).
// Copies only public files, so docs, tests, scripts and any leftover files never
// get published, then stamps the service worker with a version and precache list.
//   npm run build
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
const INCLUDE = ['index.html', 'research.html', 'solution.html', 'implementation.html', 'feedback.html', 'dashboard.html',
  '404.html', 'robots.txt', 'sw.js', 'CNAME', 'admin', 'assets', 'public', 'vendor'];
const SKIP = [/sample-data\.json$/, /demo-seed\.js$/, /\.md$/i, /\.mp4$/i, /\.mov$/i, /(^|\/)\.gitkeep$/, /(^|\/)\.DS_Store$/];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const item of INCLUDE) {
  const src = join(root, item);
  if (!existsSync(src)) continue;
  cpSync(src, join(out, item), { recursive: true, filter: (p) => !SKIP.some((re) => re.test(p.split(sep).join('/'))) });
}
writeFileSync(join(out, '.nojekyll'), ''); // serve files as-is (no Jekyll processing)

// The placeholder CNAME must not be published: GitHub ignores it with Actions
// deployments anyway, but a wrong value would confuse anyone reading the site.
const cname = join(out, 'CNAME');
if (existsSync(cname) && /example|your-domain/i.test(readFileSync(cname, 'utf8'))) rmSync(cname);

const files = [];
const walk = (dir) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) walk(p); else files.push(relative(out, p).split(sep).join('/'));
});
walk(out);

const hash = createHash('sha256');
files.sort().forEach((f) => { if (f !== 'sw.js') hash.update(f).update(readFileSync(join(out, f))); });
const version = hash.digest('hex').slice(0, 12);
const precache = ['./', ...files.filter((f) => !/^(sw\.js|CNAME|\.nojekyll|robots\.txt)$/.test(f) && !/\.(png|jpe?g|webp)$/i.test(f) || f.startsWith('vendor/leaflet/images/'))];
precache.push(...files.filter((f) => /\/index\.html$/.test(f)).map((f) => f.replace(/index\.html$/, '')));
const sw = join(out, 'sw.js');
writeFileSync(sw, readFileSync(sw, 'utf8')
  .replace("const VERSION = 'dev';", `const VERSION = '${version}';`)
  .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(precache)};`));

console.log(`_site built: ${files.length} files, version ${version}, ${precache.length} precached`);
