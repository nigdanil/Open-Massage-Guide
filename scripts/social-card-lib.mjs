import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

export const root = path.resolve(import.meta.dirname, '..');

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => {
        const pos = arg.indexOf('=');
        return pos < 0
          ? [arg.slice(2), true]
          : [arg.slice(2, pos), arg.slice(pos + 1)];
      }),
  );
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function imageUri(relative) {
  if (!relative) return null;
  const file = path.resolve(root, relative.replace(/^\.\//, ''));
  if (!fs.existsSync(file)) throw new Error(`Image not found: ${relative}`);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.webp' ? 'image/webp'
    : ext === '.png' ? 'image/png'
      : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

export function loadTechnique(lang, id) {
  const catalog = readJson(path.join(root, `data/generated/catalog.${lang}.json`));
  const item = catalog.find((x) => x.id === id && x.status === 'published');
  if (!item) throw new Error(`Published technique not found: ${id}`);
  return item;
}

export function techniqueModel(lang, item) {
  const locale = readJson(path.join(root, `data/locales/${lang}.json`));
  const dots = `${'●'.repeat(item.pressure)}${'○'.repeat(5 - item.pressure)}`;

  return {
    kind: 'technique',
    lang,
    eyebrow: locale.categories?.[item.category] || item.category,
    title: item.text.title,
    summary: item.text.summary,
    image: item.image,
    facts: [
      `${locale.ui?.pressure || 'Pressure'}: ${dots} · ${item.text.pressureText}`,
      `${locale.ui?.tempo || 'Tempo'}: ${item.text.tempoText}`,
      `${locale.ui?.time || 'Time'}: ${item.text.durationText}`,
    ],
  };
}

export function genericModel(lang, record) {
  const labels = {
    project: { ru: 'О ПРОЕКТЕ', en: 'ABOUT THE PROJECT' },
    educational: { ru: 'ПОЛЕЗНО', en: 'EDUCATIONAL' },
  };

  return {
    kind: record.type,
    lang,
    eyebrow: labels[record.type]?.[lang] || record.type.toUpperCase(),
    title: record.title,
    summary: record.idea || '',
    image: null,
    facts: [],
  };
}

function html({ model, format, config }) {
  const f = config.formats[format];
  const story = format === 'story';
  const image = imageUri(model.image);

  return `<!doctype html>
<html lang="${esc(model.lang)}">
<meta charset="utf-8">
<style>
*{box-sizing:border-box}
html,body{margin:0;width:${f.width}px;height:${f.height}px;overflow:hidden}
body{font-family:"Segoe UI",Arial,sans-serif;background:#f4efe5;color:#17211e}
.card{width:100%;height:100%;padding:${story ? 76 : 60}px;display:grid;
grid-template-rows:auto ${story ? 760 : 590}px 1fr auto;gap:${story ? 42 : 32}px;
background:radial-gradient(circle at 90% 5%,rgba(15,118,110,.14),transparent 25%),#f4efe5}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:18px}
.logo{width:${story ? 92 : 76}px;height:${story ? 92 : 76}px;border-radius:24px;
display:grid;place-items:center;background:#0f766e;color:#fff;font-weight:800;
font-size:${story ? 30 : 24}px}
.name{font-size:${story ? 31 : 26}px;font-weight:750}
.badge{margin-top:7px;color:#60736e;font-size:${story ? 20 : 17}px;letter-spacing:1.2px}
.format{padding:12px 18px;border:1px solid #d8d6ce;border-radius:999px;
font-size:${story ? 19 : 16}px;background:#ffffff80}
.visual{overflow:hidden;border-radius:${story ? 48 : 40}px;background:#ffffffbd;
border:1px solid #deddd6;display:grid;place-items:center;padding:${story ? 38 : 30}px;
box-shadow:0 20px 55px #33443f17}
.visual img{width:100%;height:100%;object-fit:contain}
.generic{background:linear-gradient(145deg,#e0ece7,#fbfaf7)}
.monogram{width:${story ? 285 : 225}px;height:${story ? 285 : 225}px;border-radius:50%;
display:grid;place-items:center;background:#0f766e;color:#fff;font-size:${story ? 90 : 72}px;
font-weight:800;box-shadow:0 25px 60px #0f766e35}
.content{min-height:0;display:flex;flex-direction:column}
.eyebrow{margin:0 0 ${story ? 22 : 17}px;color:#0f766e;font-size:${story ? 24 : 20}px;
font-weight:800;letter-spacing:1.6px}
h1{margin:0;font-size:${story ? 65 : 53}px;line-height:1.04;letter-spacing:-1.5px}
.summary{margin:${story ? 28 : 21}px 0 0;color:#526660;font-size:${story ? 30 : 24}px;
line-height:1.38;display:-webkit-box;-webkit-box-orient:vertical;
-webkit-line-clamp:${story ? 4 : 3};overflow:hidden}
.facts{margin-top:${story ? '34px' : 'auto'};display:grid;grid-template-columns:${story ? '1fr' : 'repeat(3,1fr)'};gap:${story ? 14 : 12}px;padding-top:${story ? 0 : 22}px}
.fact{padding:${story ? '21px 24px' : '14px'};border-radius:20px;background:#ffffff9c;border:1px solid #deddd6;
font-size:${story ? 21 : 15}px;line-height:1.3}
.footer{display:flex;justify-content:space-between;border-top:1px solid #d6d4cc;padding-top:16px;
color:#5b6d68;font-size:${story ? 21 : 17}px}
.footer strong{color:#0f766e}
</style>
<body>
<main class="card">
<header class="top">
  <div class="brand">
    <div class="logo">${esc(config.brand.shortName)}</div>
    <div><div class="name">${esc(config.brand.name)}</div>
    <div class="badge">${esc(config.brand.badge[model.lang])}</div></div>
  </div>
</header>
${image
    ? `<div class="visual"><img src="${image}"></div>`
    : `<div class="visual generic"><div class="monogram">${esc(config.brand.shortName)}</div></div>`}
<section class="content">
  <p class="eyebrow">${esc(model.eyebrow)}</p>
  <h1>${esc(model.title)}</h1>
  <p class="summary">${esc(model.summary)}</p>
  ${model.facts.length
    ? `<div class="facts">${model.facts.map((x) => `<div class="fact">${esc(x)}</div>`).join('')}</div>`
    : ''}
</section>
<footer class="footer"><span>${esc(config.brand.footer)}</span><strong>${esc(config.brand.shortName)}</strong></footer>
</main>`;
}

export async function renderCard({ model, format, output }) {
  const config = readJson(path.join(root, 'data/social-cards.json'));
  const f = config.formats[format];
  if (!f) throw new Error(`Unsupported format: ${format}`);

  fs.mkdirSync(path.dirname(output), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: f.width, height: f.height },
      deviceScaleFactor: 1,
    });
    await page.setContent(html({ model, format, config }), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts?.ready);
    await page.screenshot({ path: output, type: 'png', fullPage: false });
  } finally {
    await browser.close();
  }

  return { width: f.width, height: f.height, output };
}
