import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const languageArg = process.argv.find((arg) => arg.startsWith('--lang='));
const language = languageArg?.split('=')[1] || 'ru';
const supportedLanguages = new Set(['ru', 'en']);

if (!supportedLanguages.has(language)) {
  console.error(`Unsupported language: ${language}. Use --lang=ru or --lang=en.`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const index = readJson(path.join(root, 'data/techniques/index.json'));
const locale = readJson(path.join(root, `data/locales/${language}.json`));
const hashtags = language === 'ru' ? '#массаж #справочник' : '#massage #massageguide';

const feed = [];

for (const entry of index) {
  const moduleDir = path.join(root, entry.path.replace(/^\.\//, ''));
  const meta = readJson(path.join(moduleDir, 'meta.json'));

  if (meta.status !== 'published' || !meta.telegram?.publish || !meta.image) continue;

  const text = readJson(path.join(moduleDir, `${language}.json`));
  feed.push({
    id: meta.id,
    language,
    image: meta.image,
    text: [
      `👐 ${text.title}`,
      `📍 ${locale.categories[meta.category] || meta.category}`,
      '',
      text.telegramCaption || text.summary,
      '',
      `${locale.ui.pressure}: ${'●'.repeat(meta.pressure)}${'○'.repeat(5 - meta.pressure)} · ${text.pressureText}`,
      `${locale.ui.tempo}: ${text.tempoText}`,
      `${locale.ui.time}: ${text.durationText}`,
      '',
      hashtags,
    ].join('\n'),
  });
}

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, `telegram-feed.${language}.json`);
fs.writeFileSync(output, JSON.stringify(feed, null, 2));
console.log(`Created ${feed.length} Telegram records: ${output}`);
