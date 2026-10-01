import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const userArgs = process.argv.slice(2);
const languageArg = userArgs.find((arg) => arg.startsWith('--lang='));
const language = languageArg?.split('=')[1] || 'ru';
const hasCampaign = userArgs.some((arg) => arg.startsWith('--campaign='));
const campaignArgs = hasCampaign ? [] : ['--campaign=manual_export'];

const result = spawnSync(process.execPath, [
  path.join(root, 'scripts', 'export-publishing.mjs'),
  '--channel=telegram',
  '--mode=queue',
  ...campaignArgs,
  ...userArgs,
], { cwd: root, stdio: 'inherit' });

if (result.status !== 0) process.exit(result.status ?? 1);

const queueFile = path.join(root, 'dist', 'publishing', `telegram.${language}.queue.json`);
if (!fs.existsSync(queueFile)) {
  console.error(`Queue output not found: ${queueFile}`);
  process.exit(1);
}

const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
const legacy = queue.records.map((record) => ({
  id: record.techniqueId,
  language: record.language,
  image: record.assets.image,
  text: record.caption,
  ctaUrl: record.ctaUrl,
  publicationId: record.publicationId,
}));

const legacyOutput = path.join(root, 'dist', `telegram-feed.${language}.json`);
fs.writeFileSync(legacyOutput, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');
console.log(`Compatibility feed: ${legacy.length} records -> ${legacyOutput}`);
