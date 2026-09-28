import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const techniques = JSON.parse(fs.readFileSync(path.join(root, 'data/techniques.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8'));
const localeIds = ['ru', 'en'];
const locales = Object.fromEntries(localeIds.map((id) => [
  id,
  JSON.parse(fs.readFileSync(path.join(root, `data/locales/${id}.json`), 'utf8')),
]));

const categoryIds = new Set(categories.map((item) => item.id));
const ids = new Set();
let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

for (const category of categories) {
  if (!category.id || !Number.isFinite(category.order)) fail(`[category] invalid entry: ${JSON.stringify(category)}`);
  for (const localeId of localeIds) {
    if (!locales[localeId].categories?.[category.id]) fail(`[${localeId}] missing category translation: ${category.id}`);
  }
}

for (const item of techniques) {
  const required = ['id', 'slug', 'category', 'image', 'pressure', 'tempo', 'duration', 'repetitions', 'status', 'version'];
  for (const key of required) {
    if (item[key] === undefined || item[key] === '') fail(`[${item.id || 'unknown'}] missing field ${key}`);
  }

  if (ids.has(item.id)) fail(`Duplicate id: ${item.id}`);
  ids.add(item.id);

  if (!categoryIds.has(item.category)) fail(`[${item.id}] unknown category: ${item.category}`);
  if (!Number.isInteger(item.pressure) || item.pressure < 1 || item.pressure > 5) {
    fail(`[${item.id}] pressure must be an integer from 1 to 5`);
  }

  const imagePath = path.resolve(root, item.image.replace(/^\.\//, ''));
  if (!fs.existsSync(imagePath)) fail(`[${item.id}] image not found: ${item.image}`);

  for (const localeId of localeIds) {
    const locale = locales[localeId];
    const text = locale.techniques?.[item.id];
    if (!text) {
      fail(`[${localeId}] missing technique translation: ${item.id}`);
      continue;
    }
    for (const key of ['title', 'summary', 'imageAlt', 'instructions', 'warning']) {
      if (text[key] === undefined || text[key] === '') fail(`[${localeId}:${item.id}] missing ${key}`);
    }
    if (!Array.isArray(text.instructions) || text.instructions.length === 0) {
      fail(`[${localeId}:${item.id}] instructions must be a non-empty array`);
    }
    if (!locale.tempo?.[item.tempo]) fail(`[${localeId}:${item.id}] missing tempo translation: ${item.tempo}`);
    if (item.duration?.key && !locale.duration?.[item.duration.key]) {
      fail(`[${localeId}:${item.id}] missing duration translation: ${item.duration.key}`);
    }
    if (item.repetitions?.key && !locale.repetitions?.[item.repetitions.key]) {
      fail(`[${localeId}:${item.id}] missing repetitions translation: ${item.repetitions.key}`);
    }
    for (const area of item.areas || []) {
      if (!locale.areas?.[area]) fail(`[${localeId}:${item.id}] missing area translation: ${area}`);
    }
  }
}

if (failed) process.exit(1);
console.log(`OK: ${techniques.length} techniques, ${categories.length} categories, locales: ${localeIds.join(', ')}.`);
