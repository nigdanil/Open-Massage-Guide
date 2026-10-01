# Telegram integration

Telegram now uses the common publishing pipeline documented in:

```text
docs/PUBLISHING.md
```

Source content remains in `data/techniques/`; Telegram is only a distribution channel.

Preview:

```bash
node scripts/export-publishing.mjs \
  --channel=telegram \
  --lang=ru \
  --campaign=omg_launch_ru_2026_10 \
  --mode=preview
```

Queue:

```bash
node scripts/export-publishing.mjs \
  --channel=telegram \
  --lang=ru \
  --campaign=omg_launch_ru_2026_10 \
  --mode=queue
```

Compatibility command remains:

```bash
node scripts/export-telegram.mjs --lang=ru
```

After manual publication:

```bash
node scripts/mark-published.mjs \
  --file=dist/publishing/telegram.ru.queue.json \
  --id=back-001 \
  --url=https://t.me/example/123
```

Automatic Bot API publishing remains a later stage and no Telegram credentials are stored by Stage 15.
