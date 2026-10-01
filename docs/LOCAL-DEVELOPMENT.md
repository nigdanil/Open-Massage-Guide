# Локальная разработка и проверка

Эта инструкция описывает полный локальный workflow проекта **Open Massage Guide**:

- проверку окружения;
- проверку модульного контента;
- работу с изображениями;
- сборку browser catalogs;
- локальный запуск source-версии;
- preview-режим для `draft`;
- production build;
- smoke-check production build;
- проверку PWA / Service Worker;
- проверку Git перед commit;
- экспорт Telegram;
- типовые рабочие сценарии.

> Основной источник данных проекта — модульные файлы в `data/techniques/`.
> Браузер напрямую их не загружает: для него собираются агрегированные каталоги в `data/generated/`.

---

## 1. Перейти в каталог проекта

Для Git Bash / Windows:

```bash
cd /d/Open-Massage-Guide
```

Проверить текущий каталог:

```bash
pwd
```

Ожидаемо:

```text
/d/Open-Massage-Guide
```

Проверить состояние Git:

```bash
git status --short
```

Перед началом новой задачи желательно иметь чистое рабочее дерево.

---

## 2. Проверить окружение

### Git

```bash
git --version
```

### Node.js

В CI используется Node.js 22, поэтому локально рекомендуется использовать Node.js 22.

```bash
node --version
```

Проверить npm:

```bash
npm --version
```

### Python

В CI используется Python 3.12.

Проверить локальный Python:

```bash
python --version
```

Если команда `python` недоступна:

```bash
python3 --version
```

или на Windows:

```bash
py --version
```

### Pillow

Python-скрипты проверки и конвертации изображений используют Pillow.

Проверить:

```bash
python -m pip show Pillow
```

Если Pillow не установлен:

```bash
python -m pip install Pillow
```

Если используется `python3`:

```bash
python3 -m pip install Pillow
```

или:

```bash
py -m pip install Pillow
```

---

## 3. Архитектура контента

Основной индекс техник:

```text
data/techniques/index.json
```

Каждая техника хранится отдельно:

```text
data/techniques/
  back/
    back-001/
      meta.json
      ru.json
      en.json
```

### `meta.json`

Содержит языконезависимые данные:

- `id`;
- `slug`;
- `category`;
- `order`;
- `image`;
- `images` при наличии галереи;
- `pressure`;
- `tempo`;
- `difficulty`;
- `duration`;
- `repetitions`;
- `areas`;
- `tags`;
- `status`;
- `version`;
- дополнительные служебные поля.

### `ru.json` / `en.json`

Содержат пользовательские тексты соответствующей локали.

### Статусы

Поддерживаются:

```text
draft
published
```

Обычный каталог показывает только:

```text
published
```

Для просмотра `draft` используется preview-режим:

```text
?preview=1
```

---

## 4. Основная проверка контента

Запускать после изменений:

- `data/techniques/index.json`;
- любого `meta.json`;
- `ru.json`;
- `en.json`;
- категорий;
- локализации;
- структуры техники.

Команда:

```bash
node scripts/validate-content.mjs
```

Успешный результат для текущего каталога:

```text
OK: 91 modular techniques, 91 unique slugs, 91 unique orders, locales: ru, en.
```

Количество техник может увеличиваться по мере развития проекта.

### Валидатор проверяет

- корректность `data/techniques/index.json`;
- уникальность `id`;
- уникальность `slug`;
- уникальность `order`;
- уникальность путей модулей;
- соответствие директории техники её `id`;
- соответствие `index.json ↔ meta.json`;
- соответствие `id`;
- соответствие `category`;
- соответствие `order`;
- существование категории;
- обязательные поля `meta.json`;
- `pressure` в диапазоне `1–5`;
- корректный `status`;
- положительный `version`;
- непустые `tempo` и `difficulty`;
- структуру `duration`;
- структуру `repetitions`;
- массивы `areas`;
- массивы `tags`;
- наличие основного изображения у `published`;
- существование основного изображения;
- существование gallery images;
- наличие `ru.json`;
- наличие `en.json`;
- обязательные текстовые поля;
- массивы `instructions`;
- массивы `areasText`;
- массивы `tips`;
- массивы `mistakes`;
- наличие переводов категорий в UI locale.

