import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const categoryIds = new Set(
  JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8')).map((item) => item.id),
);
const localeIds = ['ru', 'en'];
const indexPath = path.join(root, 'data/techniques/index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const ids = new Set();
let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} missing: ${path.relative(root, filePath)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} invalid JSON: ${error.message}`);
    return null;
  }
}

for (const entry of index) {
  if (!entry.id || !entry.path || !entry.category || !Number.isFinite(entry.order)) {
    fail(`[index] invalid entry: ${JSON.stringify(entry)}`);
    continue;
  }
  if (ids.has(entry.id)) fail(`Duplicate id: ${entry.id}`);
  ids.add(entry.id);

  const relativeModulePath = entry.path.replace(/^\.\//, '');
  const moduleDir = path.join(root, relativeModulePath);
  const meta = readJson(path.join(moduleDir, 'meta.json'), `[${entry.id}] meta`);
  if (!meta) continue;

  const requiredMeta = [
    'id', 'slug', 'category', 'order', 'pressure', 'tempo', 'difficulty',
    'duration', 'repetitions', 'areas', 'tags', 'status', 'version',
  ];
  for (const key of requiredMeta) {
    if (meta[key] === undefined || meta[key] === '') fail(`[${entry.id}] missing meta field ${key}`);
  }

  if (meta.id !== entry.id) fail(`[${entry.id}] meta.id mismatch: ${meta.id}`);
  if (meta.category !== entry.category) fail(`[${entry.id}] category mismatch`);
  if (meta.order !== entry.order) fail(`[${entry.id}] order mismatch`);
  if (!categoryIds.has(meta.category)) fail(`[${entry.id}] unknown category: ${meta.category}`);
  if (!Number.isInteger(meta.pressure) || meta.pressure < 1 || meta.pressure > 5) {
    fail(`[${entry.id}] pressure must be an integer from 1 to 5`);
  }
  if (!['draft', 'published'].includes(meta.status)) fail(`[${entry.id}] invalid status: ${meta.status}`);

  if (meta.image) {
    const imagePath = path.resolve(root, meta.image.replace(/^\.\//, ''));
    if (!fs.existsSync(imagePath)) fail(`[${entry.id}] image not found: ${meta.image}`);
  } else if (meta.status === 'published') {
    fail(`[${entry.id}] published technique must have an image`);
  }

  if (meta.images !== undefined) {
    if (!Array.isArray(meta.images)) {
      fail(`[${entry.id}] images must be an array`);
    } else {
      for (const image of meta.images) {
        if (typeof image !== 'string' || !image.trim()) {
          fail(`[${entry.id}] images must contain non-empty strings`);
          continue;
        }

        const imagePath = path.resolve(root, image.replace(/^\.?\//, ''));
        if (!fs.existsSync(imagePath)) {
          fail(`[${entry.id}] gallery image not found: ${image}`);
        }
      }
    }
  }
  for (const localeId of localeIds) {
    const text = readJson(path.join(moduleDir, `${localeId}.json`), `[${localeId}:${entry.id}] text`);
    if (!text) continue;

    const requiredText = [
      'title', 'shortTitle', 'summary', 'goal', 'imageAlt', 'startingPosition',
      'instructions', 'direction', 'pressureText', 'tempoText', 'durationText',
      'repetitionsText', 'areasText', 'tips', 'mistakes', 'warning',
    ];
    for (const key of requiredText) {
      if (text[key] === undefined || text[key] === '') fail(`[${localeId}:${entry.id}] missing ${key}`);
    }

    for (const key of ['instructions', 'areasText', 'tips', 'mistakes']) {
      if (!Array.isArray(text[key]) || text[key].length === 0) {
        fail(`[${localeId}:${entry.id}] ${key} must be a non-empty array`);
      }
    }
  }
}

for (const localeId of localeIds) {
  const locale = readJson(path.join(root, `data/locales/${localeId}.json`), `[${localeId}] UI locale`);
  if (!locale) continue;
  for (const categoryId of categoryIds) {
    if (!locale.categories?.[categoryId]) fail(`[${localeId}] missing category translation: ${categoryId}`);
  }
}

if (failed) process.exit(1);
console.log(`OK: ${index.length} modular techniques, locales: ${localeIds.join(', ')}.`);
