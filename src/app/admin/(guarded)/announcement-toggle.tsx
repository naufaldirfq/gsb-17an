"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateAnnouncementSettingAction } from "../actions";
import { toast } from "sonner";

interface AnnouncementToggleProps {
  initialShow: boolean;
}

export function AnnouncementToggle({ initialShow }: AnnouncementToggleProps) {
  const [show, setShow] = useState(initialShow);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setShow(checked);
    startTransition(async () => {
      const res = await updateAnnouncementSettingAction(checked);
      if (res?.error) {
        toast.error(res.error);
        setShow(!checked);
      } else {
        toast.success(
          checked
            ? "Pengumuman lineup berhasil ditampilkan"
            : "Pengumuman lineup berhasil disembunyikan"
        );
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="space-y-0.5 pr-4">
        <Label htmlFor="announcement-mode" className="text-base font-semibold text-arang">
          Tampilkan Pengumuman Lineup
        </Label>
        <p className="text-sm text-gray-500">
          Tampilkan banner &quot;Lineup Belum Final&quot; di halaman utama jika ada perlombaan yang aktif.
        </p>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        <Switch
          id="announcement-mode"
          checked={show}
          onCheckedChange={handleToggle}
          disabled={isPending}
          className="data-checked:bg-merah"
        />
      </div>
    </div>
  );
}
