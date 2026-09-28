const state = {
  techniques: [],
  categories: [],
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
  dialog: document.querySelector('#techniqueDialog'),
  dialogContent: document.querySelector('#dialogContent'),
  closeDialog: document.querySelector('#closeDialog'),
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Не удалось загрузить ${path}`);
  return response.json();
}

async function init() {
  try {
    const [categories, techniques] = await Promise.all([
      loadJson('./data/categories.json'),
      loadJson('./data/techniques.json'),
    ]);
    state.categories = categories;
    state.techniques = techniques;
    renderCategories();
    render();
  } catch (error) {
    els.cardsGrid.innerHTML = `<div class="notice">${escapeHtml(error.message)}. Если приложение открыто впервые — подключитесь к интернету.</div>`;
  }
  updateNetworkStatus();
  registerServiceWorker();
}

function renderCategories() {
  for (const category of state.categories) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.title;
    els.categorySelect.append(option);
  }
  els.techniqueCount.textContent = state.techniques.length;
  els.categoryCount.textContent = state.categories.length;
}

function getFilteredTechniques() {
  const query = els.searchInput.value.trim().toLocaleLowerCase('ru');
  const category = els.categorySelect.value;
  return state.techniques.filter((item) => {
    const haystack = [item.title, item.summary, item.category, ...(item.muscles || [])].join(' ').toLocaleLowerCase('ru');
    const queryMatch = !query || haystack.includes(query);
    const categoryMatch = category === 'all' || item.category === category;
    const favoriteMatch = !state.favoritesOnly || state.favorites.has(item.id);
    return queryMatch && categoryMatch && favoriteMatch;
  });
}

function render() {
  const items = getFilteredTechniques();
  els.cardsGrid.replaceChildren();
  els.resultCount.textContent = `${items.length} из ${state.techniques.length}`;
  els.emptyState.hidden = items.length !== 0;

  for (const item of items) {
    const node = els.cardTemplate.content.cloneNode(true);
    const article = node.querySelector('.technique-card');
    const open = node.querySelector('.card-open');
    const favorite = node.querySelector('.favorite-control');
    const image = node.querySelector('.card-image');
    const category = state.categories.find((entry) => entry.id === item.category);

    image.src = item.image;
    image.alt = item.imageAlt || item.title;
    node.querySelector('.card-category').textContent = category?.title || item.category;
    node.querySelector('.card-title').textContent = item.title;
    node.querySelector('.card-summary').textContent = item.summary;
    node.querySelector('.card-meta').innerHTML = [
      `Давление ${'●'.repeat(item.pressure)}${'○'.repeat(Math.max(0, 5 - item.pressure))}`,
      item.tempo,
      item.duration,
    ].map((value) => `<span>${escapeHtml(value)}</span>`).join('');

    const isFavorite = state.favorites.has(item.id);
    favorite.textContent = isFavorite ? '★' : '☆';
    favorite.classList.toggle('active', isFavorite);
    favorite.setAttribute('aria-label', isFavorite ? 'Удалить из избранного' : 'Добавить в избранное');

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
  render();
}

function openTechnique(item) {
  const category = state.categories.find((entry) => entry.id === item.category);
  els.dialogContent.innerHTML = `
    <img class="dialog-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" />
    <div class="dialog-body">
      <p class="eyebrow">${escapeHtml(category?.title || item.category)}</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary)}</p>
      <div class="dialog-grid">
        <div class="dialog-fact"><small>Давление</small><strong>${'●'.repeat(item.pressure)}${'○'.repeat(Math.max(0, 5 - item.pressure))}</strong></div>
        <div class="dialog-fact"><small>Темп</small><strong>${escapeHtml(item.tempo)}</strong></div>
        <div class="dialog-fact"><small>Время</small><strong>${escapeHtml(item.duration)}</strong></div>
        <div class="dialog-fact"><small>Повторы</small><strong>${escapeHtml(item.repetitions)}</strong></div>
      </div>
      <h3>Как выполнять</h3>
      <p>${escapeHtml(item.instructions)}</p>
      <h3>Зоны и мышцы</h3>
      <p>${escapeHtml((item.muscles || []).join(', '))}</p>
      <div class="dialog-warning"><strong>Осторожно:</strong> ${escapeHtml(item.warning)}</div>
    </div>`;
  els.dialog.showModal();
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
els.favoritesButton.addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  els.favoritesButton.setAttribute('aria-pressed', String(state.favoritesOnly));
  els.favoritesButton.textContent = state.favoritesOnly ? '★ Только избранное' : '☆ Избранное';
  render();
});
els.closeDialog.addEventListener('click', () => els.dialog.close());
els.dialog.addEventListener('click', (event) => {
  if (event.target === els.dialog) els.dialog.close();
});

init();
