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
      <DialogTrigger render={<Button variant="outline" size="sm" className="cursor-pointer" />}>
        Jadwalkan
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
