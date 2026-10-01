import fs from 'node:fs';
import path from 'node:path';
import {
  genericModel,
  loadTechnique,
  parseArgs,
  renderCard,
  root,
  techniqueModel,
} from './social-card-lib.mjs';

const args = parseArgs(process.argv.slice(2));

try {
  const planFile = path.resolve(
    root,
    String(args.plan || 'dist/social-launch/launch-plan.ru.json'),
  );
  if (!fs.existsSync(planFile)) throw new Error(`Plan not found: ${planFile}`);

  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const lang = String(args.lang || plan.language || 'ru');
  const formats = String(args.formats || 'feed').split(',').map((x) => x.trim());
  const limit = args.limit ? Number.parseInt(args.limit, 10) : plan.records.length;

  const manifest = [];

  for (const record of plan.records.slice(0, limit)) {
    const model = record.techniqueId
      ? techniqueModel(lang, loadTechnique(lang, record.techniqueId))
      : genericModel(lang, record);

    for (const format of formats) {
      if (!['feed', 'story'].includes(format)) throw new Error(`Bad format: ${format}`);

      const name = record.techniqueId
        ? record.techniqueId
        : `${String(record.order).padStart(2, '0')}-${record.type}`;

      const output = path.join(root, 'dist/social/launch', `${name}.${lang}.${format}.png`);
      const result = await renderCard({ model, format, output });

      manifest.push({
        order: record.order,
        week: record.week,
        type: record.type,
        techniqueId: record.techniqueId,
        language: lang,
        format,
        width: result.width,
        height: result.height,
        output: path.relative(root, output).replaceAll('\\', '/'),
      });

      console.log(`${String(record.order).padStart(2, '0')} ${format} ${name}`);
    }
  }

  const manifestFile = path.join(root, 'dist/social/launch', `manifest.${lang}.json`);
  fs.writeFileSync(
    manifestFile,
    `${JSON.stringify({
      schemaVersion: 1,
      campaign: plan.campaign,
      language: lang,
      cards: manifest,
    }, null, 2)}\n`,
    'utf8',
  );

  console.log(`Cards: ${manifest.length}`);
  console.log(`Manifest: ${manifestFile}`);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
