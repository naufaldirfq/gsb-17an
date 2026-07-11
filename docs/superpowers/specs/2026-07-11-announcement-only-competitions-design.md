# Design Doc: Announcement-Only Competitions

This design document specifies the implementation details for allowing announcement-only/informational competitions ("lomba") that do not require registration and instead focus on holding date, time, and location details.

## Context & Requirements
Currently, all competitions in the GSB application require participants to register. However, some competitions do not require registration (e.g. they are announcements or walk-in/informational only). We need to:
1. Distinguish between normal competitions (requiring registration) and announcement-only competitions.
2. Store and display the date, time, and location details for competitions.
3. Update the admin portal to configure these details.
4. Update the public pages to adapt the UI for announcement-only competitions.

---

## Architectural & Data Model Changes

### 1. Database Schema
We will update `model Competition` in `prisma/schema.prisma`:
- Add `registrationRequired Boolean @default(true)` to flag if registration is needed.
- Add `heldAt String?` for holding date/time details in a flexible natural-language string format.
- Add `location String?` for the event location.

```prisma
model Competition {
  // Existing fields...
  registrationRequired Boolean           @default(true)
  heldAt               String?
  location             String?
  // Existing relations...
}
```

A migration will be generated using:
`npx prisma migrate dev --name add_announcement_only_competition_fields`

---

## Component Details & Flow

### 2. Admin Panel Updates

#### Server Action Updates (`src/app/admin/actions.ts`)
- Modify `createCompetitionSchema` (Zod) to validate `registrationRequired`, `heldAt`, and `location`.
- Update `createCompetitionAction` to parse these fields from `FormData` and pass them into the `prisma.competition.create` database transaction.

#### Add Competition Modal (`src/app/admin/(guarded)/add-competition-modal.tsx`)
- Add form fields for:
  - Checkbox/Switch: **Pendaftaran Diperlukan** (bound to state `registrationRequired`, defaults to `true`).
  - Text Input: **Waktu Pelaksanaan** (placeholder: e.g., "Sabtu, 17 Agustus 2026, 09:00 WIB").
  - Text Input: **Lokasi** (placeholder: e.g., "Lapangan Blok C").
- Form state will bind and submit these parameters.

---

### 3. Public Interface Updates

#### Lomba List Page (`src/app/lomba/page.tsx`)
- For each competition:
  - If `comp.registrationRequired` is `true`:
    - Show `Terdaftar: X Orang` badge.
    - Show primary button ("Daftar Sekarang" / "Ditutup").
  - If `comp.registrationRequired` is `false`:
    - Hide `Terdaftar: X Orang` badge.
    - Render a secondary/neutral-styled button/link saying **"Lihat Informasi"**.

#### Lomba Detail Page (`src/app/lomba/[slug]/page.tsx`)
- Retrieve `registrationRequired`, `heldAt`, and `location` fields in the page's main database query.
- Adapt layout if `competition.registrationRequired` is `false`:
  - Hide `Terdaftar: X Orang` badge in the page header.
  - Hide the "Pendaftaran" card (which contains `RegistrationForm` or closed alerts).
  - Hide the "Daftar Peserta" list card.
- If `competition.heldAt` or `competition.location` is set, or if `competition.registrationRequired` is `false`:
  - Show an **"Informasi Pelaksanaan"** Card.
  - If both `heldAt` and `location` are blank, display a placeholder text: *"Detail waktu dan tempat akan segera diumumkan."*

---

## Testing & Verification
### Automated Checks
- Ensure standard compilation builds correctly.
- Add test coverage for the creation action with the new fields if appropriate.

### Manual Verification
1. Create a registration-required competition with held time and location. Verify registration works.
2. Create an announcement-only competition. Verify list page shows "Lihat Informasi", and detail page hides registration form and shows the schedule details.
