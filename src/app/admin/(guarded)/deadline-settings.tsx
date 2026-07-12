"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getWIBDateTimeString, formatIndonesianDate } from "@/lib/utils";
import { updateDeadlineSettingAction } from "../actions";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

interface DeadlineSettingsProps {
  initialDeadline: string;
}

export function DeadlineSettings({ initialDeadline }: DeadlineSettingsProps) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const [inputValue, setInputValue] = useState(() => getWIBDateTimeString(initialDeadline));
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) {
      toast.error("Batas waktu pendaftaran tidak boleh kosong");
      return;
    }

    // Append timezone offset for WIB (+07:00)
    // datetime-local returns YYYY-MM-DDTHH:mm
    const finalISOString = `${inputValue}:00+07:00`;

    startTransition(async () => {
      const res = await updateDeadlineSettingAction(finalISOString);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setDeadline(finalISOString);
        toast.success("Batas waktu pendaftaran berhasil diperbarui");
      }
    });
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-merah" />
          <CardTitle className="text-lg font-bold text-arang">Batas Waktu Pendaftaran</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-arang/[0.02] border border-gray-100 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-jetbrains">Batas Waktu Saat Ini</p>
          <p className="text-sm font-bold text-merah mt-1">{formatIndonesianDate(deadline)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="deadline-input" className="text-xs font-semibold text-gray-600">
              Ubah / Perpanjang Batas Waktu (WIB)
            </Label>
            <Input
              id="deadline-input"
              type="datetime-local"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isPending}
              className="w-full bg-white border-gray-300"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-merah hover:bg-merah-tua text-white font-semibold cursor-pointer h-10 transition-colors"
          >
            {isPending ? "Menyimpan..." : "Simpan Batas Waktu"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
