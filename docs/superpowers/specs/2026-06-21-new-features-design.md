# Design Specification: GSB Lomba Post-MVP Features
Date: 2026-06-21

Design specification for implementing Match Scheduling, PDF Export, and Admin UI for creating custom competitions.

---

## 1. Goals & Requirements

1. **Match Scheduling & Court Assignment**: Enable admins to assign a specific court name and date/time to individual matches. Display scheduling info on both admin and public brackets and match listings.
2. **Export to PDF**: Provide high-fidelity PDF exports for both a single competition (including rules, participants, matches, and bracket) and a global event summary report (including general statistics, champions, and block standings). Use Tailwind print CSS stylesheets and native browser print dialogs.
3. **Admin UI for Competitions**: Create a "+ Tambah Lomba" flow in the Admin Dashboard with preset templates for quick creation, while preserving advanced overrides.

---

## 2. Architecture & Data Model

### 2.1 Schema Utilization
Match scheduling relies on existing schema fields (`court` and `scheduledAt`) in the `Match` model.
No schema changes are required for these features.

### 2.2 Client Revalidation
All admin actions that update match schedules or competition configurations will invoke `revalidatePath` server-side to guarantee the public pages show the latest state instantly.

---

## 3. Detailed Component Designs

### 3.1 Custom Competitions Form
* **Path:** `/admin` (as a Dialog modal `AddCompetitionModal`) next to the main header.
* **Form Logic:** Pre-filled presets (Solo, Ganda Acak, Tim Manual) which populate standard fields (e.g. `teamSize` and `pairingMode`) but leave them editable.
* **Server Action:**
  `createCompetitionAction(formData: FormData)` inside `src/app/admin/actions.ts`.
  Generates a unique slug from the name. If the slug already exists, appends a numeric suffix.

### 3.2 Match Scheduling Modal
* **Path:** `/admin/lomba/[slug]` (triggered by clicking on a Match node or entry in the matches table).
* **Modal Fields:** Date/Time picker (`scheduledAt`) and a Text Input for `court`.
* **Server Action:**
  `scheduleMatchAction(matchId: string, court: string, scheduledAtRaw: string)` inside `src/app/admin/(guarded)/lomba/[slug]/actions.ts`.

### 3.3 PDF Export
* **Overall Report Path:** `/print/laporan`. Includes:
  * Overall stats card.
  * Leaderboard per Block (tallying Gold medals won).
  * Champions summary list.
* **Per-Competition Report Path:** `/print/lomba/[slug]`. Includes:
  * Roster of participants.
  * Rules and description.
  * Match log summary.
* **Print styling:** Implemented using CSS printing rules and class utility `@media print` / `print:` helpers to hide UI decorations and optimize layout for white pages. A client component triggers `window.print()` automatically upon load.

---

## 4. Open Design Decisions & Scope Limits
* PDF layouts are built responsively to fit standard A4 paper size.
* The bracket format remains Single Elimination for all generated custom competitions in this phase.
