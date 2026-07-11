"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editParticipantAction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Edit } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  phone: string;
  houseBlock: string;
  houseNumber: string;
}

export function EditParticipantModal({ participant }: { participant: Participant }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(participant.name);
  const [phone, setPhone] = useState(participant.phone);
  const [houseBlock, setHouseBlock] = useState(participant.houseBlock);
  const [houseNumber, setHouseNumber] = useState(participant.houseNumber);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("phone", phone);
    formData.set("houseBlock", houseBlock);
    formData.set("houseNumber", houseNumber);

    const res = await editParticipantAction(participant.id, formData);
    setIsPending(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Detail peserta berhasil diubah!");
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-arang hover:bg-gray-100 cursor-pointer">
            <Edit className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="max-w-md bg-white text-arang p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Detail Peserta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="edit-name" className="font-semibold">Nama Lengkap</Label>
            <Input
              id="edit-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="edit-phone" className="font-semibold">Nomor WhatsApp</Label>
            <Input
              id="edit-phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-houseBlock" className="font-semibold">Blok Rumah</Label>
              <Input
                id="edit-houseBlock"
                required
                value={houseBlock}
                onChange={(e) => setHouseBlock(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-houseNumber" className="font-semibold">Nomor Rumah</Label>
              <Input
                id="edit-houseNumber"
                required
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-merah hover:bg-merah-tua text-white cursor-pointer mt-2"
          >
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
