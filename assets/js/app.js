const SUPPORTED_LANGUAGES = ['ru', 'en'];
const DEFAULT_LANGUAGE = 'ru';
const SUPPORTED_THEMES = ['system', 'light', 'dark'];
const THEME_STORAGE_KEY = 'massage-theme';
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
  const locale = await loadJson(`./data/locales/${language}.json`);
  state.locale = locale;
  state.language = language;
  localStorage.setItem('massage-language', language);
  document.documentElement.lang = language;
  els.languageSelect.value = language;
}

function ui(key, fallback = '') {
  return state.locale?.ui?.[key] ?? fallback;
}

function techniqueText(item, key, fallback = '') {
  return state.locale?.techniques?.[item.id]?.[key] ?? fallback;
}

function categoryTitle(id) {
  return state.locale?.categories?.[id] ?? id;
}

function areaTitle(id) {
  return state.locale?.areas?.[id] ?? id;
}

function formatTemplate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function formatTempo(item) {
  return state.locale?.tempo?.[item.tempo] ?? item.tempo ?? '';
}

function formatDuration(item) {
  const duration = item.duration;
  if (!duration) return '';
  if (duration.key) return state.locale?.duration?.[duration.key] ?? duration.key;
  if (Number.isFinite(duration.seconds)) return `${Math.round(duration.seconds / 60)} ${ui('minutesShort', 'min')}`;
  if (Number.isFinite(duration.minSeconds) && Number.isFinite(duration.maxSeconds)) {
    return `${Math.round(duration.minSeconds / 60)}–${Math.round(duration.maxSeconds / 60)} ${ui('minutesShort', 'min')}`;
  }
  return '';
}

function formatRepetitions(item) {
  const repetitions = item.repetitions;
  if (!repetitions) return '';
  if (repetitions.key) return state.locale?.repetitions?.[repetitions.key] ?? repetitions.key;
  if (Number.isFinite(repetitions.min) && Number.isFinite(repetitions.max)) return `${repetitions.min}–${repetitions.max}`;
  if (Number.isFinite(repetitions.count)) return String(repetitions.count);
  return '';
}

function pressureDots(item) {
  return `${'●'.repeat(item.pressure)}${'○'.repeat(Math.max(0, 5 - item.pressure))}`;
}

function applyTheme(preference, persist = true) {
  const safePreference = SUPPORTED_THEMES.includes(preference) ? preference : 'system';
  state.themePreference = safePreference;

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, safePreference);
    } catch (_) { }
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
  els.languageSelect.setAttribute('aria-label', ui('language'));
  updateThemeToggle();
  els.closeDialog.setAttribute('aria-label', ui('close'));
  els.favoritesButton.textContent = state.favoritesOnly ? ui('favoritesOnly') : ui('favorites');
}

async function init() {
  try {
    const [categories, techniques] = await Promise.all([
      loadJson('./data/categories.json'),
      loadJson('./data/techniques.json'),
    ]);
    state.categories = categories.sort((a, b) => a.order - b.order);
    state.techniques = techniques;
    await loadLocale(state.language);
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
    const text = state.locale?.techniques?.[item.id] || {};
    const haystack = [
      text.title,
      text.summary,
      categoryTitle(item.category),
      ...(item.areas || []).map(areaTitle),
    ].filter(Boolean).join(' ').toLocaleLowerCase(localeName);

    const queryMatch = !query || haystack.includes(query);
    const categoryMatch = category === 'all' || item.category === category;
    const favoriteMatch = !state.favoritesOnly || state.favorites.has(item.id);
    return queryMatch && categoryMatch && favoriteMatch;
  });
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
    const image = node.querySelector('.card-image');
    const title = techniqueText(item, 'title', item.id);
    const summary = techniqueText(item, 'summary');

    image.src = item.image;
    image.alt = techniqueText(item, 'imageAlt', title);
    node.querySelector('.card-category').textContent = categoryTitle(item.category);
    node.querySelector('.card-title').textContent = title;
    node.querySelector('.card-summary').textContent = summary;
    node.querySelector('.card-meta').innerHTML = [
      `${ui('pressure')} ${pressureDots(item)}`,
      formatTempo(item),
      formatDuration(item),
    ].filter(Boolean).map((value) => `<span>${escapeHtml(value)}</span>`).join('');

    const isFavorite = state.favorites.has(item.id);
    favorite.textContent = isFavorite ? '★' : '☆';
    favorite.classList.toggle('active', isFavorite);
    favorite.setAttribute('aria-label', isFavorite ? ui('removeFavorite') : ui('addFavorite'));

    favorite.addEventListener('click', () => toggleFavorite(item.id));
    open.addEventListener('click', () => openTechnique(item));
    article.dataset.id = item.id;
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

function openTechnique(item) {
  const title = techniqueText(item, 'title', item.id);
  const summary = techniqueText(item, 'summary');
  const instructions = techniqueText(item, 'instructions', []);
  const warning = techniqueText(item, 'warning');
  const areas = (item.areas || []).map(areaTitle).join(', ');
  const instructionHtml = Array.isArray(instructions)
    ? `<ol>${instructions.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
    : `<p>${escapeHtml(instructions)}</p>`;

  els.dialogContent.innerHTML = `
    <img class="dialog-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(techniqueText(item, 'imageAlt', title))}" />
    <div class="dialog-body">
      <p class="eyebrow">${escapeHtml(categoryTitle(item.category))}</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(summary)}</p>
      <div class="dialog-grid">
        <div class="dialog-fact"><small>${escapeHtml(ui('pressure'))}</small><strong>${pressureDots(item)}</strong></div>
        <div class="dialog-fact"><small>${escapeHtml(ui('tempo'))}</small><strong>${escapeHtml(formatTempo(item))}</strong></div>
        <div class="dialog-fact"><small>${escapeHtml(ui('time'))}</small><strong>${escapeHtml(formatDuration(item))}</strong></div>
        <div class="dialog-fact"><small>${escapeHtml(ui('repetitions'))}</small><strong>${escapeHtml(formatRepetitions(item))}</strong></div>
      </div>
      <h3>${escapeHtml(ui('howTo'))}</h3>
      ${instructionHtml}
      <h3>${escapeHtml(ui('areas'))}</h3>
      <p>${escapeHtml(areas)}</p>
      <div class="dialog-warning"><strong>${escapeHtml(ui('caution'))}</strong> ${escapeHtml(warning)}</div>
    </div>`;
  els.dialog.showModal();
}

async function switchLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language) || language === state.language) return;
  els.languageSelect.disabled = true;
  try {
    await loadLocale(language);
    renderStaticUi();
    renderCategories();
    render();
  } finally {
    els.languageSelect.disabled = false;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function updateNetworkStatus() {
  els.offlineNotice.hidden = navigator.onLine;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('Service Worker registration failed', error);
  }
}

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