При ошибке валидатора commit делать не следует до исправления причины.

---

## 5. Проверка изображений

После работы с изображениями и перед значимым commit выполнить:

```bash
python scripts/check_image_links.py
```

Успешный результат:

```text
RESULT: OK
```

Скрипт выводит:

```text
Indexed techniques
Referenced images
WebP files
No image in meta
Broken paths
Invalid images
Orphan WebP
```

Для полностью подготовленного каталога ожидается:

```text
No image in meta:   0
Broken paths:       0
Invalid images:     0
Orphan WebP:        0

RESULT: OK
```

### Что означают основные ошибки

`No image in meta`

Техника существует, но в `meta.json` не указан `image`.

`Broken paths`

В `meta.json` есть ссылка, но файла по этому пути нет.

`Invalid images`

Файл существует, но не читается как корректное изображение.

`Orphan WebP`

WebP лежит в `assets/images/`, но ни одна техника на него не ссылается.

---

## 6. Добавление и конвертация изображений

Этот workflow используется при добавлении или замене изображений.

Исходники помещаются в:

```text
convert/
```

Поддерживаемые исходные форматы:

```text
.png
.jpg
.jpeg
```

Имя файла должно соответствовать `id` техники, например:

```text
arms-009.png
legs-014.jpeg
self-010.png
```

### 6.1. Dry-run

Сначала всегда рекомендуется проверить план конвертации:

```bash
python scripts/convert_images_to_webp.py --dry-run
```

Dry-run ничего не записывает.

Он показывает:

- найденные изображения;
- целевые пути WebP;
- технику;
- изменение `meta.json`, если оно требуется.

### 6.2. Реальная конвертация

Используем качество WebP 90:

```bash
python scripts/convert_images_to_webp.py --quality 90
```

Workflow:

```text
convert/*.png|jpg|jpeg
        ↓
assets/images/techniques/.../*.webp
        ↓
data/techniques/.../meta.json
```

Поле:

```json
"image": "./assets/images/techniques/.../technique-id.webp"
```

может быть обновлено автоматически.

### 6.3. После конвертации

Сначала обновить thumbnail для каталога:

```bash
python scripts/generate_thumbnails.py
```

Затем выполнить:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
node scripts/build-catalogs.mjs
```

После этого проверить сайт локально.

### 6.4. Thumbnails для каталога

Полноразмерный файл хранится в поле:

```json
"image": "./assets/images/techniques/.../technique-id.webp"
```

Облегчённая версия для сетки карточек хранится в:

```json
"thumbnail": "./assets/images/techniques/.../technique-id-thumb.webp"
```

Предпросмотр генерации:

```bash
python scripts/generate_thumbnails.py --dry-run
```

Генерация:

```bash
python scripts/generate_thumbnails.py
```

По умолчанию:

```text
максимальная ширина: 640 px
WebP quality:        82
```

Карточка каталога использует `thumbnail`, а открытая техника — полноразмерный `image`/gallery.

После генерации обязательно выполнить:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
node scripts/build-catalogs.mjs
```

### Важно

Рабочие исходники из:

```text
convert/
```

не должны попадать в commit.

В Git хранятся готовые WebP, используемые приложением.

---

## 6.5. Проверка технического стандарта изображений

После генерации full-size и thumbnails выполнить:

```bash
python scripts/check_image_spec.py
```

Проверяются:

- WebP-формат;
- размеры full-size;
- размеры thumbnail;
- вес файлов;
- имя thumbnail;
- сохранение aspect ratio;
- технические hard limits и рекомендации по весу.

Полный стандарт:

```text
docs/IMAGE-SPEC.md
```

`ERROR` блокирует CI, `WARNING` носит рекомендательный характер.

---

## 7. Browser catalogs

Модульные JSON остаются **источником истины**:

```text
data/techniques/
```

Но браузер не загружает каждый `meta.json`, `ru.json` и `en.json` отдельно.

Для браузера собираются:

```text
data/generated/catalog.ru.json
data/generated/catalog.en.json
```

### 7.1. Когда пересобирать

