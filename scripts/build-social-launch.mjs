import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildUrl({ baseUrl, source, medium, campaign, content, techniqueId }) {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', content);

  if (techniqueId) {
    url.hash = `/technique/${encodeURIComponent(techniqueId)}`;
  }

  return url.toString();
}

const config = readJson(path.join(root, 'data/social-launch.json'));
const publishing = readJson(path.join(root, 'data/publishing.json'));

const language = config.launch.language;
const catalog = readJson(
  path.join(root, `data/generated/catalog.${language}.json`),
).filter((item) => item.status === 'published');

const staticPosts = [
  {
    type: 'project',
    key: 'project-intro',
    title: language === 'ru'
      ? 'Что такое Open Massage Guide'
      : 'What is Open Massage Guide',
    idea: language === 'ru'
      ? 'Коротко представить проект: бесплатный визуальный справочник, RU/EN, без регистрации.'
      : 'Introduce the project as a free visual RU/EN massage guide with no registration.',
  },
  {
    type: 'educational',
    key: 'how-to-use',
    title: language === 'ru'
      ? 'Как пользоваться справочником'
      : 'How to use the guide',
    idea: language === 'ru'
      ? 'Показать поиск, категории, карточку техники и избранное.'
      : 'Show search, categories, technique cards and favorites.',
  },
  {
    type: 'educational',
    key: 'safety-first',
    title: language === 'ru'
      ? 'Безопасность важнее силы'
      : 'Safety before pressure',
    idea: language === 'ru'
      ? 'Объяснить принцип: боль, травма, воспаление и ухудшение самочувствия — повод остановиться.'
      : 'Explain that pain, injury, inflammation or worsening symptoms are reasons to stop.',
  },
  {
    type: 'project',
    key: 'offline-pwa',
    title: language === 'ru'
      ? 'Справочник работает офлайн'
      : 'The guide works offline',
    idea: language === 'ru'
      ? 'Показать установку PWA и загрузку офлайн-библиотеки.'
      : 'Show PWA installation and offline library download.',
  },
];

const selectedTechniquePosts = [];
const usedIds = new Set();

for (const category of config.launch.techniqueCategories) {
  const technique = catalog.find(
    (item) => item.category === category && !usedIds.has(item.id),
  );

  if (!technique) continue;

  usedIds.add(technique.id);
  selectedTechniquePosts.push({
    type: 'technique',
    techniqueId: technique.id,
    category: technique.category,
    title: technique.text.title,
    summary: technique.text.summary,
    image: technique.image,
  });
}

const sequence = [
  staticPosts[0],
  selectedTechniquePosts[0],
  selectedTechniquePosts[1],
  staticPosts[1],
  selectedTechniquePosts[2],
  selectedTechniquePosts[3],
  staticPosts[2],
  selectedTechniquePosts[4],
  selectedTechniquePosts[5],
  staticPosts[3],
  selectedTechniquePosts[6],
  selectedTechniquePosts[7],
].filter(Boolean).slice(0, config.launch.targetPosts);

const records = sequence.map((item, index) => {
  const number = index + 1;
  const contentBase = item.techniqueId
    ? `${item.type}_${item.techniqueId}_${language}`
    : `${item.type}_${item.key}_${language}`;

  return {
    order: number,
    week: Math.floor(index / config.launch.cadencePerWeek) + 1,
    type: item.type,
    techniqueId: item.techniqueId || null,
    title: item.title,
    idea: item.idea || item.summary || '',
    image: item.image || null,
    channels: {
      telegram: {
        status: 'planned',
        utmContent: `telegram_${contentBase}`,
        ctaUrl: buildUrl({
          baseUrl: publishing.baseUrl,
          source: 'telegram',
          medium: 'organic_social',
          campaign: config.launch.campaign,
          content: `telegram_${contentBase}`,
          techniqueId: item.techniqueId,
        }),
      },
      instagram: {
        status: 'planned',
        utmContent: `instagram_${contentBase}`,
        ctaUrl: buildUrl({
          baseUrl: publishing.baseUrl,
          source: 'instagram',
          medium: 'organic_social',
          campaign: config.launch.campaign,
          content: `instagram_${contentBase}`,
          techniqueId: item.techniqueId,
        }),
      },
    },
  };
});

const output = {
  schemaVersion: 1,
  campaign: config.launch.campaign,
  language,
  generatedAt: new Date().toISOString(),
  targetPosts: config.launch.targetPosts,
  generatedPosts: records.length,
  cadencePerWeek: config.launch.cadencePerWeek,
  estimatedWeeks: Math.ceil(records.length / config.launch.cadencePerWeek),
  profiles: config.profiles,
  records,
};

const outputDir = path.join(root, 'dist/social-launch');
writeJson(path.join(outputDir, `launch-plan.${language}.json`), output);

const markdown = [
  `# ${config.brand.name} — launch plan`,
  '',
  `Campaign: \`${output.campaign}\``,
  `Language: \`${language}\``,
  `Cadence: ${output.cadencePerWeek} posts/week`,
  `Posts: ${output.generatedPosts}`,
  '',
  ...records.flatMap((record) => [
    `## ${record.order}. ${record.title}`,
    '',
    `- Week: ${record.week}`,
    `- Type: ${record.type}`,
    record.techniqueId ? `- Technique: ${record.techniqueId}` : null,
    `- Idea: ${record.idea}`,
    `- Telegram UTM: ${record.channels.telegram.ctaUrl}`,
    `- Instagram UTM: ${record.channels.instagram.ctaUrl}`,
    '',
  ].filter(Boolean)),
].join('\n');

fs.writeFileSync(
  path.join(outputDir, `launch-plan.${language}.md`),
  `${markdown}\n`,
  'utf8',
);

console.log(`Campaign:       ${output.campaign}`);
console.log(`Language:       ${output.language}`);
console.log(`Posts:          ${output.generatedPosts}`);
console.log(`Cadence/week:   ${output.cadencePerWeek}`);
console.log(`Estimated weeks:${String(output.estimatedWeeks).padStart(4)}`);
console.log(`Created:        dist/social-launch/launch-plan.${language}.json`);
console.log(`Created:        dist/social-launch/launch-plan.${language}.md`);

if (output.generatedPosts !== config.launch.targetPosts) {
  throw new Error(
    `Expected ${config.launch.targetPosts} launch posts, generated ${output.generatedPosts}`,
  );
}
