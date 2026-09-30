const SUPPORTED_LANGUAGES = ['ru', 'en'];
const SUPPORTED_THEMES = ['system', 'light', 'dark'];
const THEME_STORAGE_KEY = 'massage-theme';
const PREVIEW_MODE = new URLSearchParams(window.location.search).get('preview') === '1';
const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');

function resolveInitialLanguage() {
  const saved = localStorage.getItem('massage-language');
  if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
  const browserLanguage = (navigator.language || '').toLowerCase();
  return browserLanguage.startsWith('ru') ? 'ru' : 'en';
}

function resolveInitialThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (SUPPORTED_THEMES.includes(saved)) return saved;
  } catch (_) { }
  return 'system';
}

function resolvedTheme(preference) {
  if (preference === 'system') return systemThemeMedia.matches ? 'dark' : 'light';
  return preference;
}

const state = {
  techniques: [],
  categories: [],
  locale: null,
  language: resolveInitialLanguage(),
  themePreference: resolveInitialThemePreference(),
  favoritesOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem('massage-favorites') || '[]')),
  deferredPrompt: null,
  offlineDownloadStatus: 'idle',
  offlineDownloadProgress: 0,
  offlineDownloadBytes: 0,
  offlineDownloadError: '',
  offlineManifest: null,
  offlineInstalledVersion: null,
};

const els = {
  cardsGrid: document.querySelector('#cardsGrid'),
  cardTemplate: document.querySelector('#cardTemplate'),
  categorySelect: document.querySelector('#categorySelect'),
  searchInput: document.querySelector('#searchInput'),
  favoritesButton: document.querySelector('#favoritesButton'),
  resultCount: document.querySelector('#resultCount'),
  emptyState: document.querySelector('#emptyState'),
  techniqueCount: document.querySelector('#techniqueCount'),
  categoryCount: document.querySelector('#categoryCount'),
  offlineNotice: document.querySelector('#offlineNotice'),
  installButton: document.querySelector('#installButton'),
  offlineDownloadButton: document.querySelector('#offlineDownloadButton'),
  themeToggle: document.querySelector('#themeToggle'),
  themeToggleIcon: document.querySelector('#themeToggleIcon'),
  languageSelect: document.querySelector('#languageSelect'),
  dialog: document.querySelector('#techniqueDialog'),
  dialogContent: document.querySelector('#dialogContent'),
  closeDialog: document.querySelector('#closeDialog'),
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function loadLocale(language) {
  state.locale = await loadJson(`./data/locales/${language}.json`);
  state.language = language;
  localStorage.setItem('massage-language', language);
  document.documentElement.lang = language;
  els.languageSelect.value = language;
}

function shouldIncludeTechnique(meta) {
  return meta.status === 'published' || PREVIEW_MODE;
}

async function loadTechniqueModules(language) {
  const catalog = await loadJson(`./data/generated/catalog.${language}.json`);
  return catalog.filter(shouldIncludeTechnique);
}

async function reloadTechniqueTexts(language) {
  state.techniques = await loadTechniqueModules(language);
}

function ui(key, fallback = '') {
  return state.locale?.ui?.[key] ?? fallback;
}

function techniqueText(item, key, fallback = '') {
  return item.text?.[key] ?? fallback;
}

function categoryTitle(id) {
  return state.locale?.categories?.[id] ?? id;
}

function formatTemplate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function pressureDots(item) {
  return `${'●'.repeat(item.pressure)}${'○'.repeat(Math.max(0, 5 - item.pressure))}`;
}

function applyTheme(preference, persist = true) {
  const safePreference = SUPPORTED_THEMES.includes(preference) ? preference : 'system';
  state.themePreference = safePreference;

  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, safePreference); } catch (_) { }
  }

  const theme = resolvedTheme(safePreference);
  document.documentElement.dataset.theme = theme;
  updateThemeToggle(theme);

  const themeColor = document.querySelector('#themeColor');
  if (themeColor) themeColor.content = theme === 'dark' ? '#101514' : '#0f766e';
}

function handleSystemThemeChange() {
  if (state.themePreference === 'system') applyTheme('system', false);
}

