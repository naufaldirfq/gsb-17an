"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addParticipantToCompetitionAction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  phone: string;
  houseBlock: string;
  houseNumber: string;
}

export function AddParticipantModal({
  competitionId,
  existingParticipants,
}: {
  competitionId: string;
  existingParticipants: Participant[];
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseBlock, setHouseBlock] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const filteredParticipants = searchQuery.trim() === ""
    ? []
    : existingParticipants.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.phone.includes(searchQuery)
      ).slice(0, 5);

  const handleSelectExisting = (p: Participant) => {
    setSelectedParticipant(p);
    setName(p.name);
    setPhone(p.phone);
    setHouseBlock(p.houseBlock);
    setHouseNumber(p.houseNumber);
    setSearchQuery("");
  };

  const handleResetSelection = () => {
    setSelectedParticipant(null);
    setName("");
    setPhone("");
    setHouseBlock("");
    setHouseNumber("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("phone", phone);
    formData.set("houseBlock", houseBlock);
    formData.set("houseNumber", houseNumber);

    const res = await addParticipantToCompetitionAction(competitionId, formData);
    setIsPending(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Peserta berhasil ditambahkan!");
      setOpen(false);
      handleResetSelection();
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-merah hover:bg-merah-tua text-white font-medium cursor-pointer">
            + Tambah Peserta
          </Button>
        }
      />
      <DialogContent className="max-w-md bg-white text-arang p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Tambah Peserta Baru</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Search Existing */}
          <div className="relative">
            <Label htmlFor="search-participant" className="font-semibold text-xs text-gray-500 mb-1 block">
              Pilih dari Peserta yang Sudah Ada (Opsional)
            </Label>
            <div className="relative">
              <Input
                id="search-participant"
                placeholder="Cari nama atau WhatsApp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            {filteredParticipants.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredParticipants.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectExisting(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium text-arang">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({p.houseBlock}-{p.houseNumber})</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedParticipant && (
            <div className="bg-emas/10 border border-emas/30 text-arang rounded-lg p-3 text-xs flex justify-between items-center">
              <div>
                <p className="font-semibold">Menggunakan data peserta terdaftar:</p>
                <p>{selectedParticipant.name} ({selectedParticipant.phone})</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleResetSelection}
                className="text-red-500 hover:bg-red-100/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <hr className="border-gray-100 my-2" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="font-semibold">Nama Lengkap</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Santoso"
                disabled={!!selectedParticipant}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="font-semibold">Nomor WhatsApp</Label>
              <Input
                id="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                disabled={!!selectedParticipant}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="houseBlock" className="font-semibold">Blok Rumah</Label>
                <Input
                  id="houseBlock"
                  required
                  value={houseBlock}
                  onChange={(e) => setHouseBlock(e.target.value)}
                  placeholder="C3"
                  disabled={!!selectedParticipant}
                />
              </div>
              <div>
                <Label htmlFor="houseNumber" className="font-semibold">Nomor Rumah</Label>
                <Input
                  id="houseNumber"
                  required
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="12A"
                  disabled={!!selectedParticipant}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-merah hover:bg-merah-tua text-white cursor-pointer mt-2"
            >
              {isPending ? "Menyimpan..." : "Daftarkan Peserta"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
