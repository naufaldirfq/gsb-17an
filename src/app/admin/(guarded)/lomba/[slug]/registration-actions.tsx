"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { closeRegistrationAction, openRegistrationAction } from "./actions";

export function RegistrationActions({
  competitionId,
  isRegistration,
}: {
  competitionId: string;
  isRegistration: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeRegistrationAction(competitionId);
      if (result?.error) {
        alert(result.error);
      }
    });
  };

  const handleOpen = () => {
    startTransition(async () => {
      const result = await openRegistrationAction(competitionId);
      if (result?.error) {
        alert(result.error);
      }
    });
  };

  if (isRegistration) {
    return (
      <Button 
        onClick={handleClose} 
        disabled={isPending} 
        variant="destructive"
      >
        {isPending ? "Loading..." : "Tutup Pendaftaran (LOCKED)"}
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleOpen} 
      disabled={isPending} 
      variant="outline"
    >
      {isPending ? "Loading..." : "Buka Pendaftaran"}
    </Button>
  );
}
