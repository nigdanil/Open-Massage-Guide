import fs from 'node:fs';
import path from 'node:path';
import { loadPublishingState, parseArgs, root, writeJson } from './publishing-lib.mjs';

const args = parseArgs(process.argv.slice(2));
try {
  const file = String(args.file || '').trim();
  const techniqueId = String(args.id || '').trim();
  const publicationIdArg = String(args['publication-id'] || '').trim();
  const externalUrl = String(args.url || '').trim();

  if (!file) throw new Error('Missing --file=dist/publishing/...queue.json');
  if (!techniqueId && !publicationIdArg) throw new Error('Use --id=<technique-id> or --publication-id=<id>');

  const queuePath = path.resolve(root, file);
  if (!fs.existsSync(queuePath)) throw new Error(`Queue file not found: ${queuePath}`);
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const records = Array.isArray(queue.records) ? queue.records : [];
  const matches = records.filter((record) => publicationIdArg ? record.publicationId === publicationIdArg : record.techniqueId === techniqueId);
  if (matches.length === 0) throw new Error('Publication record not found in queue');
  if (matches.length > 1) throw new Error('More than one record matched. Use --publication-id for exact selection.');

  const publication = matches[0];
  if (externalUrl) {
    const url = new URL(externalUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('External URL must use HTTP/HTTPS');
  }

  const statePath = path.join(root, 'data', 'publishing-state.json');
  const state = loadPublishingState();
  if (state.records.some((record) => record.publicationId === publication.publicationId)) {
    throw new Error(`Already marked published: ${publication.publicationId}`);
  }

  const record = {
    publicationId: publication.publicationId,
    fingerprint: publication.fingerprint,
    channel: publication.channel,
    language: publication.language,
    techniqueId: publication.techniqueId,
    campaign: publication.campaign,
    publishedAt: new Date().toISOString(),
    externalUrl: externalUrl || null,
  };
  state.records.push(record);
  state.records.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  writeJson(statePath, state);

  console.log(`Marked published: ${publication.publicationId}`);
  console.log(`Technique:        ${publication.techniqueId}`);
  console.log(`Channel:          ${publication.channel}`);
  console.log(`Language:         ${publication.language}`);
  console.log(`Campaign:         ${publication.campaign}`);
  console.log(`Published at:     ${record.publishedAt}`);
  if (record.externalUrl) console.log(`External URL:     ${record.externalUrl}`);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  console.error('Example: node scripts/mark-published.mjs --file=dist/publishing/telegram.ru.queue.json --id=back-001 --url=https://t.me/example/123');
  process.exit(1);
}
