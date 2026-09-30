import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeWebPath(value) {
  const normalized = String(value).replaceAll('\\', '/').replace(/^\.\//, '');
  return `./${normalized}`;
}

const coreFiles = [
  './data/categories.json',
  './data/locales/ru.json',
  './data/locales/en.json',
  './data/generated/catalog.ru.json',
  './data/generated/catalog.en.json',
];

const index = readJson(path.join(root, 'data/techniques/index.json'))
  .sort((a, b) => a.order - b.order);

const files = new Set(coreFiles);
let techniqueCount = 0;

for (const entry of index) {
  const moduleDir = path.join(root, entry.path.replace(/^\.\//, ''));
  const meta = readJson(path.join(moduleDir, 'meta.json'));

  if (meta.status !== 'published') continue;
  techniqueCount += 1;

  for (const image of [
    meta.thumbnail,
    meta.image,
    ...(Array.isArray(meta.images) ? meta.images : []),
  ]) {
    if (image) files.add(normalizeWebPath(image));
  }
}

const orderedFiles = [...files].sort();
let totalBytes = 0;

for (const webPath of orderedFiles) {
  const diskPath = path.join(root, webPath.replace(/^\.\//, ''));
  if (!fs.existsSync(diskPath)) {
    throw new Error(`Offline manifest file does not exist: ${webPath}`);
  }
  totalBytes += fs.statSync(diskPath).size;
}

const manifest = {
  techniqueCount,
  fileCount: orderedFiles.length,
  totalBytes,
  files: orderedFiles,
};

const target = path.join(root, 'data/generated/offline-manifest.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(
  `Built ${path.relative(root, target)}: `
  + `${manifest.techniqueCount} published techniques, `
  + `${manifest.fileCount} files, `
  + `${(manifest.totalBytes / 1024 / 1024).toFixed(2)} MB`,
);
