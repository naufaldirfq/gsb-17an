"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateBracketAction } from "./actions";

export function BracketActions({
  competitionId,
  isLocked,
}: {
  competitionId: string;
  isLocked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!confirm("Acak Tim & Buat Bagan sekarang? Tindakan ini akan menghapus data tim dan match sebelumnya jika ada.")) return;
    
    startTransition(async () => {
      const result = await generateBracketAction(competitionId);
      if (result?.error) {
        alert(result.error);
      } else {
        alert("Bagan dan Tim berhasil dibuat!");
      }
    });
  };

  if (!isLocked) return null;

  return (
    <Button 
      onClick={handleGenerate} 
      disabled={isPending}
      variant="default"
      className="bg-merah hover:bg-merah-tua text-putih-kertas"
    >
      {isPending ? "Memproses..." : "Acak Tim & Buat Bagan"}
    </Button>
  );
}
