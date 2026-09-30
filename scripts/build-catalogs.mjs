import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const localeIds = ['ru', 'en'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const index = readJson(path.join(root, 'data/techniques/index.json'))
  .sort((a, b) => a.order - b.order);

const catalogs = Object.fromEntries(localeIds.map((localeId) => [localeId, []]));

for (const entry of index) {
  const moduleDir = path.join(root, entry.path.replace(/^\.\//, ''));
  const meta = readJson(path.join(moduleDir, 'meta.json'));

  for (const localeId of localeIds) {
    const text = readJson(path.join(moduleDir, `${localeId}.json`));
    catalogs[localeId].push({
      ...meta,
      modulePath: entry.path,
      text,
    });
  }
}

for (const localeId of localeIds) {
  const target = path.join(root, `data/generated/catalog.${localeId}.json`);
  writeJson(target, catalogs[localeId]);
  console.log(`Built ${path.relative(root, target)}: ${catalogs[localeId].length} techniques`);
}
