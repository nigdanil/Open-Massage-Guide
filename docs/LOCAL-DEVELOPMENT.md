# Локальная разработка и проверка

## 1. Перейти в каталог проекта

Git Bash / Windows:

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

---

## 2. Проверить окружение

### Node.js

```bash
node --version
```

### Python

```bash
python --version
```

Если команда `python` недоступна:

```bash
python3 --version
```

или:

```bash
py --version
```

### Pillow

Python-скрипты работы с изображениями используют Pillow. Например `check_image_links.py` импортирует `PIL.Image`. :chatgpt-content-reference{index="2"}

Проверить:

```bash
python -m pip show Pillow
```

Если Pillow не установлен:

```bash
python -m pip install Pillow
```

---

# 3. Основная проверка контента

Запускать после изменений JSON, структуры техник, локализации и перед commit:

```bash
node scripts/validate-content.mjs
```

Успешный результат:

```text
OK: 91 modular techniques, locales: ru, en.
```

Валидатор проверяет:

- индекс техник;
- `meta.json`;
- RU/EN JSON;
- обязательные поля;
- категории;
- `pressure`;
- `status`;
- существование указанных изображений;
- gallery images;
- наличие переводов категорий. :chatgpt-content-reference{index="3"}

При ошибке commit делать не следует до исправления проблемы.

---

# 4. Проверка изображений

Запускать после работы с изображениями и желательно перед каждым commit:

```bash
python scripts/check_image_links.py
```

Успешный результат:

```text
RESULT: OK
```

Скрипт проверяет:

```text
Indexed techniques
Referenced images
WebP files
No image in meta
Broken paths
Invalid images
Orphan WebP
```

:chatgpt-content-reference{index="4"}

Идеальный результат:

```text
No image in meta:   0
Broken paths:       0
Invalid images:     0
Orphan WebP:        0

RESULT: OK
```

---

# 5. Добавление и конвертация изображений

Этот шаг нужен **только при добавлении или замене изображений**.

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

Скрипт автоматически определяет категорию по имени файла, создаёт WebP и может обновить соответствующий `meta.json`. :chatgpt-content-reference{index="5"}

### Сначала dry-run

```bash
python scripts/convert_images_to_webp.py --dry-run
```

Он показывает план изменений, ничего не записывая.

### Реальная конвертация

```bash
python scripts/convert_images_to_webp.py --quality 90
```

Скрипт:

```text
convert/*.png|jpg|jpeg
        ↓
assets/images/techniques/.../*.webp
        ↓
data/techniques/.../meta.json
```

Поле:

```json
"image": "./assets/images/techniques/.../image.webp"
```

обновляется автоматически. :chatgpt-content-reference{index="6"}

После конвертации обязательно выполнить:

```bash
node scripts/validate-content.mjs
python scripts/check_image_links.py
```

### Важно

Исходники из:

```text
convert/
```

не коммитить.

---

# 6. Запуск сайта локально

Проект необходимо открывать через HTTP-сервер, а не двойным кликом по `index.html`.

Из корня проекта:

```bash
python -m http.server 8080
```

Если используется `python3`:

```bash
python3 -m http.server 8080
```

Или:

```bash
py -m http.server 8080
```

Открыть:

```text
http://localhost:8080/
```

Остановить сервер:

```text
Ctrl+C
```

---

## Preview-режим для draft-техник

Обычный локальный адрес работает как production-каталог и показывает только `published`:

```text
http://localhost:8080/
```

Для редакционной проверки всех техник, включая `draft`, добавить параметр:

```text
http://localhost:8080/?preview=1
```

В preview-режиме draft-карточки помечаются как черновики. Этот режим предназначен для локальной/редакционной проверки и не меняет данные в `meta.json`.

---

# 7. Проверка интерфейса

После запуска проверить вручную:

- главная страница открывается;
- карточки отображаются;
- изображения загружаются;
- нет placeholder там, где изображение уже добавлено;
- карточки техник открываются;
- поиск работает;
- фильтр категорий работает;
- избранное работает;
- RU → EN работает;
- EN → RU работает;
- переключение темы работает;
- мобильная вёрстка не ломается.

---

# 8. Проверка Console

Открыть:

```text
F12
→ Console
```

Не должно быть красных ошибок:

```text
Uncaught
SyntaxError
TypeError
Failed to fetch
```

---

# 9. Проверка Network

Открыть:

```text
F12
→ Network
```

Обновить страницу.

Не должно быть запросов:

```text
404
500
```

Особенно проверить:

```text
.json
.webp
.js
.css
```

---

# 10. Проверка без браузерного кеша

При разработке:

```text
F12
→ Network
→ Disable cache
```

Затем:

```text
Ctrl+Shift+R
```

Это особенно важно после изменения:

- изображений;
- JSON;
- JavaScript;
- CSS.

---

# 11. Service Worker и PWA-кеш

Если после изменения браузер показывает старую версию:

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

И:

```text
Ctrl+Shift+R
```

---

# 12. Проверка Git

Посмотреть состояние:

```bash
git status --short
```

Посмотреть изменения:

```bash
git diff
```

Проверить пробельные ошибки:

```bash
git diff --check
```

После `git add` посмотреть staged changes:

```bash
git diff --cached
```

---

# 13. Финальная проверка перед commit

Стандартный набор:

```bash
node scripts/validate-content.mjs

python scripts/check_image_links.py

git diff --check

git status --short
```

После этого запустить:

```bash
python -m http.server 8080
```

Открыть:

```text
http://localhost:8080/
```

Проверить приложение вручную.

Остановить:

```text
Ctrl+C
```

И только после успешной проверки:

```bash
git add .
git status --short
git diff --cached
git commit -m "..."
git push
```

---

# 14. Экспорт Telegram

Это не обязательная локальная проверка, а отдельная служебная операция.

Русский:

```bash
node scripts/export-telegram.mjs --lang=ru
```

Английский:

```bash
node scripts/export-telegram.mjs --lang=en
```

Скрипт экспортирует только опубликованные техники, у которых разрешена публикация в Telegram и присутствует изображение. :chatgpt-content-reference{index="7"}

Результат создаётся в:

```text
dist/telegram-feed.ru.json
dist/telegram-feed.en.json
```

:chatgpt-content-reference{index="8"}

---

# Короткий ежедневный workflow

Для обычных изменений:

```bash
cd /d/Open-Massage-Guide

git status --short

node scripts/validate-content.mjs

python scripts/check_image_links.py

git diff --check

python -m http.server 8080
```

Открыть:

```text
http://localhost:8080/
```

После ручной проверки:

```text
Ctrl+C
```

Затем:

```bash
git status --short
git diff
```

---

# Workflow при добавлении изображений

```bash
cd /d/Open-Massage-Guide

python scripts/convert_images_to_webp.py --dry-run

python scripts/convert_images_to_webp.py --quality 90

node scripts/validate-content.mjs

python scripts/check_image_links.py

git diff --check

git status --short

python -m http.server 8080
```