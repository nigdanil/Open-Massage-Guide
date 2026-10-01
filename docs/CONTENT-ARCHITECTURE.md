# Modular content architecture

Open Massage Guide использует модульную content-first архитектуру: каждая техника является самостоятельным модулем, а `data/techniques/index.json` служит индексом каталога.

## Источник истины

Основная структура контента:

```text
data/
  categories.json
  locales/
    ru.json
    en.json
  techniques/
    index.json
    back/
      back-001/
        meta.json
        ru.json
        en.json

assets/
  images/
    techniques/
      back/
        back-001.webp
```

Старый монолитный файл `data/techniques.json` не является источником данных и удалён из актуальной архитектуры.

## `data/techniques/index.json`

Индекс содержит список модулей и связывает каталог с директориями техник.

Для каждой записи используются:

- `id` — стабильный идентификатор техники;
- `path` — путь к директории модуля;
- `category` — идентификатор категории;
- `order` — порядок отображения.

Runtime загружает индекс, затем читает `meta.json` и языковой файл выбранной локали из каждого модуля.

## `meta.json`

`meta.json` содержит языконезависимые машинно-читаемые данные техники.

Текущий валидатор ожидает основные поля:

- `id`;
- `slug`;
- `category`;
- `order`;
- `pressure`;
- `tempo`;
- `difficulty`;
- `duration`;
- `repetitions`;
- `areas`;
- `tags`;
- `status`;
- `version`.

Также модуль может содержать:

- `image` — основное изображение;
- `images` — дополнительные изображения галереи;
- `telegram` — настройки Telegram-публикации.

## Локализованный текст

Пользовательский текст хранится отдельно:

```text
ru.json
en.json
```

Для каждой поддерживаемой локали техника должна содержать полный набор пользовательских текстов, включая название, краткое описание, цель, исходное положение, инструкции, направление движений, параметры времени/темпа/давления, зоны, советы, ошибки и предупреждение.

UI-переводы и названия категорий находятся в:

```text
data/locales/ru.json
data/locales/en.json
```

## Статусы контента

Поддерживаются два состояния:

```text
draft
published
```

`draft` используется во время подготовки техники.

`published` означает, что техника готова к публичному использованию. Опубликованная техника должна иметь основное изображение.

В обычном режиме runtime включает в каталог только техники со статусом `published`.

Для редакционной проверки доступен preview-режим:

```text
?preview=1
```

Например локально:

```text
http://localhost:8080/?preview=1
```

В preview-режиме отображаются и `published`, и `draft`; draft-карточки сохраняют визуальную метку черновика. Preview-режим не меняет данные и включается только параметром URL.

## Изображения

Основные изображения техник хранятся в:

```text
assets/images/techniques/<category>/<technique-id>.webp
```

Рабочие PNG/JPEG исходники помещаются локально в `convert/` и не должны попадать в commit.

Конвертация:

```bash
python scripts/convert_images_to_webp.py --dry-run
python scripts/convert_images_to_webp.py --quality 90
```

Скрипт размещает WebP в каталоге assets и обновляет поле `image` соответствующего `meta.json`, если модуль найден.

Проверка изображений:

```bash
python scripts/check_image_links.py
```

### Thumbnail и full-size

Для опубликованной техники используются два изображения:

```text
image      — полноразмерное изображение для открытой карточки;
thumbnail  — облегчённое изображение для каталога.
```

Пример:

```json
{
  "image": "./assets/images/techniques/back/back-001.webp",
  "thumbnail": "./assets/images/techniques/back/back-001-thumb.webp"
}
```

Thumbnails генерируются из `image` автоматически:

```bash
python scripts/generate_thumbnails.py --dry-run
python scripts/generate_thumbnails.py
```

Текущий стандарт Stage 6:

```text
максимальная ширина: 640 px
WebP quality:        82
```

Маленькие изображения не увеличиваются. Пропорции исходного изображения сохраняются.

Каталог использует `thumbnail`, а открытая техника — полноразмерный `image` или `images` gallery.

## Generated browser catalogs

Исходным источником истины остаются модульные файлы в `data/techniques/`.

Для браузера из них автоматически собираются:

```text
data/generated/catalog.ru.json
data/generated/catalog.en.json
```

Генерация:

```bash
node scripts/build-catalogs.mjs
```

Каждый generated catalog содержит объединённые `meta.json` и текст соответствующей локали. Фронтенд загружает один каталог вместо отдельных `meta.json` и локализованных файлов для каждой техники.

Generated-файлы не редактируются вручную. После изменения модульного контента каталоги необходимо пересобрать.

---

## Валидация

