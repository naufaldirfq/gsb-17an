"use client";

import { useEffect, useState } from "react";

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    // 17 Agustus 2026 (assuming 2026 based on KE-81, since 1945 + 81 = 2026)
    const target = new Date("2026-08-17T00:00:00+07:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) {
    return <div className="h-[80px]" />; // Placeholder to avoid layout shift
  }

  return (
    <div className="flex gap-4 text-center">
      <div className="flex flex-col items-center">
        <span className="font-jetbrains text-4xl font-bold text-merah">{String(timeLeft.d).padStart(2, "0")}</span>
        <span className="text-xs font-semibold tracking-wider text-arang/60">HARI</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="font-jetbrains text-4xl font-bold text-merah">{String(timeLeft.h).padStart(2, "0")}</span>
        <span className="text-xs font-semibold tracking-wider text-arang/60">JAM</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="font-jetbrains text-4xl font-bold text-merah">{String(timeLeft.m).padStart(2, "0")}</span>
        <span className="text-xs font-semibold tracking-wider text-arang/60">MNT</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="font-jetbrains text-4xl font-bold text-merah">{String(timeLeft.s).padStart(2, "0")}</span>
        <span className="text-xs font-semibold tracking-wider text-arang/60">DTK</span>
      </div>
    </div>
  );
}
