"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { editCompetitionAction } from "@/app/admin/actions";
import { toast } from "sonner";
import { Settings } from "lucide-react";

interface Competition {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  teamSize: number;
  pairingMode: string;
  bracketFormat: string;
  heatSize: number | null;
  maxParticipants: number | null;
  registrationRequired: boolean;
  heldAt: string | null;
  location: string | null;
}

export function EditCompetitionModal({ 
  competition, 
  hasMatches 
}: { 
  competition: Competition;
  hasMatches: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Form states
  const [name, setName] = useState(competition.name);
  const [description, setDescription] = useState(competition.description || "");
  const [rules, setRules] = useState(competition.rules || "");
  const [registrationRequired, setRegistrationRequired] = useState(competition.registrationRequired);
  const [heldAt, setHeldAt] = useState(competition.heldAt || "");
  const [location, setLocation] = useState(competition.location || "");
  const [teamSize, setTeamSize] = useState(String(competition.teamSize));
  const [maxParticipants, setMaxParticipants] = useState(competition.maxParticipants ? String(competition.maxParticipants) : "");
  const [pairingMode, setPairingMode] = useState(competition.pairingMode);
  const [bracketFormat, setBracketFormat] = useState(competition.bracketFormat);
  const [heatSize, setHeatSize] = useState(competition.heatSize ? String(competition.heatSize) : "3");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("rules", rules);
    formData.set("heldAt", heldAt);
    formData.set("location", location);
    formData.set("maxParticipants", maxParticipants);

    if (!hasMatches) {
      formData.set("teamSize", teamSize);
      formData.set("pairingMode", pairingMode);
      formData.set("bracketFormat", bracketFormat);
      formData.set("registrationRequired", String(registrationRequired));
      formData.set("heatSize", bracketFormat === "RACE_HEATS" ? heatSize : "");
    }

    const res = await editCompetitionAction(competition.id, formData);
    setIsPending(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Perlombaan berhasil diperbarui!");
      setOpen(false);
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Edit Lomba
          </Button>
        }
      />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white text-arang">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Detail Perlombaan</DialogTitle>
        </DialogHeader>
        
        {hasMatches && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-3 rounded-md mb-2">
            Pertandingan/bagan sudah dibuat. Beberapa pengaturan format perlombaan (sistem bagan, ukuran tim, pasangan, dll.) telah dikunci demi konsistensi data.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-comp-name">Nama Lomba</Label>
            <Input id="edit-comp-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="edit-comp-desc">Deskripsi</Label>
            <Textarea id="edit-comp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-comp-rules">Peraturan</Label>
            <Textarea id="edit-comp-rules" value={rules} onChange={(e) => setRules(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 py-1">
            <input
              id="edit-comp-reg-req"
              type="checkbox"
              checked={registrationRequired}
              disabled={hasMatches}
              onChange={(e) => setRegistrationRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-merah focus:ring-merah cursor-pointer disabled:opacity-50"
            />
            <Label htmlFor="edit-comp-reg-req" className="cursor-pointer font-semibold">Pendaftaran Diperlukan</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-comp-heldAt">Waktu Pelaksanaan</Label>
              <Input
                id="edit-comp-heldAt"
                value={heldAt}
                onChange={(e) => setHeldAt(e.target.value)}
                placeholder="Sabtu, 17 Agt, 09:00"
              />
            </div>
            <div>
              <Label htmlFor="edit-comp-location">Lokasi</Label>
              <Input
                id="edit-comp-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Lapangan Blok C"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-comp-teamSize">Pemain per Tim</Label>
              <Input 
                id="edit-comp-teamSize" 
                type="number" 
                min="1" 
                value={teamSize} 
                disabled={hasMatches}
                onChange={(e) => setTeamSize(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="edit-comp-maxParticipants">Kuota Maksimal (Tim/Solo)</Label>
              <Input 
                id="edit-comp-maxParticipants" 
                type="number" 
                min="1" 
                value={maxParticipants} 
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="Unlimited" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-comp-pairingMode">Sistem Pasangan</Label>
              <Select 
                value={pairingMode} 
                disabled={hasMatches}
                onValueChange={(val) => setPairingMode(val ?? "SOLO")}
              >
                <SelectTrigger id="edit-comp-pairingMode"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="SOLO">SOLO</SelectItem>
                  <SelectItem value="RANDOM">RANDOM (Acak)</SelectItem>
                  <SelectItem value="MANUAL">MANUAL (Pilih)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-comp-bracketFormat">Sistem Bagan</Label>
              <Select 
                value={bracketFormat} 
                disabled={hasMatches}
                onValueChange={(val) => setBracketFormat(val ?? "SINGLE_ELIM")}
              >
                <SelectTrigger id="edit-comp-bracketFormat"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="SINGLE_ELIM">Single Elimination</SelectItem>
                  <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                  <SelectItem value="GROUP_KNOCKOUT">Group + Knockout</SelectItem>
                  <SelectItem value="RACE_HEATS">Balap / Renang (Multi-heat)</SelectItem>
                  <SelectItem value="LEADERBOARD">Satu Babak (Leaderboard)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!hasMatches && bracketFormat === "RACE_HEATS" && (
            <div>
              <Label htmlFor="edit-comp-heatSize">Jumlah Peserta per Heat</Label>
              <Input
                id="edit-comp-heatSize"
                type="number"
                min={2}
                required
                value={heatSize}
                onChange={(e) => setHeatSize(e.target.value)}
              />
            </div>
          )}
          <Button type="submit" disabled={isPending} className="w-full bg-merah hover:bg-merah-tua text-white cursor-pointer">
            {isPending ? "Menyimpan..." : "Simpan Perubahan Lomba"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
