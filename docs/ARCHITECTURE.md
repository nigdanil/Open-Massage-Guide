# Архитектура Open Massage Guide

## Общая модель

Open Massage Guide — статическое PWA-приложение.

Основной production-хостинг проекта — **GitHub Pages**.

Для работы основного справочника не требуются собственный backend, API,
VPS, Nginx или база данных.

Production-поток:

```text
Git repository
        ↓
GitHub Actions
        ↓
production build
        ↓
GitHub Pages
```

Текущий production URL:

```text
https://nigdanil.github.io/Open-Massage-Guide/
```

Домен `openmassageguide.com` сохраняется для последующего подключения
непосредственно к GitHub Pages как custom domain.

До отдельного этапа подключения домена canonical production URL остаётся
GitHub Pages URL.

---

## Источник истины

Основной индекс техник:

```text
data/techniques/index.json
```

Каждая техника хранится отдельным модулем:

```text
data/techniques/
  back/
    back-001/
      meta.json
      ru.json
      en.json
```

Общие данные:

```text
data/categories.json
data/locales/
```

Изображения:

```text
assets/images/techniques/
```

`meta.json` содержит языконезависимые машинные данные техники.

`ru.json` и `en.json` содержат пользовательские тексты соответствующих
локалей.

Старый монолитный файл:

```text
data/techniques.json
```

не является источником данных приложения и не должен использоваться
для добавления или редактирования техник.

---

## Generated data

Модульные файлы остаются источником истины, а для браузера собираются
агрегированные данные:

```text
data/generated/catalog.ru.json
data/generated/catalog.en.json
data/generated/offline-manifest.json
```

Поток:

```text
data/techniques/*
        ↓
validation
        ↓
build-catalogs
        ↓
data/generated/*
        ↓
production build
```

Generated-файлы не редактируются вручную.

---

## Production build

Production build создаётся командой:

```bash
node scripts/build-site.mjs
```

Результат:

```text
dist/site/
```

Проверка production build:

```bash
node scripts/check-build.mjs
```

GitHub Pages получает содержимое `dist/site/`.

Исходная модульная структура проекта остаётся в Git-репозитории и
используется build-процессом.

---

## CI/CD

Production workflow:

```text
.github/workflows/pages.yml
```

После push в `main` GitHub Actions выполняет validation, build,
smoke-checks и deploy.

Упрощённая схема:

```text
source
  ↓
validation
  ↓
generated data
  ↓
production build
  ↓
smoke checks
  ↓
GitHub Pages deploy
```

Ошибка validation, build или обязательных smoke-checks должна
останавливать production deploy.

---

## PWA и offline

Приложение использует:

```text
manifest.webmanifest
sw.js
```

Service Worker отвечает за offline-кэш и обновление локальной библиотеки.

PWA работает поверх статического HTTPS-хостинга GitHub Pages и не требует
отдельного application server.

---

## Аналитика

Продуктовая аналитика не является runtime-зависимостью основного
справочника.

Схема:

```text
GitHub Pages
      ↓
browser
      ↓
Umami
```

Недоступность аналитики не должна блокировать каталог, поиск, карточки,
избранное, PWA или offline-режим.

---

## Publishing и social assets

Publishing workflow, Telegram/Instagram launch plan, social cards и launch
kit генерируются из данных проекта.

Они являются build/editorial-инструментами и не являются обязательной
частью runtime публичного сайта.

---

## Hosting policy

Для основного Open Massage Guide фиксируется правило:

```text
Production hosting = GitHub Pages
```

В обязательную production-архитектуру не входят:

```text
VPS
Nginx
собственный application server
собственный database server
```

Если в будущем отдельный функциональный модуль потребует backend,
он должен проектироваться отдельно и не должен без необходимости менять
статическую архитектуру основного справочника.

---

## Custom domain

Зарезервированный домен:

```text
openmassageguide.com
```

План:

```text
openmassageguide.com
        ↓
GitHub Pages
```

До отдельного этапа подключения домена публичные ссылки, publishing
configuration и UTM должны использовать текущий GitHub Pages URL.

Временные VPS IP, локальные адреса и тестовые хосты не должны попадать
в production configuration или маркетинговые ссылки.
