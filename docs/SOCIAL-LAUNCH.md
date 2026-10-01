# Social launch foundation

Stage 17 prepares Telegram and Instagram before the accounts exist.

It does not create accounts and does not publish anything automatically.

---

## Brand

Name:

```text
Open Massage Guide
```

Short name:

```text
OMG
```

RU positioning:

```text
Открытый визуальный справочник массажа: техники, безопасность и готовые программы.
```

EN positioning:

```text
An open visual massage guide with techniques, safety guidance and ready-made routines.
```

---

## Telegram profile

Current state:

```text
planned
```

Name:

```text
Open Massage Guide
```

RU description:

```text
Открытый визуальный справочник массажа: техники, безопасность и готовые программы. RU/EN • бесплатно • без регистрации.
```

EN description:

```text
Open visual massage guide: techniques, safety and ready-made routines. RU/EN • free • no registration.
```

After the channel is created, fill:

```text
data/social-launch.json
→ profiles.telegram.status = active
→ profiles.telegram.handle
→ profiles.telegram.profileUrl
```

---

## Instagram profile

Current state:

```text
planned
```

Name:

```text
Open Massage Guide
```

RU bio:

```text
Визуальный справочник массажа
Техники • безопасность • программы
RU/EN
```

EN bio:

```text
Visual massage guide
Techniques • safety • routines
RU/EN
```

After the account is created, fill:

```text
data/social-launch.json
→ profiles.instagram.status = active
→ profiles.instagram.handle
→ profiles.instagram.profileUrl
```

---

## Launch campaign

Initial campaign:

```text
omg_launch_ru_2026_10
```

Initial cadence:

```text
4 posts/week
```

Initial plan:

```text
12 posts
≈ 3 weeks
```

Do not treat the cadence as a permanent marketing rule. It is the first measurable experiment.

---

## Content pillars

Use a mix rather than publishing 12 nearly identical technique cards.

### Project

Examples:

```text
What is Open Massage Guide
How offline/PWA works
Why the guide is free/open
```

### Educational

Examples:

```text
How to use the guide
Safety principle
Pressure/tempo explanations
How to build a short routine
```

### Technique

A specific technique with:

```text
image
short explanation
pressure
tempo
time
CTA
UTM
```

---

## Instagram formats

Stage 17 defines only the content workflow.

Recommended working ratios:

```text
feed-card: 4:5
story/reel: 9:16
```

The actual visual social-card generator is a separate future stage.

Do not force the website image to serve as the final Instagram design.

---

## Launch-plan generator

Validate configuration:

```bash
node scripts/check-social-launch.mjs
```

Build plan:

```bash
node scripts/build-social-launch.mjs
```

Outputs:

```text
dist/social-launch/launch-plan.ru.json
dist/social-launch/launch-plan.ru.md
```

The generated plan contains:

```text
post order
week
content type
technique id where applicable
content idea
Telegram UTM
Instagram UTM
```

---

## First launch rule

Before scaling:

```text
create profiles
→ fill real handles/URLs
→ validate
→ regenerate plan
→ publish one Telegram pilot
→ verify Umami
→ mark-published
→ only then increase publication volume
```

The existing Stage 16 Telegram pilot remains pending until the Telegram channel exists.

---

## Account creation checklist

Telegram:

```text
[ ] Create channel
[ ] Set name
[ ] Set avatar
[ ] Add RU description
[ ] Choose handle
[ ] Add project URL
[ ] Update data/social-launch.json
[ ] Run validator
```

Instagram:

```text
[ ] Create account
[ ] Set name
[ ] Set avatar
[ ] Add bio
[ ] Choose handle
[ ] Add project/profile link
[ ] Update data/social-launch.json
[ ] Run validator
```

---

## Measurement

Every link must use UTM.

Primary launch metrics:

```text
visits
technique_open
favorite_add
return visits
Telegram source traffic
Instagram source traffic
campaign/content breakdown
```

Do not judge the channels by follower count alone.

---

## What Stage 17 does not do

It does not:

```text
create social accounts
store passwords/tokens
auto-publish
generate finished Instagram artwork
buy ads
change medical/editorial status
```

Those remain explicit later decisions.
