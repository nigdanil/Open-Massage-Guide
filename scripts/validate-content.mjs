import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const localeIds = ['ru', 'en'];
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

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
    return;
  }

  if (!allowEmpty && value.length === 0) {
    fail(`${label} must be a non-empty array`);
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      fail(`${label}[${index}] must be a non-empty string`);
    }
  });
}

function validateDuration(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
    return;
  }

  if ('seconds' in value) {
    if (!isPositiveInteger(value.seconds)) {
      fail(`${label}.seconds must be a positive integer`);
    }
    return;
  }

  if ('minSeconds' in value || 'maxSeconds' in value) {
    if (!isPositiveInteger(value.minSeconds) || !isPositiveInteger(value.maxSeconds)) {
      fail(`${label}.minSeconds and ${label}.maxSeconds must be positive integers`);
      return;
    }

    if (value.minSeconds > value.maxSeconds) {
      fail(`${label}.minSeconds must not exceed ${label}.maxSeconds`);
    }
    return;
  }

  if ('key' in value) {
    if (!isNonEmptyString(value.key)) {
      fail(`${label}.key must be a non-empty string`);
    }
    return;
  }

  fail(`${label} must use one of: {seconds}, {minSeconds,maxSeconds}, or {key}`);
}

function validateRepetitions(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
    return;
  }

  if ('count' in value) {
    if (!isPositiveInteger(value.count)) {
      fail(`${label}.count must be a positive integer`);
    }
    return;
  }

  if ('min' in value || 'max' in value) {
    if (!isPositiveInteger(value.min) || !isPositiveInteger(value.max)) {
      fail(`${label}.min and ${label}.max must be positive integers`);
      return;
    }

    if (value.min > value.max) {
      fail(`${label}.min must not exceed ${label}.max`);
    }
    return;
  }

  if ('key' in value) {
    if (!isNonEmptyString(value.key)) {
      fail(`${label}.key must be a non-empty string`);
    }
    return;
  }

  fail(`${label} must use one of: {count}, {min,max}, or {key}`);
}

function registerUnique(map, value, label, owner) {
  if (map.has(value)) {
    fail(`Duplicate ${label}: ${value} (${map.get(value)} and ${owner})`);
    return;
  }
  map.set(value, owner);
}

const categories = readJson(path.join(root, 'data/categories.json'), '[categories]');
const categoryIds = new Set();

if (categories && !Array.isArray(categories)) {
  fail('[categories] root must be an array');
}

if (Array.isArray(categories)) {
  const categoryOrders = new Map();

  for (const category of categories) {
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      fail(`[categories] invalid entry: ${JSON.stringify(category)}`);
      continue;
    }

    if (!isNonEmptyString(category.id)) {
      fail(`[categories] invalid id: ${JSON.stringify(category)}`);
      continue;
    }

    if (categoryIds.has(category.id)) {
      fail(`Duplicate category id: ${category.id}`);
    }
    categoryIds.add(category.id);

    if (!Number.isInteger(category.order)) {
      fail(`[category:${category.id}] order must be an integer`);
    } else {
      registerUnique(categoryOrders, category.order, 'category order', category.id);
    }
  }
}

const indexPath = path.join(root, 'data/techniques/index.json');
const index = readJson(indexPath, '[index]');

if (index && !Array.isArray(index)) {
  fail('[index] root must be an array');
}

const entries = Array.isArray(index) ? index : [];
const ids = new Set();
const paths = new Map();
const orders = new Map();
const slugs = new Map();

