# GSB Lomba Post-MVP Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Custom Competition Creation (Admin UI), Match Scheduling & Court Assignment, and PDF Export Layout & Styling.

**Architecture:** Implement server actions for competition creation and match scheduling. Create UI components using shadcn/ui Dialog and Tailwind styling. Use native browser printing (`window.print()`) with print-optimized stylesheets for PDF generation.

**Tech Stack:** Next.js (App Router), TypeScript, Prisma ORM, PostgreSQL (Supabase), Tailwind CSS, shadcn/ui.

---

### Task 1: Custom Competition Creation (Admin UI)

**Files:**
- Modify: `src/app/admin/actions.ts`
- Create: `src/app/admin/(guarded)/add-competition-modal.tsx`
- Modify: `src/app/admin/(guarded)/page.tsx`

- [ ] **Step 1: Implement createCompetition server action**
  Add the server action inside `src/app/admin/actions.ts` to validate fields with `zod`, generate a unique slug, and create the competition.
  
  Code to add:
  ```ts
  import { z } from "zod";
  import prisma from "@/lib/prisma";
  import { PairingMode, BracketFormat, CompetitionStatus } from "@prisma/client";

  const createCompetitionSchema = z.object({
    name: z.string().min(1, "Nama lomba harus diisi"),
    description: z.string().optional(),
    rules: z.string().optional(),
    teamSize: z.number().int().min(1),
    pairingMode: z.nativeEnum(PairingMode),
    bracketFormat: z.nativeEnum(BracketFormat),
    maxParticipants: z.number().int().optional().nullable(),
  });

  export async function createCompetitionAction(formData: FormData) {
    const rawName = formData.get("name") as string;
    const teamSize = parseInt(formData.get("teamSize") as string) || 1;
    const maxParticipantsRaw = formData.get("maxParticipants") as string;
    
    const parsed = createCompetitionSchema.safeParse({
      name: rawName,
      description: formData.get("description") || undefined,
      rules: formData.get("rules") || undefined,
      teamSize,
      pairingMode: formData.get("pairingMode"),
      bracketFormat: formData.get("bracketFormat"),
      maxParticipants: maxParticipantsRaw ? parseInt(maxParticipantsRaw) : null,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    let slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const existing = await prisma.competition.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    try {
      await prisma.competition.create({
        data: {
          ...parsed.data,
          slug,
          status: CompetitionStatus.REGISTRATION,
        },
      });
      return { success: true };
    } catch (err) {
      console.error(err);
      return { error: "Gagal membuat perlombaan" };
    }
  }
  ```

- [ ] **Step 2: Create AddCompetitionModal component**
  Create `src/app/admin/(guarded)/add-competition-modal.tsx` with dialog elements and preset buttons to autofill.
  
  Code to write:
  ```tsx
  "use client";

  import { useState } from "react";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { createCompetitionAction } from "../actions";
  import { useRouter } from "next/navigation";
  import { toast } from "sonner";

  export function AddCompetitionModal() {
    const [open, setOpen] = useState(false);
    const [teamSize, setTeamSize] = useState("1");
    const [pairingMode, setPairingMode] = useState("SOLO");
    const [bracketFormat, setBracketFormat] = useState("SINGLE_ELIM");
    const router = useRouter();

    const applyPreset = (preset: "solo" | "ganda_acak" | "tim_manual") => {
      if (preset === "solo") {
        setTeamSize("1");
        setPairingMode("SOLO");
      } else if (preset === "ganda_acak") {
        setTeamSize("2");
        setPairingMode("RANDOM");
      } else if (preset === "tim_manual") {
        setTeamSize("3");
        setPairingMode("MANUAL");
      }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set("teamSize", teamSize);
      formData.set("pairingMode", pairingMode);
      formData.set("bracketFormat", bracketFormat);

      const res = await createCompetitionAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Perlombaan berhasil ditambahkan!");
        setOpen(false);
        router.refresh();
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-merah hover:bg-merah-tua text-white font-medium cursor-pointer">
            + Tambah Lomba
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white text-arang">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Tambah Perlombaan Baru</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 my-2 overflow-x-auto pb-1">
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("solo")}>Preset Solo</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("ganda_acak")}>Preset Ganda Acak</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("tim_manual")}>Preset Tim Manual</Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nama Lomba</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea id="description" name="description" />
            </div>
            <div>
              <Label htmlFor="rules">Peraturan</Label>
              <Textarea id="rules" name="rules" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamSize">Pemain per Tim</Label>
                <Input id="teamSize" type="number" min="1" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="maxParticipants">Kuota Maksimal (Tim/Solo)</Label>
                <Input id="maxParticipants" name="maxParticipants" type="number" min="1" placeholder="Unlimited" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sistem Pasangan</Label>
                <Select value={pairingMode} onValueChange={setPairingMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="SOLO">SOLO</SelectItem>
                    <SelectItem value="RANDOM">RANDOM (Acak)</SelectItem>
                    <SelectItem value="MANUAL">MANUAL (Pilih)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sistem Bagan</Label>
                <Select value={bracketFormat} onValueChange={setBracketFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="SINGLE_ELIM">Single Elimination</SelectItem>
                    <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full bg-merah hover:bg-merah-tua text-white cursor-pointer">Simpan Lomba</Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
  ```

