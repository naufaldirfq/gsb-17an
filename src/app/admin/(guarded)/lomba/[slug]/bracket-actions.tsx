"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateBracketAction } from "./actions";

export function BracketActions({
  competitionId,
  status,
}: {
  competitionId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    const confirmMessage = status === "LOCKED"
      ? "Acak Tim & Buat Bagan sekarang? Tindakan ini akan menghapus data tim dan match sebelumnya jika ada."
      : "Regenerasi bagan sekarang? Tindakan ini akan mengacak ulang semua tim dan menghapus semua jadwal serta skor pertandingan yang sudah ada.";

    if (!confirm(confirmMessage)) return;
    
    startTransition(async () => {
      const result = await generateBracketAction(competitionId);
      if (result?.error) {
        alert(result.error);
      } else {
        alert("Bagan dan Tim berhasil dibuat!");
      }
    });
  };

  if (status === "REGISTRATION") return null;

  const isLocked = status === "LOCKED";
  const buttonText = isLocked ? "Acak Tim & Buat Bagan" : "Regenerasi Bagan 🔄";

  return (
    <Button 
      onClick={handleGenerate} 
      disabled={isPending}
      variant={isLocked ? "default" : "outline"}
      className={isLocked ? "bg-merah hover:bg-merah-tua text-putih-kertas font-bold" : "border-merah text-merah hover:bg-merah/10 font-bold"}
    >
      {isPending ? "Memproses..." : buttonText}
    </Button>
  );
}
