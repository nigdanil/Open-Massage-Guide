const CACHE_VERSION = 'massage-guide-v17-umami-production';
const OFFLINE_CACHE_PREFIX = 'massage-guide-offline-library-';
const LEGACY_OFFLINE_CACHE = 'massage-guide-offline-library';
const OFFLINE_META_CACHE = 'massage-guide-offline-meta';
const OFFLINE_ACTIVE_KEY = './__offline-active-version__';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/css/modular-extra.css',
  './assets/js/app.js',
  './assets/js/analytics.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './data/categories.json',
  './data/analytics.json',
  './data/generated/catalog.ru.json',
  './data/generated/catalog.en.json',
  './data/generated/offline-manifest.json',
  './data/locales/ru.json',
  './data/locales/en.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) => (
          key !== CACHE_VERSION
          && key !== OFFLINE_META_CACHE
          && key !== LEGACY_OFFLINE_CACHE
          && !key.startsWith(OFFLINE_CACHE_PREFIX)
        ))
        .map((key) => caches.delete(key)),
    );

    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const message = event.data || {};

  if (message.type === 'GET_OFFLINE_LIBRARY_STATUS') {
    event.waitUntil(
      reportOfflineLibraryStatus(event.source, message.currentVersion),
    );
    return;
  }

  if (message.type === 'DOWNLOAD_OFFLINE_LIBRARY') {
    event.waitUntil(downloadOfflineLibrary(event.source, message.manifest));
  }
});

async function getActiveOfflineVersion() {
  const metaCache = await caches.open(OFFLINE_META_CACHE);
  const activeUrl = new URL(OFFLINE_ACTIVE_KEY, self.registration.scope).href;
  const response = await metaCache.match(activeUrl);

  if (!response) return null;

  try {
    const data = await response.json();
    return data.version || null;
  } catch (_) {
    return null;
  }
}

