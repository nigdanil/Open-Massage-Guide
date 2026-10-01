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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function safeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function postText(record) {
  return record.idea || record.summary || '';
}

function buildTelegram(record, language, config) {
  const copy = config.copy[language];
  const tags = copy.hashtags[record.type] || [];
  const url = record.channels?.telegram?.ctaUrl || '';

  return [
    record.title,
    '',
    postText(record),
    '',
    copy.telegramCta,
    url,
    '',
    tags.join(' '),
  ].join('\n');
}

function buildInstagram(record, language, config) {
  const copy = config.copy[language];
  const tags = copy.hashtags[record.type] || [];

  return [
    record.title,
    '',
    postText(record),
    '',
    copy.instagramCta,
    '',
    tags.join(' '),
  ].join('\n');
}

const args = parseArgs(process.argv.slice(2));

try {
  const planPath = path.resolve(
    root,
    String(args.plan || 'dist/social-launch/launch-plan.ru.json'),
  );

  if (!fs.existsSync(planPath)) {
    throw new Error(
      `Launch plan not found: ${planPath}. `
      + 'Run node scripts/build-social-launch.mjs first.',
    );
  }

  const plan = readJson(planPath);
  const language = String(args.lang || plan.language || 'ru');

  if (!['ru', 'en'].includes(language)) {
    throw new Error('Use --lang=ru or --lang=en');
  }

  const config = readJson(path.join(root, 'data/launch-kit.json'));

  const formats = String(
    args.formats || config.defaultFormats.join(','),
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  for (const format of formats) {
    if (!['feed', 'story'].includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  const limit = args.limit
    ? Number.parseInt(args.limit, 10)
    : plan.records.length;

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('--limit must be a positive integer');
  }

  const campaign = safeName(plan.campaign);
  const kitRoot = path.join(root, 'dist', 'launch-kit', campaign);

  fs.rmSync(kitRoot, { recursive: true, force: true });
  fs.mkdirSync(kitRoot, { recursive: true });

  const socialLaunch = readJson(
    path.join(root, 'data/social-launch.json'),
  );

  const manifestRecords = [];

  for (const record of plan.records.slice(0, limit)) {
    const prefix = String(record.order).padStart(2, '0');
    const identity = record.techniqueId || record.type;
    const folderName = `${prefix}-${safeName(identity)}`;
    const postDir = path.join(kitRoot, folderName);

    fs.mkdirSync(postDir, { recursive: true });

    const model = record.techniqueId
      ? techniqueModel(
          language,
          loadTechnique(language, record.techniqueId),
        )
      : genericModel(language, record);

    const assets = {};

    for (const format of formats) {
      const output = path.join(postDir, `${format}.png`);

      const result = await renderCard({
        model,
        format,
        output,
      });

      assets[format] = {
        file: `${folderName}/${format}.png`,
        width: result.width,
        height: result.height,
      };
    }

    const telegramText = buildTelegram(
      record,
      language,
      config,
    );

    const instagramText = buildInstagram(
      record,
      language,
      config,
    );

    fs.writeFileSync(
      path.join(postDir, 'telegram.txt'),
      `${telegramText}\n`,
      'utf8',
    );

    fs.writeFileSync(
      path.join(postDir, 'instagram.txt'),
      `${instagramText}\n`,
      'utf8',
    );

    const meta = {
      schemaVersion: 1,
      order: record.order,
      week: record.week,
      type: record.type,
      techniqueId: record.techniqueId || null,
      title: record.title,
      campaign: plan.campaign,
      language,
      assets,
      channels: record.channels,
    };

    fs.writeFileSync(
      path.join(postDir, 'meta.json'),
      `${JSON.stringify(meta, null, 2)}\n`,
      'utf8',
    );

    fs.writeFileSync(
      path.join(postDir, 'links.json'),
      `${JSON.stringify({
        telegram: record.channels?.telegram || null,
        instagram: record.channels?.instagram || null,
      }, null, 2)}\n`,
      'utf8',
    );

    manifestRecords.push({
      folder: folderName,
      ...meta,
    });

    console.log(
      `${prefix}. ${record.type.padEnd(11)} `
      + `${record.techniqueId || '-'} → ${folderName}`,
    );
  }

  const manifest = {
    schemaVersion: 1,
    campaign: plan.campaign,
    language,
    generatedAt: new Date().toISOString(),
    formats,
    postCount: manifestRecords.length,
    profiles: socialLaunch.profiles,
    records: manifestRecords,
  };

  fs.writeFileSync(
    path.join(kitRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  const readme = [
    `# Open Massage Guide — ${plan.campaign}`,
    '',
    `Language: ${language}`,
    `Posts: ${manifestRecords.length}`,
    `Formats: ${formats.join(', ')}`,
    '',
    '## Profiles',
    '',
    `Telegram status: ${socialLaunch.profiles.telegram.status}`,
    `Telegram handle: ${socialLaunch.profiles.telegram.handle || '(not created)'}`,
    '',
    `Instagram status: ${socialLaunch.profiles.instagram.status}`,
    `Instagram handle: ${socialLaunch.profiles.instagram.handle || '(not created)'}`,
    '',
    '## Telegram description',
    '',
    socialLaunch.profiles.telegram.description[language],
    '',
    '## Instagram bio',
    '',
    socialLaunch.profiles.instagram.description[language],
    '',
    '## Before publishing',
    '',
    '1. Create the real profile/channel.',
    '2. Fill handle/profileUrl in data/social-launch.json.',
    '3. Regenerate this kit.',
    '4. Publish the first pilot only.',
    '5. Verify UTM in Umami.',
    '6. Record the real publication with mark-published.mjs.',
    '',
  ].join('\n');

  fs.writeFileSync(
    path.join(kitRoot, 'README.md'),
    readme,
    'utf8',
  );

  console.log('');
  console.log(`Campaign: ${plan.campaign}`);
  console.log(`Posts: ${manifestRecords.length}`);
  console.log(`Formats: ${formats.join(', ')}`);
  console.log(`Created: ${kitRoot}`);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
