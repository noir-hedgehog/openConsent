import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'apps/demo/dist');
const base = (process.argv[3] || '/').replace(/\/$/, '');
const htmlFiles = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(target);
    else if (entry.name.endsWith('.html')) htmlFiles.push(target);
  }
}

await collect(root);
const missing = [];
for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  for (const reference of references) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
    const cleanReference = reference.split(/[?#]/)[0];
    const target = cleanReference.startsWith(`${base}/`)
      ? path.join(root, cleanReference.slice(base.length + 1))
      : cleanReference.startsWith('/')
        ? null
        : path.resolve(path.dirname(htmlFile), cleanReference);
    if (!target || !target.startsWith(root)) {
      missing.push(`${path.relative(root, htmlFile)} -> ${reference}`);
      continue;
    }
    try { await access(target); }
    catch { missing.push(`${path.relative(root, htmlFile)} -> ${reference}`); }
  }
}

if (missing.length) {
  console.error(`Built site contains ${missing.length} missing local resource(s):\n${missing.join('\n')}`);
  process.exit(1);
}
console.log(`Checked ${htmlFiles.length} HTML file(s); every ${base || '/'} resource exists.`);
