import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const configPath = path.join(root, 'data', 'analytics.json');
const indexPath = path.join(root, 'index.html');
const analyticsPath = path.join(root, 'assets', 'js', 'analytics.js');

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

if (!fs.existsSync(configPath)) {
  fail('data/analytics.json is missing');
}

if (!fs.existsSync(analyticsPath)) {
  fail('assets/js/analytics.js is missing');
}

let config = null;

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    fail(`data/analytics.json is invalid JSON: ${error.message}`);
  }
}

if (config) {
  if (config.provider !== 'umami') {
    fail(`provider must be "umami", got ${JSON.stringify(config.provider)}`);
  }

  for (const key of ['enabled', 'trackLocalhost', 'debug']) {
    if (!isBoolean(config[key])) {
      fail(`${key} must be boolean`);
    }
  }

  if (typeof config.scriptUrl !== 'string' || !config.scriptUrl.startsWith('https://')) {
    fail('scriptUrl must be an HTTPS URL');
  }

  if (config.enabled && !isUuid(config.websiteId)) {
    fail('enabled analytics requires a valid Umami websiteId UUID');
  }

  if (!config.enabled && config.websiteId && !isUuid(config.websiteId)) {
    fail('websiteId must be empty or a valid UUID');
  }
}

if (fs.existsSync(indexPath)) {
  const index = fs.readFileSync(indexPath, 'utf8');

  if (!index.includes('./assets/js/analytics.js')) {
    fail('index.html must load ./assets/js/analytics.js');
  }
}

if (fs.existsSync(analyticsPath)) {
  const analytics = fs.readFileSync(analyticsPath, 'utf8');

  for (const eventName of [
    'technique_open',
    'search',
    'category_filter',
    'favorite_add',
    'favorite_remove',
    'language_change',
    'offline_download_complete',
    'pwa_install_complete',
  ]) {
    if (!analytics.includes(`'${eventName}'`)) {
      fail(`analytics event contract missing: ${eventName}`);
    }
  }

  if (analytics.includes('query: query') || analytics.includes('search_query')) {
    fail('raw search text must not be sent to analytics');
  }
}

if (failed) process.exit(1);

console.log(
  `Analytics config: ${config?.enabled ? 'enabled' : 'disabled'}`
  + `, provider=${config?.provider || 'unknown'}`
  + `, localhost=${config?.trackLocalhost ? 'on' : 'off'} — OK`,
);
