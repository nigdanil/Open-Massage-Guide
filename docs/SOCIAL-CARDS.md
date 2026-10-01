# Social card generator

Stage 18 renders reproducible social artwork from Open Massage Guide content.

Generated files are stored only under:

```text
dist/social/
```

and are not committed.

## Formats

```text
feed  — 1080 × 1350 — 4:5
story — 1080 × 1920 — 9:16
```

Configuration:

```text
data/social-cards.json
```

## One technique

```bash
node scripts/build-social-card.mjs \
  --id=back-001 \
  --lang=ru \
  --format=feed
```

Output:

```text
dist/social/back-001.ru.feed.png
```

Story:

```bash
node scripts/build-social-card.mjs \
  --id=back-001 \
  --lang=ru \
  --format=story
```

## Launch batch

```bash
node scripts/build-social-launch.mjs

node scripts/build-social-cards.mjs \
  --plan=dist/social-launch/launch-plan.ru.json \
  --formats=feed
```

Both formats:

```bash
node scripts/build-social-cards.mjs \
  --plan=dist/social-launch/launch-plan.ru.json \
  --formats=feed,story
```

Batch output:

```text
dist/social/launch/
```

The batch supports technique, project and educational launch records.

Technique cards use the existing educational image. Project and educational cards use a neutral branded visual and do not invent anatomical imagery.

## Rendering

The renderer uses the Playwright Chromium already present in the project.

```text
JSON
→ local source image
→ isolated HTML/CSS
→ Chromium
→ PNG
```

No external font, graphics API or network image is required.

## Validation

```bash
node scripts/check-social-cards.mjs
```

Example output check:

```bash
node scripts/check-social-card-output.mjs \
  --file=dist/social/back-001.ru.feed.png \
  --width=1080 \
  --height=1350
```

Visual review is still required before a real post. Automated checks verify repeatability and dimensions, not aesthetics.