После изменения любого:

```text
meta.json
ru.json
en.json
data/techniques/index.json
```

необходимо выполнить:

```bash
node scripts/build-catalogs.mjs
```

Ожидаемо:

```text
Built data/generated/catalog.ru.json: 91 techniques
Built data/generated/catalog.en.json: 91 techniques
```

Число техник будет меняться вместе с каталогом.

### 7.2. Важно

Если изменить модульный контент, но не пересобрать browser catalogs, обычный локальный сайт может продолжить показывать старую версию данных.

Generated catalogs не редактируются вручную.

Изменения в них должны появляться только после:

```bash
node scripts/build-catalogs.mjs
```

### 7.3. Что коммитить

`data/generated/catalog.ru.json` и:

```text
data/generated/catalog.en.json
```

являются частью текущей source-версии приложения и должны коммититься вместе с изменениями контента.

Production build в CI всё равно пересобирает их заново, что дополнительно защищает deploy от устаревшего generated-контента.

---

## 8. Source development — быстрый локальный запуск

Для обычной разработки можно запускать сайт прямо из корня репозитория.

Перед запуском после изменения контента:

```bash
node scripts/build-catalogs.mjs
```

Запустить HTTP-сервер:

```bash
python -m http.server 8080
```

Если используется `python3`:

```bash
python3 -m http.server 8080
```

или:

```bash
py -m http.server 8080
```

Открыть:

```text
http://localhost:8080/
```

Остановить:

```text
Ctrl+C
```

### Почему нельзя открывать `index.html` двойным кликом

Приложение использует:

- `fetch`;
- JSON;
- Service Worker;
- PWA API.

Поэтому запуск через `file://` не является корректным режимом разработки.

---

## 9. Preview-режим для draft-техник

Обычный адрес:

```text
http://localhost:8080/
```

показывает только техники:

```text
published
```

Для редакционной проверки всех техник, включая `draft`:

```text
http://localhost:8080/?preview=1
```

Preview-режим:

- не изменяет данные;
- не меняет `status`;
- показывает `published + draft`;
- предназначен для разработки и редакционной проверки.

Новая техника должна начинать жизнь как:

```json
"status": "draft"
```

После проверки её можно перевести в:

```json
"status": "published"
```

После изменения `status` обязательно пересобрать catalogs:

```bash
node scripts/build-catalogs.mjs
```

---

## 10. Проверка интерфейса

После запуска вручную проверить:

- главная страница открывается;
- отображается ожидаемое количество техник;
- отображается ожидаемое количество разделов;
- карточки загружаются;
- изображения отображаются;
- нет placeholder там, где изображение добавлено;
- карточка техники открывается;
- подробная информация отображается;
- поиск работает;
- фильтр категорий работает;
- избранное работает;
- RU → EN работает;
- EN → RU работает;
- тема переключается;
- диалог закрывается;
- мобильная вёрстка не ломается;
- preview-mode работает отдельно от production-mode.

---

## 11. Проверка Console

Открыть DevTools:

```text
F12
```

Перейти:

```text
Console
```

Не должно быть красных ошибок приложения:

```text
Uncaught ...
SyntaxError
TypeError
Failed to fetch
```

Если есть ошибка `Failed to fetch`, см. раздел «Типовые проблемы».

---

## 12. Проверка Network

Открыть:

```text
F12
→ Network
```

Для проверки загрузки данных удобно выбрать:

```text
Fetch/XHR
```

Затем обновить страницу.

### Нормальная загрузка

Для русского каталога ожидаются примерно:

```text
categories.json
ru.json
catalog.ru.json
```

При переключении на английский будет загружаться:

```text
en.json
catalog.en.json
```

Браузер **не должен** загружать десятки или сотни отдельных:

```text
meta.json
ru.json
en.json
```

из `data/techniques/...`.

Именно для этого используются browser catalogs.

### Ошибки

Не должно быть запросов приложения со статусами:

```text
404
500
```

Особенно проверять:

```text
.json
.webp
.js
.css
```

Служебные запросы самого браузера, не относящиеся к приложению, следует оценивать отдельно.

Например запрос браузера вида:

