import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/social-cards.json', 'utf8'));
let failed = false;
const fail = (m) => { console.error(`ERROR: ${m}`); failed = true; };

if (config.schemaVersion !== 1) fail('schemaVersion must be 1');
if (config.formats?.feed?.width !== 1080 || config.formats?.feed?.height !== 1350) {
  fail('feed must be 1080x1350');
}
if (config.formats?.story?.width !== 1080 || config.formats?.story?.height !== 1920) {
  fail('story must be 1080x1920');
}
for (const key of ['name', 'shortName', 'footer']) {
  if (!String(config.brand?.[key] || '').trim()) fail(`brand.${key} is required`);
}
for (const lang of ['ru', 'en']) {
  if (!String(config.brand?.badge?.[lang] || '').trim()) fail(`brand.badge.${lang} is required`);
}

console.log('Social card configuration');
console.log('=========================');
console.log('Feed:  1080x1350');
console.log('Story: 1080x1920');
console.log(`Brand: ${config.brand.name}`);

if (failed) process.exit(1);
console.log('');
console.log('RESULT: OK');
