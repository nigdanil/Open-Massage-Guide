import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');

const social = JSON.parse(
  fs.readFileSync(path.join(root, 'data/social-cards.json'), 'utf8'),
);

const kit = JSON.parse(
  fs.readFileSync(path.join(root, 'data/launch-kit.json'), 'utf8'),
);

const output = path.join(
  root,
  'dist',
  'launch-kit',
  'brand',
  'avatar-1024.png',
);

fs.mkdirSync(path.dirname(output), { recursive: true });

const { width, height } = kit.avatar;

const html = `<!doctype html>
<html>
<meta charset="utf-8">
<style>
*{box-sizing:border-box}
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
body{
  display:grid;
  place-items:center;
  background:#f4efe5;
  font-family:"Segoe UI",Arial,sans-serif;
}
.safe{
  width:82%;
  height:82%;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:#0f766e;
  box-shadow:0 40px 110px rgba(15,118,110,.22);
}
.logo{
  color:white;
  font-size:260px;
  line-height:1;
  font-weight:800;
  letter-spacing:-12px;
  transform:translateX(-5px);
}
</style>
<body>
  <main class="safe">
    <div class="logo">${social.brand.shortName}</div>
  </main>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({
    path: output,
    type: 'png',
    fullPage: false,
  });
} finally {
  await browser.close();
}

console.log(`Avatar: ${width}x${height}`);
console.log(`Created: ${output}`);
