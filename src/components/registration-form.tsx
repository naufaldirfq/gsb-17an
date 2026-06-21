"use client";

import { useActionState, useEffect } from "react";
import { registerAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function RegistrationForm({ competitionId }: { competitionId: string }) {
  const [state, formAction, isPending] = useActionState(registerAction, null);

  useEffect(() => {
    if (state) {
      if (state.error) {
        toast.error(state.message);
      } else {
        toast.success(state.message);
        // Optionally reset form here
        const form = document.getElementById("registration-form") as HTMLFormElement;
        if (form) form.reset();
      }
    }
  }, [state]);

  return (
    <form id="registration-form" action={formAction} className="flex flex-col gap-5 mt-6">
      <input type="hidden" name="competitionId" value={competitionId} />
      
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-arang font-semibold">Nama Lengkap</Label>
        <Input 
          id="name" 
          name="name" 
          placeholder="Budi Santoso" 
          className="border-arang/20 focus-visible:ring-merah"
          required
        />
        {state?.error && state.fieldErrors?.name && (
          <p className="text-merah-tua text-xs">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <Label htmlFor="houseBlock" className="text-arang font-semibold">Blok Rumah</Label>
          <Input 
            id="houseBlock" 
            name="houseBlock" 
            placeholder="C3" 
            className="border-arang/20 focus-visible:ring-merah"
            required
          />
          {state?.error && state.fieldErrors?.houseBlock && (
            <p className="text-merah-tua text-xs">{state.fieldErrors.houseBlock[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label htmlFor="houseNumber" className="text-arang font-semibold">Nomor</Label>
          <Input 
            id="houseNumber" 
            name="houseNumber" 
            placeholder="12A" 
            className="border-arang/20 focus-visible:ring-merah"
            required
          />
          {state?.error && state.fieldErrors?.houseNumber && (
            <p className="text-merah-tua text-xs">{state.fieldErrors.houseNumber[0]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone" className="text-arang font-semibold">Nomor WhatsApp</Label>
        <Input 
          id="phone" 
          name="phone" 
          type="tel"
          placeholder="08123456789" 
          className="border-arang/20 focus-visible:ring-merah"
          required
        />
        {state?.error && state.fieldErrors?.phone && (
          <p className="text-merah-tua text-xs">{state.fieldErrors.phone[0]}</p>
        )}
      </div>

      <Button 
        type="submit" 
        disabled={isPending}
        className="w-full bg-merah hover:bg-merah-tua text-putih-kertas text-lg py-6 rounded-[12px] font-bold mt-2"
      >
        {isPending ? "Mendaftar..." : "Daftar Lomba"}
      </Button>
    </form>
  );
}
