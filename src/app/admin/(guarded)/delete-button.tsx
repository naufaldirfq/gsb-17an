"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteButtonProps {
  id: string;
  action: (id: string) => Promise<{ error?: string; success?: boolean }>;
  confirmMessage: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DeleteButton({
  id,
  action,
  confirmMessage,
  className = "",
  variant = "destructive",
  size = "sm",
}: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await action(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Berhasil dihapus!");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal melakukan aksi.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDelete}
      disabled={isDeleting}
      className={className}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
