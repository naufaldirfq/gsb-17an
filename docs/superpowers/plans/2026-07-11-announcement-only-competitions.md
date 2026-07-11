# Announcement-Only Competitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add database fields and UI components to support informational/announcement-only competitions that do not require registration and instead show held date/time and location.

**Architecture:**
1. Add `registrationRequired`, `heldAt`, and `location` to `Competition` schema, and execute a Prisma migration.
2. Update admin dashboard action and creation modal to allow configuring these fields.
3. Update public competition list and details pages to show schedule details and hide registration widgets for non-registration competitions.

**Tech Stack:** Next.js (App Router), Prisma, PostgreSQL, React, Tailwind CSS

---

### Task 1: Database Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Modify schema.prisma**
  Open `prisma/schema.prisma` and add three new fields to the `Competition` model:
  * `registrationRequired` (Boolean, default `true`)
  * `heldAt` (String, optional)
  * `location` (String, optional)

  ```prisma
  model Competition {
    id               String            @id @default(cuid())
    slug             String            @unique
    name             String
    description      String?
    rules            String?
    teamSize         Int
    pairingMode      PairingMode
    bracketFormat    BracketFormat
    heatSize         Int?
    maxParticipants  Int?
    registrationOpen Boolean           @default(true)
    status           CompetitionStatus @default(REGISTRATION)
    createdAt        DateTime          @default(now())
    
    // New fields:
    registrationRequired Boolean         @default(true)
    heldAt               String?
    location             String?

    registrations Registration[]
    teams         Team[]
    matches       Match[]
    photos        Photo[]
  }
  ```

- [ ] **Step 2: Generate and apply database migration**
  Run the Prisma migration generator to apply changes to the local database.
  
  Run: `npx prisma migrate dev --name add_announcement_only_competition_fields`
  Expected: Successful migration creation, and update of the generated Prisma Client.

- [ ] **Step 3: Commit migration changes**
  
  Run:
  ```bash
  git add prisma/schema.prisma prisma/migrations/
  git commit -m "db: add registrationRequired, heldAt, and location to Competition"
  ```

---

### Task 2: Server Action Updates

**Files:**
- Modify: `src/app/admin/actions.ts`

- [ ] **Step 1: Update createCompetitionSchema Zod schema**
  Add the validation schema for the new fields in `src/app/admin/actions.ts`:
  
  ```typescript
  const createCompetitionSchema = z.object({
    name: z.string().min(1, "Nama lomba harus diisi"),
    description: z.string().optional(),
    rules: z.string().optional(),
    teamSize: z.number().int().min(1),
    pairingMode: z.nativeEnum(PairingMode),
    bracketFormat: z.nativeEnum(BracketFormat),
    maxParticipants: z.number().int().optional().nullable(),
    heatSize: z.coerce.number().min(2).optional().nullable(),
    // New fields:
    registrationRequired: z.boolean().default(true),
    heldAt: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
  })
  ```

- [ ] **Step 2: Update createCompetitionAction**
  Retrieve and parse the inputs from `FormData` and pass them into the prisma creation call:
  
  ```typescript
  export async function createCompetitionAction(formData: FormData) {
    const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
    if (authCookie?.value !== "authenticated") {
      return { error: "Unauthorized" };
    }
  
    const rawName = formData.get("name") as string;
    const teamSize = parseInt(formData.get("teamSize") as string) || 1;
    const maxParticipantsRaw = formData.get("maxParticipants") as string;
    const heatSizeRaw = formData.get("heatSize") as string;
    const heatSize = (heatSizeRaw && heatSizeRaw.trim() !== "") ? parseInt(heatSizeRaw) : null;
    
    // New fields extraction:
    const registrationRequired = formData.get("registrationRequired") === "true";
    const heldAt = (formData.get("heldAt") as string) || null;
    const location = (formData.get("location") as string) || null;
    
    const parsed = createCompetitionSchema.safeParse({
      name: rawName,
      description: formData.get("description") || undefined,
      rules: formData.get("rules") || undefined,
      teamSize,
      pairingMode: formData.get("pairingMode"),
      bracketFormat: formData.get("bracketFormat"),
      maxParticipants: maxParticipantsRaw ? parseInt(maxParticipantsRaw) : null,
      heatSize,
      registrationRequired,
      heldAt,
      location,
    });
    
    // Rest of existing function: validation check, slug generation, database write...
  ```

- [ ] **Step 3: Run Vitest checks**
  Ensure existing tests pass successfully.
  
  Run: `npx vitest run`
  Expected: All tests pass.

- [ ] **Step 4: Commit action changes**
  
  Run:
  ```bash
  git add src/app/admin/actions.ts
  git commit -m "feat: handle registrationRequired, heldAt, and location in create action"
  ```