async function setActiveOfflineVersion(version, manifest) {
  const metaCache = await caches.open(OFFLINE_META_CACHE);
  const activeUrl = new URL(OFFLINE_ACTIVE_KEY, self.registration.scope).href;

  await metaCache.put(
    activeUrl,
    new Response(
      JSON.stringify({
        version,
        totalBytes: manifest.totalBytes || 0,
        fileCount: manifest.fileCount || 0,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  );
}

async function getActiveOfflineMetadata() {
  const metaCache = await caches.open(OFFLINE_META_CACHE);
  const activeUrl = new URL(OFFLINE_ACTIVE_KEY, self.registration.scope).href;
  const response = await metaCache.match(activeUrl);

  if (!response) return null;

  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}


async function cleanupOldOfflineCaches(activeVersion) {
  const activeCacheName = activeVersion
    ? `${OFFLINE_CACHE_PREFIX}${activeVersion}`
    : null;

  const keys = await caches.keys();

  await Promise.all(
    keys
      .filter((key) => (
        (key === LEGACY_OFFLINE_CACHE || key.startsWith(OFFLINE_CACHE_PREFIX))
        && key !== activeCacheName
      ))
      .map((key) => caches.delete(key)),
  );
}

async function reportOfflineLibraryStatus(client, currentVersion) {
  if (!client) return;

  const metadata = await getActiveOfflineMetadata();

  if (metadata?.version) {
    await cleanupOldOfflineCaches(metadata.version);

    client.postMessage({
      type: 'OFFLINE_LIBRARY_STATUS',
      ready: true,
      installedVersion: metadata.version,
      currentVersion: currentVersion || null,
      updateAvailable: Boolean(currentVersion && metadata.version !== currentVersion),
      totalBytes: metadata.totalBytes || 0,
      fileCount: metadata.fileCount || 0,
    });
    return;
  }

  // Stage 8 migration: an old fixed cache may exist without version metadata.
  if (await caches.has(LEGACY_OFFLINE_CACHE)) {
    client.postMessage({
      type: 'OFFLINE_LIBRARY_STATUS',
      ready: true,
      installedVersion: 'legacy',
      currentVersion: currentVersion || null,
      updateAvailable: true,
      legacy: true,
    });
    return;
  }

  client.postMessage({
    type: 'OFFLINE_LIBRARY_STATUS',
    ready: false,
    installedVersion: null,
    currentVersion: currentVersion || null,
    updateAvailable: false,
  });
}

async function downloadOfflineLibrary(client, manifest) {
  if (!client) return;

  let targetCacheName = null;

  try {
    if (
      !manifest
      || manifest.schemaVersion !== 2
      || typeof manifest.version !== 'string'
      || !manifest.version
      || !Array.isArray(manifest.files)
    ) {
      throw new Error('Invalid versioned offline manifest');
    }

    const version = manifest.version;
    targetCacheName = `${OFFLINE_CACHE_PREFIX}${version}`;

    // Remove a partial cache from a previous failed attempt for this version.
    await caches.delete(targetCacheName);
    const targetCache = await caches.open(targetCacheName);

    const urls = manifest.files.map(
      (file) => new URL(file, self.registration.scope).href,
    );

    client.postMessage({
      type: 'OFFLINE_DOWNLOAD_STARTED',
      version,
      total: urls.length,
      totalBytes: manifest.totalBytes || 0,
    });

    let completed = 0;
    let nextIndex = 0;

    async function cacheNext() {
      while (nextIndex < urls.length) {
        const index = nextIndex;
        nextIndex += 1;
        const url = urls[index];

        // Always fetch a fresh copy for a new manifest version.
        const response = await fetch(new Request(url, { cache: 'no-store' }));

        if (!response?.ok) {
          throw new Error(`Failed to cache ${url}`);
        }

        await targetCache.put(url, response.clone());

        completed += 1;
        client.postMessage({
          type: 'OFFLINE_DOWNLOAD_PROGRESS',
          version,
          completed,
          total: urls.length,
        });
      }
    }

    const concurrency = Math.min(4, Math.max(1, urls.length));
    await Promise.all(Array.from({ length: concurrency }, () => cacheNext()));

    // Atomic switch: the old active library remains untouched until all
    // files of the new version have been downloaded successfully.
    await setActiveOfflineVersion(version, manifest);

    await cleanupOldOfflineCaches(version);

    client.postMessage({
      type: 'OFFLINE_DOWNLOAD_COMPLETE',
      version,
      total: urls.length,
      totalBytes: manifest.totalBytes || 0,
    });
  } catch (error) {
    // Failed update must not damage the currently active offline library.
    if (targetCacheName) {
      await caches.delete(targetCacheName);
    }

    client.postMessage({
      type: 'OFFLINE_DOWNLOAD_ERROR',
      message: error?.message || 'Offline download failed',
    });
  }
}

async function matchActiveOfflineLibrary(request) {
  const version = await getActiveOfflineVersion();

  if (version) {
    const cache = await caches.open(`${OFFLINE_CACHE_PREFIX}${version}`);
    const response = await cache.match(request);
    if (response) return response;
  }

  // Compatibility with a Stage 8 library until the user upgrades it.
  const legacyCache = await caches.open(LEGACY_OFFLINE_CACHE);
  return legacyCache.match(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});


async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response?.ok) return response;
  } catch (_) {
    // Continue with offline fallback.
  }

  const indexUrl = new URL('./index.html', self.registration.scope).href;
  const indexRequest = new Request(indexUrl);

  const offline = await matchActiveOfflineLibrary(indexRequest);
  if (offline) return offline;

  const shell = await caches.match(indexRequest);
  if (shell) return shell;

  return new Response(
    'Open Massage Guide is unavailable offline because the application shell is not cached.',
    {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  );
}

async function cacheFirst(request) {
  // Always prefer the current application shell created by the active
  // Service Worker. Otherwise an older downloaded offline library can pin
  // stale app.js/CSS after a deploy.
  const currentCache = await caches.open(CACHE_VERSION);
  const current = await currentCache.match(request);
  if (current) return current;

  const offline = await matchActiveOfflineLibrary(request);
  if (offline) return offline;

  const response = await fetch(request);
  if (response.ok) {
    currentCache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const offline = await matchActiveOfflineLibrary(request);
    return offline || caches.match(request);
  }
}