function updateThemeToggle(theme = resolvedTheme(state.themePreference)) {
  const switchToDark = theme === 'light';
  const label = switchToDark
    ? ui('switchToDarkTheme', 'Switch to dark theme')
    : ui('switchToLightTheme', 'Switch to light theme');

  els.themeToggleIcon.textContent = switchToDark ? '☾' : '☀';
  els.themeToggle.setAttribute('aria-label', label);
  els.themeToggle.title = label;
}

function renderStaticUi() {
  document.title = ui('documentTitle', 'Open Massage Guide');
  document.querySelector('#metaDescription').content = ui('metaDescription', 'Open Massage Guide');
  document.querySelector('#appTitle').textContent = ui('appTitle');
  document.querySelector('#appSubtitle').textContent = ui('appSubtitle');
  document.querySelector('#heroTitle').textContent = ui('heroTitle');
  document.querySelector('#heroDescription').textContent = ui('heroDescription');
  document.querySelector('#techniqueCountLabel').textContent = ui('techniquesLabel');
  document.querySelector('#categoryCountLabel').textContent = ui('sectionsLabel');
  document.querySelector('#freeLabel').textContent = ui('freeLabel');
  document.querySelector('#searchLabel').textContent = ui('search');
  document.querySelector('#catalogEyebrow').textContent = ui('catalogEyebrow');
  document.querySelector('#catalogTitle').textContent = ui('catalog');
  document.querySelector('#openSourceTitle').textContent = ui('openSourceTitle');
  document.querySelector('#openSourceText').textContent = ui('openSourceText');
  document.querySelector('#telegramGuideLink').textContent = ui('telegramGuide');
  document.querySelector('#safetyTitle').textContent = ui('safetyTitle');
  document.querySelector('#safetyText').textContent = ui('safetyText');
  els.searchInput.placeholder = ui('searchPlaceholder');
  els.emptyState.textContent = ui('noResults');
  els.offlineNotice.textContent = ui('offlineNotice');
  els.installButton.textContent = ui('install');
  renderOfflineDownloadButton();
  els.languageSelect.setAttribute('aria-label', ui('language'));
  updateThemeToggle();
  els.closeDialog.setAttribute('aria-label', ui('close'));
  els.favoritesButton.textContent = state.favoritesOnly ? ui('favoritesOnly') : ui('favorites');
}

async function init() {
  try {
    const [categories] = await Promise.all([loadJson('./data/categories.json')]);
    state.categories = categories.sort((a, b) => a.order - b.order);
    await loadLocale(state.language);
    state.techniques = await loadTechniqueModules(state.language);
    applyTheme(state.themePreference, false);
    renderStaticUi();
    renderCategories();
    render();
  } catch (error) {
    els.cardsGrid.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
  updateNetworkStatus();
  registerServiceWorker();
}

function renderCategories() {
  const selected = els.categorySelect.value || 'all';
  els.categorySelect.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = ui('allZones');
  els.categorySelect.append(allOption);

  for (const category of state.categories) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = categoryTitle(category.id);
    els.categorySelect.append(option);
  }

  if ([...els.categorySelect.options].some((option) => option.value === selected)) {
    els.categorySelect.value = selected;
  }
  els.techniqueCount.textContent = state.techniques.length;
  els.categoryCount.textContent = state.categories.length;
}

function getFilteredTechniques() {
  const localeName = state.language === 'ru' ? 'ru' : 'en';
  const query = els.searchInput.value.trim().toLocaleLowerCase(localeName);
  const category = els.categorySelect.value;

  return state.techniques.filter((item) => {
    const haystack = [
      techniqueText(item, 'title'),
      techniqueText(item, 'summary'),
      techniqueText(item, 'goal'),
      categoryTitle(item.category),
      ...(techniqueText(item, 'areasText', [])),
      ...(item.tags || []),
    ].filter(Boolean).join(' ').toLocaleLowerCase(localeName);

    const queryMatch = !query || haystack.includes(query);
    const categoryMatch = category === 'all' || item.category === category;
    const favoriteMatch = !state.favoritesOnly || state.favorites.has(item.id);
    return queryMatch && categoryMatch && favoriteMatch;
  });
}

