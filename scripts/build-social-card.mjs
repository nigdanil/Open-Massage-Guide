import path from 'node:path';
import {
  loadTechnique,
  parseArgs,
  renderCard,
  root,
  techniqueModel,
} from './social-card-lib.mjs';

const args = parseArgs(process.argv.slice(2));

try {
  const id = String(args.id || '').trim();
  const lang = String(args.lang || 'ru').trim();
  const format = String(args.format || 'feed').trim();

  if (!id) throw new Error('Missing --id=<technique-id>');
  if (!['ru', 'en'].includes(lang)) throw new Error('Use --lang=ru or --lang=en');
  if (!['feed', 'story'].includes(format)) throw new Error('Use --format=feed or --format=story');

  const item = loadTechnique(lang, id);
  const output = path.join(root, 'dist/social', `${id}.${lang}.${format}.png`);
  const result = await renderCard({
    model: techniqueModel(lang, item),
    format,
    output,
  });

  console.log(`Technique: ${id}`);
  console.log(`Language:  ${lang}`);
  console.log(`Format:    ${format}`);
  console.log(`Size:      ${result.width}x${result.height}`);
  console.log(`Created:   ${result.output}`);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
