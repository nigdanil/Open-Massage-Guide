import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const index = readJson(path.join(root, 'data/techniques/index.json'));

const counts = {
  total: index.length,
  withEditorial: 0,
  reviewed: 0,
  inReview: 0,
  unreviewed: 0,
  sourceCount: 0,
};

for (const entry of index) {
  const moduleDir = path.join(root, entry.path.replace(/^\.\//, ''));
  const meta = readJson(path.join(moduleDir, 'meta.json'));
  const editorial = meta.editorial;

  if (!editorial) continue;

  counts.withEditorial += 1;

  if (editorial.reviewStatus === 'reviewed') counts.reviewed += 1;
  if (editorial.reviewStatus === 'in-review') counts.inReview += 1;
  if (editorial.reviewStatus === 'unreviewed') counts.unreviewed += 1;

  if (Array.isArray(editorial.sources)) {
    counts.sourceCount += editorial.sources.length;
  }
}

console.log('Editorial coverage');
console.log('==================');
console.log(`Techniques:             ${counts.total}`);
console.log(`With editorial metadata:${String(counts.withEditorial).padStart(4)}`);
console.log(`Reviewed:               ${String(counts.reviewed).padStart(4)}`);
console.log(`In review:              ${String(counts.inReview).padStart(4)}`);
console.log(`Unreviewed:             ${String(counts.unreviewed).padStart(4)}`);
console.log(`Source references:      ${String(counts.sourceCount).padStart(4)}`);
console.log('');
console.log('RESULT: OK');
