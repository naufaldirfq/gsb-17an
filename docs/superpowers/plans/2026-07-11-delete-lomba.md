# Delete Lomba Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Delete Lomba" feature to allow administrators to permanently delete a competition and its related data from the dashboard.

**Architecture:** Create a server action `deleteCompetitionAction` that performs cascading deletions inside a Prisma transaction (releasing match flows, deleting matches, team members, teams, registrations, photos, and the competition). Expose this functionality on the Admin Dashboard using the existing `DeleteButton` client component.

**Tech Stack:** Next.js (App Router), Prisma ORM, PostgreSQL, Vitest, Tailwind CSS, Lucide Icons.

---

### Task 1: Backend Server Action

**Files:**
- Modify: `src/app/admin/actions.ts`

- [ ] **Step 1: Implement server action `deleteCompetitionAction`**

Add the `deleteCompetitionAction` function at the end of [actions.ts](file:///Users/mekari/Documents/project/gsb/src/app/admin/actions.ts):

```typescript
export async function deleteCompetitionAction(competitionId: string) {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Break self-referential relationships on Matches in this competition
      await tx.match.updateMany({
        where: { competitionId },
        data: { nextMatchId: null },
      });

      // 2. Delete matches
      await tx.match.deleteMany({
        where: { competitionId },
      });

      // 3. Delete TeamMembers for teams in this competition
      await tx.teamMember.deleteMany({
        where: {
          team: {
            competitionId,
          },
        },
      });

      // 4. Delete Teams
      await tx.team.deleteMany({
        where: { competitionId },
      });

      // 5. Delete Registrations
      await tx.registration.deleteMany({
        where: { competitionId },
      });

      // 6. Delete Photos
      await tx.photo.deleteMany({
        where: { competitionId },
      });

      // 7. Delete the Competition itself
      await tx.competition.delete({
        where: { id: competitionId },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Gagal menghapus perlombaan:", err);
    return { error: "Gagal menghapus perlombaan" };
  }
}
```

---

### Task 2: Backend Unit Tests

**Files:**
- Create: `src/app/admin/actions.test.ts`

- [ ] **Step 1: Write the unit tests for `deleteCompetitionAction`**

Create [actions.test.ts](file:///Users/mekari/Documents/project/gsb/src/app/admin/actions.test.ts):

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteCompetitionAction } from "./actions";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      match: {
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      teamMember: {
        deleteMany: vi.fn(),
      },
      team: {
        deleteMany: vi.fn(),
      },
      registration: {
        deleteMany: vi.fn(),
      },
      photo: {
        deleteMany: vi.fn(),
      },
      competition: {
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return await cb(prisma);
      }),
    },
  };
});

// Mock next/headers
const mockGet = vi.fn();
vi.mock("next/headers", () => {
  return {
    cookies: vi.fn(async () => {
      return {
        get: mockGet,
      };
    }),
  };
});

describe("deleteCompetitionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail if unauthorized", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await deleteCompetitionAction("comp-1");

    expect(result.error).toBe("Unauthorized");
    expect(prisma.competition.delete).not.toHaveBeenCalled();
  });

  it("should successfully delete a competition inside transaction when authorized", async () => {
    mockGet.mockReturnValue({ value: "authenticated" });

    const result = await deleteCompetitionAction("comp-1");

    expect(result.success).toBe(true);
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
      data: { nextMatchId: null },
    });
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.teamMember.deleteMany).toHaveBeenCalledWith({
      where: {
        team: {
          competitionId: "comp-1",
        },
      },
    });
    expect(prisma.team.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.registration.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.photo.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.competition.delete).toHaveBeenCalledWith({
      where: { id: "comp-1" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/app/admin/actions.test.ts`
Expected: PASS all tests in `src/app/admin/actions.test.ts`.

- [ ] **Step 3: Commit backend changes**

Run:
```bash
git add src/app/admin/actions.ts src/app/admin/actions.test.ts
git commit -m "feat(backend): add deleteCompetitionAction and tests"
```

---

### Task 3: Admin Dashboard UI

**Files:**
- Modify: `src/app/admin/(guarded)/page.tsx`

- [ ] **Step 1: Import `DeleteButton` and `deleteCompetitionAction`**

In [page.tsx](file:///Users/mekari/Documents/project/gsb/src/app/admin/(guarded)/page.tsx), add imports:

```typescript
import { DeleteButton } from "./delete-button";
import { deleteCompetitionAction } from "../actions";
```

- [ ] **Step 2: Integrate `DeleteButton` on the Card**

Modify the action footer in [page.tsx](file:///Users/mekari/Documents/project/gsb/src/app/admin/(guarded)/page.tsx):

Replace:
```tsx
              <div className="flex gap-2">
                <Link href={`/admin/lomba/${comp.slug}`} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all h-8 px-2.5 w-full bg-merah hover:bg-merah-tua text-white">
                  Kelola
                </Link>
              </div>
```

With:
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

- [ ] **Step 3: Run all vitest tests to verify no regressions**

Run: `npx vitest run`
Expected: PASS all tests.

- [ ] **Step 4: Commit frontend changes**

Run:
```bash
git add src/app/admin/(guarded)/page.tsx
git commit -m "feat(frontend): integrate delete competition button on admin cards"
```