---

### Task 3: Admin UI Creation Modal

**Files:**
- Modify: `src/app/admin/(guarded)/add-competition-modal.tsx`

- [ ] **Step 1: Add state and inputs to add-competition-modal.tsx**
  Add state and UI controls for registrationRequired, heldAt, and location.
  
  Initialize states inside `AddCompetitionModal`:
  ```typescript
  const [registrationRequired, setRegistrationRequired] = useState(true);
  const [heldAt, setHeldAt] = useState("");
  const [location, setLocation] = useState("");
  ```
  
  Reset these values in `handleSubmit` and append them to `formData` before calling the action:
  ```typescript
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("teamSize", teamSize);
    formData.set("pairingMode", pairingMode);
    formData.set("bracketFormat", bracketFormat);
    formData.set("heatSize", bracketFormat === "RACE_HEATS" ? heatSize : "");
    
    // Set new fields:
    formData.set("registrationRequired", String(registrationRequired));
    formData.set("heldAt", heldAt);
    formData.set("location", location);
  
    const res = await createCompetitionAction(formData);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Perlombaan berhasil ditambahkan!");
      setOpen(false);
      // Reset form states
      setRegistrationRequired(true);
      setHeldAt("");
      setLocation("");
      router.refresh();
    }
  };
  ```

- [ ] **Step 2: Add form fields in DialogContent**
  Add a checkbox toggle for "Pendaftaran Diperlukan", and inputs for "Waktu Pelaksanaan" and "Lokasi" inside the `<form>`:
  
  ```tsx
  {/* Add before or after system selections */}
  <div className="flex items-center gap-2 py-2">
    <input 
      id="registrationRequired" 
      type="checkbox" 
      checked={registrationRequired} 
      onChange={(e) => setRegistrationRequired(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-merah focus:ring-merah cursor-pointer"
    />
    <Label htmlFor="registrationRequired" className="cursor-pointer font-semibold">Pendaftaran Diperlukan (Aktifkan jika peserta harus daftar)</Label>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <Label htmlFor="heldAt">Waktu Pelaksanaan</Label>
      <Input 
        id="heldAt" 
        value={heldAt} 
        onChange={(e) => setHeldAt(e.target.value)} 
        placeholder="Contoh: Sabtu, 17 Agt, 09:00"
      />
    </div>
    <div>
      <Label htmlFor="location">Lokasi</Label>
      <Input 
        id="location" 
        value={location} 
        onChange={(e) => setLocation(e.target.value)} 
        placeholder="Contoh: Lapangan Blok C"
      />
    </div>
  </div>
  ```

- [ ] **Step 3: Commit Admin UI changes**
  
  Run:
  ```bash
  git add src/app/admin/\(guarded\)/add-competition-modal.tsx
  git commit -m "feat: add registrationRequired checkbox and heldAt/location inputs in Admin modal"
  ```

---

### Task 4: Public Competition List Page

**Files:**
- Modify: `src/app/lomba/page.tsx`

- [ ] **Step 1: Fetch and adapt Lomba List UI**
  In `src/app/lomba/page.tsx`, the list elements are generated.
  Update the code where badges and buttons are rendered to handle `comp.registrationRequired === false`.

  Inside `competitions.map((comp) => { ... })`:
  ```typescript
  const isFull = comp.maxParticipants && comp._count.registrations >= comp.maxParticipants;
  const isOpen = comp.registrationOpen && comp.status === "REGISTRATION";
  const canRegister = isOpen && !isFull && comp.registrationRequired; // Update this line to check registrationRequired
  ```

- [ ] **Step 2: Conditional rendering of badges & buttons**
  * Update the registered count badge to only show if `comp.registrationRequired` is true:
    ```tsx
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
        {comp.teamSize === 1 ? "Perorangan" : `${comp.teamSize} Orang`}
      </span>
      {comp.registrationRequired && (
        <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
          Terdaftar: {comp._count.registrations} Orang
        </span>
      )}
    </div>
    ```

  * Update the button link rendering to handle non-registration competitions:
    ```tsx
    {!comp.registrationRequired ? (
      <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-gray-800 hover:bg-gray-900 text-putih-kertas py-3 rounded-[12px] font-bold transition-colors">
        Lihat Informasi
      </Link>
    ) : canRegister ? (
      <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-merah hover:bg-merah-tua text-putih-kertas py-3 rounded-[12px] font-bold transition-colors">
        Daftar Sekarang
      </Link>
    ) : (
      <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-arang/5 hover:bg-arang/10 text-arang/80 py-3 rounded-[12px] font-bold transition-colors">
        {isFull ? "Kuota Penuh (Lihat Detail)" : "Ditutup (Lihat Detail)"}
      </Link>
    )}
    ```

