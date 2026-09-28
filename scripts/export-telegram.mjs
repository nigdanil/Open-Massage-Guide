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

const techniques = JSON.parse(fs.readFileSync(path.join(root, 'data/techniques.json'), 'utf8'));
const locale = JSON.parse(fs.readFileSync(path.join(root, `data/locales/${language}.json`), 'utf8'));

function formatDuration(item) {
  const duration = item.duration;
  if (!duration) return '';
  if (duration.key) return locale.duration?.[duration.key] || duration.key;
  if (Number.isFinite(duration.seconds)) return `${Math.round(duration.seconds / 60)} ${locale.ui.minutesShort}`;
  if (Number.isFinite(duration.minSeconds) && Number.isFinite(duration.maxSeconds)) {
    return `${Math.round(duration.minSeconds / 60)}–${Math.round(duration.maxSeconds / 60)} ${locale.ui.minutesShort}`;
  }
  return '';
}

const hashtags = language === 'ru' ? '#массаж #справочник' : '#massage #massageguide';

const feed = techniques
  .filter((item) => item.status === 'published' && item.telegram?.publish)
  .map((item) => {
    const text = locale.techniques[item.id];
    return {
      id: item.id,
      language,
      image: item.image,
      text: [
        `👐 ${text.title}`,
        `📍 ${locale.categories[item.category] || item.category}`,
        '',
        text.telegramCaption || text.summary,
        '',
        `${locale.ui.pressure}: ${'●'.repeat(item.pressure)}${'○'.repeat(5 - item.pressure)}`,
        `${locale.ui.tempo}: ${locale.tempo[item.tempo] || item.tempo}`,
        `${locale.ui.time}: ${formatDuration(item)}`,
        '',
        hashtags,
      ].join('\n'),
    };
  });

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, `telegram-feed.${language}.json`);
fs.writeFileSync(output, JSON.stringify(feed, null, 2));
console.log(`Created ${feed.length} Telegram records: ${output}`);
