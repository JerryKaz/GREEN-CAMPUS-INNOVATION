// File helpers for backups and published JSON files.

export function downloadJSON(filename, data) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MAX_BYTES = 25 * 1024 * 1024;

/** Read a user-chosen .json file. Rejects non-JSON, oversized or unparsable files. */
export async function readJSONFile(file) {
  if (!file) throw new Error('Choose a backup file first.');
  if (!/\.json$/i.test(file.name) && file.type !== 'application/json') throw new Error('Choose a .json backup file.');
  if (file.size > MAX_BYTES) throw new Error('This file is too large to be a WaterWatch backup.');
  const text = await file.text();
  try { return JSON.parse(text); } catch { throw new Error('The file is not valid JSON. It may be damaged or not a backup.'); }
}

export const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