for (const entry of entries) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    fail(`[index] invalid entry: ${JSON.stringify(entry)}`);
    continue;
  }

  if (
    !isNonEmptyString(entry.id)
    || !isNonEmptyString(entry.path)
    || !isNonEmptyString(entry.category)
    || !Number.isInteger(entry.order)
  ) {
    fail(`[index] invalid entry: ${JSON.stringify(entry)}`);
    continue;
  }

  if (ids.has(entry.id)) {
    fail(`Duplicate id: ${entry.id}`);
  }
  ids.add(entry.id);

  registerUnique(paths, entry.path, 'index path', entry.id);
  registerUnique(orders, entry.order, 'order', entry.id);

  if (!categoryIds.has(entry.category)) {
    fail(`[${entry.id}] unknown index category: ${entry.category}`);
  }

  const relativeModulePath = entry.path.replace(/^\.\//, '');
  const normalizedModulePath = relativeModulePath.replaceAll('\\', '/');

  if (!normalizedModulePath.startsWith('data/techniques/')) {
    fail(`[${entry.id}] path must be inside data/techniques/: ${entry.path}`);
  }

  if (path.posix.basename(normalizedModulePath) !== entry.id) {
    fail(`[${entry.id}] module directory must match id: ${entry.path}`);
  }

  const moduleDir = path.join(root, relativeModulePath);
  const meta = readJson(path.join(moduleDir, 'meta.json'), `[${entry.id}] meta`);
  if (!meta) continue;

  const requiredMeta = [
    'id', 'slug', 'category', 'order', 'pressure', 'tempo', 'difficulty',
    'duration', 'repetitions', 'areas', 'tags', 'status', 'version',
  ];

  for (const key of requiredMeta) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === '') {
      fail(`[${entry.id}] missing meta field ${key}`);
    }
  }

  if (meta.id !== entry.id) {
    fail(`[${entry.id}] meta.id mismatch: ${meta.id}`);
  }

  if (!isNonEmptyString(meta.slug)) {
    fail(`[${entry.id}] slug must be a non-empty string`);
  } else {
    registerUnique(slugs, meta.slug, 'slug', entry.id);
  }

  if (meta.category !== entry.category) {
    fail(`[${entry.id}] category mismatch: index=${entry.category}, meta=${meta.category}`);
  }

  if (meta.order !== entry.order) {
    fail(`[${entry.id}] order mismatch: index=${entry.order}, meta=${meta.order}`);
  }

  if (!categoryIds.has(meta.category)) {
    fail(`[${entry.id}] unknown category: ${meta.category}`);
  }

  if (!Number.isInteger(meta.pressure) || meta.pressure < 1 || meta.pressure > 5) {
    fail(`[${entry.id}] pressure must be an integer from 1 to 5`);
  }

  if (!isNonEmptyString(meta.tempo)) {
    fail(`[${entry.id}] tempo must be a non-empty string`);
  }

  if (!isNonEmptyString(meta.difficulty)) {
    fail(`[${entry.id}] difficulty must be a non-empty string`);
  }

  if (!['draft', 'published'].includes(meta.status)) {
    fail(`[${entry.id}] invalid status: ${meta.status}`);
  }

  if (!isPositiveInteger(meta.version)) {
    fail(`[${entry.id}] version must be a positive integer`);
  }

  validateDuration(meta.duration, `[${entry.id}] duration`);
  validateRepetitions(meta.repetitions, `[${entry.id}] repetitions`);
  validateStringArray(meta.areas, `[${entry.id}] areas`);
  validateStringArray(meta.tags, `[${entry.id}] tags`);

  if (meta.image !== undefined && meta.image !== null && meta.image !== '') {
    if (!isNonEmptyString(meta.image)) {
      fail(`[${entry.id}] image must be a non-empty string`);
    } else {
      const imagePath = path.resolve(root, meta.image.replace(/^\.\//, ''));
      if (!fs.existsSync(imagePath)) {
        fail(`[${entry.id}] image not found: ${meta.image}`);
      }
    }
  } else if (meta.status === 'published') {
    fail(`[${entry.id}] published technique must have an image`);
  }

  if (meta.thumbnail !== undefined && meta.thumbnail !== null && meta.thumbnail !== '') {
    if (!isNonEmptyString(meta.thumbnail)) {
      fail(`[${entry.id}] thumbnail must be a non-empty string`);
    } else {
      if (meta.thumbnail === meta.image) {
        fail(`[${entry.id}] thumbnail must be different from the full image`);
      }

      const thumbnailPath = path.resolve(root, meta.thumbnail.replace(/^\.\//, ''));
      if (!fs.existsSync(thumbnailPath)) {
        fail(`[${entry.id}] thumbnail not found: ${meta.thumbnail}`);
      }
    }
  } else if (meta.status === 'published') {
    fail(`[${entry.id}] published technique must have a thumbnail`);
  }

  if (meta.images !== undefined) {
    validateStringArray(meta.images, `[${entry.id}] images`);

    if (Array.isArray(meta.images)) {
      for (const image of meta.images) {
        if (!isNonEmptyString(image)) continue;

        const imagePath = path.resolve(root, image.replace(/^\.?\//, ''));
        if (!fs.existsSync(imagePath)) {
          fail(`[${entry.id}] gallery image not found: ${image}`);
        }
      }
    }
  }

  for (const localeId of localeIds) {
    const text = readJson(
      path.join(moduleDir, `${localeId}.json`),
      `[${localeId}:${entry.id}] text`,
    );
    if (!text) continue;

    const scalarTextFields = [
      'title', 'shortTitle', 'summary', 'goal', 'imageAlt', 'startingPosition',
      'direction', 'pressureText', 'tempoText', 'durationText',
      'repetitionsText', 'warning',
    ];

    for (const key of scalarTextFields) {
      if (!isNonEmptyString(text[key])) {
        fail(`[${localeId}:${entry.id}] ${key} must be a non-empty string`);
      }
    }

    for (const key of ['instructions', 'areasText', 'tips', 'mistakes']) {
      validateStringArray(text[key], `[${localeId}:${entry.id}] ${key}`);
    }
  }
}

for (const localeId of localeIds) {
  const locale = readJson(
    path.join(root, `data/locales/${localeId}.json`),
    `[${localeId}] UI locale`,
  );
  if (!locale) continue;

  for (const categoryId of categoryIds) {
    if (!isNonEmptyString(locale.categories?.[categoryId])) {
      fail(`[${localeId}] missing category translation: ${categoryId}`);
    }
  }
}

if (failed) process.exit(1);

console.log(
  `OK: ${entries.length} modular techniques, `
  + `${slugs.size} unique slugs, ${orders.size} unique orders, `
  + `locales: ${localeIds.join(', ')}.`,
);
