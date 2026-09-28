import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const techniques = JSON.parse(fs.readFileSync(path.join(root, 'data/techniques.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8'));
const byId = Object.fromEntries(categories.map((item) => [item.id, item.title]));

const feed = techniques
  .filter((item) => item.status === 'published' && item.telegram?.publish)
  .map((item) => ({
    id: item.id,
    image: item.image,
    text: [
      `👐 ${item.title}`,
      `📍 ${byId[item.category] || item.category}`,
      '',
      item.telegram?.caption || item.summary,
      '',
      `Давление: ${'●'.repeat(item.pressure)}${'○'.repeat(5 - item.pressure)}`,
      `Темп: ${item.tempo}`,
      `Время: ${item.duration}`,
      '',
      '#массаж #справочник'
    ].join('\n')
  }));

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'telegram-feed.json'), JSON.stringify(feed, null, 2));
console.log(`Создано Telegram-записей: ${feed.length}`);
