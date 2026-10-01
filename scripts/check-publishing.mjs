import path from 'node:path';
import {
  PUBLISHING_STATUSES,
  SUPPORTED_CHANNELS,
  SUPPORTED_LANGUAGES,
  loadPublishingConfig,
  loadPublishingState,
  loadTechniqueIndex,
  readJson,
  root,
} from './publishing-lib.mjs';

let failed = false;
function fail(message) { console.error(`ERROR: ${message}`); failed = true; }
function isNonEmptyString(value) { return typeof value === 'string' && value.trim().length > 0; }
function isHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); }
  catch (_) { return false; }
}

const config = loadPublishingConfig();
const state = loadPublishingState();
const index = loadTechniqueIndex();

if (config.schemaVersion !== 1) fail('data/publishing.json schemaVersion must be 1');
if (!isHttpUrl(config.baseUrl)) fail('data/publishing.json baseUrl must be HTTP/HTTPS URL');

for (const channel of SUPPORTED_CHANNELS) {
  const channelConfig = config.channels?.[channel];
  if (!channelConfig) { fail(`publishing config missing channel: ${channel}`); continue; }

  for (const key of ['source', 'medium']) {
    const value = channelConfig[key];
    if (!isNonEmptyString(value) || !/^[a-z0-9][a-z0-9_-]*$/.test(value)) {
      fail(`${channel}.${key} must be a lowercase UTM token`);
    }
  }
  if (!isNonEmptyString(channelConfig.captionField)) fail(`${channel}.captionField must be a non-empty string`);

  for (const language of SUPPORTED_LANGUAGES) {
    const hashtags = channelConfig.hashtags?.[language];
    if (!Array.isArray(hashtags) || hashtags.length === 0) {
      fail(`${channel}.hashtags.${language} must be a non-empty array`);
      continue;
    }
    for (const hashtag of hashtags) {
      if (!/^#[^\s#]+$/u.test(hashtag)) fail(`${channel}.hashtags.${language} invalid hashtag: ${hashtag}`);
    }
  }
}

if (state.schemaVersion !== 1 || !Array.isArray(state.records)) {
  fail('data/publishing-state.json must contain schemaVersion=1 and records[]');
}

const publicationIds = new Set();
for (const record of state.records || []) {
  if (!isNonEmptyString(record.publicationId)) { fail('publishing-state record missing publicationId'); continue; }
  if (publicationIds.has(record.publicationId)) fail(`duplicate publicationId in state: ${record.publicationId}`);
  publicationIds.add(record.publicationId);
  if (!SUPPORTED_CHANNELS.has(record.channel)) fail(`state record has unsupported channel: ${record.channel}`);
  if (!SUPPORTED_LANGUAGES.has(record.language)) fail(`state record has unsupported language: ${record.language}`);
  if (!isNonEmptyString(record.publishedAt) || Number.isNaN(Date.parse(record.publishedAt))) {
    fail(`state record ${record.publicationId} has invalid publishedAt`);
  }
  if (record.externalUrl && !isHttpUrl(record.externalUrl)) fail(`state record ${record.publicationId} has invalid externalUrl`);
}

const counts = { techniques: index.length, explicit: 0, telegramReady: 0, instagramReady: 0, legacyTelegramReady: 0 };

for (const entry of index) {
  const moduleDir = path.join(root, entry.path.replace(/^\.\//, ''));
  const meta = readJson(path.join(moduleDir, 'meta.json'));

  if (meta.telegram !== undefined) {
    if (typeof meta.telegram !== 'object' || Array.isArray(meta.telegram) || typeof meta.telegram.publish !== 'boolean') {
      fail(`[${meta.id}] telegram.publish must be boolean`);
    } else if (meta.telegram.publish) counts.legacyTelegramReady += 1;
  }

  if (meta.publishing !== undefined) {
    if (typeof meta.publishing !== 'object' || Array.isArray(meta.publishing)) {
      fail(`[${meta.id}] publishing must be an object`);
    } else {
      counts.explicit += 1;
      for (const [channel, channelValue] of Object.entries(meta.publishing)) {
        if (!SUPPORTED_CHANNELS.has(channel)) { fail(`[${meta.id}] unsupported publishing channel: ${channel}`); continue; }
        if (!channelValue || typeof channelValue !== 'object' || Array.isArray(channelValue)) {
          fail(`[${meta.id}] publishing.${channel} must be an object`);
          continue;
        }
        if (!PUBLISHING_STATUSES.has(channelValue.status)) {
          fail(`[${meta.id}] publishing.${channel}.status must be draft, ready or paused`);
        }
        if (channelValue.status === 'ready' && (meta.status !== 'published' || !meta.image)) {
          fail(`[${meta.id}] publishing.${channel}=ready requires published technique with image`);
        }
        if (channel === 'telegram' && channelValue.status === 'ready') counts.telegramReady += 1;
        if (channel === 'instagram' && channelValue.status === 'ready') counts.instagramReady += 1;
      }
    }
  }

  for (const language of SUPPORTED_LANGUAGES) {
    const text = readJson(path.join(moduleDir, `${language}.json`));
    for (const field of ['telegramCaption', 'instagramCaption']) {
      if (text[field] !== undefined && !isNonEmptyString(text[field])) {
        fail(`[${meta.id}/${language}] ${field} must be non-empty string`);
      }
    }
  }
}

console.log('Publishing validation');
console.log('=====================');
console.log(`Techniques:             ${counts.techniques}`);
console.log(`Explicit publishing:    ${counts.explicit}`);
console.log(`Telegram ready:         ${counts.telegramReady}`);
console.log(`Instagram ready:        ${counts.instagramReady}`);
console.log(`Legacy Telegram ready:  ${counts.legacyTelegramReady}`);
console.log(`Publication state rows: ${state.records?.length || 0}`);
if (failed) process.exit(1);
console.log('');
console.log('RESULT: OK');
