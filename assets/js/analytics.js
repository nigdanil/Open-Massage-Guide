const CONFIG_URL = './data/analytics.json';
const ATTRIBUTION_STORAGE_KEY = 'omg-attribution-v1';
const TECHNIQUE_HASH_PREFIX = '#/technique/';
const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
];

let config = {
  provider: 'umami',
  enabled: false,
  scriptUrl: '',
  websiteId: '',
  trackLocalhost: false,
  debug: false,
};

let attribution = {};
let initialized = false;
let trackerReady = false;
let eventQueue = [];
let previousLanguage = document.documentElement.lang || 'ru';

function isLocalhost() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function readSessionJson(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch (_) {
    return null;
  }
}

function writeSessionJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (_) { }
}

function safeReferrerHost() {
  if (!document.referrer) return '';
  try {
    const url = new URL(document.referrer);
    return url.hostname === window.location.hostname ? '' : url.hostname;
  } catch (_) {
    return '';
  }
}

function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const incoming = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) incoming[key] = value.slice(0, 200);
  }

  const hasIncomingUtm = Object.keys(incoming).length > 0;
  const stored = readSessionJson(ATTRIBUTION_STORAGE_KEY) || {};

  if (hasIncomingUtm) {
    attribution = {
      ...incoming,
      referrer_host: safeReferrerHost(),
      landing_path: `${window.location.pathname}${window.location.hash}`,
      captured_at: new Date().toISOString(),
    };
    writeSessionJson(ATTRIBUTION_STORAGE_KEY, attribution);
  } else {
    attribution = stored;
  }

  return attribution;
}

function sanitizeValue(value) {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'string') {
    return value.slice(0, 500);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).slice(0, 500);
}

function sanitizeData(data = {}) {
  const result = {};

  for (const [key, value] of Object.entries(data)) {
    const safeValue = sanitizeValue(value);
    if (safeValue !== undefined) result[key] = safeValue;
  }

  return result;
}

function eventContext() {
  return {
    language: document.documentElement.lang || navigator.language || '',
    ...attribution,
  };
}

function analyticsEnabled() {
  if (!config.enabled) return false;
  if (config.provider !== 'umami') return false;
  if (!config.websiteId || !config.scriptUrl) return false;
  if (isLocalhost() && !config.trackLocalhost) return false;
  if (!navigator.onLine) return false;
  return true;
}

function debugLog(...args) {
  if (config.debug) {
    console.info('[OMG analytics]', ...args);
  }
}

function sendEvent(name, data) {
  const payload = sanitizeData({
    ...eventContext(),
    ...data,
  });

  debugLog(name, payload);

  if (!analyticsEnabled()) return;

  if (trackerReady && window.umami?.track) {
    window.umami.track(name, payload);
    return;
  }

  eventQueue.push({ name, payload });
}

function flushQueue() {
  if (!trackerReady || !window.umami?.track) return;

  const pending = eventQueue;
  eventQueue = [];

  for (const item of pending) {
    window.umami.track(item.name, item.payload);
  }
}

