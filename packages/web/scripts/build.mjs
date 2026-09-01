import { build } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(packageRoot, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await Promise.all([
  build({
    entryPoints: [path.join(packageRoot, 'src/index.js')],
    outfile: path.join(dist, 'index.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    sourcemap: true,
    legalComments: 'eof'
  }),
  build({
    entryPoints: [path.join(packageRoot, 'src/iife.js')],
    outfile: path.join(dist, 'openconsent.min.js'),
    bundle: true,
    format: 'iife',
    globalName: '__OpenConsentBundle',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    sourcemap: true,
    legalComments: 'eof'
  }),
  copyFile(path.join(packageRoot, 'src/index.d.ts'), path.join(dist, 'index.d.ts'))
]);
