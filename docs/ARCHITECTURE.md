# Архитектура

## Источник истины

`data/techniques.json` + изображения в `assets/images/cards/`.

PWA ничего не хранит на сервере и не требует API. GitHub Pages раздаёт статические файлы по HTTPS.

## Поток данных

```text
Git repository
  ├─ data/techniques.json
  ├─ data/categories.json
  └─ assets/images/cards/*
           │
           ├──> PWA (браузер / установка / offline)
           ├──> Telegram exporter
           ├──> будущий PDF exporter
           └──> будущий native wrapper / store build
```

## Почему JSON отдельно от изображения

- легко исправлять текст без перерисовки;
- можно сделать RU/EN локализацию;
- можно сортировать, искать и фильтровать;
- Telegram получает те же данные;
- изображения остаются независимыми оригиналами.

## Версионирование карточек

`id` не меняется после публикации. Поле `version` увеличивается при существенном обновлении изображения или описания.

## Следующий слой

Когда карточек станет много, данные можно разбить по файлам:

```text
data/techniques/back.json
data/techniques/neck.json
data/techniques/legs.json
```

Сборка может объединять их автоматически.
