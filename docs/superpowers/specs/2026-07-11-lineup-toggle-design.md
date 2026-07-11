# Design Document: Toggle Lineup Announcement Visibility in Admin Panel

## Goal Description
Add a configuration setting that allows administrators to show/hide the "Lineup Belum Final" (Lineup Not Final) announcement banner on the public homepage. This configuration will be managed via a new Global Settings section at the top of the Admin Dashboard.

## Proposed Changes

### Database Layer
#### [NEW] [Setting Model](file:///Users/mekari/Documents/project/gsb/prisma/schema.prisma)
Add a new database model to store key-value settings.

```prisma
model Setting {
  key   String @id
  value String
}
```

### Server Actions
#### [MODIFY] [actions.ts](file:///Users/mekari/Documents/project/gsb/src/app/admin/actions.ts)
Add a new server action `updateAnnouncementSettingAction(show: boolean)` to toggle the visibility:
- Ensures the admin is authenticated.
- Upserts the setting key `showLineupAnnouncement` to `"true"` or `"false"`.
- Revalidates the homepage path `/` and the admin path `/admin`.

### Components & UI
#### [NEW] [announcement-toggle.tsx](file:///Users/mekari/Documents/project/gsb/src/app/admin/%28guarded%29/announcement-toggle.tsx)
A client-side interactive React component for the toggle button:
- Uses `useState` and React transitions (`useTransition`) for immediate visual feedback.
- Calls `updateAnnouncementSettingAction` to update the DB when clicked.
- Renders a styled button or switch to match the dashboard's design.

#### [MODIFY] [page.tsx](file:///Users/mekari/Documents/project/gsb/src/app/admin/%28guarded%29/page.tsx)
- Retrieve the current status of the setting `showLineupAnnouncement` from the database.
- Render a new "Pengaturan Event" / "Global Settings" card at the top of the page.
- Render the `AnnouncementToggle` component inside this card.

#### [MODIFY] [page.tsx](file:///Users/mekari/Documents/project/gsb/src/app/page.tsx)
- Query the `showLineupAnnouncement` key from the `Setting` table.
- Default to `true` (show) if not set.
- Conditionally render the `CardFooter` containing the lineup announcement banner.

## Verification Plan

### Automated Tests
- Run `npm run build` or similar to verify compilation.

### Manual Verification
1. Login to the admin dashboard (`/admin`).
2. Verify the new toggle is visible at the top.
3. Switch the toggle to off. Check the homepage (`/`) to verify that the "Lineup Belum Final" banner is hidden.
4. Switch the toggle to on. Check the homepage (`/`) to verify that the banner is visible again.