```text
/.well-known/appspecific/com.chrome.devtools.json
```

может возвращать `404` и не является ошибкой Open Massage Guide.

---

## 13. Проверка без браузерного кеша

Во время разработки:

```text
F12
→ Network
→ Disable cache
```

Затем:

```text
Ctrl+Shift+R
```

Это особенно полезно после изменения:

- JavaScript;
- CSS;
- JSON;
- generated catalogs;
- изображений.

`Disable cache` работает, пока DevTools открыт.

---

## 14. Service Worker и PWA-кеш

Приложение является PWA и использует Service Worker.

После изменения frontend-файлов браузер иногда может продолжать использовать старую кешированную версию.

Если отображается старый код или старое изображение:

```text
F12
→ Application
→ Service Workers
→ Unregister
```

Затем:

```text
Application
→ Storage
→ Clear site data
```

После этого:

```text
Ctrl+Shift+R
```

### Когда особенно проверять Service Worker

После изменения:

```text
sw.js
assets/js/app.js
assets/css/
manifest.webmanifest
```

или при изменении стратегии кеширования.

При изменениях app shell версия кеша в `sw.js` должна обновляться, если это требуется логикой текущей реализации.

---

## 15. Production build

Source development и production build — разные режимы.

Production build создаёт только файлы, которые должны попасть на GitHub Pages.

### 15.1. Собрать production

```bash
node scripts/build-site.mjs
```

`build-site.mjs`:

1. пересобирает browser catalogs;
2. очищает предыдущий production output;
3. создаёт:

```text
dist/site/
```

4. копирует необходимые файлы сайта.

Production build включает, в частности:

```text
dist/site/
  index.html
  manifest.webmanifest
  sw.js
  .nojekyll
  assets/
  data/
    categories.json
    generated/
    locales/
  docs/
    TELEGRAM.md
```

Модульный source-каталог:

```text
data/techniques/
```

в production build не копируется.

### 15.2. Проверить production build

```bash
node scripts/check-build.mjs
```

Ожидаемо:

```text
data/generated/catalog.ru.json: 91 techniques — OK
data/generated/catalog.en.json: 91 techniques — OK
Production build smoke-check: OK
```

Количество техник может меняться.

Smoke-check проверяет:

- обязательные production-файлы;
- generated catalogs;
- количество и порядок техник;
- наличие локализованных данных;
- наличие изображений, используемых каталогом;
- отсутствие `data/techniques/` в production output.

### 15.3. Запустить production build локально

```bash
python -m http.server 8080 --directory dist/site
```

Открыть:

```text
http://localhost:8080/
```

Это наиболее близкая локальная проверка к тому, что реально получит GitHub Pages.

### 15.4. `dist/` не коммитится

`dist/` — локальный/CI build output.

Он должен оставаться вне Git.

---

## Проверка deep links техник

URL конкретной техники:

```text
http://localhost:8080/#/technique/back-001
```

Проверить:

1. прямой переход по URL открывает нужную технику;
2. после `Ctrl+R` открывается та же техника;
3. Browser Back закрывает dialog и возвращает к каталогу;
4. кнопка закрытия убирает hash из URL;
5. RU ↔ EN сохраняет открытую технику;
6. неизвестный `id` не ломает приложение;
7. deep link работает в offline-режиме после скачивания offline library.

Пример неизвестного маршрута:

```text
http://localhost:8080/#/technique/not-found
```

После обработки приложение должно остаться рабочим и вернуться к обычному URL каталога.

---

## Проверка полной offline library

После изменения контента `build-catalogs.mjs` также обновляет:

```text
data/generated/offline-manifest.json
```

Для проверки:

```bash
node scripts/build-catalogs.mjs
node scripts/build-site.mjs
node scripts/check-build.mjs
```

Запустить production build:

```bash
python -m http.server 8080 --directory dist/site
```

Открыть приложение и нажать:

```text
Скачать офлайн
```

Дождаться состояния:

```text
Офлайн-библиотека загружена
```

После этого:

```text
F12
→ Application
→ Cache Storage
→ massage-guide-offline-library
```

Финальная ручная проверка:

