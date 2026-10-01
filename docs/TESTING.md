# UI smoke testing

Open Massage Guide uses Playwright for automatic browser-level smoke tests.

The goal is not to reproduce every visual detail. The suite protects the critical user paths that must work before a GitHub Pages deployment is allowed.

---

## Current smoke contract

The suite verifies:

- production catalog loads;
- UI count matches the number of published techniques in the generated catalog;
- search works;
- category filtering works;
- a card opens;
- opening a card creates `#/technique/<id>`;
- a direct deep link opens the correct technique;
- deep link survives browser reload;
- Browser Back closes the technique;
- dialog close removes the technique hash;
- RU → EN keeps the same technique open;
- favorites work and persist;
- favorites-only filtering works;
- an unknown technique route fails safely;
- catalog and technique dialog remain usable at a mobile viewport.

The suite deliberately reads the generated catalog to determine expected published counts. It must not require updating a hard-coded `91` when new techniques are published.

---

## Dependencies

```text
@playwright/test 1.63.0
http-server 14.1.1
```

`http-server` serves the real production output:

```text
dist/site/
```

The tests therefore exercise the same files that GitHub Pages deploys.

---

## First local setup

From the repository root:

```bash
npm ci
```

Install Chromium used by smoke tests:

```bash
npx playwright install chromium
```

On a Linux workstation that also needs system browser dependencies:

```bash
npx playwright install --with-deps chromium
```

---

## Standard local run

Build production and run smoke tests:

```bash
npm run test:smoke
```

Expected summary:

```text
11 passed
```

The Playwright web server is started automatically on:

```text
http://127.0.0.1:4173
```

---

## Headed browser mode

Useful when debugging a failure:

```bash
npm run test:smoke:headed
```

---

## Playwright UI mode

Interactive test runner:

```bash
npm run test:smoke:ui
```

---

## Run one test

Example:

```bash
npx playwright test -g "direct deep link"
```

---

## Reports and failure artifacts

Generated locally:

```text
playwright-report/
test-results/
```

These directories are ignored by Git.

CI uploads the Playwright report as an Actions artifact when the UI smoke step fails.

---

## Service Worker policy during smoke tests

The general UI smoke suite blocks Service Worker registration.

Reason:

- tests must exercise the current production build deterministically;
- an older browser cache must not hide a broken current build;
- offline/PWA behavior has its own explicit manual acceptance tests.

This does **not** disable Service Worker functionality in production.

---

## GitHub Actions

Pipeline order:

```text
validate
   ↓
build production
   ↓
check production build
   ↓
install Playwright
   ↓
run Chromium smoke tests
   ↓
upload Pages artifact
   ↓
deploy
```

A failed UI smoke test blocks deployment.

---

## Before commit

For changes that can affect frontend behavior:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
python scripts/check_image_spec.py
node scripts/check-analytics.mjs
node scripts/build-site.mjs
node scripts/check-build.mjs
npm run test:smoke:ci
git diff --check
```

If `dist/site` has not already been built, use:

```bash
npm run test:smoke
```

---

## When to add a smoke test

Add a new test when a regression would make the product unusable or break a key business measurement.

Good candidates:

- navigation;
- catalog rendering;
- opening a technique;
- language switching;
- search/filter behavior;
- favorites;
- deep links;
- critical analytics integration.

Do not turn the smoke suite into exhaustive visual regression testing.
