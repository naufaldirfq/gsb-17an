"use client";

import { useTransition } from "react";
import { registerAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormData } from "@/lib/validations";

export function RegistrationForm({ competitionId }: { competitionId: string }) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      competitionId,
      name: "",
      houseBlock: "",
      houseNumber: "",
      phone: "",
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    startTransition(async () => {
      // Build FormData to pass to action
      const formData = new FormData();
      formData.append("competitionId", data.competitionId);
      formData.append("name", data.name);
      formData.append("houseBlock", data.houseBlock);
      formData.append("houseNumber", data.houseNumber);
      formData.append("phone", data.phone);

      const result = await registerAction(null, formData);

      if (result.error) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
        reset();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-6">
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