1. дождаться полного скачивания;
2. открыть `Application → Cache Storage` и убедиться, что активный versioned offline-cache существует;
3. включить `Offline` в DevTools Network или Service Workers;
4. выполнить обычный `Ctrl+R`;
5. убедиться, что сама главная страница перезагрузилась без сети;
6. открыть техники из разных категорий;
7. переключить RU ↔ EN;
8. убедиться, что thumbnails и full-size изображения доступны без сети.

Полный offline package включает app shell (`index.html`, JS, CSS, manifest и иконки), поэтому обычная перезагрузка страницы должна работать без сети.

Полная библиотека никогда не скачивается автоматически — только после явного действия пользователя.

---

## Проверка обновления offline library

После Stage 9 manifest содержит:

```text
schemaVersion
version
techniqueCount
fileCount
totalBytes
files
```

Версия детерминирована содержимым offline package.

### Проверка актуальной версии

1. собрать production;
2. скачать offline library;
3. убедиться, что кнопка показывает состояние загруженной библиотеки;
4. перезагрузить приложение — состояние должно сохраниться.

### Проверка появления обновления

1. изменить одну опубликованную технику или её изображение;
2. выполнить:

```bash
node scripts/build-catalogs.mjs
node scripts/build-site.mjs
node scripts/check-build.mjs
```

3. убедиться, что `offline-manifest.json` получил другую `version`;
4. открыть приложение со старой offline library;
5. кнопка должна предложить:

```text
Обновить офлайн
```

### Проверка безопасного обновления

Во время обновления старый cache не удаляется заранее.

Для проверки ошибки:

1. начать обновление;
2. искусственно отключить сеть до завершения;
3. обновление должно завершиться ошибкой;
4. ранее активная offline library должна продолжить работать;
5. после восстановления сети повторить обновление;
6. после успешного завершения должна активироваться новая версия.

Cache Storage:

```text
massage-guide-offline-meta
massage-guide-offline-library-<version>
```

Legacy cache Stage 8 автоматически заменяется при первом успешном обновлении.

---

## 16. GitHub Actions / GitHub Pages

После push в `main` workflow:

```text
.github/workflows/pages.yml
```

выполняет production pipeline.

Текущая последовательность:

```text
validate
  ↓
image validation
  ↓
build
  ↓
smoke-check
  ↓
deploy
```

### Validate

CI проверяет:

```bash
node scripts/validate-content.mjs
```

и:

```bash
python scripts/check_image_links.py
```

Для image validation CI устанавливает Pillow.

### Build

CI выполняет:

```bash
node scripts/build-site.mjs
```

Затем:

```bash
node scripts/check-build.mjs
```

### Deploy

GitHub Pages получает только:

```text
dist/site/
```

а не весь репозиторий.

Если `validate`, `build` или `smoke-check` завершились ошибкой, deploy выполняться не должен.

После push обязательно проверить, что GitHub Actions завершился успешно.

---

## 17. Проверка Git

Посмотреть состояние:

```bash
git status --short
```

Посмотреть unstaged-изменения:

```bash
git diff
```

Статистика:

```bash
git diff --stat
```

Проверить пробельные ошибки:

```bash
git diff --check
```

После `git add`:

```bash
git diff --cached
```

или кратко:

```bash
git diff --cached --stat
```

Проверить staged-файлы:

```bash
git status --short
```

### LF / CRLF

На Windows Git может выводить предупреждение:

```text
LF will be replaced by CRLF the next time Git touches it
```

Само по себе это предупреждение не означает ошибку в проекте.

Критичным является именно результат:

```bash
git diff --check
```

Если команда не выводит ошибок, whitespace-check пройден.

---

## 18. Финальная проверка перед commit

Для значимых изменений рекомендуется полный цикл:

```bash
node scripts/validate-content.mjs

python scripts/check_image_links.py
python scripts/check_image_spec.py

node scripts/build-catalogs.mjs

node scripts/build-site.mjs

node scripts/check-build.mjs

git diff --check

git status --short
```

После этого запустить production build:

```bash
python -m http.server 8080 --directory dist/site
```

Открыть:

```text
http://localhost:8080/
```

Проверить интерфейс вручную.

Остановить:

```text
Ctrl+C
```

