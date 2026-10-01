# Publishing workflow

Open Massage Guide keeps source content in GitHub and treats Telegram/Instagram as distribution channels.

Stage 15 does not automatically post to external services. It provides a deterministic workflow:

```text
technique JSON
→ preview
→ editorial check
→ ready
→ queue
→ manual publication
→ mark-published
→ publication journal
```

## Files

```text
data/publishing.json          channel/UTM configuration
data/publishing-state.json    actual publication history
dist/publishing/              generated preview/queue artifacts
```

`dist/` is not committed.

## Per-technique metadata

New canonical optional block in `meta.json`:

```json
{
  "publishing": {
    "telegram": { "status": "ready" },
    "instagram": { "status": "draft" }
  }
}
```

Allowed source states:

```text
draft
ready
paused
```

Actual `published` state is derived from `data/publishing-state.json`.

## Legacy Telegram compatibility

Existing:

```json
"telegram": { "publish": true }
```

continues to work. `publishing.telegram.status` takes priority when present.

## Preview

Telegram RU:

```bash
node scripts/export-publishing.mjs \
  --channel=telegram \
  --lang=ru \
  --campaign=omg_launch_ru_2026_10 \
  --mode=preview
```

Instagram RU:

```bash
node scripts/export-publishing.mjs \
  --channel=instagram \
  --lang=ru \
  --campaign=omg_launch_ru_2026_10 \
  --mode=preview
```

Preview contains every published technique with an image, regardless of ready/draft status.

## Dry-run

```bash
node scripts/export-publishing.mjs \
  --channel=telegram \
  --lang=ru \
  --campaign=stage15_test \
  --mode=preview \
  --dry-run
```

## Queue

Only `ready` records that have not already been marked published for the same content/campaign are selected:

```bash
node scripts/export-publishing.mjs \
  --channel=telegram \
  --lang=ru \
  --campaign=omg_launch_ru_2026_10 \
  --mode=queue
```

Output:

```text
dist/publishing/telegram.ru.queue.json
```

## UTM

Generated automatically:

```text
utm_source=telegram|instagram
utm_medium=organic_social
utm_campaign=<campaign>
utm_content=<channel>_<technique-id>_<language>
```

The link targets:

```text
#/technique/<id>
```

## Telegram content

Telegram caption uses:

```text
title
category
telegramCaption or summary
pressure
tempo
duration
trackable CTA URL
hashtags
```

## Instagram content

Instagram caption uses:

```text
title
instagramCaption or summary
Open Massage Guide
hashtags
```

The clickable tracked URL is stored separately in `ctaUrl` for profile/story/ad/link placements. Social-card visual generation remains a separate future step.

## Mark publication complete

After manual posting:

```bash
node scripts/mark-published.mjs \
  --file=dist/publishing/telegram.ru.queue.json \
  --id=back-001 \
  --url=https://t.me/example/123
```

This updates:

```text
data/publishing-state.json
```

Commit the journal change.

A repeated queue for unchanged content and the same campaign will then exclude that publication.

## Re-publication

A new publication fingerprint is created if relevant publication content changes, or if the campaign changes.

For deliberate forced queueing:

```bash
node scripts/export-publishing.mjs \
  --channel=telegram \
  --lang=ru \
  --campaign=omg_launch_ru_2026_10 \
  --mode=queue \
  --force
```

## Existing Telegram command

Still supported:

```bash
node scripts/export-telegram.mjs --lang=ru
```

Recommended explicit campaign:

```bash
node scripts/export-telegram.mjs \
  --lang=ru \
  --campaign=omg_launch_ru_2026_10
```

Compatibility output remains:

```text
dist/telegram-feed.ru.json
```

## Validation

```bash
node scripts/check-publishing.mjs
```

It validates publishing config, state journal, optional technique channel metadata, legacy Telegram flags, ready-state consistency and localized social caption fields.

## Recommended first real publication

Start with one technique, one language, one channel and one campaign:

```text
back-001
ru
telegram
omg_launch_ru_2026_10
```

Then:

```text
preview
→ inspect
→ mark ready
→ validate
→ queue
→ publish manually
→ mark-published
→ commit state
→ verify Umami UTM/events
```

Only then expand the queue.

## Later automation

This pipeline can later feed Telegram Bot API, Instagram integrations, GitHub Actions, n8n or other schedulers without changing source technique content.

---

## 18. Current Telegram pilot

The first controlled real-publication pilot uses:

```text
technique: back-001
language:  ru
channel:   telegram
campaign:  omg_launch_ru_2026_10
```

During the pilot:

```text
overview-001 → Telegram paused
back-001     → Telegram ready
all others   → not ready unless explicitly configured
```

Generate the queue:

```bash
node scripts/export-publishing.mjs   --channel=telegram   --lang=ru   --campaign=omg_launch_ru_2026_10   --mode=queue
```

Expected:

```text
Ready:    1
Selected: 1
```

Inspect the exact queued record before publication.

After manual publication:

```bash
node scripts/mark-published.mjs   --file=dist/publishing/telegram.ru.queue.json   --id=back-001   --url=https://t.me/<channel>/<message-id>
```

Then validate:

```bash
node scripts/check-publishing.mjs
```

Finally open the published CTA and verify in Umami:

```text
utm_source=telegram
utm_medium=organic_social
utm_campaign=omg_launch_ru_2026_10
utm_content=telegram_back-001_ru
technique_open
```

Do not expand the queue until this complete loop has been confirmed.