Перед commit необходимо выполнить:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
```

`validate-content.mjs` проверяет структуру индекса, метаданные, локализованные JSON и ссылки на изображения.

`check_image_links.py` дополнительно проверяет отсутствие битых и повреждённых изображений, техники без `image` и WebP-файлы, на которые не ссылается контент.

## Deep links техник

Каждая доступная пользователю техника имеет постоянный hash URL:

```text
#/technique/<id>
```

Пример:

```text
#/technique/back-001
```

Преимущества hash-маршрута для текущего статического GitHub Pages приложения:

- не требует server-side rewrite;
- прямой URL работает на GitHub Pages;
- URL можно копировать и отправлять другому пользователю;
- browser Back закрывает технику и возвращает к каталогу;
- маршрут работает offline, потому что fragment не отправляется серверу;
- язык интерфейса может переключаться без изменения идентификатора техники.

При прямом открытии URL приложение сначала загружает каталог текущей локали, затем открывает технику по `id`.

Если `id` отсутствует в публичном каталоге, маршрут очищается без падения приложения.

Hash deep links являются продуктовым URL уровня SPA. Полноценные статические SEO-страницы выполняются отдельным следующим этапом.

---

## Offline library

Обычный Service Worker кеширует app shell и ранее открытые ресурсы.

Полная библиотека для offline загружается только по явному действию пользователя через кнопку:

```text
Скачать офлайн
```

Generated manifest:

```text
data/generated/offline-manifest.json
```

Он содержит опубликованный контент и полный app shell:

- `index.html`;
- CSS и JavaScript приложения;
- Web App Manifest и иконки;
- Telegram guide;
- RU/EN browser catalogs;
- RU/EN UI locales;
- categories;
- thumbnails;
- полноразмерные изображения;
- gallery images.

Это позволяет перезагрузить приложение при полностью отключённой сети, не полагаясь только на временный shell-cache Service Worker.

Offline library хранится в отдельном Cache Storage:

```text
massage-guide-offline-library
```

Shell-cache и offline library разделены. Обычное обновление shell-cache не должно автоматически удалять скачанную библиотеку.

Версионирование и обновление уже скачанной offline library выполняется следующим отдельным этапом.

---

### Версионирование offline library

`offline-manifest.json` содержит детерминированную версию:

```json
{
  "schemaVersion": 2,
  "version": "0123456789abcdef"
}
```

`version` вычисляется из путей и содержимого всех файлов offline package. Если опубликованный текст или изображение меняются, меняется и версия.

Каждая установленная offline library хранится в cache:

```text
massage-guide-offline-library-<version>
```

Активная версия хранится отдельно в:

```text
massage-guide-offline-meta
```

Обновление выполняется безопасно:

1. старая offline library продолжает работать;
2. новая версия полностью скачивается в новый cache;
3. только после успешного скачивания новая версия становится активной;
4. старый cache удаляется;
5. если загрузка новой версии завершилась ошибкой, старая библиотека остаётся активной.

Stage 8 cache без версии распознаётся как legacy и предлагается к обновлению.


## Telegram

Экспорт:

```bash
node scripts/export-telegram.mjs --lang=ru
node scripts/export-telegram.mjs --lang=en
```

В Telegram feed попадают только опубликованные техники, у которых разрешена Telegram-публикация и задано изображение.

## Добавление новой техники

Пример для `back-011`:

```text
data/techniques/back/back-011/
  meta.json
  ru.json
  en.json

assets/images/techniques/back/back-011.webp
```

После создания модуля необходимо добавить запись в `data/techniques/index.json`, затем выполнить обе проверки.

## Главное правило

Редактируем исходные модульные файлы техники. Производные каталоги, SEO-страницы и другие build-артефакты в следующих этапах плана должны генерироваться автоматически и не становиться вторым ручным источником истины.

## Product analytics

Product analytics вынесена из `app.js` в отдельный runtime:

```text
assets/js/analytics.js
```

Конфигурация:

```text
data/analytics.json
```

Analytics-layer не является критической зависимостью приложения:

- при `enabled: false` сайт работает без внешних запросов аналитики;
- ошибка analytics provider не должна ломать каталог;
- UTM attribution хранится только в `sessionStorage`;
- свободный поисковый текст не отправляется;
- product events подписываются на DOM, hash navigation и Service Worker messages без внедрения analytics-кода в основную бизнес-логику.

UTM и event contract описаны в:

```text
docs/ANALYTICS.md
```

---


## UI smoke test layer

Browser-level regression protection lives outside application business logic:

```text
playwright.config.mjs
tests/smoke/
```

Tests execute against the generated production tree:

```text
dist/site/
```

The smoke suite uses Chromium and intentionally blocks Service Worker registration so a stale cache cannot hide a broken current build.

GitHub Pages deployment is allowed only after:

```text
content validation
→ image validation
→ analytics validation
→ production build
→ production build smoke-check
→ Playwright UI smoke
→ deploy
```

Detailed test contract:

```text
docs/TESTING.md
```

---


## Editorial metadata

Technique `meta.json` may optionally contain:

```text
editorial
```

The block is intentionally optional during migration.

Supported workflow states:

```text
unreviewed
in-review
reviewed
```

A completed review requires:

```text
contentVersion
reviewedAt
reviewedBy
sources[]
```

The public UI displays editorial information only for `reviewed` content.

Technical validation checks structure and consistency but does not replace human medical/editorial judgment.

Detailed workflow:

```text
docs/EDITORIAL.md
```

---


## Publishing pipeline

Social publishing is a derived-output layer. Source of truth remains `data/techniques/`.

Configuration:

```text
data/publishing.json
```

Publication journal:

```text
data/publishing-state.json
```

Generated preview/queue artifacts:

```text
dist/publishing/
```

Supported Stage 15 channels: `telegram`, `instagram`.

Optional source readiness lives in `meta.publishing.<channel>.status` with `draft`, `ready`, `paused`. Actual `published` state is derived from the publication journal and deterministic fingerprint. Legacy `meta.telegram.publish` remains supported.

Detailed workflow: `docs/PUBLISHING.md`.

---