- [ ] **Step 3: Integrate AddCompetitionModal into Admin page**
  Open `src/app/admin/(guarded)/page.tsx`. Import `AddCompetitionModal` and render it next to the page heading.
  
  Code modifications in `src/app/admin/(guarded)/page.tsx`:
  ```tsx
  // Add import:
  import { AddCompetitionModal } from "./add-competition-modal";

  // Replace heading section:
  <div className="flex justify-between items-center mb-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-arang">Dashboard Admin</h1>
      <p className="text-gray-500 mt-2">Ringkasan status perlombaan GSB.</p>
    </div>
    <AddCompetitionModal />
  </div>
  ```

- [ ] **Step 4: Commit changes**
  Run: `git commit -m "feat(admin): implement custom competition creation"`

---

### Task 2: Match Scheduling & Court Assignment

**Files:**
- Modify: `src/app/admin/(guarded)/lomba/[slug]/actions.ts`
- Create: `src/app/admin/(guarded)/lomba/[slug]/match-schedule-modal.tsx`
- Modify: `src/app/admin/(guarded)/lomba/[slug]/page.tsx`
- Modify: `src/app/lomba/[slug]/page.tsx`
- Modify: `src/app/lomba/[slug]/bagan/page.tsx`

- [ ] **Step 1: Create scheduleMatch server action**
  In `src/app/admin/(guarded)/lomba/[slug]/actions.ts`, append the `scheduleMatchAction`:
  
  Code to add:
  ```ts
  export async function scheduleMatchAction(
    matchId: string,
    court: string,
    scheduledAtRaw: string
  ) {
    try {
      const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
      await prisma.match.update({
        where: { id: matchId },
        data: { court, scheduledAt }
      });
      revalidatePath("/admin");
      revalidatePath(`/admin/lomba/[slug]`, "page");
      revalidatePath(`/lomba/[slug]`, "page");
      revalidatePath(`/lomba/[slug]/bagan`, "page");
      return { success: true };
    } catch (error) {
      console.error(error);
      return { error: "Gagal menjadwalkan pertandingan" };
    }
  }
  ```

- [ ] **Step 2: Build MatchScheduleModal component**
  Create `src/app/admin/(guarded)/lomba/[slug]/match-schedule-modal.tsx`.
  
  Code to write:
  ```tsx
  "use client";

  import { useState } from "react";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { scheduleMatchAction } from "./actions";
  import { useRouter } from "next/navigation";
  import { toast } from "sonner";

  export function MatchScheduleModal({
    match,
  }: {
    match: { id: string; court: string | null; scheduledAt: Date | null };
  }) {
    const [open, setOpen] = useState(false);
    const [court, setCourt] = useState(match.court || "");
    const [scheduledAt, setScheduledAt] = useState(
      match.scheduledAt
        ? new Date(match.scheduledAt.getTime() - match.scheduledAt.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : ""
    );
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const res = await scheduleMatchAction(match.id, court, scheduledAt);
      setLoading(false);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Jadwal pertandingan berhasil disimpan!");
        setOpen(false);
        router.refresh();
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="cursor-pointer">Jadwalkan</Button>
        </DialogTrigger>
        <DialogContent className="bg-white text-arang">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Jadwal Pertandingan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="court">Lapangan / Court</Label>
              <Input id="court" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="e.g. Lapangan Utama, Meja 1" />
            </div>
            <div>
              <Label htmlFor="scheduledAt">Waktu</Label>
              <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-merah hover:bg-merah-tua text-white cursor-pointer">
              {loading ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
  ```

