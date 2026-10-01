# Open Massage Guide — PWA

Открытый визуальный справочник массажных техник. Проект работает как обычный сайт и как устанавливаемое PWA-приложение в поддерживаемых мобильных и desktop-браузерах.

## Что уже есть

- адаптивный интерфейс;
- модульный каталог массажных техник;
- русская и английская локализации;
- поиск и фильтрация по зонам;
- избранное локально на устройстве;
- подробные карточки техник;
- Web App Manifest;
- Service Worker и офлайн-кэш;
- GitHub Pages workflow;
- проверка структуры контента и изображений;
- конвертация исходных изображений в WebP;
- экспорт опубликованных техник для Telegram.

## Архитектура контента

Источник данных каталога — `data/techniques/index.json` и самостоятельные модули техник.

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

Для каждой техники:

- `meta.json` хранит языконезависимые машинные данные;
- `ru.json` содержит пользовательский текст на русском;
- `en.json` содержит пользовательский текст на английском;
- изображение хранится отдельно в `assets/images/techniques/...`;
- `data/techniques/index.json` связывает технику с её модулем и определяет порядок каталога.

Старый монолитный `data/techniques.json` больше не используется.

Подробное описание: [docs/CONTENT-ARCHITECTURE.md](docs/CONTENT-ARCHITECTURE.md).

## Локальная разработка

Полная инструкция по локальному запуску, проверкам, изображениям и рабочему циклу:

[docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md)

Минимальная проверка перед запуском:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
```

Локальный HTTP-сервер:

```bash
python -m http.server 8080
```

После запуска открыть:

```text
http://localhost:8080/
```

## Добавление новой техники

1. Добавить запись в `data/techniques/index.json`.
2. Создать каталог техники, например `data/techniques/back/back-011/`.
3. Добавить в него:
   - `meta.json`;
   - `ru.json`;
   - `en.json`.
4. Добавить исходное изображение в `convert/` с именем, совпадающим с id техники, и выполнить при необходимости:

```bash
python scripts/convert_images_to_webp.py --dry-run
python scripts/convert_images_to_webp.py --quality 90
```

5. Проверить проект:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
```

Во время подготовки техника может иметь статус `draft`. Перед публикацией следует проверить изображение и перевести технику в `published`.

## Telegram-экспорт

```bash
node scripts/export-telegram.mjs --lang=ru
node scripts/export-telegram.mjs --lang=en
```

Экспортируются только техники, разрешённые для Telegram в `meta.json`.

## Production build и GitHub Pages

Локальная production-сборка:

```bash
node scripts/build-site.mjs
node scripts/check-build.mjs
```

Готовый сайт создаётся в:

```text
dist/site/
```

Workflow `.github/workflows/pages.yml` после push в `main` выполняет последовательность:

```text
validate → build → smoke-check → deploy
```

GitHub Pages получает только содержимое `dist/site`, а не весь исходный репозиторий.

В настройках репозитория GitHub Pages должен использовать **Source: GitHub Actions**.

## Документация

- [Архитектура контента](docs/CONTENT-ARCHITECTURE.md)
- [Локальная разработка и проверки](docs/LOCAL-DEVELOPMENT.md)
- [Стандарт изображений](docs/IMAGE-SPEC.md)
- [Продуктовая аналитика и UTM](docs/ANALYTICS.md)
- [UI smoke testing](docs/TESTING.md)
- [Редакционная модель и источники](docs/EDITORIAL.md)
- документация по изображениям и другим процессам находится в `docs/`.

## Безопасность

Проект носит образовательный характер и не является медицинской диагностикой или индивидуальным назначением лечения.

## Лицензирование

Исходный код: MIT (`LICENSE`).

Изображения и редакционный контент не получают автоматически лицензию MIT вместе с исходным кодом. Правила повторного использования контента следует фиксировать отдельно в `CONTENT-LICENSE.md`.