После ручной проверки:

```bash
git status --short
git diff
```

### Перед commit

Не рекомендуется без проверки выполнять вслепую:

```bash
git add .
```

Сначала убедиться через:

```bash
git status --short
```

что в commit не попадут:

- временные apply-скрипты;
- исходники из `convert/`;
- локальный `dist/`;
- случайные файлы;
- временные тестовые артефакты.

Добавить нужные файлы явно:

```bash
git add <files>
```

Проверить:

```bash
git status --short
git diff --cached --stat
git diff --cached --check
```

Commit:

```bash
git commit -m "..."
```

Push:

```bash
git push origin main
```

После push проверить GitHub Actions и GitHub Pages.

---

## 19. Workflow изменения существующей техники

Если меняется текст или metadata существующей техники:

1. Изменить нужные файлы:

```text
meta.json
ru.json
en.json
```

2. Проверить source:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
```

3. Пересобрать browser catalogs:

```bash
node scripts/build-catalogs.mjs
```

4. Запустить source development:

```bash
python -m http.server 8080
```

5. Проверить:

```text
http://localhost:8080/
```

6. Для финальной проверки:

```bash
node scripts/build-site.mjs
node scripts/check-build.mjs
```

7. Запустить production build:

```bash
python -m http.server 8080 --directory dist/site
```

8. Проверить Git и commit.

---

## 20. Workflow добавления новой техники

Новая техника должна сначала быть `draft`.

### 20.1. Создать модуль

Пример:

```text
data/techniques/back/back-013/
  meta.json
  ru.json
  en.json
```

### 20.2. Добавить в индекс

Добавить запись в:

```text
data/techniques/index.json
```

Проверить:

- уникальный `id`;
- уникальный `slug`;
- уникальный `order`;
- корректную `category`;
- корректный `path`.

### 20.3. Начальный статус

В `meta.json`:

```json
"status": "draft"
```

### 20.4. Добавить изображение

Исходник:

```text
convert/back-013.png
```

Dry-run:

```bash
python scripts/convert_images_to_webp.py --dry-run
```

Конвертация:

```bash
python scripts/convert_images_to_webp.py --quality 90
```

### 20.5. Проверить

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
node scripts/build-catalogs.mjs
```

### 20.6. Открыть preview

```bash
python -m http.server 8080
```

Открыть:

```text
http://localhost:8080/?preview=1
```

Проверить новую карточку.

В обычном:

```text
http://localhost:8080/
```

draft-техника отображаться не должна.

### 20.7. Публикация

Когда техника полностью проверена:

```json
"status": "published"
```

После этого:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
node scripts/build-catalogs.mjs
```

Проверить обычный каталог.

Финально:

```bash
node scripts/build-site.mjs
node scripts/check-build.mjs
```

---

## 21. Workflow при добавлении или замене изображений

```bash
cd /d/Open-Massage-Guide

git status --short

python scripts/convert_images_to_webp.py --dry-run

python scripts/convert_images_to_webp.py --quality 90

python scripts/generate_thumbnails.py

node scripts/validate-content.mjs

python scripts/check_image_links.py
python scripts/check_image_spec.py

node scripts/build-catalogs.mjs

git diff --check

git status --short

