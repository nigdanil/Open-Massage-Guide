import {
  SUPPORTED_CHANNELS,
  SUPPORTED_LANGUAGES,
  collectPublicationRecords,
  defaultOutputPath,
  parseArgs,
  queueRecords,
  requireToken,
  writeJson,
} from './publishing-lib.mjs';

const args = parseArgs(process.argv.slice(2));

try {
  const channel = String(args.channel || '').trim();
  const language = String(args.lang || 'ru').trim();
  const mode = String(args.mode || 'preview').trim();
  const campaign = requireToken(args, 'campaign');
  const dryRun = Boolean(args['dry-run']);
  const force = Boolean(args.force);

  if (!SUPPORTED_CHANNELS.has(channel)) throw new Error(`Unsupported channel: ${channel}. Use telegram or instagram.`);
  if (!SUPPORTED_LANGUAGES.has(language)) throw new Error(`Unsupported language: ${language}. Use ru or en.`);
  if (!['preview', 'queue'].includes(mode)) throw new Error(`Unsupported mode: ${mode}. Use preview or queue.`);

  const allRecords = collectPublicationRecords({ channel, language, campaign });
  const selected = mode === 'queue' ? queueRecords(allRecords, { force }) : allRecords;

  const summary = {
    schemaVersion: 1,
    channel,
    language,
    mode,
    campaign,
    generatedAt: new Date().toISOString(),
    totalPublishedTechniques: allRecords.length,
    ready: allRecords.filter((item) => item.sourceStatus === 'ready').length,
    draft: allRecords.filter((item) => item.sourceStatus === 'draft').length,
    paused: allRecords.filter((item) => item.sourceStatus === 'paused').length,
    alreadyPublished: allRecords.filter((item) => item.publicationStatus === 'published').length,
    selected: selected.length,
    records: selected,
  };

  const output = defaultOutputPath(channel, language, mode);
  console.log(`Channel:           ${channel}`);
  console.log(`Language:          ${language}`);
  console.log(`Mode:              ${mode}`);
  console.log(`Campaign:          ${campaign}`);
  console.log(`Published content: ${summary.totalPublishedTechniques}`);
  console.log(`Ready:             ${summary.ready}`);
  console.log(`Draft:             ${summary.draft}`);
  console.log(`Paused:            ${summary.paused}`);
  console.log(`Already published: ${summary.alreadyPublished}`);
  console.log(`Selected:          ${summary.selected}`);

  if (dryRun) console.log('Dry run: no file written.');
  else {
    writeJson(output, summary);
    console.log(`Created: ${output}`);
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  console.error('Example: node scripts/export-publishing.mjs --channel=telegram --lang=ru --campaign=omg_launch_ru_2026_10 --mode=preview');
  process.exit(1);
}
