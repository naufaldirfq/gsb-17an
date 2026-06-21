"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Share2 } from "lucide-react";

export function WhatsAppShare({ competitionName }: { competitionName: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    // Render a placeholder button during SSR to avoid hydration mismatch layout shift
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-green-600 text-green-600 flex gap-2 w-fit pointer-events-none opacity-50"
      >
        <Share2 className="w-4 h-4" />
        Bagikan ke WhatsApp
      </Button>
    );
  }

  const url = window.location.href;
  const text = `Yuk ikutan lomba ${competitionName}! ${url}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <a 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      aria-label="Bagikan tautan lomba ini ke WhatsApp"
      className={buttonVariants({ 
        variant: "outline", 
        size: "sm", 
        className: "border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 focus-visible:ring-green-600 flex gap-2 w-fit" 
      })}
    >
      <Share2 className="w-4 h-4" />
      Bagikan ke WhatsApp
    </a>
  );
}
