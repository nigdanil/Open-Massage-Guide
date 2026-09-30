import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist', 'site');

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDir(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(output, relativePath);
  fs.cpSync(source, target, { recursive: true });
}

console.log('Building browser catalogs...');
await import('./build-catalogs.mjs');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  '.nojekyll',
]) {
  copyFile(file);
}

for (const directory of [
  'assets',
  'data/generated',
  'data/locales',
]) {
  copyDir(directory);
}

copyFile('data/categories.json');
copyFile('data/analytics.json');

// index.html currently links to this file.
if (fs.existsSync(path.join(root, 'docs', 'TELEGRAM.md'))) {
  copyFile('docs/TELEGRAM.md');
}

console.log(`Production site built: ${path.relative(root, output)}`);
