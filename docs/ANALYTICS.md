# Product analytics and UTM standard

Open Massage Guide использует отдельный analytics-layer, который не связан с бизнес-логикой `app.js`.

Текущий поддерживаемый provider:

```text
Umami
```

По умолчанию аналитика выключена:

```json
{
  "provider": "umami",
  "enabled": false,
  "scriptUrl": "https://cloud.umami.is/script.js",
  "websiteId": "",
  "trackLocalhost": false,
  "debug": false
}
```

Конфигурация:

```text
data/analytics.json
```

Сайт должен полностью работать при выключенной или недоступной аналитике.

---

## 1. Зачем нужна аналитика

Основные бизнес-вопросы:

- сколько пользователей приходит;
- откуда они приходят;
- какие техники открывают;
- какие категории интересуют;
- пользуются ли поиском;
- добавляют ли техники в избранное;
- скачивают ли offline library;
- устанавливают ли PWA;
- какой рекламный/социальный канал даёт полезных пользователей.

---

## 2. Privacy rules

В аналитику не отправляем:

- имя;
- email;
- телефон;
- логин;
- свободный текст пользователя;
- полный поисковый запрос;
- собственный persistent user id.

Для события `search` отправляется только:

```text
query_length
results
```

UTM attribution хранится только в `sessionStorage`.

---

## 3. События продукта

Текущий event contract:

```text
technique_open
search
category_filter
favorite_add
favorite_remove
favorites_filter
language_change
offline_download_click
offline_download_start
offline_download_complete
offline_download_error
pwa_install_click
pwa_install_complete
```

### technique_open

```text
technique_id
route
language
UTM attribution
```

### search

```text
query_length
results
language
UTM attribution
```

Сам поисковый текст не отправляется.

### category_filter

```text
category
language
UTM attribution
```

### favorite_add / favorite_remove

```text
technique_id
language
UTM attribution
```

### language_change

```text
from
to
UTM attribution
```

### offline_download_*

Возможные технические поля:

```text
version
files
bytes
```

### PWA

```text
pwa_install_click
pwa_install_complete
```

---

## 4. UTM standard

Используем стандартные параметры:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
```

Правила:

- lowercase;
- только латиница;
- без пробелов;
- слова разделять `_`;
- значения должны быть стабильными;
- не менять название одного канала от поста к посту.

### utm_source

Источник трафика.

Рекомендуемые значения:

```text
instagram
telegram
vk
youtube
pinterest
reddit
partner_<name>
qr
```

### utm_medium

Тип канала.

Рекомендуемые значения:

```text
organic_social
paid_social
referral
email
qr
```

### utm_campaign

Конкретная маркетинговая кампания.

Примеры:

```text
omg_launch_ru_2026_10
omg_launch_en_2026_10
back_series_ru_2026_10
self_massage_ru_2026_11
```

### utm_content

Конкретный креатив или размещение.

Примеры:

```text
reel_back_001
story_back_001
instagram_post_001
telegram_post_001
channel_pin
profile_link
```

### utm_term

Использовать только когда реально нужен термин рекламной кампании.

---

## 5. Очень важно: UTM должен быть до hash

Правильно:

```text
https://nigdanil.github.io/Open-Massage-Guide/?utm_source=instagram&utm_medium=organic_social&utm_campaign=omg_launch_ru_2026_10&utm_content=reel_back_001#/technique/back-001
```

Неправильно:

```text
https://nigdanil.github.io/Open-Massage-Guide/#/technique/back-001?utm_source=instagram
```

Query string должен находиться перед `#`.

---

## 6. Генератор UTM URL

Базовый пример:

```bash
node scripts/build-utm-url.mjs \
  --source=instagram \
  --medium=organic_social \
  --campaign=omg_launch_ru_2026_10 \
  --content=reel_back_001 \
  --technique=back-001
```

Telegram:

```bash
node scripts/build-utm-url.mjs \
  --source=telegram \
  --medium=organic_social \
  --campaign=omg_launch_ru_2026_10 \
  --content=telegram_post_001 \
  --technique=back-001
```

Можно указать другой base URL:

```bash
node scripts/build-utm-url.mjs \
  --base=https://example.com/ \
  --source=partner_example \
  --medium=referral \
  --campaign=omg_partners_2026_10
```

---

## 7. Включение Umami

После создания website в Umami получить `websiteId`.

Изменить:

```text
data/analytics.json
```

Пример:

```json
{
  "provider": "umami",
  "enabled": true,
  "scriptUrl": "https://cloud.umami.is/script.js",
  "websiteId": "00000000-0000-4000-8000-000000000000",
  "trackLocalhost": false,
  "debug": false
}
```

`websiteId` не является секретным API key и используется клиентским tracker.

После изменения:

```bash
node scripts/check-analytics.mjs
node scripts/build-site.mjs
node scripts/check-build.mjs
```

---

## 8. Локальная отладка

В обычном committed config рекомендуется:

```json
"trackLocalhost": false,
"debug": false
```

Для временной локальной проверки можно поставить:

```json
"trackLocalhost": true,
"debug": true
```

После этого в Console будут сообщения:

```text
[OMG analytics] ...
```

Не коммитить локальный `trackLocalhost: true`, если он больше не нужен.

В Console также доступно:

```js
OMG_ANALYTICS.getConfig()
OMG_ANALYTICS.getAttribution()
OMG_ANALYTICS.track('debug_event', { source: 'console' })
```

---

## 9. Проверка UTM attribution

Открыть:

```text
http://localhost:8080/?utm_source=instagram&utm_medium=organic_social&utm_campaign=test_campaign&utm_content=test_post#/technique/back-001
```

В Console:

```js
OMG_ANALYTICS.getAttribution()
```

Ожидаемо присутствуют:

```text
utm_source
utm_medium
utm_campaign
utm_content
landing_path
captured_at
```

Если затем открыть другую карточку без изменения query string, attribution остаётся тем же в рамках текущей browser session.

---

## 10. Проверка перед commit

```bash
node scripts/check-analytics.mjs
node scripts/validate-content.mjs
python scripts/check_image_links.py
python scripts/check_image_spec.py
node scripts/build-site.mjs
node scripts/check-build.mjs
git diff --check
```

---

## 11. Что измеряем сначала

На первом этапе не строим десятки событий.

Основные KPI:

```text
visits
traffic source
UTM campaign
technique_open
search
favorite_add
offline_download_complete
pwa_install_complete
```

После получения реального трафика набор событий можно расширить по данным, а не заранее.

---

## 12. Production configuration

Production Umami tracking is enabled with:

```text
provider: umami
scriptUrl: https://cloud.umami.is/script.js
websiteId: 25965f14-b6fb-441c-80fc-35068e0b65ec
trackLocalhost: false
debug: false
```

This means:

- GitHub Pages sends analytics;
- localhost does not send analytics;
- analytics failure does not block the application;
- product events continue to use the local analytics adapter.

Production verification URL:

```text
https://nigdanil.github.io/Open-Massage-Guide/?utm_source=telegram&utm_medium=organic_social&utm_campaign=stage12_test&utm_content=test_link#/technique/back-001
```

After opening it, verify in Umami:

```text
pageview
utm_source=telegram
utm_medium=organic_social
utm_campaign=stage12_test
utm_content=test_link
technique_open
```

