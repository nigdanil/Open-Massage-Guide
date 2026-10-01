# Editorial and source model

Open Massage Guide separates publication status from editorial/medical review status.

`status` answers:

```text
Is this technique visible to users?
```

`editorial.reviewStatus` answers:

```text
Has the educational/medical content been editorially reviewed?
```

These are intentionally different concepts.

---

## 1. Why the model is optional

The project already contains many techniques. Editorial fields are therefore optional during migration.

Do not mark an existing technique as reviewed merely to satisfy a schema.

A technique without `editorial` remains valid and publishable under the current content model.

---

## 2. Metadata structure

Optional block in `meta.json`:

```json
{
  "editorial": {
    "reviewStatus": "reviewed",
    "contentVersion": 2,
    "reviewedAt": "2026-10-01",
    "reviewedBy": "Reviewer or organization name",
    "sources": [
      {
        "kind": "guideline",
        "title": "Original source title",
        "publisher": "Publisher or organization",
        "url": "https://example.org/source",
        "year": 2025,
        "accessedAt": "2026-10-01"
      }
    ]
  }
}
```

---

## 3. reviewStatus

Allowed values:

```text
unreviewed
in-review
reviewed
```

Meaning:

### unreviewed

The technique has not yet gone through the editorial review workflow.

### in-review

Review is currently in progress.

### reviewed

Review is complete.

For `reviewed`, the validator requires:

```text
reviewedAt
reviewedBy
at least one source
```

---

## 4. contentVersion

`editorial.contentVersion` is a positive integer.

Increment it when substantive educational content changes after a review, for example:

- technique instructions change;
- contraindication or warning wording changes materially;
- target area guidance changes;
- source basis changes.

Do not increment it for purely visual or formatting changes.

The existing top-level `version` remains untouched for backward compatibility.

---

## 5. reviewedAt

Format:

```text
YYYY-MM-DD
```

Example:

```text
2026-10-01
```

Do not add a review date if a real review did not occur.

---

## 6. reviewedBy

A non-empty reviewer or organization label.

Examples:

```text
Editorial team
Dr. Example Name
Example Clinic
```

Do not use a person's name without permission to publish it.

---

## 7. sources

`sources` is an array.

Allowed `kind` values:

```text
guideline
article
book
website
standard
other
```

Required fields per source:

```text
kind
title
```

Optional fields:

```text
publisher
url
year
accessedAt
note
```

For `url`, only HTTP/HTTPS URLs are accepted.

`accessedAt` uses:

```text
YYYY-MM-DD
```

Do not invent references. A source is added only after somebody actually checked it.

---

## 8. Example: review in progress

```json
{
  "editorial": {
    "reviewStatus": "in-review",
    "contentVersion": 1,
    "reviewedBy": "Editorial team",
    "sources": []
  }
}
```

`reviewedAt` is intentionally absent.

---

## 9. Example: completed review

```json
{
  "editorial": {
    "reviewStatus": "reviewed",
    "contentVersion": 2,
    "reviewedAt": "2026-10-01",
    "reviewedBy": "Editorial team",
    "sources": [
      {
        "kind": "guideline",
        "title": "Source title",
        "publisher": "Source publisher",
        "url": "https://example.org/source",
        "year": 2025,
        "accessedAt": "2026-10-01"
      }
    ]
  }
}
```

The values above demonstrate the schema only. They are not a source recommendation and must not be copied into real content unchanged.

---

## 10. User interface behavior

The public technique dialog shows editorial information only when:

```text
reviewStatus = reviewed
```

It can show:

```text
review date
reviewer
content version
source list
```

`unreviewed` and `in-review` metadata are editorial workflow states and are not presented as a public quality badge.

---

## 11. Validation

Run:

```bash
node scripts/validate-content.mjs
node scripts/editorial-report.mjs
```

The validator checks format and consistency.

It does **not** determine whether a source is medically authoritative or whether a review is clinically correct. That remains a human editorial responsibility.

---

## 12. Migration strategy

Do not migrate all techniques at once.

Recommended order:

```text
1. safety
2. basics
3. back
4. neck/shoulders
5. arms/legs/feet
6. face/head
7. self-massage
8. programs
```

For each technique:

```text
collect real sources
→ review text
→ correct content if required
→ set editorial metadata
→ validate
→ publish
```

This keeps technical schema work separate from medical/editorial judgment.