function mediaHtml(item, dialog = false) {
  if (dialog && Array.isArray(item.images) && item.images.length > 0) {
    const alt = escapeHtml(
      techniqueText(
        item,
        'imageAlt',
        techniqueText(item, 'title', item.id),
      ),
    );
    return `
    <div class="dialog-gallery">
      ${item.images
        .map(
          (image, index) => `
            <img
              class="dialog-image"
              src="${escapeHtml(image)}"
              alt="${alt}${item.images.length > 1 ? ` — ${index + 1}` : ''}"
            />
          `,
        )
        .join('')}
    </div>
  `;
  }
  const image = dialog ? item.image : (item.thumbnail || item.image);
  if (image) {
    const className = dialog ? 'dialog-image' : 'card-image';
    return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(techniqueText(item, 'imageAlt', techniqueText(item, 'title', item.id)))}" ${dialog ? '' : 'loading="lazy"'} />`;
  }

  const className = dialog ? 'dialog-image-placeholder' : 'card-image-placeholder';
  return `<div class="${className}" role="img" aria-label="${escapeHtml(ui('imagePending'))}">
    <span aria-hidden="true">✦</span>
    <strong>${escapeHtml(ui('imagePending'))}</strong>
  </div>`;
}

function render() {
  const items = getFilteredTechniques();
  els.cardsGrid.replaceChildren();
  els.resultCount.textContent = formatTemplate(ui('resultCount', '{shown} / {total}'), {
    shown: items.length,
    total: state.techniques.length,
  });
  els.emptyState.hidden = items.length !== 0;

  for (const item of items) {
    const node = els.cardTemplate.content.cloneNode(true);
    const article = node.querySelector('.technique-card');
    const open = node.querySelector('.card-open');
    const favorite = node.querySelector('.favorite-control');
    const imageWrap = node.querySelector('.card-image-wrap');

    imageWrap.innerHTML = mediaHtml(item);
    node.querySelector('.card-category').textContent = categoryTitle(item.category);
    node.querySelector('.card-title').textContent = techniqueText(item, 'title', item.id);
    node.querySelector('.card-summary').textContent = techniqueText(item, 'summary');

    const meta = [
      `${ui('pressure')} ${pressureDots(item)}`,
      techniqueText(item, 'tempoText'),
      techniqueText(item, 'durationText'),
    ];
    if (item.status === 'draft') meta.push(ui('draft'));

    node.querySelector('.card-meta').innerHTML = meta
      .filter(Boolean)
      .map((value) => `<span>${escapeHtml(value)}</span>`)
      .join('');

    const isFavorite = state.favorites.has(item.id);
    favorite.textContent = isFavorite ? '★' : '☆';
    favorite.classList.toggle('active', isFavorite);
    favorite.setAttribute('aria-label', isFavorite ? ui('removeFavorite') : ui('addFavorite'));

    favorite.addEventListener('click', () => toggleFavorite(item.id));
    open.addEventListener('click', () => openTechnique(item));
    article.dataset.id = item.id;
    article.dataset.status = item.status;
    els.cardsGrid.append(node);
  }
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  localStorage.setItem('massage-favorites', JSON.stringify([...state.favorites]));
  renderStaticUi();
  render();
}

