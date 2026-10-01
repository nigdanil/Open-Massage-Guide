import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((x) => {
    const p = x.indexOf('=');
    return [x.slice(2, p), x.slice(p + 1)];
  }),
);

const file = path.resolve(args.file || '');
if (!fs.existsSync(file)) {
  console.error(`ERROR: file not found: ${file}`);
  process.exit(1);
}

const buffer = fs.readFileSync(file);
if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
  console.error('ERROR: not a PNG');
  process.exit(1);
}

const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);

console.log(`PNG: ${file}`);
console.log(`Size: ${width}x${height}`);
console.log(`Bytes: ${buffer.length}`);

if (args.width && width !== Number(args.width)) process.exit(1);
if (args.height && height !== Number(args.height)) process.exit(1);

console.log('RESULT: OK');
