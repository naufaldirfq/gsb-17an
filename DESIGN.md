# DESIGN.md — Lomba 17-an GSB

The visual identity for the Green Serpong Bintaro Independence Day site. This is the source of truth for color, type, layout, and tone. Build every screen from these tokens.

---

## Direction

**"Kampung tournament poster."** The event lives in the world of 17-an: umbul-umbul strung between houses, bold *Dirgahayu* banners, the scoreboard at the lapangan, medals and trophies for the juara. The design takes the **Merah Putih** flag as its non-negotiable core, sets it on warm paper, and adds **brass/gold** strictly for winners. It should feel celebratory and unmistakably Indonesian — but stay sharp and legible, because half the screens are forms, participant lists, and brackets.

Festive on the landing and bracket surfaces; quiet and disciplined on every functional surface. Spend the boldness on the **hero and the bracket**, keep forms calm.

**Anti-goals:** flag emoji sprinkled everywhere, balloon-and-confetti clip art, comic-style "fun" fonts. And deliberately *not* the AI-default look (cream background + serif display + terracotta accent) — our red is the flag's, our display face is a poster shout, and the accent is brass, not terracotta.

---

## Color

Anchored to the official Sang Saka Merah Putih red. Six named tokens:

| Token            | Hex       | Use                                                        |
|------------------|-----------|------------------------------------------------------------|
| `merah`          | `#CE1126` | Primary. Flag red — headers, primary buttons, active state |
| `merah-tua`      | `#8E0C1B` | Deep red for shadows, header bars, pressed states          |
| `putih-kertas`   | `#FAF6EE` | Page background — warm paper, not stark white              |
| `surface`        | `#FFFFFF` | Cards, forms, bracket nodes                                |
| `arang`          | `#1C1A19` | Ink — body text, headings on light                         |
| `emas`           | `#C9962E` | Brass accent — **champions, medals, juara only**. Rare.    |

Rules:
- The page reads **red + paper + ink**. `emas` is precious: a champion's node, a medal icon, the `/juara` wall. If gold shows up on a normal button, it's overused.
- White-on-`merah` and `arang`-on-`putih-kertas` are the workhorse text pairings — both clear WCAG AA.
- No gradients on red. Flat, confident fields of color, like a printed poster.

---

## Typography

Three roles. The display face is the personality; use it loud but rarely.

- **Display — `Anton`** (Google Fonts). Heavy condensed grotesque, the visual cousin of vintage *MERDEKA!* poster lettering. For the hero, section shouts (`LOMBA`, `BAGAN`, `JUARA`), and big numerals. Uppercase, tight tracking. Never for body.
- **Body / UI — `Plus Jakarta Sans`** (Google Fonts). A deliberate, on-brief pick: an Indonesian-designed sans literally named for the city. Clean, friendly, excellent at small sizes — carries all forms, labels, and lists.
- **Data / scores — `JetBrains Mono`**. Monospace for scores, seeds, and bracket figures so columns of numbers line up like a real scoreboard.

Scale (mobile-first, rem):

```
display-xl  Anton    3.5  / 0.95  uppercase, -0.5px   hero
display-lg  Anton    2.25 / 1.0   uppercase            section heads
h1          Jakarta  1.5  / 1.2   700
h2          Jakarta  1.25 / 1.3   700
body        Jakarta  1.0  / 1.5   400/500
caption     Jakarta  0.8125/1.4   500  labels, meta
score       Mono     1.5  / 1.0   600  match scores
```

---

## Layout

- **Mobile-first, single column** that opens up to a max content width of ~`1100px` on desktop. Most warga arrive from a WhatsApp link on their phone.
- **8px spacing grid.** Generous breathing room on the landing; tight, scannable rows for participant lists and brackets.
- **Border-radius: `12px`** on cards and buttons (soft, modern), `0` on the bunting divider and bracket connector lines (graphic, poster-like).
- Cards: `surface` on `putih-kertas`, a hairline `1px` border in `arang` at 8% opacity, no heavy drop shadows.

Hero (`/`) — the thesis screen:

```
┌──────────────────────────────────────────┐
│  ▲▼▲▼▲▼▲▼  (umbul-umbul bunting strip)     │
│                                            │
│        DIRGAHAYU RI KE-81   ← Anton, merah │
│        L O M B A   1 7 - A N               │
│        Green Serpong Bintaro               │
│                                            │
│        [ 17 AGT ]  countdown: 58 hari      │  ← Mono numerals
│                                            │
│        [ Daftar Lomba ]  (merah button)    │
│                                            │
│  Tenis Meja · Bulu Tangkis · Padel · Basket│
└──────────────────────────────────────────┘
```

Not a generic "big stat + label" hero — the characteristic thing is the *event banner itself* plus a live countdown to the 17th.

---

## Signature element — the umbul-umbul

The one thing the site is remembered by: a **bunting strip of red-and-white triangles** (`▲▼▲▼`) used as the primary section divider, echoing the flags strung across komplek streets every August. It reappears, scaled down, as the **connector styling in the bracket** — bracket lines terminate in small flag-triangle nodes so the tournament tree literally reads as bunting between matches.

Use it with restraint: top of the hero, between major sections, and in the bracket. Not on every card.

---

## Components

- **Buttons:** primary = solid `merah`, white text, `12px` radius, pressed → `merah-tua`. Secondary = `surface` with `merah` border + text. One primary action per screen.
- **Competition card:** name in `h2`, a clear participant count (`24 peserta`), and a status pill — `REGISTRATION` (merah outline), `LOCKED` (arang), `ONGOING` (merah solid), `DONE` (emas).
- **Bracket node:** white card, team name in Jakarta, score in Mono on the right. Winner's name in `700` + a thin `emas` left-border. Bye nodes are muted (`arang` 40%).
- **Champion (`/juara`):** the *only* place gold goes big — `emas` medal/trophy mark, team name in `display-lg`.
- **Forms:** calm. Label (caption) above input, `surface` field, `merah` focus ring. Inline validation in `merah-tua`.

---

## Motion

Sparing and purposeful — overdone animation reads as AI-generated.

- Hero bunting does **one** gentle sway on load, then rests.
- Bracket: when a score is saved, the winning team's advance into the next node is a short slide/fade so the result feels live.
- Respect `prefers-reduced-motion`: disable the sway and slide, keep instant state.

---

## Voice & copy

Bahasa Indonesia, warm and neighborly — like the panitia talking, not a corporation.

- Actions say what happens: **`Daftar`**, **`Acak Tim`**, **`Buat Bagan`**, **`Simpan Skor`** — and stay consistent through the flow (the button that says `Daftar` produces a toast `Berhasil daftar!`).
- Empty states invite action: an unregistered competition shows *"Belum ada peserta. Jadi yang pertama daftar!"* not a blank table.
- Errors are plain and helpful, in the interface's voice: *"Nomor WhatsApp ini sudah terdaftar di lomba ini."* — never a vague "Error".
- Numbers and house references in local form: blok + nomor rumah (`Blok C3 No. 12`), phone as `08xx`.

---

## Quality floor

Responsive to 360px wide · visible keyboard focus on every interactive element · AA contrast on all text · reduced-motion honored · brackets readable (and screenshot-able) on a phone, since they'll be shared in the komplek WhatsApp group.
