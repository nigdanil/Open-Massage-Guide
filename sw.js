const CACHE_VERSION = 'massage-guide-v10-offline-download';
const OFFLINE_CACHE = 'massage-guide-offline-library';
const OFFLINE_MARKER = './__offline-library-complete__';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/css/modular-extra.css',
  './assets/js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './data/categories.json',
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
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_VERSION && key !== OFFLINE_CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const message = event.data || {};

  if (message.type === 'GET_OFFLINE_LIBRARY_STATUS') {
    event.waitUntil(reportOfflineLibraryStatus(event.source));
    return;
  }

  if (message.type === 'DOWNLOAD_OFFLINE_LIBRARY') {
    event.waitUntil(downloadOfflineLibrary(event.source, message.manifest));
  }
});

async function reportOfflineLibraryStatus(client) {
  if (!client) return;

  const cache = await caches.open(OFFLINE_CACHE);
  const markerUrl = new URL(OFFLINE_MARKER, self.registration.scope).href;
  const marker = await cache.match(markerUrl);

  if (!marker) {
    client.postMessage({ type: 'OFFLINE_LIBRARY_STATUS', ready: false });
    return;
  }

  try {
    const data = await marker.json();
    client.postMessage({
      type: 'OFFLINE_LIBRARY_STATUS',
      ready: true,
      totalBytes: data.totalBytes || 0,
      fileCount: data.fileCount || 0,
    });
  } catch (_) {
    client.postMessage({ type: 'OFFLINE_LIBRARY_STATUS', ready: true });
  }
}

async function downloadOfflineLibrary(client, manifest) {
  if (!client) return;

  try {
    if (!manifest || !Array.isArray(manifest.files)) {
      throw new Error('Invalid offline manifest');
    }

    const cache = await caches.open(OFFLINE_CACHE);
    const urls = manifest.files.map(
      (file) => new URL(file, self.registration.scope).href,
    );

    client.postMessage({
      type: 'OFFLINE_DOWNLOAD_STARTED',
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

        let response = await cache.match(url);

        if (!response) {
          const existing = await caches.match(url);
          if (existing?.ok) {
            response = existing;
          } else {
            response = await fetch(url);
          }

          if (!response?.ok) {
            throw new Error(`Failed to cache ${url}`);
          }

          await cache.put(url, response.clone());
        }

        completed += 1;
        client.postMessage({
          type: 'OFFLINE_DOWNLOAD_PROGRESS',
          completed,
          total: urls.length,
        });
      }
    }

    const concurrency = Math.min(4, Math.max(1, urls.length));
    await Promise.all(Array.from({ length: concurrency }, () => cacheNext()));

    const markerUrl = new URL(OFFLINE_MARKER, self.registration.scope).href;
    await cache.put(
      markerUrl,
      new Response(
        JSON.stringify({
          fileCount: manifest.fileCount || urls.length,
          totalBytes: manifest.totalBytes || 0,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );

    client.postMessage({
      type: 'OFFLINE_DOWNLOAD_COMPLETE',
      total: urls.length,
      totalBytes: manifest.totalBytes || 0,
    });
  } catch (error) {
    client.postMessage({
      type: 'OFFLINE_DOWNLOAD_ERROR',
      message: error?.message || 'Offline download failed',
    });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
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

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
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
    return caches.match(request);
  }
}
