import fs from 'node:fs';
import path from 'node:path';

function argsMap(argv) {
  const result = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const pos = arg.indexOf('=');

    result[arg.slice(2, pos)] = arg.slice(pos + 1);
  }

  return result;
}

function pngSize(file) {
  const buffer = fs.readFileSync(file);

  if (
    buffer.length < 24
    || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a'
  ) {
    throw new Error(`Not a PNG: ${file}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const args = argsMap(process.argv.slice(2));
const dir = path.resolve(
  args.dir || 'dist/launch-kit/omg_launch_ru_2026_10',
);

const expected = args.expected
  ? Number.parseInt(args.expected, 10)
  : null;

const formats = String(args.formats || 'feed,story')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

try {
  const manifestPath = path.join(dir, 'manifest.json');
  const readmePath = path.join(dir, 'README.md');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }

  if (!fs.existsSync(readmePath)) {
    throw new Error(`Missing README: ${readmePath}`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf8'),
  );

  if (
    expected !== null
    && manifest.postCount !== expected
  ) {
    throw new Error(
      `Expected ${expected} posts, got ${manifest.postCount}`,
    );
  }

  for (const record of manifest.records) {
    const postDir = path.join(dir, record.folder);

    for (const required of [
      'telegram.txt',
      'instagram.txt',
      'meta.json',
      'links.json',
    ]) {
      const file = path.join(postDir, required);

      if (!fs.existsSync(file)) {
        throw new Error(`Missing file: ${file}`);
      }
    }

    for (const format of formats) {
      const file = path.join(postDir, `${format}.png`);

      if (!fs.existsSync(file)) {
        throw new Error(`Missing card: ${file}`);
      }

      const size = pngSize(file);
      const expectedSize = format === 'feed'
        ? { width: 1080, height: 1350 }
        : { width: 1080, height: 1920 };

      if (
        size.width !== expectedSize.width
        || size.height !== expectedSize.height
      ) {
        throw new Error(
          `${file}: expected `
          + `${expectedSize.width}x${expectedSize.height}, `
          + `got ${size.width}x${size.height}`,
        );
      }
    }
  }

  console.log('Launch kit check');
  console.log('================');
  console.log(`Campaign: ${manifest.campaign}`);
  console.log(`Posts: ${manifest.postCount}`);
  console.log(`Formats: ${formats.join(', ')}`);
  console.log('');
  console.log('RESULT: OK');
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
