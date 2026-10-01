import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const root = path.resolve(import.meta.dirname, '..');
export const SUPPORTED_CHANNELS = new Set(['telegram', 'instagram']);
export const SUPPORTED_LANGUAGES = new Set(['ru', 'en']);
export const PUBLISHING_STATUSES = new Set(['draft', 'ready', 'paused']);

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const separator = arg.indexOf('=');
    if (separator === -1) result[arg.slice(2)] = true;
    else result[arg.slice(2, separator)] = arg.slice(separator + 1);
  }
  return result;
}

export function validateToken(name, value) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(value)) {
    throw new Error(`${name} must use lowercase latin letters, digits, "_" or "-": ${value}`);
  }
}

export function requireToken(args, key) {
  const value = String(args[key] || '').trim();
  if (!value) throw new Error(`Missing required --${key}=...`);
  validateToken(key, value);
  return value;
}

export function loadPublishingConfig() {
  return readJson(path.join(root, 'data', 'publishing.json'));
}

export function loadPublishingState() {
  return readJson(path.join(root, 'data', 'publishing-state.json'));
}

export function loadTechniqueIndex() {
  return readJson(path.join(root, 'data', 'techniques', 'index.json'));
}

export function resolvePublishingStatus(meta, channel) {
  const explicit = meta.publishing?.[channel]?.status;
  if (explicit) return explicit;
  if (channel === 'telegram' && meta.telegram?.publish === true) return 'ready';
  return 'draft';
}

export function buildTrackingUrl({ baseUrl, source, medium, campaign, content, techniqueId }) {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', content);
  url.hash = `/technique/${encodeURIComponent(techniqueId)}`;
  return url.toString();
}

export function publicationFingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function pressureDots(value) {
  return `${'●'.repeat(value)}${'○'.repeat(5 - value)}`;
}

export function buildTelegramCaption({ text, meta, locale, hashtags, ctaUrl }) {
  const category = locale.categories?.[meta.category] || meta.category;
  const customCaption = text.telegramCaption || text.summary;
  const openLabel = locale.ui?.openTechnique || (locale.lang === 'en' ? 'Open technique' : 'Открыть технику');

  return [
    `👐 ${text.title}`,
    `📍 ${category}`,
    '',
    customCaption,
    '',
    `${locale.ui.pressure}: ${pressureDots(meta.pressure)} · ${text.pressureText}`,
    `${locale.ui.tempo}: ${text.tempoText}`,
    `${locale.ui.time}: ${text.durationText}`,
    '',
    `${openLabel}:`,
    ctaUrl,
    '',
    hashtags.join(' '),
  ].join('\n');
}

export function buildInstagramCaption({ text, hashtags }) {
  const customCaption = text.instagramCaption || text.summary;
  return [text.title, '', customCaption, '', 'Open Massage Guide', '', hashtags.join(' ')].join('\n');
}

export function buildPublicationRecord({ channel, language, campaign, meta, text, locale, config, state }) {
  const channelConfig = config.channels[channel];
  const sourceStatus = resolvePublishingStatus(meta, channel);
  const utmContent = `${channel}_${meta.id}_${language}`;
  const ctaUrl = buildTrackingUrl({
    baseUrl: config.baseUrl,
    source: channelConfig.source,
    medium: channelConfig.medium,
    campaign,
    content: utmContent,
    techniqueId: meta.id,
  });
  const hashtags = channelConfig.hashtags?.[language] || [];
  const caption = channel === 'telegram'
    ? buildTelegramCaption({ text, meta, locale, hashtags, ctaUrl })
    : buildInstagramCaption({ text, hashtags });

  const fingerprint = publicationFingerprint({
    channel,
    language,
    techniqueId: meta.id,
    techniqueVersion: meta.version,
    image: meta.image,
    thumbnail: meta.thumbnail || '',
    title: text.title,
    caption,
    campaign,
    utmContent,
  });
  const publicationId = `${channel}:${language}:${meta.id}:${fingerprint}`;
  const publishedRecord = state.records.find((record) => record.publicationId === publicationId);

  return {
    schemaVersion: 1,
    publicationId,
    fingerprint,
    channel,
    language,
    techniqueId: meta.id,
    slug: meta.slug,
    techniqueVersion: meta.version,
    publicationStatus: publishedRecord ? 'published' : sourceStatus,
    sourceStatus,
    campaign,
    assets: { image: meta.image, thumbnail: meta.thumbnail || null },
    title: text.title,
    summary: text.summary,
    caption,
    ctaUrl,
    utm: {
      source: channelConfig.source,
      medium: channelConfig.medium,
      campaign,
      content: utmContent,
    },
    published: publishedRecord
      ? { publishedAt: publishedRecord.publishedAt, externalUrl: publishedRecord.externalUrl || null }
      : null,
  };
}

export function collectPublicationRecords({ channel, language, campaign }) {
  const config = loadPublishingConfig();
  const state = loadPublishingState();
  const index = loadTechniqueIndex();
  const locale = readJson(path.join(root, `data/locales/${language}.json`));
  const records = [];

  for (const entry of index) {
    const moduleDir = path.join(root, entry.path.replace(/^\.\//, ''));
    const meta = readJson(path.join(moduleDir, 'meta.json'));
    if (meta.status !== 'published' || !meta.image) continue;
    const text = readJson(path.join(moduleDir, `${language}.json`));
    records.push(buildPublicationRecord({ channel, language, campaign, meta, text, locale, config, state }));
  }
  return records;
}

export function queueRecords(records, { force = false } = {}) {
  return records.filter((record) => {
    if (record.sourceStatus !== 'ready') return false;
    if (force) return true;
    return record.publicationStatus !== 'published';
  });
}

export function defaultOutputPath(channel, language, mode) {
  return path.join(root, 'dist', 'publishing', `${channel}.${language}.${mode}.json`);
}
