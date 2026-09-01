import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(await readFile(path.join(root, 'packages/web/package.json'), 'utf8')).version;
const temporary = await mkdtemp(path.join(tmpdir(), 'openconsent-tarballs-'));
const archives = path.join(temporary, 'archives');
await mkdir(archives);

function run(args, cwd = root) {
  const result = spawnSync('pnpm', args, { cwd, encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`pnpm ${args.join(' ')} failed`);
  }
}

async function fixture(name, dependencies, assertion, extraFiles = {}) {
  const directory = path.join(temporary, name);
  await mkdir(directory);
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ name: `openconsent-${name}-smoke`, private: true, type: 'module', dependencies }, null, 2));
  const localOverrides = Object.entries(dependencies).filter(([name]) => name.startsWith('@openconsent/'));
  if (localOverrides.length) {
    await writeFile(path.join(directory, 'pnpm-workspace.yaml'), `packages:\n  - '.'\noverrides:\n${localOverrides.map(([name, location]) => `  '${name}': '${location}'`).join('\n')}\n`);
  }
  for (const [file, contents] of Object.entries(extraFiles)) await writeFile(path.join(directory, file), contents);
  run(['install', '--ignore-scripts', '--no-frozen-lockfile'], directory);
  run(['exec', 'node', '--input-type=module', '--eval', assertion], directory);
}

try {
  for (const packageName of ['core', 'web', 'react', 'vue', 'express']) {
    run(['--dir', `packages/${packageName}`, 'pack', '--pack-destination', archives]);
  }
  const tarball = (name) => `file:${path.join(archives, `openconsent-${name}-${version}.tgz`)}`;
  await fixture('plain-html', {
    '@openconsent/core': tarball('core'), '@openconsent/web': tarball('web')
  }, `const fs = await import('node:fs/promises'); const file = await fs.readFile('./node_modules/@openconsent/web/dist/openconsent.min.js','utf8'); if (!file.includes('OpenConsent')) process.exit(1);`, {
    'index.html': '<script src="./node_modules/@openconsent/web/dist/openconsent.min.js" data-openconsent-config="./openconsent.json"></script>\n'
  });
  await fixture('react', {
    '@openconsent/core': tarball('core'), '@openconsent/web': tarball('web'), '@openconsent/react': tarball('react'), react: '19.2.6'
  }, `const sdk = await import('@openconsent/react'); if (!sdk.OpenConsentProvider || !sdk.ConsentBanner || !sdk.ConsentGate) process.exit(1);`);
  await fixture('vue', {
    '@openconsent/core': tarball('core'), '@openconsent/web': tarball('web'), '@openconsent/vue': tarball('vue'), vue: '3.5.29'
  }, `const sdk = await import('@openconsent/vue'); if (!sdk.createOpenConsentPlugin || !sdk.ConsentBanner || !sdk.useOpenConsent) process.exit(1);`);
  await fixture('express', {
    '@openconsent/core': tarball('core'), '@openconsent/express': tarball('express'), express: '5.2.1'
  }, `const sdk = await import('@openconsent/express'); if (!sdk.openConsent || !sdk.requirePurpose || !sdk.readGpc) process.exit(1);`);
  const html = await readFile(path.join(temporary, 'plain-html', 'index.html'), 'utf8');
  if (!html.includes('openconsent.min.js')) throw new Error('Plain HTML fixture did not retain the browser entry');
  console.log('Tarball smoke tests passed: Plain HTML, React, Vue, and Express.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
