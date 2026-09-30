const DEFAULT_BASE = 'https://nigdanil.github.io/Open-Massage-Guide/';

function parseArgs(argv) {
  const result = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const separator = arg.indexOf('=');

    if (separator === -1) {
      result[arg.slice(2)] = true;
    } else {
      result[arg.slice(2, separator)] = arg.slice(separator + 1);
    }
  }

  return result;
}

function requireValue(args, key) {
  const value = String(args[key] || '').trim();

  if (!value) {
    throw new Error(`Missing required --${key}=...`);
  }

  return value;
}

function validateToken(name, value) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(value)) {
    throw new Error(
      `${name} must use lowercase latin letters, digits, "_" or "-": ${value}`,
    );
  }
}

const args = parseArgs(process.argv.slice(2));

try {
  const base = String(args.base || DEFAULT_BASE);
  const source = requireValue(args, 'source');
  const medium = requireValue(args, 'medium');
  const campaign = requireValue(args, 'campaign');

  validateToken('source', source);
  validateToken('medium', medium);
  validateToken('campaign', campaign);

  const url = new URL(base);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);

  for (const key of ['content', 'term']) {
    if (!args[key]) continue;
    const value = String(args[key]).trim();
    validateToken(key, value);
    url.searchParams.set(`utm_${key}`, value);
  }

  if (args.technique) {
    const technique = String(args.technique).trim();

    if (!/^[a-z0-9][a-z0-9_-]*$/.test(technique)) {
      throw new Error(`Invalid technique id: ${technique}`);
    }

    url.hash = `/technique/${encodeURIComponent(technique)}`;
  }

  console.log(url.toString());
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  console.error('');
  console.error('Example:');
  console.error(
    'node scripts/build-utm-url.mjs '
    + '--source=instagram '
    + '--medium=organic_social '
    + '--campaign=omg_launch_ru_2026_10 '
    + '--content=reel_back_001 '
    + '--technique=back-001',
  );
  process.exit(1);
}