python -m http.server 8080
```

Проверить:

```text
http://localhost:8080/
```

При необходимости preview:

```text
http://localhost:8080/?preview=1
```

Перед commit рекомендуется также:

```bash
node scripts/build-site.mjs
node scripts/check-build.mjs
```

---

## 22. Workflow изменения JavaScript / CSS

Если меняется только frontend:

```text
assets/js/
assets/css/
index.html
```

пересборка browser catalogs обычно не требуется.

Минимальная проверка JavaScript:

```bash
node --check assets/js/app.js
```

Для Service Worker:

```bash
node --check sw.js
```

Локально:

```bash
python -m http.server 8080
```

После проверки source-версии:

```bash
node scripts/build-site.mjs
node scripts/check-build.mjs
python -m http.server 8080 --directory dist/site
```

После изменений app shell отдельно проверить PWA-кеш / Service Worker.

---

## 23. Экспорт Telegram

Это отдельная служебная операция и не является обязательной частью обычного локального запуска.

Русский:

```bash
node scripts/export-telegram.mjs --lang=ru
```

Английский:

```bash
node scripts/export-telegram.mjs --lang=en
```

Результат:

```text
dist/telegram-feed.ru.json
dist/telegram-feed.en.json
```

Telegram export использует модульные source-данные.

Telegram-публикация зависит от настроек техники, включая:

- `status`;
- `telegram.publish`;
- наличие изображения.

Поскольку `dist/` является generated output, Telegram feed не следует автоматически считать source-файлом для commit.

---

## 24. Типовые проблемы

### `Failed to fetch`

Сначала проверить:

```bash
node scripts/build-catalogs.mjs
```

Затем Network:

```text
F12 → Network → Fetch/XHR
```

Проверить наличие:

```text
catalog.ru.json
catalog.en.json
```

Если файлы существуют, очистить Service Worker / site data.

### После изменения JSON сайт показывает старые данные

Скорее всего browser catalogs не пересобраны.

Выполнить:

```bash
node scripts/build-catalogs.mjs
```

и обновить страницу без кеша.

### После замены изображения показывается старая версия

Проверить файл и ссылку:

```bash
python scripts/check_image_links.py
```

Затем:

```text
F12
→ Application
→ Service Workers
→ Unregister
```

и:

```text
Application
→ Storage
→ Clear site data
```

После этого:

```text
Ctrl+Shift+R
```

### Появился placeholder вместо изображения

Запустить:

```bash
python scripts/check_image_links.py
```

Проверить поле:

```json
"image": "..."
```

в соответствующем `meta.json`.

### Production build не совпадает с source

Пересобрать:

```bash
node scripts/build-site.mjs
```

Затем:

```bash
node scripts/check-build.mjs
```

Не редактировать вручную:

```text
dist/site/
```

### `404 /.well-known/appspecific/com.chrome.devtools.json`

Это служебный запрос браузера/DevTools и не является ошибкой приложения.

### `LF will be replaced by CRLF`

На Windows это предупреждение Git о переводах строк.

Дополнительно проверить:

```bash
git diff --check
```

### Порт 8080 занят

Использовать другой порт:

```bash
python -m http.server 8081
```

или для production:

```bash
python -m http.server 8081 --directory dist/site
```

---

## 25. Короткий ежедневный workflow

Для обычных изменений контента:

```bash
cd /d/Open-Massage-Guide

git status --short

node scripts/validate-content.mjs

python scripts/check_image_links.py
python scripts/check_image_spec.py

node scripts/build-catalogs.mjs

git diff --check

python -m http.server 8080
```

Открыть:

```text
http://localhost:8080/
```

При необходимости:

```text
http://localhost:8080/?preview=1
```

После ручной проверки:

```text
Ctrl+C
```

Проверить:

```bash
git status --short
git diff
```

---

## 26. Полный pre-push workflow

Перед важным push:

```bash
cd /d/Open-Massage-Guide

node scripts/validate-content.mjs

python scripts/check_image_links.py
python scripts/check_image_spec.py

node scripts/build-catalogs.mjs

node scripts/build-site.mjs

node scripts/check-build.mjs

git diff --check