- [ ] **Step 3: Commit Public List changes**
  
  Run:
  ```bash
  git add src/app/lomba/page.tsx
  git commit -m "feat: show Lihat Informasi button and hide Terdaftar badge on list page"
  ```

---

### Task 5: Public Competition Detail Page

**Files:**
- Modify: `src/app/lomba/[slug]/page.tsx`

- [ ] **Step 1: Update LombaDetail to fetch and render the new details**
  * Update `prisma.competition.findUnique` query in `src/app/lomba/[slug]/page.tsx` to explicitly fetch `registrationRequired`, `heldAt`, and `location` if needed (it already uses `prisma.competition.findUnique` but since Prisma is client-generated, make sure the values are loaded).
  
  * Check the registration header badge:
    ```tsx
    <div className="flex flex-wrap items-center gap-2 mt-4">
      <span className="bg-arang/5 text-arang px-2 py-1 rounded text-xs font-bold font-jetbrains">
        {competition.teamSize === 1 ? "Perorangan" : `${competition.teamSize} Orang/Tim`}
      </span>
      {competition.registrationRequired && (
        <span className="bg-arang/5 text-arang px-2 py-1 rounded text-xs font-bold font-jetbrains">
          Terdaftar: {competition._count.registrations} Orang
        </span>
      )}
    </div>
    ```

- [ ] **Step 2: Add "Informasi Pelaksanaan" card and conditionally render registration**
  * If `competition.heldAt` or `competition.location` is set, or if `competition.registrationRequired` is false, render the "Informasi Pelaksanaan" card (place it before the Registration card):
    
    ```tsx
    {(competition.heldAt || competition.location || !competition.registrationRequired) && (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-anton text-xl text-arang tracking-tight">Informasi Pelaksanaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-arang/80">
          {competition.heldAt && (
            <div>
              <span className="font-bold text-arang/60 block text-xs uppercase font-jetbrains">Waktu & Tanggal</span>
              <p className="mt-0.5 font-medium">{competition.heldAt}</p>
            </div>
          )}
          {competition.location && (
            <div>
              <span className="font-bold text-arang/60 block text-xs uppercase font-jetbrains">Lokasi</span>
              <p className="mt-0.5 font-medium">{competition.location}</p>
            </div>
          )}
          {!competition.heldAt && !competition.location && (
            <p className="text-arang/60 italic">Detail waktu dan tempat akan segera diumumkan.</p>
          )}
        </CardContent>
      </Card>
    )}
    ```

  * Wrap the registration card so it is only rendered if `competition.registrationRequired` is `true`:
    ```tsx
    {competition.registrationRequired && (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-anton text-2xl text-arang tracking-tight">Pendaftaran</CardTitle>
        </CardHeader>
        <CardContent>
          {!canRegister ? (
            <div className="p-4 bg-merah/10 text-merah-tua rounded-lg text-sm font-medium text-center border border-merah/20">
              {isFull ? "Maaf, kuota pendaftaran sudah penuh." : "Pendaftaran untuk lomba ini sudah ditutup."}
            </div>
          ) : (
            <RegistrationForm competitionId={competition.id} />
          )}
        </CardContent>
      </Card>
    )}
    ```

  * Wrap the participant list card so it is only rendered if `competition.registrationRequired` is `true`:
    ```tsx
    {competition.registrationRequired && (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-anton text-xl text-arang tracking-tight">Daftar Peserta ({competition._count.registrations})</CardTitle>
        </CardHeader>
        <CardContent>
          {competition.registrations.length === 0 ? (
            <p className="text-sm text-arang/60 text-center py-4">Belum ada peserta yang mendaftar.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {competition.registrations.map((reg, idx) => (
                <li key={reg.id} className="flex justify-between items-center pb-3 border-b border-arang/5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="font-jetbrains text-merah/60 font-bold text-sm w-4">{idx + 1}.</span>
                    <span className="font-medium text-arang">{reg.participant.name}</span>
                  </div>
                  <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
                    Blok {reg.participant.houseBlock}-{reg.participant.houseNumber}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    )}
    ```

- [ ] **Step 3: Commit Public Detail changes**
  
  Run:
  ```bash
  git add src/app/lomba/\[slug\]/page.tsx
  git commit -m "feat: hide registration widgets and show schedule details on detail page"
  ```

---

### Task 6: Build & Final Verification

- [ ] **Step 1: Test the production build**
  Ensure the Next.js production build passes with all code changes.
  
  Run: `npm run build`
  Expected: Build succeeds with no Typescript errors.

- [ ] **Step 2: Commit all remaining files**
  Verify `git status` is clean.
