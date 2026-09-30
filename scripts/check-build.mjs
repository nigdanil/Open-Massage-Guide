import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist', 'site');

let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

function requireFile(relativePath) {
  const filePath = path.join(output, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Missing production file: ${relativePath}`);
  }
}

function readJson(relativePath) {
  const filePath = path.join(output, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Invalid production JSON ${relativePath}: ${error.message}`);
    return null;
  }
}

for (const file of [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  '.nojekyll',
  'assets/js/app.js',
  'assets/js/analytics.js',
  'assets/css/styles.css',
  'assets/css/modular-extra.css',
  'data/categories.json',
  'data/analytics.json',
  'data/locales/ru.json',
  'data/locales/en.json',
  'data/generated/catalog.ru.json',
  'data/generated/catalog.en.json',
  'data/generated/offline-manifest.json',
  'docs/TELEGRAM.md',
]) {
  requireFile(file);
}

const sourceIndex = JSON.parse(
  fs.readFileSync(path.join(root, 'data/techniques/index.json'), 'utf8'),
);
const expectedIds = sourceIndex
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((item) => item.id);

for (const language of ['ru', 'en']) {
  const relativePath = `data/generated/catalog.${language}.json`;
  const catalog = readJson(relativePath);
  if (!catalog) continue;

  if (!Array.isArray(catalog)) {
    fail(`${relativePath} must contain an array`);
    continue;
  }

  const ids = catalog.map((item) => item.id);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
    fail(`${relativePath} does not match source index id/order`);
  }

  for (const item of catalog) {
    if (!item.text || typeof item.text !== 'object') {
      fail(`${relativePath}: missing localized text for ${item.id}`);
    }

    if (item.image) {
      const imagePath = item.image.replace(/^\.\//, '');
      if (!fs.existsSync(path.join(output, imagePath))) {
        fail(`${relativePath}: image missing from production build for ${item.id}: ${item.image}`);
      }
    }

    if (item.status === 'published' && !item.thumbnail) {
      fail(`${relativePath}: published technique missing thumbnail for ${item.id}`);
    }

    if (item.thumbnail) {
      const thumbnailPath = item.thumbnail.replace(/^\.\//, '');
      if (!fs.existsSync(path.join(output, thumbnailPath))) {
        fail(`${relativePath}: thumbnail missing from production build for ${item.id}: ${item.thumbnail}`);
      }
    }
  }

  console.log(`${relativePath}: ${catalog.length} techniques — OK`);
}


const offlineManifest = readJson('data/generated/offline-manifest.json');

if (offlineManifest) {
  if (offlineManifest.schemaVersion !== 2) {
    fail(
      'data/generated/offline-manifest.json: '
      + `expected schemaVersion=2, got ${offlineManifest.schemaVersion}`,
    );
  }

  if (
    typeof offlineManifest.version !== 'string'
    || !/^[a-f0-9]{16}$/.test(offlineManifest.version)
  ) {
    fail(
      'data/generated/offline-manifest.json: '
      + `invalid version ${offlineManifest.version}`,
    );
  }

  if (!Array.isArray(offlineManifest.files)) {
    fail('data/generated/offline-manifest.json: files must be an array');
  } else {
    if (offlineManifest.fileCount !== offlineManifest.files.length) {
      fail(
        'data/generated/offline-manifest.json: '
        + `fileCount=${offlineManifest.fileCount} but files=${offlineManifest.files.length}`,
      );
    }

    for (const webPath of offlineManifest.files) {
      const relativePath = String(webPath).replace(/^\.\//, '');
      if (!fs.existsSync(path.join(output, relativePath))) {
        fail(`offline manifest file missing from production build: ${webPath}`);
      }
    }

    console.log(
      `data/generated/offline-manifest.json: `
      + `version ${offlineManifest.version}, `
      + `${offlineManifest.techniqueCount} techniques, `
      + `${offlineManifest.fileCount} files — OK`,
    );
  }
}

if (fs.existsSync(path.join(output, 'data', 'techniques'))) {
  fail('Production build must not contain modular source directory data/techniques');
}

if (failed) process.exit(1);

console.log('Production build smoke-check: OK');
