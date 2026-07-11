"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { generateBracketAction } from "./actions";

export function BracketActions({
  competitionId,
  status,
  hasCompletedMatches,
}: {
  competitionId: string;
  status: string;
  hasCompletedMatches: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [leftovers, setLeftovers] = useState<string[] | null>(null);
  const [resolution, setResolution] = useState<"MERGE" | "ADD_PANITIA">("MERGE");
  const [showLeftoverDialog, setShowLeftoverDialog] = useState(false);

  const runGeneration = (resOption?: { action: "MERGE" | "ADD_PANITIA" }) => {
    startTransition(async () => {
      const result = await generateBracketAction(competitionId, resOption);
      if (result?.error === "LEFTOVERS_DETECTED" && result.leftovers) {
        setLeftovers(result.leftovers);
        setShowLeftoverDialog(true);
      } else if (result?.error) {
        alert(result.error);
      } else {
        alert("Bagan dan Tim berhasil dibuat!");
        setLeftovers(null);
        setShowLeftoverDialog(false);
      }
    });
  };

  const handleGenerate = () => {
    if (hasCompletedMatches) {
      alert("Pertandingan sudah berjalan. Pengacakan bagan dikunci.");
      return;
    }

    const confirmMessage = status === "LOCKED"
      ? "Acak Tim & Buat Bagan sekarang? Tindakan ini akan menghapus data tim dan match sebelumnya jika ada."
      : "Regenerasi bagan sekarang? Tindakan ini akan mengacak ulang semua tim dan menghapus semua jadwal serta skor pertandingan yang sudah ada.";

    if (!confirm(confirmMessage)) return;
    runGeneration();
  };

  if (status === "REGISTRATION") return null;

  const isLocked = status === "LOCKED";
  const buttonText = isLocked ? "Acak Tim & Buat Bagan" : "Regenerasi Bagan 🔄";

  return (
    <>
      <Button 
        onClick={handleGenerate} 
        disabled={isPending || hasCompletedMatches}
        variant={isLocked ? "default" : "outline"}
        className={
          hasCompletedMatches 
            ? "border-gray-300 text-gray-400 font-bold cursor-not-allowed"
            : isLocked 
              ? "bg-merah hover:bg-merah-tua text-putih-kertas font-bold cursor-pointer" 
              : "border-merah text-merah hover:bg-merah/10 font-bold cursor-pointer"
        }
      >
        {isPending ? "Memproses..." : hasCompletedMatches ? "Bagan Terkunci 🔒" : buttonText}
      </Button>

      <Dialog open={showLeftoverDialog} onOpenChange={setShowLeftoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-anton text-merah tracking-wide">
              Ada Peserta Tersisa!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-arang/80 leading-relaxed">
              Jumlah pendaftar tidak pas dengan ukuran tim. Peserta berikut belum mendapatkan tim:
            </p>
            <div className="bg-arang/5 p-3 rounded-lg border border-border">
              <ul className="list-disc pl-5 text-sm font-medium text-arang/90 space-y-1">
                {leftovers?.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-arang">Pilih resolusi:</Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 border border-border p-3 rounded-lg hover:bg-arang/5 cursor-pointer transition-colors">
                  <input 
                    type="radio" 
                    name="resolution" 
                    checked={resolution === "MERGE"} 
                    onChange={() => setResolution("MERGE")}
                    className="mt-1 accent-merah" 
                  />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-arang">Gabungkan ke Tim Lain</p>
                    <p className="text-xs text-arang/60">
                      Peserta sisa akan dimasukkan secara acak ke tim yang sudah terbentuk (tim menjadi berukuran lebih besar).
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 border border-border p-3 rounded-lg hover:bg-arang/5 cursor-pointer transition-colors">
                  <input 
                    type="radio" 
                    name="resolution" 
                    checked={resolution === "ADD_PANITIA"} 
                    onChange={() => setResolution("ADD_PANITIA")}
                    className="mt-1 accent-merah" 
                  />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-arang">Tambahkan Anggota Panitia</p>
                    <p className="text-xs text-arang/60">
                      Sistem akan membuat peserta otomatis &quot;Panitia Penyelamat&quot; untuk mengisi slot kosong agar tim genap.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => setShowLeftoverDialog(false)}
                disabled={isPending}
              >
                Batalkan
              </Button>
              <Button 
                onClick={() => runGeneration({ action: resolution })} 
                disabled={isPending}
                className="bg-merah hover:bg-merah-tua text-putih-kertas font-bold"
              >
                {isPending ? "Memproses..." : "Konfirmasi & Buat Bagan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
