import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const techniques = JSON.parse(fs.readFileSync(path.join(root, 'data/techniques.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8'));
const categoryIds = new Set(categories.map((item) => item.id));
const ids = new Set();
let failed = false;

for (const item of techniques) {
  const required = ['id', 'title', 'category', 'summary', 'image', 'pressure', 'tempo', 'duration', 'instructions', 'warning'];
  for (const key of required) {
    if (item[key] === undefined || item[key] === '') {
      console.error(`[${item.id || 'unknown'}] отсутствует поле ${key}`);
      failed = true;
    }
  }
  if (ids.has(item.id)) {
    console.error(`Дублирующийся id: ${item.id}`);
    failed = true;
  }
  ids.add(item.id);
  if (!categoryIds.has(item.category)) {
    console.error(`[${item.id}] неизвестная категория: ${item.category}`);
    failed = true;
  }
  if (!Number.isInteger(item.pressure) || item.pressure < 1 || item.pressure > 5) {
    console.error(`[${item.id}] pressure должен быть целым числом 1..5`);
    failed = true;
  }
  const imagePath = path.resolve(root, item.image.replace(/^\.\//, ''));
  if (!fs.existsSync(imagePath)) {
    console.error(`[${item.id}] изображение не найдено: ${item.image}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`OK: ${techniques.length} техник, ${categories.length} категорий.`);