function listHtml(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function sectionHtml(title, body) {
  if (!body || (Array.isArray(body) && body.length === 0)) return '';
  const content = Array.isArray(body) ? listHtml(body) : `<p>${escapeHtml(body)}</p>`;
  return `<section class="dialog-section"><h3>${escapeHtml(title)}</h3>${content}</section>`;
}

function openTechnique(item) {
  const instructions = techniqueText(item, 'instructions', []);
  const instructionHtml = `<ol>${instructions.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`;

  els.dialogContent.innerHTML = `
    ${mediaHtml(item, true)}
    <div class="dialog-body">
      <p class="eyebrow">${escapeHtml(categoryTitle(item.category))}</p>
      <h2>${escapeHtml(techniqueText(item, 'title', item.id))}</h2>
      <p>${escapeHtml(techniqueText(item, 'summary'))}</p>

      <div class="dialog-grid">
        <div class="dialog-fact"><small>${escapeHtml(ui('pressure'))}</small><strong>${pressureDots(item)} · ${escapeHtml(techniqueText(item, 'pressureText'))}</strong></div>
        <div class="dialog-fact"><small>${escapeHtml(ui('tempo'))}</small><strong>${escapeHtml(techniqueText(item, 'tempoText'))}</strong></div>
        <div class="dialog-fact"><small>${escapeHtml(ui('time'))}</small><strong>${escapeHtml(techniqueText(item, 'durationText'))}</strong></div>
        <div class="dialog-fact"><small>${escapeHtml(ui('repetitions'))}</small><strong>${escapeHtml(techniqueText(item, 'repetitionsText'))}</strong></div>
      </div>

      ${sectionHtml(ui('goal'), techniqueText(item, 'goal'))}
      ${sectionHtml(ui('startingPosition'), techniqueText(item, 'startingPosition'))}
      <section class="dialog-section"><h3>${escapeHtml(ui('howTo'))}</h3>${instructionHtml}</section>
      ${sectionHtml(ui('direction'), techniqueText(item, 'direction'))}
      ${sectionHtml(ui('areas'), techniqueText(item, 'areasText', []))}
      ${sectionHtml(ui('tips'), techniqueText(item, 'tips', []))}
      ${sectionHtml(ui('commonMistakes'), techniqueText(item, 'mistakes', []))}

      <div class="dialog-warning"><strong>${escapeHtml(ui('caution'))}</strong> ${escapeHtml(techniqueText(item, 'warning'))}</div>
    </div>`;

  els.dialog.showModal();
}

async function switchLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language) || language === state.language) return;
  els.languageSelect.disabled = true;
  try {
    await loadLocale(language);
    await reloadTechniqueTexts(language);
    renderStaticUi();
    renderCategories();
    render();
  } finally {
    els.languageSelect.disabled = false;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toLocaleString(state.language, { maximumFractionDigits: 1 })} MB`;
}

function renderOfflineDownloadButton() {
  const button = els.offlineDownloadButton;
  if (!button) return;

  if (!('serviceWorker' in navigator)) {
    button.hidden = true;
    return;
  }

  button.hidden = false;
  button.disabled = ['preparing', 'downloading', 'ready'].includes(state.offlineDownloadStatus);

  let label = ui('offlineDownload', 'Download offline');

  if (state.offlineDownloadStatus === 'preparing') {
    label = ui('offlinePreparing', 'Preparing…');
  } else if (state.offlineDownloadStatus === 'downloading') {
    const progressKey = state.offlineInstalledVersion
      ? 'offlineUpdating'
      : 'offlineDownloading';
    const progressFallback = state.offlineInstalledVersion
      ? 'Updating {percent}%'
      : 'Downloading {percent}%';

    label = formatTemplate(ui(progressKey, progressFallback), {
      percent: state.offlineDownloadProgress,
    });
  } else if (state.offlineDownloadStatus === 'ready') {
    label = ui('offlineReady', 'Offline library downloaded');
  } else if (state.offlineDownloadStatus === 'update') {
    label = ui('offlineUpdate', 'Update offline');
  } else if (state.offlineDownloadStatus === 'error') {
    label = ui('offlineFailed', 'Retry offline download');
  }

  button.textContent = label;

  const size = formatBytes(state.offlineDownloadBytes);
  const details = [label, size, state.offlineDownloadError].filter(Boolean).join(' · ');
  button.title = details;
  button.setAttribute('aria-label', details || label);
}

async function downloadOfflineLibrary() {
  if (!navigator.onLine) {
    state.offlineDownloadStatus = 'error';
    state.offlineDownloadError = ui(
      'offlineNeedConnection',
      'An internet connection is required for the full offline download',
    );
    renderOfflineDownloadButton();
    return;
  }

  state.offlineDownloadStatus = 'preparing';
  state.offlineDownloadProgress = 0;
  state.offlineDownloadError = '';
  renderOfflineDownloadButton();

  try {
    const manifest = state.offlineManifest
      || await loadJson('./data/generated/offline-manifest.json');
    state.offlineManifest = manifest;
    state.offlineDownloadBytes = Number(manifest.totalBytes) || 0;

    if (navigator.storage?.estimate && state.offlineDownloadBytes > 0) {
      const estimate = await navigator.storage.estimate();
      const available = Math.max(0, (estimate.quota || 0) - (estimate.usage || 0));
      const safetyMargin = state.offlineDownloadBytes * 1.15;

      if (available > 0 && available < safetyMargin) {
        throw new Error(ui('offlineNoSpace', 'Not enough free storage for the offline library'));
      }
    }

    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active || navigator.serviceWorker.controller;
    if (!worker) throw new Error('Service Worker is not active');

    worker.postMessage({
      type: 'DOWNLOAD_OFFLINE_LIBRARY',
      manifest,
    });
  } catch (error) {
    state.offlineDownloadStatus = 'error';
    state.offlineDownloadError = error.message;
    renderOfflineDownloadButton();
  }
}

function handleServiceWorkerMessage(event) {
  const message = event.data || {};

  if (message.type === 'OFFLINE_LIBRARY_STATUS') {
    state.offlineInstalledVersion = message.installedVersion || null;

    if (message.ready && message.updateAvailable) {
      state.offlineDownloadStatus = 'update';
      state.offlineDownloadError = ui(
        'offlineUpdateAvailable',
        'Offline library update available',
      );
    } else if (message.ready) {
      state.offlineDownloadStatus = 'ready';
      state.offlineDownloadError = '';
    } else {
      state.offlineDownloadStatus = 'idle';
      state.offlineDownloadError = '';
    }

    state.offlineDownloadBytes = Number(message.totalBytes)
      || Number(state.offlineManifest?.totalBytes)
      || 0;

    renderOfflineDownloadButton();
    return;
  }

  if (message.type === 'OFFLINE_DOWNLOAD_STARTED') {
    state.offlineDownloadStatus = 'downloading';
    state.offlineDownloadProgress = 0;
    state.offlineDownloadBytes = Number(message.totalBytes) || 0;
    state.offlineDownloadError = '';
    renderOfflineDownloadButton();
    return;
  }

  if (message.type === 'OFFLINE_DOWNLOAD_PROGRESS') {
    state.offlineDownloadStatus = 'downloading';
    const total = Number(message.total) || 0;
    const completed = Number(message.completed) || 0;
    state.offlineDownloadProgress = total > 0
      ? Math.min(100, Math.round((completed / total) * 100))
      : 0;
    renderOfflineDownloadButton();
    return;
  }

  if (message.type === 'OFFLINE_DOWNLOAD_COMPLETE') {
    state.offlineDownloadStatus = 'ready';
    state.offlineDownloadProgress = 100;
    state.offlineDownloadBytes = Number(message.totalBytes) || state.offlineDownloadBytes;
    state.offlineInstalledVersion = message.version || state.offlineManifest?.version || null;
    state.offlineDownloadError = '';
    renderOfflineDownloadButton();
    return;
  }

  if (message.type === 'OFFLINE_DOWNLOAD_ERROR') {
    state.offlineDownloadStatus = 'error';
    state.offlineDownloadError = message.message || 'Offline download failed';
    renderOfflineDownloadButton();
  }
}

function updateNetworkStatus() {
  els.offlineNotice.hidden = navigator.onLine;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    const readyRegistration = await navigator.serviceWorker.ready;
    const worker = readyRegistration.active || registration.active || navigator.serviceWorker.controller;

    state.offlineManifest = await loadJson('./data/generated/offline-manifest.json');
    state.offlineDownloadBytes = Number(state.offlineManifest.totalBytes) || 0;

    renderOfflineDownloadButton();
    worker?.postMessage({
      type: 'GET_OFFLINE_LIBRARY_STATUS',
      currentVersion: state.offlineManifest.version,
    });
  } catch (error) {
    console.warn('Service Worker registration failed', error);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
}

els.offlineDownloadButton?.addEventListener('click', downloadOfflineLibrary);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredPrompt = event;
  els.installButton.hidden = false;
});

els.installButton.addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  els.installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  state.deferredPrompt = null;
  els.installButton.hidden = true;
});
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
els.searchInput.addEventListener('input', render);
els.categorySelect.addEventListener('change', render);
els.languageSelect.addEventListener('change', (event) => switchLanguage(event.target.value));
els.themeToggle.addEventListener('click', () => {
  const nextTheme = resolvedTheme(state.themePreference) === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
});
if (typeof systemThemeMedia.addEventListener === 'function') {
  systemThemeMedia.addEventListener('change', handleSystemThemeChange);
} else {
  systemThemeMedia.addListener?.(handleSystemThemeChange);
}
els.favoritesButton.addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  els.favoritesButton.setAttribute('aria-pressed', String(state.favoritesOnly));
  renderStaticUi();
  render();
});
els.closeDialog.addEventListener('click', () => els.dialog.close());
els.dialog.addEventListener('click', (event) => {
  if (event.target === els.dialog) els.dialog.close();
});

init();
