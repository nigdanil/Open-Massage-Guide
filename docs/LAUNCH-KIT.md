# Social launch kit

Stage 19 packages the existing launch plan into files that can be used when the real Telegram channel and Instagram account are created.

It does not publish anything automatically.

## Output

```text
dist/launch-kit/<campaign>/
```

For every launch post:

```text
feed.png
story.png
telegram.txt
instagram.txt
links.json
meta.json
```

Top-level files:

```text
README.md
manifest.json
```

Brand avatar:

```text
dist/launch-kit/brand/avatar-1024.png
```

## Build

First create the launch plan:

```bash
node scripts/build-social-launch.mjs
```

Then create the brand avatar:

```bash
node scripts/build-brand-avatar.mjs
```

Build the full launch kit:

```bash
node scripts/build-launch-kit.mjs \
  --plan=dist/social-launch/launch-plan.ru.json
```

Validate:

```bash
node scripts/check-launch-kit.mjs \
  --dir=dist/launch-kit/omg_launch_ru_2026_10 \
  --expected=12 \
  --formats=feed,story
```

## Pilot mode

During development:

```bash
node scripts/build-launch-kit.mjs \
  --plan=dist/social-launch/launch-plan.ru.json \
  --limit=2 \
  --formats=feed
```

## Accounts do not exist yet

Until the real profiles are created:

```text
Telegram status = planned
Instagram status = planned
```

Do not invent handles or profile URLs.

Once the accounts exist, update:

```text
data/social-launch.json
```

and rebuild the kit.

## Publishing order

The launch kit is a convenience package, not an approval mechanism.

Real flow remains:

```text
launch kit
→ review visual/copy
→ real channel/account
→ one pilot publication
→ UTM/Umami verification
→ mark-published
→ scale
```