- [ ] **Step 3: Add schedule column in Admin Competition detail**
  Update `src/app/admin/(guarded)/lomba/[slug]/page.tsx` to add `court` and `scheduledAt` columns and integration.
  
  Code modifications:
  ```tsx
  // Add imports:
  import { MatchScheduleModal } from "./match-schedule-modal";

  // In matches Table headers:
  <TableHead>Jadwal</TableHead>

  // In the TableBody, add:
  <TableCell>
    {match.court || match.scheduledAt ? (
      <div className="text-xs">
        <p className="font-semibold text-arang">{match.court || "Tanpa Lapangan"}</p>
        <p className="text-gray-500">
          {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""}
        </p>
      </div>
    ) : (
      <span className="text-gray-400 text-xs">Belum dijadwalkan</span>
    )}
  </TableCell>

  // In actions Cell, render the MatchScheduleModal next to MatchScoreModal:
  {match.status !== "BYE" && (
    <div className="flex gap-2">
      <MatchScheduleModal match={match} />
      <MatchScoreModal match={match} />
    </div>
  )}
  ```

- [ ] **Step 4: Display schedule on Public detail page**
  Open `src/app/lomba/[slug]/page.tsx` and load the `court` and `scheduledAt` fields on `Match` objects, and display them on the card.
  
  Code to add inside the Match Card render logic:
  ```tsx
  {match.court && (
    <div className="text-xs text-arang/60 mt-1 font-medium bg-arang/5 py-0.5 px-1.5 rounded inline-block">
      {match.court} {match.scheduledAt ? `• ${new Date(match.scheduledAt).toLocaleString("id-ID", { hour: "numeric", minute: "numeric" })}` : ""}
    </div>
  )}
  ```

- [ ] **Step 5: Display schedule on Public Bracket (Bagan) page**
  Open `src/app/lomba/[slug]/bagan/page.tsx` and load/display the `court` and `scheduledAt` fields on `Match` objects.
  
  Code to add inside the Match node container:
  ```tsx
  {match.court && (
    <div className="text-[10px] text-center text-arang/60 font-medium bg-arang/5 py-0.5 px-1 rounded-b border-t border-border mt-1">
      {match.court} {match.scheduledAt ? `• ${new Date(match.scheduledAt).toLocaleString("id-ID", { hour: "numeric", minute: "numeric" })}` : ""}
    </div>
  )}
  ```

- [ ] **Step 6: Commit changes**
  Run: `git commit -m "feat: implement match scheduling and court assignment"`

---

