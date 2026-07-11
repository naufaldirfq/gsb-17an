# Design Specification: Delete Lomba (Competition) Feature

This specification documents the design and behavior of the "Delete Lomba" feature in the GSB application.

## User Experience

On the Admin Dashboard (`/admin`), each competition card will now display a trash icon button next to the "Kelola" button. 

- **Placement**: Next to the "Kelola" button on the bottom of the card.
- **Button Styling**: Red/destructive outline style (`variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50"`).
- **Confirmation**: Clicking the button will trigger a browser confirmation dialog:
  > "Apakah Anda yakin ingin menghapus perlombaan \"[Nama Lomba]\"? Semua data pendaftaran, tim, dan pertandingan yang terkait akan dihapus secara permanen."
- **After Deletion**: If the user confirms, the competition and all its cascade dependencies will be deleted, a success toast ("Berhasil dihapus!") will be displayed, and the dashboard will refresh.

## Data Flow & Architecture

The deletion is executed inside a database transaction to ensure data integrity and avoid orphan/broken records.

```mermaid
sequenceDiagram
    actor Admin
    participant AdminDashboard as Admin Dashboard Page
    participant DeleteButton as Delete Button (Client)
    participant Actions as Server Actions (deleteCompetitionAction)
    database DB as PostgreSQL Database (Prisma)

    Admin->>AdminDashboard: Click Trash Button
    AdminDashboard->>DeleteButton: Trigger Click
    DeleteButton->>Admin: Show confirm("Apakah Anda yakin...?")
    Admin->>DeleteButton: Confirm (Yes)
    DeleteButton->>Actions: Call deleteCompetitionAction(competitionId)
    Actions->>DB: Begin Transaction
    Note over DB: 1. Break MatchFlow references (set nextMatchId = null)
    Note over DB: 2. Delete matches
    Note over DB: 3. Delete team members
    Note over DB: 4. Delete teams
    Note over DB: 5. Delete registrations
    Note over DB: 6. Delete photos
    Note over DB: 7. Delete competition
    DB-->>Actions: Transaction Complete
    Actions-->>DeleteButton: Return { success: true }
    DeleteButton->>AdminDashboard: Show toast.success & router.refresh()
```

## Proposed Changes

### 1. `src/app/admin/actions.ts`
We will implement `deleteCompetitionAction(competitionId: string)`:
- Authenticates the admin via cookie check.
- Runs a Prisma transaction `prisma.$transaction` performing:
  1. `prisma.match.updateMany` setting `nextMatchId: null` where `competitionId = competitionId`.
  2. `prisma.match.deleteMany` where `competitionId = competitionId`.
  3. `prisma.teamMember.deleteMany` where `team.competitionId = competitionId`.
  4. `prisma.team.deleteMany` where `competitionId = competitionId`.
  5. `prisma.registration.deleteMany` where `competitionId = competitionId`.
  6. `prisma.photo.deleteMany` where `competitionId = competitionId`.
  7. `prisma.competition.delete` where `id = competitionId`.

### 2. `src/app/admin/(guarded)/page.tsx`
- Import `DeleteButton` from `./delete-button`.
- Import `deleteCompetitionAction` from `../actions`.
- In the loop rendering each competition card, change:
  ```tsx
  <div className="flex gap-2">
    <Link href={`/admin/lomba/${comp.slug}`} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all h-8 px-2.5 w-full bg-merah hover:bg-merah-tua text-white">
      Kelola
    </Link>
  </div>
  ```
  to:
  ```tsx
  <div className="flex gap-2">
    <Link href={`/admin/lomba/${comp.slug}`} className="flex-1 inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all h-8 px-2.5 bg-merah hover:bg-merah-tua text-white">
      Kelola
    </Link>
    <DeleteButton
      id={comp.id}
      action={deleteCompetitionAction}
      confirmMessage={`Apakah Anda yakin ingin menghapus perlombaan "${comp.name}"? Semua data pendaftaran, tim, dan pertandingan yang terkait akan dihapus secara permanen.`}
      size="sm"
      variant="outline"
      className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer h-8 w-8 p-0"
    />
  </div>
  ```

## Verification Plan

### Automated Tests
We will add unit tests to `src/app/actions.test.ts` (or a dedicated test file) to assert:
- `deleteCompetitionAction` returns `{ error: "Unauthorized" }` if the caller is not authenticated as admin.
- `deleteCompetitionAction` successfully deletes the competition and its related data (registrations, teams, matches, photos) when authenticated.

### Manual Verification
- Log in to the admin dashboard.
- Create a test competition.
- Add some registrations or seed some data.
- Click the delete button and verify the confirmation dialog appears.
- Cancel the dialog and confirm the competition is NOT deleted.
- Click delete and confirm the dialog. Verify that:
  - The competition card disappears from the dashboard.
  - The success toast is shown.
