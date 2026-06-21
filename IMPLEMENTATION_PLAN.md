# Lomba 17-an GSB — Implementation Plan

A web app for **Green Serpong Bintaro (GSB)** to run the Independence Day (17 Agustus / HUT RI ke-81) competitions: public registration, participant lists, admin-driven team formation + bracket generation, and live score entry.

---

## 1. Goals

1. Warga (residents) can browse competitions and **register themselves** from their phone.
2. Anyone can **see who's participating** in each competition.
3. Admin (panitia) can **form teams/pairs** — random doubles for ping pong / badminton / padel, random 3v3 for basket.
4. Admin can **generate the bracket** and **enter scores**, with winners auto-advancing.
5. Public, shareable **bracket + results** view so the whole komplek can follow along.

---

## 2. Confirmed decisions

- **No accounts for residents.** Registration is a simple public form (nama, blok, nomor rumah, no. WhatsApp). Admin is the only login.
- **No payment.** Free registration; the site just records who's in. (Midtrans/Xendit could be added later if ever needed — out of scope.)
- **Single-elimination** for all competitions. (Round-robin / group→knockout stay in the schema as options but aren't built for v1.)
- **Fully random** team formation for the racket sports (tenis meja, bulu tangkis, padel). **Basketball 3x3 is TBD** — likely *not* random; see §11.
- **Bahasa Indonesia** UI; codebase/docs in English.
- One event this year; schema leaves room to reuse next year.

---

## 3. Tech stack

Chosen to match your Next.js comfort and to ship fast with minimal ops:

- **Next.js (App Router) + TypeScript** — Server Actions for mutations, RSC for the read-heavy public pages.
- **Tailwind CSS** + **shadcn/ui** for accessible primitives (dialog, table, form, toast).
- **Supabase (Postgres + Auth + Storage)** — Postgres for data, Supabase Auth for the single admin login, Storage for an optional photo/champion gallery.
- **Prisma** (or Drizzle if you prefer lighter) as the ORM. Schema below is Prisma; trivially portable.
- **Vercel** for hosting. Edge-friendly, free tier is plenty for komplek traffic.
- **Zod** for input validation on every form and server action.

Why Supabase over raw Postgres: you get a hosted DB, auth, and file storage in one dashboard, and Row Level Security if you ever expose the public API directly. For v1 you can keep all DB access server-side through Prisma and treat Supabase purely as managed Postgres + Auth.

---

## 4. Architecture

```
Browser (mobile-first)
   │
   ├── Public RSC pages ── read via Prisma (cached) ──┐
   │                                                  │
   └── Forms / Admin ── Server Actions (Zod) ─────────┤──► Postgres (Supabase)
                                                      │
   Admin login ── Supabase Auth (email magic link) ───┘
```

- Reads (competition lists, participant lists, brackets) are React Server Components — fast, cacheable, no client JS needed.
- Writes (register, generate teams, set score) go through **Server Actions** guarded by Zod + an admin check.
- Revalidate the relevant paths after each mutation so the public bracket updates.

---

## 5. Data model

The model generalizes "doubles", "3v3", and possible future formats into one set of fields: a competition has a `teamSize` and a `pairingMode`, so "could be more" is just new rows, not new code.

```prisma
model Competition {
  id               String            @id @default(cuid())
  slug             String            @unique
  name             String            // "Tenis Meja", "Bulu Tangkis", "Basket 3x3", "Padel"
  description      String?
  rules            String?
  teamSize         Int               // 1 = perorangan, 2 = ganda, 3 = 3v3
  pairingMode      PairingMode       // SOLO | RANDOM | MANUAL
  bracketFormat    BracketFormat     // SINGLE_ELIM | ROUND_ROBIN | GROUP_KNOCKOUT
  maxParticipants  Int?
  registrationOpen Boolean           @default(true)
  status           CompetitionStatus @default(REGISTRATION)
  createdAt        DateTime          @default(now())

  registrations    Registration[]
  teams            Team[]
  matches          Match[]
}

model Participant {
  id            String         @id @default(cuid())
  name          String
  houseBlock    String         // Blok, e.g. "C3"
  houseNumber   String         // Nomor rumah
  phone         String         @unique   // WhatsApp; doubles as a soft identity
  createdAt     DateTime       @default(now())
  registrations Registration[]
}

model Registration {
  id            String      @id @default(cuid())
  competitionId String
  participantId String
  createdAt     DateTime    @default(now())
  competition   Competition @relation(fields: [competitionId], references: [id])
  participant   Participant @relation(fields: [participantId], references: [id])
  teamMember    TeamMember?
  @@unique([competitionId, participantId]) // no double-registering the same comp
}

model Team {
  id            String       @id @default(cuid())
  competitionId String
  name          String       // auto: "Tim 1" or "Budi & Andi"
  seed          Int?
  competition   Competition  @relation(fields: [competitionId], references: [id])
  members       TeamMember[]
  matchesAsA    Match[]      @relation("TeamA")
  matchesAsB    Match[]      @relation("TeamB")
}

model TeamMember {
  id             String       @id @default(cuid())
  teamId         String
  registrationId String       @unique
  team           Team         @relation(fields: [teamId], references: [id])
  registration   Registration @relation(fields: [registrationId], references: [id])
}

model Match {
  id            String      @id @default(cuid())
  competitionId String
  round         Int         // 1 = first round
  position      Int         // index within the round (for layout + linking)
  label         String?     // "Final", "Semifinal", "Perebutan Juara 3"
  teamAId       String?
  teamBId       String?
  scoreA        Int?
  scoreB        Int?
  winnerTeamId  String?
  status        MatchStatus @default(PENDING)
  nextMatchId   String?     // where the winner flows
  nextSlot      Slot?       // into slot A or B of the next match
  court         String?     // "Lapangan 1"
  scheduledAt   DateTime?
  competition   Competition @relation(fields: [competitionId], references: [id])
  teamA         Team?       @relation("TeamA", fields: [teamAId], references: [id])
  teamB         Team?       @relation("TeamB", fields: [teamBId], references: [id])
}

enum PairingMode       { SOLO RANDOM MANUAL }
enum BracketFormat     { SINGLE_ELIM ROUND_ROBIN GROUP_KNOCKOUT }
enum CompetitionStatus { DRAFT REGISTRATION LOCKED ONGOING DONE }
enum MatchStatus       { PENDING READY ONGOING COMPLETED BYE }
enum Slot              { A B }
```

Seed data for launch:

| Competition   | teamSize | pairingMode | bracketFormat |
|---------------|----------|-------------|---------------|
| Tenis Meja    | 2        | RANDOM      | SINGLE_ELIM   |
| Bulu Tangkis  | 2        | RANDOM      | SINGLE_ELIM   |
| Padel         | 2        | RANDOM      | SINGLE_ELIM   |
| Basket 3x3    | 3        | RANDOM      | SINGLE_ELIM   |

---

## 6. Core algorithms

These are the only genuinely tricky pieces. Everything else is CRUD.

### 6.1 Team formation (random pairing)

Runs when admin clicks **"Acak Tim"** after locking registration. Same code handles doubles (size 2) and 3v3 (size 3).

```ts
function formTeams(registrations: Registration[], teamSize: number) {
  const pool = shuffle([...registrations]);   // Fisher–Yates
  const teams: Registration[][] = [];
  const leftovers: Registration[] = [];

  for (let i = 0; i < pool.length; i += teamSize) {
    const group = pool.slice(i, i + teamSize);
    if (group.length === teamSize) teams.push(group);
    else leftovers.push(...group);             // incomplete final group
  }
  return { teams, leftovers };
}
```

**Odd / leftover participants are never silently dropped.** If `leftovers.length > 0`, the admin sees a warning and chooses:
- assign a panitia member to fill the slot,
- merge a leftover into an existing team (e.g. allow one team of 4 in 3v3 as a sub),
- or wait for more sign-ups.

Persisting: create a `Team` per group, name it from members (`"Budi & Andi"`) or `"Tim N"`, then a `TeamMember` per registration. Re-running should require an explicit "regenerate" that's **blocked once any match is completed** (see §6.4 lock).

### 6.2 Single-elimination bracket

```ts
function buildSingleElim(teams: Team[]) {
  const shuffled = shuffle(teams);
  const n = shuffled.length;
  const size = nextPowerOfTwo(n);     // 5 teams -> 8
  const rounds = Math.log2(size);     // number of rounds

  // 1) Create empty match shells, round by round, linked by nextMatchId.
  const matchesByRound: Match[][] = [];
  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r;      // round 1 has size/2 matches
    matchesByRound[r] = range(count).map(pos => makeMatch({ round: r, position: pos }));
  }
  // link: winner of round r match p -> round r+1 match floor(p/2), slot A if p even else B
  for (let r = 1; r < rounds; r++) {
    matchesByRound[r].forEach((m, p) => {
      m.nextMatchId = matchesByRound[r + 1][Math.floor(p / 2)].id;
      m.nextSlot = p % 2 === 0 ? "A" : "B";
    });
  }

  // 2) Seat teams into round-1 slots using a spread order so byes don't cluster.
  const order = seedOrder(size);      // standard bracket seeding positions
  const seats = order.map(i => shuffled[i - 1] ?? null);   // null = BYE

  // 3) Fill round-1 matches and auto-resolve byes.
  matchesByRound[1].forEach((m, p) => {
    m.teamAId = seats[2 * p]?.id ?? null;
    m.teamBId = seats[2 * p + 1]?.id ?? null;
    if (m.teamAId && !m.teamBId) resolveBye(m, "A");
    else if (!m.teamAId && m.teamBId) resolveBye(m, "B");
    else if (m.teamAId && m.teamBId) m.status = "READY";
  });

  // 4) Label the last rounds: Final, Semifinal, etc. Optionally add a 3rd-place match.
}
```

- `nextPowerOfTwo(5) = 8`, so 3 teams get a first-round bye. `seedOrder` (e.g. `[1,8,5,4,3,6,7,2]` for size 8) spreads byes evenly instead of bunching them on one side.
- `resolveBye` sets `winnerTeamId`, `status = COMPLETED`, and immediately pushes that team into its `nextMatch` slot — so byes "just work" with the same advancement code below.

### 6.3 Other formats (supported, not default)

- **Round-robin:** generate every pairing (`C(n,2)` matches). Standings = wins, tiebreak by point difference. Good for small fields or a "liga santai".
- **Group → knockout:** split into groups, round-robin within each, top *k* per group seed a single-elim bracket. Reuses 6.2.

### 6.4 Score entry + winner advancement

```ts
async function setScore(matchId, scoreA, scoreB) {
  if (scoreA === scoreB) throw new Error("Skor seri tidak boleh di sistem gugur");
  const m = await getMatch(matchId);
  const winnerTeamId = scoreA > scoreB ? m.teamAId : m.teamBId;

  await update(m, { scoreA, scoreB, winnerTeamId, status: "COMPLETED" });

  if (m.nextMatchId) {
    const field = m.nextSlot === "A" ? "teamAId" : "teamBId";
    const next = await update(m.nextMatchId, { [field]: winnerTeamId });
    if (next.teamAId && next.teamBId) await update(next.id, { status: "READY" });
  }
  revalidatePath(`/lomba/${competitionSlug}`);
}
```

Scores are editable (typo fixes) but **changing a completed match's winner must cascade**: if the bracket has already advanced, warn the admin and re-propagate, or block the edit if downstream matches are completed. Simplest safe rule for v1: allow editing scores freely **until** the next match has a result; after that, require an explicit "reset downstream" confirmation.

**Lock rule:** once `bracketFormat` matches exist and any is `COMPLETED`, the competition moves to `ONGOING` and re-pairing/regeneration is disabled to prevent accidental reshuffles.

---

## 7. Pages

Public (RSC, mobile-first):

- `/` — Hero (Dirgahayu RI ke-81 + GSB), countdown to 17 Agustus, competition lineup, CTA "Daftar".
- `/lomba` — all competitions with participant counts and registration status.
- `/lomba/[slug]` — description, rules, **participant/team list**, register button, and the **bracket** once generated.
- `/lomba/[slug]/bagan` — full-screen bracket view (shareable, good for projecting/screenshotting).
- `/juara` — champions wall once events finish (nice closing touch).

Admin (`/admin/*`, behind Supabase Auth):

- `/admin` — dashboard: per-competition status, registration counts, quick actions.
- `/admin/lomba/[slug]` — manage one competition:
  - view/edit registrations, close registration (`LOCKED`),
  - **Acak Tim** (form teams) with leftover handling,
  - **Buat Bagan** (generate bracket),
  - **input skor** per match with live advancement,
  - reset/regenerate (guarded by the lock rule).
- `/admin/peserta` — master participant list, dedupe, edit contact info.

---

## 8. Admin flow (happy path)

1. Create competitions (seed script covers the four; UI to add "more").
2. Registration window open → warga sign up.
3. Close registration → `LOCKED`.
4. **Acak Tim** → review pairings, resolve leftovers.
5. **Buat Bagan** → bracket created, byes auto-resolved.
6. During the event: open each match, enter score → winner advances automatically.
7. Final completed → champion shown on `/juara` and the competition's bracket.

---

## 9. Validation & guardrails

- Every form + action validated with Zod; phone normalized to `08…`/`+62…` consistently.
- Registration blocked when `registrationOpen = false` or `maxParticipants` reached.
- Duplicate guard: same phone can't register twice for one competition.
- Admin-only actions check the session server-side, not just hidden UI.
- Rate-limit the public registration action (simple IP/throttle) to avoid spam.

---

## 10. Build phases

- **Phase 0 — Setup:** Next.js + Tailwind + shadcn, Supabase project, Prisma schema + migrate, seed competitions, deploy skeleton to Vercel.
- **Phase 1 — Public registration:** competition list/detail, registration form + server action, participant lists. *(Ship-worthy on its own — registration can open before brackets exist.)*
- **Phase 2 — Admin shell:** Supabase Auth login, dashboard, competition management, close registration.
- **Phase 3 — Teams + bracket:** `formTeams`, leftover UI, `buildSingleElim`, bracket data model.
- **Phase 4 — Scoring + public bracket:** score entry, winner advancement, public bracket view.
- **Phase 5 — Polish:** countdown, champions wall, WhatsApp share, QR code to the site for the pos ronda board, Bahasa copy pass, accessibility + reduced-motion.

Phases 1–4 are the MVP; 0–1 alone already lets registration go live while you build the rest.

---

## 11. Open item — basketball team formation (TBD)

Everything else is locked (§2). The one parked decision is how **Basket 3x3** teams form, since they probably shouldn't be random — people want to play with their own crew. Three options, all supported by the existing schema (no model changes):

- **A. Register as a team (recommended).** One captain submits the team: team name + 3 members (nama, blok, no. WhatsApp each). `Team` + `TeamMember` rows are created at registration time, and the **Acak Tim** step is skipped for basketball. Needs a separate registration form for this one competition.
- **B. Admin forms manually.** Warga register individually; admin assembles teams by hand in `/admin`. Same individual form as the racket sports; `pairingMode = MANUAL`.
- **C. Individual + partner preference.** Register solo with an optional *"ingin satu tim dengan ___"* field; admin uses it as a hint when forming teams.

This **doesn't block** Phase 0–1 (setup + racket-sport registration) — basketball can open later. My lean: **A**, cleanest for a komplek where friends commit as a group.

---

## 12. Nice-to-haves (post-MVP)

- Match scheduling + court assignment (`scheduledAt`, `court` fields already exist).
- Photo gallery / dokumentasi per competition (Supabase Storage).
- "Live" auto-refresh on the public bracket during match day.
- Per-blok leaderboard (which blok won the most medals) — great for komplek bragging rights.
- Export final results to PDF for the panitia report.