function loadUmamiTracker() {
  return new Promise((resolve, reject) => {
    if (!analyticsEnabled()) {
      resolve(false);
      return;
    }

    if (window.umami?.track) {
      trackerReady = true;
      flushQueue();
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = config.scriptUrl;
    script.dataset.websiteId = config.websiteId;

    script.addEventListener('load', () => {
      trackerReady = true;
      flushQueue();
      debugLog('tracker loaded');
      resolve(true);
    });

    script.addEventListener('error', () => {
      debugLog('tracker failed to load');
      reject(new Error('Analytics tracker failed to load'));
    });

    document.head.append(script);
  });
}

function techniqueIdFromHash() {
  if (!window.location.hash.startsWith(TECHNIQUE_HASH_PREFIX)) return '';

  const value = window.location.hash.slice(TECHNIQUE_HASH_PREFIX.length);
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch (_) {
    return '';
  }
}

let lastTechniqueId = '';

function trackTechniqueRoute() {
  const techniqueId = techniqueIdFromHash();

  if (!techniqueId) {
    lastTechniqueId = '';
    return;
  }

  if (techniqueId === lastTechniqueId) return;
  lastTechniqueId = techniqueId;

  sendEvent('technique_open', {
    technique_id: techniqueId,
    route: 'hash',
  });
}

function bindHashTracking() {
  window.addEventListener('hashchange', () => {
    window.setTimeout(trackTechniqueRoute, 0);
  });

  window.setTimeout(trackTechniqueRoute, 0);
}

function bindSearchTracking() {
  const input = document.querySelector('#searchInput');
  if (!input) return;

  let timer = null;

  input.addEventListener('input', () => {
    window.clearTimeout(timer);

    timer = window.setTimeout(() => {
      const query = input.value.trim();
      if (query.length < 2) return;

      sendEvent('search', {
        query_length: query.length,
        results: document.querySelectorAll('.technique-card').length,
      });
    }, 700);
  });
}

function bindCategoryTracking() {
  const select = document.querySelector('#categorySelect');
  if (!select) return;

  select.addEventListener('change', () => {
    sendEvent('category_filter', {
      category: select.value || 'all',
    });
  });
}

function bindLanguageTracking() {
  const select = document.querySelector('#languageSelect');
  if (!select) return;

  previousLanguage = select.value || previousLanguage;

  select.addEventListener('change', () => {
    const nextLanguage = select.value;

    sendEvent('language_change', {
      from: previousLanguage,
      to: nextLanguage,
    });

    previousLanguage = nextLanguage;
  });
}

function bindFavoriteTracking() {
  document.addEventListener('click', (event) => {
    const control = event.target.closest?.('.favorite-control');

    if (control) {
      const card = control.closest('.technique-card');
      const techniqueId = card?.dataset?.id || '';

      window.setTimeout(() => {
        sendEvent(
          control.classList.contains('active') ? 'favorite_add' : 'favorite_remove',
          { technique_id: techniqueId },
        );
      }, 0);
      return;
    }

    const favoritesFilter = event.target.closest?.('#favoritesButton');

    if (favoritesFilter) {
      window.setTimeout(() => {
        sendEvent('favorites_filter', {
          enabled: favoritesFilter.getAttribute('aria-pressed') === 'true',
        });
      }, 0);
    }
  });
}

function bindOfflineTracking() {
  const button = document.querySelector('#offlineDownloadButton');

  button?.addEventListener('click', () => {
    sendEvent('offline_download_click');
  });

  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const message = event.data || {};

    if (message.type === 'OFFLINE_DOWNLOAD_STARTED') {
      sendEvent('offline_download_start', {
        version: message.version || '',
        files: Number(message.total) || 0,
        bytes: Number(message.totalBytes) || 0,
      });
    }

    if (message.type === 'OFFLINE_DOWNLOAD_COMPLETE') {
      sendEvent('offline_download_complete', {
        version: message.version || '',
        files: Number(message.total) || 0,
        bytes: Number(message.totalBytes) || 0,
      });
    }

    if (message.type === 'OFFLINE_DOWNLOAD_ERROR') {
      sendEvent('offline_download_error');
    }
  });
}

function bindPwaTracking() {
  document.querySelector('#installButton')?.addEventListener('click', () => {
    sendEvent('pwa_install_click');
  });

  window.addEventListener('appinstalled', () => {
    sendEvent('pwa_install_complete');
  });
}

function bindUiTracking() {
  bindHashTracking();
  bindSearchTracking();
  bindCategoryTracking();
  bindLanguageTracking();
  bindFavoriteTracking();
  bindOfflineTracking();
  bindPwaTracking();
}

async function loadConfig() {
  try {
    const response = await fetch(CONFIG_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const loaded = await response.json();
    config = { ...config, ...loaded };
  } catch (error) {
    config.enabled = false;
    debugLog('config unavailable', error.message);
  }
}

async function initAnalytics() {
  if (initialized) return;
  initialized = true;

  captureAttribution();
  await loadConfig();
  bindUiTracking();

  window.OMG_ANALYTICS = {
    track: sendEvent,
    getAttribution: () => ({ ...attribution }),
    getConfig: () => ({ ...config }),
  };

  try {
    await loadUmamiTracker();
  } catch (error) {
    debugLog(error.message);
  }
}

initAnalytics();
