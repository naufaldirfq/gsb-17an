"use client";

import { useActionState, useRef, useEffect } from "react";
import { registerAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormData } from "@/lib/validations";

export function RegistrationForm({ competitionId }: { competitionId: string }) {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      competitionId,
      name: "",
      houseBlock: "",
      houseNumber: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (state && !isPending) {
      if (state.error) {
        toast.error(state.message, { id: "action-error" });
      } else {
        toast.success(state.message, { id: "action-success" });
        formRef.current?.reset();
      }
    }
  }, [state, isPending]);

  return (
    <form 
      ref={formRef}
      action={formAction} 
      onSubmit={async (e) => {
        const isValid = await trigger();
        if (!isValid) {
          e.preventDefault(); // Prevent server action if client validation fails
        }
      }}
      className="flex flex-col gap-5 mt-6"
    >
      <input type="hidden" {...register("competitionId")} />
      
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-arang font-semibold">Nama Lengkap</Label>
        <Input 
          id="name" 
          placeholder="Budi Santoso" 
          className="border-arang/20 focus-visible:ring-merah"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-merah-tua text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <Label htmlFor="houseBlock" className="text-arang font-semibold">Blok Rumah</Label>
          <Input 
            id="houseBlock" 
            placeholder="C3" 
            className="border-arang/20 focus-visible:ring-merah"
            {...register("houseBlock")}
          />
          {errors.houseBlock && (
            <p className="text-merah-tua text-xs">{errors.houseBlock.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label htmlFor="houseNumber" className="text-arang font-semibold">Nomor</Label>
          <Input 
            id="houseNumber" 
            placeholder="12A" 
            className="border-arang/20 focus-visible:ring-merah"
            {...register("houseNumber")}
          />
          {errors.houseNumber && (
            <p className="text-merah-tua text-xs">{errors.houseNumber.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone" className="text-arang font-semibold">Nomor WhatsApp</Label>
        <Input 
          id="phone" 
          type="tel"
          placeholder="08123456789" 
          className="border-arang/20 focus-visible:ring-merah"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-merah-tua text-xs">{errors.phone.message}</p>
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
