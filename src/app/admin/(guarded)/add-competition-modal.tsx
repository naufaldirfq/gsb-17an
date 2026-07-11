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
  const [heatSize, setHeatSize] = useState("3");
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
    formData.set("heatSize", bracketFormat === "RACE_HEATS" ? heatSize : "");

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
      <DialogTrigger
        render={
          <Button className="bg-merah hover:bg-merah-tua text-white font-medium cursor-pointer">
            + Tambah Lomba
          </Button>
        }
      />
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
              <Label htmlFor="pairingMode">Sistem Pasangan</Label>
              <Select value={pairingMode} onValueChange={(val) => setPairingMode(val ?? "SOLO")}>
                <SelectTrigger id="pairingMode"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="SOLO">SOLO</SelectItem>
                  <SelectItem value="RANDOM">RANDOM (Acak)</SelectItem>
                  <SelectItem value="MANUAL">MANUAL (Pilih)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bracketFormat">Sistem Bagan</Label>
              <Select value={bracketFormat} onValueChange={(val) => setBracketFormat(val ?? "SINGLE_ELIM")}>
                <SelectTrigger id="bracketFormat"><SelectValue /></SelectTrigger>
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
          {bracketFormat === "RACE_HEATS" && (
            <div>
              <Label htmlFor="heatSize">Jumlah Peserta per Heat</Label>
              <Input
                id="heatSize"
                type="number"
                min={2}
                required
                value={heatSize}
                onChange={(e) => setHeatSize(e.target.value)}
              />
            </div>
          )}
          <Button type="submit" className="w-full bg-merah hover:bg-merah-tua text-white cursor-pointer">Simpan Lomba</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
