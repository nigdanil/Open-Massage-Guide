# Modular content architecture

Each technique is self-contained.

```text
data/techniques/
  index.json
  back/
    back-001/
      meta.json
      ru.json
      en.json
```

`meta.json` contains language-neutral machine-readable fields.
`ru.json` and `en.json` contain all user-facing technique text.
Images live separately under `assets/images/techniques/...`.

Draft techniques may use `"image": null`. Once an illustration is added:
1. set `image` to its repository path;
2. set `status` to `published`;
3. optionally set `telegram.publish` to `true`.

Run:

```bash
node scripts/validate-content.mjs
node scripts/export-telegram.mjs --lang=ru
node scripts/export-telegram.mjs --lang=en
```
