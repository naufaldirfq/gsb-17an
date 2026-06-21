"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="print-hidden fixed bottom-6 right-6 bg-merah hover:bg-merah-tua text-white font-semibold py-2.5 px-4 rounded-full shadow-lg cursor-pointer transition-colors z-50 text-sm"
    >
      Cetak 🖨️
    </button>
  );
}
