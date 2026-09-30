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

## Валидация

Перед commit необходимо выполнить:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
```

`validate-content.mjs` проверяет структуру индекса, метаданные, локализованные JSON и ссылки на изображения.

`check_image_links.py` дополнительно проверяет отсутствие битых и повреждённых изображений, техники без `image` и WebP-файлы, на которые не ссылается контент.

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
