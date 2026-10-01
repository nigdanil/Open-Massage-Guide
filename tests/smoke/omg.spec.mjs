import { test, expect } from '@playwright/test';

async function forceLanguage(page, language = 'ru') {
  await page.addInitScript((selectedLanguage) => {
    localStorage.setItem('massage-language', selectedLanguage);
    localStorage.setItem('massage-theme', 'light');
  }, language);
}

async function publishedCatalog(request, language = 'ru') {
  const response = await request.get(`/data/generated/catalog.${language}.json`);
  expect(response.ok()).toBeTruthy();

  const catalog = await response.json();
  return catalog.filter((item) => item.status === 'published');
}

async function openCatalog(page, language = 'ru') {
  await forceLanguage(page, language);
  await page.goto('/');
  await expect(page.locator('#cardsGrid .technique-card').first()).toBeVisible();
}

test.describe('Open Massage Guide smoke', () => {
  test('production catalog renders every published technique', async ({ page, request }) => {
    const published = await publishedCatalog(request, 'ru');

    await openCatalog(page, 'ru');

    await expect(page.locator('#techniqueCount')).toHaveText(String(published.length));
    await expect(page.locator('#cardsGrid .technique-card')).toHaveCount(published.length);
    await expect(page.locator('#categoryCount')).not.toHaveText('0');
  });

  test('search narrows the catalog to the expected technique', async ({ page }) => {
    await openCatalog(page, 'ru');

    await page.locator('#searchInput').fill('Продольное поглаживание спины');

    const cards = page.locator('#cardsGrid .technique-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute('data-id', 'back-001');
  });

  test('category filter shows the same number of items as the generated catalog', async ({
    page,
    request,
  }) => {
    const published = await publishedCatalog(request, 'ru');
    const expectedBackCount = published.filter((item) => item.category === 'back').length;

    expect(expectedBackCount).toBeGreaterThan(0);

    await openCatalog(page, 'ru');
    await page.locator('#categorySelect').selectOption('back');

    await expect(page.locator('#cardsGrid .technique-card')).toHaveCount(expectedBackCount);
  });

  test('card click creates a deep link and opens the correct dialog', async ({ page }) => {
    await openCatalog(page, 'ru');

    const card = page.locator('.technique-card[data-id="back-001"]');
    await card.locator('.card-open').click();

    await expect(page).toHaveURL(/#\/technique\/back-001$/);
    await expect(page.locator('#techniqueDialog')).toHaveAttribute('open', '');
    await expect(page.locator('#dialogContent h2')).toHaveText('Продольное поглаживание спины');
  });

  test('direct deep link survives reload', async ({ page }) => {
    await forceLanguage(page, 'ru');
    await page.goto('/#/technique/back-001');

    await expect(page.locator('#techniqueDialog')).toHaveAttribute('open', '');
    await expect(page.locator('#dialogContent h2')).toHaveText('Продольное поглаживание спины');

    await page.reload();

    await expect(page).toHaveURL(/#\/technique\/back-001$/);
    await expect(page.locator('#techniqueDialog')).toHaveAttribute('open', '');
    await expect(page.locator('#dialogContent h2')).toHaveText('Продольное поглаживание спины');
  });

  test('browser Back closes a technique deep link', async ({ page }) => {
    await openCatalog(page, 'ru');

    await page.locator('.technique-card[data-id="back-001"] .card-open').click();
    await expect(page).toHaveURL(/#\/technique\/back-001$/);

    await page.goBack();

    await expect(page).not.toHaveURL(/#\/technique\//);
    await expect(page.locator('#techniqueDialog')).not.toHaveAttribute('open', '');
  });

  test('dialog close button removes the technique hash', async ({ page }) => {
    await forceLanguage(page, 'ru');
    await page.goto('/#/technique/back-001');

    await expect(page.locator('#techniqueDialog')).toHaveAttribute('open', '');
    await page.locator('#closeDialog').click();

    await expect(page).not.toHaveURL(/#\/technique\//);
    await expect(page.locator('#techniqueDialog')).not.toHaveAttribute('open', '');
  });

  test('language switch keeps the same deep-linked technique open', async ({
    page,
    request,
  }) => {
    const englishCatalog = await publishedCatalog(request, 'en');
    const englishTechnique = englishCatalog.find((item) => item.id === 'back-001');

    expect(englishTechnique).toBeTruthy();

    await forceLanguage(page, 'ru');
    await page.goto('/#/technique/back-001');

    await expect(page.locator('#dialogContent h2')).toHaveText('Продольное поглаживание спины');

    await page.locator('#languageSelect').selectOption('en');

    await expect(page).toHaveURL(/#\/technique\/back-001$/);
    await expect(page.locator('#languageSelect')).toHaveValue('en');
    await expect(page.locator('#dialogContent h2')).toHaveText(englishTechnique.text.title);
  });

  test('favorites persist and favorites-only filter works', async ({ page }) => {
    await openCatalog(page, 'ru');

    const card = page.locator('.technique-card[data-id="back-001"]');
    const favorite = card.locator('.favorite-control');

    await favorite.click();
    await expect(favorite).toHaveClass(/active/);

    await page.locator('#favoritesButton').click();

    await expect(page.locator('#cardsGrid .technique-card')).toHaveCount(1);
    await expect(page.locator('#cardsGrid .technique-card').first()).toHaveAttribute(
      'data-id',
      'back-001',
    );

    await page.reload();

    await expect(
      page.locator('.technique-card[data-id="back-001"] .favorite-control'),
    ).toHaveClass(/active/);
  });

  test('unknown technique deep link fails safely back to the catalog', async ({ page }) => {
    await forceLanguage(page, 'ru');
    await page.goto('/#/technique/not-found');

    await expect(page.locator('#cardsGrid .technique-card').first()).toBeVisible();
    await expect(page).not.toHaveURL(/#\/technique\/not-found$/);
    await expect(page.locator('#techniqueDialog')).not.toHaveAttribute('open', '');
  });

  test('catalog remains usable at a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCatalog(page, 'ru');

    await expect(page.locator('#appTitle')).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();
    await expect(page.locator('#cardsGrid .technique-card').first()).toBeVisible();

    await page.locator('.technique-card[data-id="back-001"] .card-open').click();
    await expect(page.locator('#techniqueDialog')).toHaveAttribute('open', '');
  });
});
