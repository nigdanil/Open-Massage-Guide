import fs from 'node:fs';

const config = JSON.parse(
  fs.readFileSync('data/launch-kit.json', 'utf8'),
);

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

if (config.schemaVersion !== 1) {
  fail('schemaVersion must be 1');
}

if (
  config.avatar?.width !== 1024
  || config.avatar?.height !== 1024
) {
  fail('avatar must be 1024x1024');
}

if (
  !Array.isArray(config.defaultFormats)
  || config.defaultFormats.length === 0
) {
  fail('defaultFormats must be non-empty');
}

for (const format of config.defaultFormats || []) {
  if (!['feed', 'story'].includes(format)) {
    fail(`unsupported default format: ${format}`);
  }
}

for (const lang of ['ru', 'en']) {
  const copy = config.copy?.[lang];

  if (!copy) {
    fail(`copy.${lang} is required`);
    continue;
  }

  for (const key of ['telegramCta', 'instagramCta']) {
    if (!String(copy[key] || '').trim()) {
      fail(`copy.${lang}.${key} is required`);
    }
  }

  for (const type of ['technique', 'educational', 'project']) {
    const tags = copy.hashtags?.[type];

    if (!Array.isArray(tags) || tags.length === 0) {
      fail(`copy.${lang}.hashtags.${type} must be non-empty`);
      continue;
    }

    for (const tag of tags) {
      if (!/^#[^\s#]+$/u.test(tag)) {
        fail(`invalid hashtag: ${tag}`);
      }
    }
  }
}

console.log('Launch kit configuration');
console.log('========================');
console.log(`Avatar: ${config.avatar.width}x${config.avatar.height}`);
console.log(`Formats: ${config.defaultFormats.join(', ')}`);

if (failed) process.exit(1);

console.log('');
console.log('RESULT: OK');
