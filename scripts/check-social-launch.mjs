import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const configPath = path.join(root, 'data', 'social-launch.json');

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function httpUrlOrEmpty(value) {
  if (value === '') return true;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (config.schemaVersion !== 1) {
  fail('schemaVersion must be 1');
}

for (const key of ['name', 'shortName']) {
  if (!nonEmpty(config.brand?.[key])) {
    fail(`brand.${key} must be non-empty`);
  }
}

for (const language of ['ru', 'en']) {
  if (!nonEmpty(config.brand?.positioning?.[language])) {
    fail(`brand.positioning.${language} is required`);
  }

  if (!nonEmpty(config.brand?.tagline?.[language])) {
    fail(`brand.tagline.${language} is required`);
  }
}

for (const channel of ['telegram', 'instagram']) {
  const profile = config.profiles?.[channel];

  if (!profile) {
    fail(`profile missing: ${channel}`);
    continue;
  }

  if (!['planned', 'active', 'paused'].includes(profile.status)) {
    fail(`${channel}.status must be planned, active or paused`);
  }

  if (!nonEmpty(profile.name)) {
    fail(`${channel}.name is required`);
  }

  if (!httpUrlOrEmpty(profile.profileUrl)) {
    fail(`${channel}.profileUrl must be empty or HTTP/HTTPS URL`);
  }

  if (profile.status === 'active') {
    if (!nonEmpty(profile.handle)) {
      fail(`${channel}.handle is required when profile is active`);
    }

    if (!nonEmpty(profile.profileUrl)) {
      fail(`${channel}.profileUrl is required when profile is active`);
    }
  }

  for (const language of ['ru', 'en']) {
    if (!nonEmpty(profile.description?.[language])) {
      fail(`${channel}.description.${language} is required`);
    }
  }
}

const launch = config.launch || {};

if (!/^[a-z0-9][a-z0-9_-]*$/.test(launch.campaign || '')) {
  fail('launch.campaign must be a lowercase UTM token');
}

if (!['ru', 'en'].includes(launch.language)) {
  fail('launch.language must be ru or en');
}

if (!Number.isInteger(launch.cadencePerWeek) || launch.cadencePerWeek < 1) {
  fail('launch.cadencePerWeek must be a positive integer');
}

if (!Number.isInteger(launch.targetPosts) || launch.targetPosts < 1) {
  fail('launch.targetPosts must be a positive integer');
}

if (
  !Array.isArray(launch.techniqueCategories)
  || launch.techniqueCategories.length === 0
) {
  fail('launch.techniqueCategories must be a non-empty array');
}

console.log('Social launch validation');
console.log('========================');
console.log(`Campaign:       ${launch.campaign}`);
console.log(`Language:       ${launch.language}`);
console.log(`Target posts:   ${launch.targetPosts}`);
console.log(`Cadence/week:   ${launch.cadencePerWeek}`);
console.log(`Telegram:       ${config.profiles.telegram.status}`);
console.log(`Instagram:      ${config.profiles.instagram.status}`);

if (failed) process.exit(1);

console.log('');
console.log('RESULT: OK');
