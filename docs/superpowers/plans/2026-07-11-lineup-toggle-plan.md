# Toggle Lineup Announcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configuration setting to show/hide the "Lineup Belum Final" announcement on the public homepage.

**Architecture:** Create a generic key-value `Setting` model in Prisma. Implement a client-side announcement-toggle component under admin. Execute server actions to update setting values and revalidate cache. Adjust the landing page server component to fetch and respect the setting visibility.

**Tech Stack:** Next.js (Server Components & Server Actions), Prisma, TailwindCSS, shadcn/ui (switch, card).

---

### Task 1: Database Schema Migration

**Files:**
- Modify: [schema.prisma](file:///Users/mekari/Documents/project/gsb/prisma/schema.prisma)

- [ ] **Step 1: Add Setting model to schema.prisma**
  
  Add the following model to the end of `prisma/schema.prisma`:
  ```prisma
  model Setting {
    key   String @id
    value String
  }
  ```

- [ ] **Step 2: Run Prisma db push to apply changes to PostgreSQL**

  Run: `npx prisma db push`
  Expected: Database schema matches the Prisma schema.

- [ ] **Step 3: Commit**

  ```bash
  git add prisma/schema.prisma
  git commit -m "db: add Setting model for global settings"
  ```

---

### Task 2: Server Action for Announcement setting

**Files:**
- Modify: [actions.ts](file:///Users/mekari/Documents/project/gsb/src/app/admin/actions.ts)

- [ ] **Step 1: Implement server action updateAnnouncementSettingAction**

  Append to the bottom of `src/app/admin/actions.ts`:
  ```typescript
  export async function updateAnnouncementSettingAction(show: boolean) {
    const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
    if (authCookie?.value !== "authenticated") {
      return { error: "Unauthorized" };
    }

    try {
      await prisma.setting.upsert({
        where: { key: "showLineupAnnouncement" },
        update: { value: show ? "true" : "false" },
        create: { key: "showLineupAnnouncement", value: show ? "true" : "false" },
      });

      revalidatePath("/");
      revalidatePath("/admin");
      return { success: true };
    } catch (err) {
      console.error(err);
      return { error: "Gagal memperbarui pengaturan" };
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/app/admin/actions.ts
  git commit -m "feat: add updateAnnouncementSettingAction server action"
  ```

---

### Task 3: Client Toggle Component

**Files:**
- Create: [announcement-toggle.tsx](file:///Users/mekari/Documents/project/gsb/src/app/admin/%28guarded%29/announcement-toggle.tsx)

- [ ] **Step 1: Create announcement-toggle.tsx component**

  Create file `src/app/admin/(guarded)/announcement-toggle.tsx` with:
  ```typescript
  "use client";

  import { useState, useTransition } from "react";
  import { Switch } from "@/components/ui/switch";
  import { Label } from "@/components/ui/label";
  import { updateAnnouncementSettingAction } from "../actions";
  import { toast } from "sonner";

  interface AnnouncementToggleProps {
    initialShow: boolean;
  }

  export function AnnouncementToggle({ initialShow }: AnnouncementToggleProps) {
    const [show, setShow] = useState(initialShow);
    const [isPending, startTransition] = useTransition();

    const handleToggle = (checked: boolean) => {
      setShow(checked);
      startTransition(async () => {
        const res = await updateAnnouncementSettingAction(checked);
        if (res?.error) {
          toast.error(res.error);
          setShow(!checked);
        } else {
          toast.success(
            checked
              ? "Pengumuman lineup berhasil ditampilkan"
              : "Pengumuman lineup berhasil disembunyikan"
          );
        }
      });
    };

    return (
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="space-y-0.5 pr-4">
          <Label htmlFor="announcement-mode" className="text-base font-semibold text-arang">
            Tampilkan Pengumuman Lineup
          </Label>
          <p className="text-sm text-gray-500">
            Tampilkan banner &quot;Lineup Belum Final&quot; di halaman utama jika ada perlombaan yang aktif.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <Switch
            id="announcement-mode"
            checked={show}
            onCheckedChange={handleToggle}
            disabled={isPending}
            className="data-checked:bg-merah"
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/app/admin/\(guarded\)/announcement-toggle.tsx
  git commit -m "feat: add AnnouncementToggle component"
  ```

---

### Task 4: Integrate Toggle to Admin Dashboard

**Files:**
- Modify: [page.tsx](file:///Users/mekari/Documents/project/gsb/src/app/admin/%28guarded%29/page.tsx)

- [ ] **Step 1: Fetch setting status and render component in page.tsx**

  In `src/app/admin/(guarded)/page.tsx`, import `AnnouncementToggle`:
  ```typescript
  import { AnnouncementToggle } from "./announcement-toggle";
  ```

  Fetch the setting in the `AdminDashboardPage` component:
  ```typescript
  const setting = await prisma.setting.findUnique({
    where: { key: "showLineupAnnouncement" },
  });
  const showLineupAnnouncement = setting ? setting.value === "true" : true;
  ```

  And render the settings card above the competition grid:
  ```typescript
  {/* Place above the grid of competitions, right after the header block */}
  <div className="mb-8 max-w-xl">
    <h2 className="text-lg font-semibold text-arang mb-3">Pengaturan Global</h2>
    <AnnouncementToggle initialShow={showLineupAnnouncement} />
  </div>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/app/admin/\(guarded\)/page.tsx
  git commit -m "feat: integrate announcement toggle to admin page"
  ```

---

### Task 5: Homepage integration

**Files:**
- Modify: [page.tsx](file:///Users/mekari/Documents/project/gsb/src/app/page.tsx)

- [ ] **Step 1: Read setting and conditionally render banner**

  In `src/app/page.tsx`, read the setting:
  ```typescript
    const showSetting = await prisma.setting.findUnique({
      where: { key: "showLineupAnnouncement" },
    });
    const showLineupAnnouncement = showSetting ? showSetting.value === "true" : true;
  ```

  Then, wrap the `CardFooter` announcement with the condition `showLineupAnnouncement`:
  ```typescript
              {showLineupAnnouncement && (
                <CardFooter className="flex flex-col items-center gap-1 text-center bg-arang/[0.02] border-t border-border py-4 px-5">
                  <p className="text-xs font-semibold text-merah tracking-wider uppercase">📢 Lineup Belum Final</p>
                  <p className="text-xs text-arang/70 leading-relaxed font-jakarta">
                    Daftar di atas adalah lomba yang saat ini dibuka untuk pendaftaran. Nantikan kehadiran lomba seru lainnya yang akan segera menyusul!
                  </p>
                </CardFooter>
              )}
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/app/page.tsx
  git commit -m "feat: conditionally show lineup announcement card footer based on setting"
  ```

---

### Task 6: Verification

- [ ] **Step 1: Check Next.js Build**

  Run: `npm run build`
  Expected: Successful production build without any Typecheck or Next.js lint errors.