git status --short
```

Проверить production локально:

```bash
python -m http.server 8080 --directory dist/site
```

Открыть:

```text
http://localhost:8080/
```

После проверки:

```text
Ctrl+C
```

Проверить staged changes:

```bash
git status --short
git diff --cached --stat
git diff --cached --check
```

Commit:

```bash
git commit -m "..."
```

Push:

```bash
git push origin main
```

После push проверить GitHub Actions.

---

## 27. Что является source, generated и временными файлами

### Source — редактируется вручную и хранится в Git

```text
data/techniques/
data/categories.json
data/locales/
assets/
assets/js/
assets/css/
index.html
manifest.webmanifest
sw.js
scripts/
docs/
.github/workflows/
```

### Generated, но хранится в Git

Browser catalogs:

```text
data/generated/catalog.ru.json
data/generated/catalog.en.json
```

Они генерируются командой:

```bash
node scripts/build-catalogs.mjs
```

и не редактируются вручную.

### Generated build output — не хранится в Git

```text
dist/
```

В том числе:

```text
dist/site/
dist/telegram-feed.ru.json
dist/telegram-feed.en.json
```

### Локальные рабочие исходники изображений — не коммитить

```text
convert/
```

---

## 28. Главное правило рабочего цикла

Если изменён **контент техники**:

```text
изменить source
→ validate
→ check images
→ build catalogs
→ проверить source
→ build site
→ smoke-check
→ проверить production
→ commit
→ push
→ проверить Actions
```

Если изменён **frontend**:

```text
изменить frontend
→ syntax check
→ проверить source
→ build site
→ smoke-check
→ проверить production
→ commit
→ push
→ проверить Actions
```

Если добавлено **изображение**:

```text
convert source
→ WebP
→ meta.json
→ validate
→ check images
→ build catalogs
→ проверить source
→ build site
→ smoke-check
→ commit
→ push
→ проверить Actions
```

Такой порядок позволяет не публиковать:

- битый JSON;
- broken image links;
- устаревший generated catalog;
- draft вместо published;
- ошибочный production build;
- случайные локальные файлы.

## Проверка продуктовой аналитики и UTM

Основной документ:

```text
docs/ANALYTICS.md
```

Проверить analytics config:

```bash
node scripts/check-analytics.mjs
```

По умолчанию production analytics может оставаться выключенной до получения Umami `websiteId`.

Сгенерировать тестовую UTM-ссылку:

```bash
node scripts/build-utm-url.mjs \
  --source=instagram \
  --medium=organic_social \
  --campaign=omg_launch_ru_2026_10 \
  --content=reel_back_001 \
  --technique=back-001
```

Для локальной проверки attribution открыть URL с UTM и выполнить в Console:

```js
OMG_ANALYTICS.getAttribution()
```

Raw search query в аналитику не отправляется.

---


## UI smoke tests

Полная инструкция:

```text
docs/TESTING.md
```

Первичная установка:

```bash
npm ci
npx playwright install chromium
```

Обычный запуск:

```bash
npm run test:smoke
```

Если production build уже создан:

```bash
npm run test:smoke:ci
```

Интерактивная отладка:

```bash
npm run test:smoke:ui
```

UI smoke tests автоматически выполняются в GitHub Actions до публикации GitHub Pages. Ошибка smoke test блокирует deploy.

---


## Editorial/source metadata

Full rules:

```text
docs/EDITORIAL.md
```

Validate content and print current editorial coverage:

```bash
node scripts/validate-content.mjs
node scripts/editorial-report.mjs
```

Important:

- `editorial` is optional during migration;
- do not mark a technique as `reviewed` without a real review;
- reviewed techniques require a date, reviewer and at least one real source;
- technical validation cannot determine clinical/source quality.

---


## Publishing workflow

Primary guide:

```text
docs/PUBLISHING.md
```

Validate:

```bash
node scripts/check-publishing.mjs
```

Telegram preview dry-run:

```bash
node scripts/export-publishing.mjs \
  --channel=telegram \
  --lang=ru \
  --campaign=stage15_test \
  --mode=preview \
  --dry-run
```

Instagram preview dry-run:

```bash
node scripts/export-publishing.mjs \
  --channel=instagram \
  --lang=ru \
  --campaign=stage15_test \
  --mode=preview \
  --dry-run
```

Generated `dist/publishing/` artifacts are not committed.

---


## Social launch

Configuration:

```text
data/social-launch.json
```

Validation:

```bash
node scripts/check-social-launch.mjs
```

Generate the initial launch plan:

```bash
node scripts/build-social-launch.mjs
```

Outputs:

```text
dist/social-launch/launch-plan.ru.json
dist/social-launch/launch-plan.ru.md
```

Full guide:

```text
docs/SOCIAL-LAUNCH.md
```

---

---

## Social cards

Generate a feed card:

```bash
node scripts/build-social-card.mjs --id=back-001 --lang=ru --format=feed
```

Generate a story card:

```bash
node scripts/build-social-card.mjs --id=back-001 --lang=ru --format=story
```

Full guide:

```text
docs/SOCIAL-CARDS.md
```
