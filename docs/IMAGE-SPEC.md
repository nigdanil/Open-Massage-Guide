# Image specification

Этот документ фиксирует технический стандарт изображений Open Massage Guide.

Цель стандарта:

- одинаково предсказуемое качество изображений;
- небольшой вес каталога;
- отсутствие случайных PNG/JPEG в production assets;
- автоматическая проверка изображений до deploy;
- разделение полноразмерного изображения и thumbnail.

## 1. Структура

Для обычной техники используются два файла:

```text
image      — полноразмерное изображение для открытой карточки;
thumbnail  — облегчённое изображение для сетки каталога.
```

Пример `meta.json`:

```json
{
  "image": "./assets/images/techniques/back/back-001.webp",
  "thumbnail": "./assets/images/techniques/back/back-001-thumb.webp"
}
```

Для техник с gallery поле `images` может содержать дополнительные полноразмерные изображения.

## 2. Формат

Все production-изображения техник и thumbnails должны быть:

```text
WebP
```

Рабочие исходники могут быть:

```text
PNG
JPEG
JPG
```

и хранятся локально в:

```text
convert/
```

Исходники из `convert/` не коммитятся.

## 3. Полноразмерное изображение

Поле:

```text
image
```

используется при открытии техники.

Технические ограничения:

```text
формат:                 WebP
максимальный размер:    2 MB
рекомендуемый размер:   ≤ 1 MB
максимальная ширина:    6000 px
максимальная высота:    6000 px
минимальная сторона:    320 px
```

Если полноразмерный файл больше 1 MB, checker выдаёт предупреждение.

Файл больше 2 MB считается ошибкой.

## 4. Thumbnail

Thumbnail используется только в каталоге.

Текущий стандарт генерации:

```text
формат:                 WebP
максимальная ширина:    640 px
максимальная высота:    800 px
максимальный размер:    150 KB
рекомендуемый размер:   ≤ 100 KB
WebP quality:           82
```

Thumbnail:

- генерируется из `image`;
- сохраняет исходное соотношение сторон;
- не увеличивает маленькое исходное изображение;
- должен отличаться от full-size пути;
- именуется `<image-stem>-thumb.webp`.

Пример:

```text
back-001.webp
back-001-thumb.webp
```

## 5. Соотношение сторон

Thumbnail должен сохранять aspect ratio полноразмерного изображения.

Допустимое техническое отклонение из-за округления размера:

```text
≤ 1%
```

Единый aspect ratio для всех техник сейчас не вводится.

Интерфейс самостоятельно кадрирует изображения карточек через CSS `object-fit: cover`.

## 6. Gallery

Дополнительные изображения из поля:

```json
"images": []
```

считаются полноразмерными изображениями.

Для них действуют full-size ограничения:

```text
WebP
≤ 2 MB
≤ 6000 × 6000 px
минимальная сторона ≥ 320 px
```

Отдельные thumbnails для gallery на текущем этапе не требуются.

## 7. Генерация full-size WebP

Исходные PNG/JPEG помещаются в:

```text
convert/
```

Проверка:

```bash
python scripts/convert_images_to_webp.py --dry-run
```

Конвертация:

```bash
python scripts/convert_images_to_webp.py --quality 90
```

## 8. Генерация thumbnails

Предпросмотр:

```bash
python scripts/generate_thumbnails.py --dry-run
```

Генерация:

```bash
python scripts/generate_thumbnails.py
```

По умолчанию используются:

```text
width = 640
quality = 82
```

## 9. Автоматическая проверка ссылок

```bash
python scripts/check_image_links.py
```

Проверяет:

- наличие full image;
- наличие thumbnail;
- gallery;
- битые ссылки;
- повреждённые файлы;
- orphan WebP.

## 10. Автоматическая проверка стандарта

```bash
python scripts/check_image_spec.py
```

Checker проверяет:

- расширение WebP;
- формат файла WebP;
- размеры;
- вес;
- имя thumbnail;
- соответствие aspect ratio;
- отличие thumbnail от full image.

Проверки разделены на:

```text
ERROR    — нарушает технический контракт и ломает CI;
WARNING  — желательно исправить, но deploy не блокируется.
```

На текущем этапе warning используется для полноразмерных файлов > 1 MB и thumbnails > 100 KB.

## 11. После добавления изображения

Последовательность:

```bash
python scripts/convert_images_to_webp.py --dry-run
python scripts/convert_images_to_webp.py --quality 90

python scripts/generate_thumbnails.py

node scripts/validate-content.mjs
python scripts/check_image_links.py
python scripts/check_image_spec.py

node scripts/build-catalogs.mjs
node scripts/build-site.mjs
node scripts/check-build.mjs
```

## 12. Главное правило

Не оптимизировать изображения вручную хаотично.

Source image → `convert_images_to_webp.py` → full WebP → `generate_thumbnails.py` → thumbnail → проверки → generated catalogs → production build.

Это позволяет сохранять единый воспроизводимый процесс.