### Task 3: PDF Export Layout & Styling

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/app/print/laporan/page.tsx`
- Create: `src/app/print/lomba/[slug]/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/lomba/[slug]/page.tsx`

- [ ] **Step 1: Set up CSS print stylesheet rules**
  In `src/app/globals.css`, append print style configurations.
  
  Code to add:
  ```css
  @media print {
    body {
      background-color: white !important;
      color: black !important;
      font-size: 12pt;
    }
    .print-hidden, nav, header, footer, button, a.btn, select, input {
      display: none !important;
    }
    .print-page-break {
      page-break-after: always;
      break-after: page;
    }
  }
  ```

- [ ] **Step 2: Create a Client Auto-Print Component**
  Create `src/components/auto-print.tsx` to safely trigger `window.print()` in client environments.
  
  Code to write:
  ```tsx
  "use client";

  import { useEffect } from "react";

  export function AutoPrint() {
    useEffect(() => {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }, []);

    return null;
  }
  ```

- [ ] **Step 3: Implement public Print Page for Overall Event Report**
  Create `src/app/print/laporan/page.tsx` which collects all general stats, champions, and block medal tallies.
  
  Code to write:
  ```tsx
  import prisma from "@/lib/prisma";
  import { AutoPrint } from "@/components/auto-print";

  export const dynamic = "force-dynamic";

  export default async function OverallReportPrintPage() {
    const competitions = await prisma.competition.findMany({
      include: {
        registrations: { include: { participant: true } },
        teams: true,
      }
    });

    const participants = await prisma.participant.findMany();

    // Group wins by houseBlock to build a leaderboard
    const blockScores: Record<string, { gold: number }> = {};
    const champions: Array<{ comp: string; winner: string; block: string }> = [];

    const matches = await prisma.match.findMany({
      where: { label: "Final", status: "COMPLETED" },
      include: { 
        winnerTeam: { 
          include: { 
            members: { 
              include: { 
                registration: { 
                  include: { 
                    participant: true 
                  } 
                } 
              } 
            } 
          } 
        }, 
        competition: true 
      }
    });

    for (const m of matches) {
      if (m.winnerTeam) {
        const names = m.winnerTeam.members.map(mb => mb.registration.participant.name).join(" & ");
        const blocks = m.winnerTeam.members.map(mb => mb.registration.participant.houseBlock).join("/");
        champions.push({ comp: m.competition.name, winner: names, block: blocks });
        
        m.winnerTeam.members.forEach(mb => {
          const b = mb.registration.participant.houseBlock;
          if (!blockScores[b]) blockScores[b] = { gold: 0 };
          blockScores[b].gold += 1;
        });
      }
    }

    const leaderboard = Object.entries(blockScores)
      .map(([block, stats]) => ({ block, ...stats }))
      .sort((a, b) => b.gold - a.gold);

    return (
      <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen">
        <AutoPrint />
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">LAPORAN KEGIATAN LOMBA 17-AN GSB</h1>
          <p className="text-sm font-medium uppercase mt-1">Green Serpong Bintaro — HUT RI ke-81</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border p-4 text-center">
            <p className="text-sm uppercase text-gray-600">Total Lomba</p>
            <p className="text-2xl font-bold">{competitions.length}</p>
          </div>
          <div className="border p-4 text-center">
            <p className="text-sm uppercase text-gray-600">Total Peserta Terdaftar</p>
            <p className="text-2xl font-bold">{participants.length}</p>
          </div>
          <div className="border p-4 text-center">
            <p className="text-sm uppercase text-gray-600">Lomba Selesai</p>
            <p className="text-2xl font-bold">{matches.length}</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold border-b pb-2 mb-3">Klasemen Perolehan Medali (Blok)</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">Peringkat</th>
                <th className="border p-2">Blok Rumah</th>
                <th className="border p-2">Medali Emas</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((item, idx) => (
                <tr key={item.block}>
                  <td className="border p-2">{idx + 1}</td>
                  <td className="border p-2">Blok {item.block}</td>
                  <td className="border p-2">{item.gold} 🥇</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={3} className="border p-4 text-center text-gray-500">Belum ada medali yang diperoleh.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-xl font-bold border-b pb-2 mb-3">Daftar Pemenang Lomba</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">Perlombaan</th>
                <th className="border p-2">Juara 1 (Pemenang)</th>
                <th className="border p-2">Blok Rumah</th>
              </tr>
            </thead>
            <tbody>
              {champions.map((item) => (
                <tr key={item.comp}>
                  <td className="border p-2 font-medium">{item.comp}</td>
                  <td className="border p-2">{item.winner}</td>
                  <td className="border p-2">{item.block}</td>
                </tr>
              ))}
              {champions.length === 0 && (
                <tr>
                  <td colSpan={3} className="border p-4 text-center text-gray-500">Pertandingan final belum selesai.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Implement public Print Page for Single Competition**
  Create `src/app/print/lomba/[slug]/page.tsx` showing the full detailed competition info.
  
  Code to write:
  ```tsx
  import prisma from "@/lib/prisma";
  import { notFound } from "next/navigation";
  import { AutoPrint } from "@/components/auto-print";

  export const dynamic = "force-dynamic";

  export default async function CompetitionPrintPage({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;
    const comp = await prisma.competition.findUnique({
      where: { slug },
      include: {
        registrations: { include: { participant: true }, orderBy: { createdAt: "asc" } },
        matches: { include: { teamA: true, teamB: true, winnerTeam: true }, orderBy: [{ round: "asc" }, { position: "asc" }] },
      }
    });

    if (!comp) return notFound();

    return (
      <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen">
        <AutoPrint />
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight uppercase">LAPORAN DETAIL PERLOMBAAN</h1>
          <p className="text-lg font-semibold text-red-600 mt-1">{comp.name}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold border-b pb-1 mb-2">Informasi Umum</h2>
          <p className="text-sm"><strong>Status:</strong> {comp.status}</p>
          <p className="text-sm"><strong>Tipe Pasangan:</strong> {comp.pairingMode}</p>
          <p className="text-sm"><strong>Ukuran Tim:</strong> {comp.teamSize} orang</p>
          {comp.description && <p className="text-sm mt-2"><strong>Deskripsi:</strong> {comp.description}</p>}
        </div>

        <div className="mb-6 print-page-break">
          <h2 className="text-lg font-bold border-b pb-1 mb-2">Daftar Pendaftar ({comp.registrations.length})</h2>
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">No</th>
                <th className="border p-2">Nama</th>
                <th className="border p-2">Blok/No. Rumah</th>
                <th className="border p-2">No. HP / WA</th>
              </tr>
            </thead>
            <tbody>
              {comp.registrations.map((reg, idx) => (
                <tr key={reg.id}>
                  <td className="border p-2">{idx + 1}</td>
                  <td className="border p-2 font-medium">{reg.participant.name}</td>
                  <td className="border p-2">{reg.participant.houseBlock} - {reg.participant.houseNumber}</td>
                  <td className="border p-2">{reg.participant.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-bold border-b pb-1 mb-2">Jadwal & Hasil Pertandingan</h2>
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">Ronde</th>
                <th className="border p-2">Pertandingan</th>
                <th className="border p-2">Jadwal & Court</th>
                <th className="border p-2">Hasil / Skor</th>
              </tr>
            </thead>
            <tbody>
              {comp.matches.map((m) => (
                <tr key={m.id}>
                  <td className="border p-2">{m.label || `Ronde ${m.round}`}</td>
                  <td className="border p-2">
                    {m.teamA?.name || "?"} vs {m.teamB?.name || "?"}
                  </td>
                  <td className="border p-2">
                    {m.court ? `${m.court}` : ""}
                    {m.scheduledAt ? ` (${new Date(m.scheduledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })})` : "Belum dijadwalkan"}
                  </td>
                  <td className="border p-2">
                    {m.status === "COMPLETED" ? (
                      <span className="font-semibold text-green-700">
                        {m.scoreA} - {m.scoreB} (Pemenang: {m.winnerTeam?.name})
                      </span>
                    ) : m.status === "BYE" ? (
                      <span className="text-gray-500 italic">BYE</span>
                    ) : (
                      <span className="text-gray-400 italic">Belum dimainkan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 5: Add print triggers to layout**
  * On home page `src/app/page.tsx`, add a link next to the main buttons:
    ```tsx
    <a href="/print/laporan" target="_blank" className="inline-flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors">
      Cetak Laporan Event 🖨️
    </a>
    ```
  * On competition detail `src/app/lomba/[slug]/page.tsx`, add a link next to the competition title or metadata:
    ```tsx
    <a href={`/print/lomba/${competition.slug}`} target="_blank" className="inline-flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white py-2 px-3 rounded-md text-xs font-semibold transition-colors mt-2">
      Cetak Detail Lomba 🖨️
    </a>
    ```

- [ ] **Step 6: Commit changes**
  Run: `git commit -m "feat: implement PDF export and print styling"`
