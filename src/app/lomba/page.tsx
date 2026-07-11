import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LombaList() {
  const competitions = await prisma.competition.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  return (
    <main className="flex flex-col items-center w-full min-h-screen px-6 py-12">
      <div className="max-w-md w-full flex flex-col gap-8">
        <div>
          <Link href="/" className="text-arang/60 text-sm font-medium hover:text-merah transition-colors">
            &larr; Kembali
          </Link>
          <h1 className="font-anton text-4xl text-arang mt-4 tracking-wide">DAFTAR LOMBA</h1>
          <p className="text-arang/80 font-medium mt-1">Pilih lomba yang ingin Anda ikuti</p>
        </div>

        <div className="flex flex-col gap-4">
          {competitions.map((comp) => {
            const isFull = comp.maxParticipants && comp._count.registrations >= comp.maxParticipants;
            const isOpen = comp.registrationOpen && comp.status === "REGISTRATION";
            const canRegister = isOpen && !isFull;

            return (
              <Card key={comp.id} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-anton text-2xl text-merah tracking-wide">{comp.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
                      {comp.teamSize === 1 ? "Perorangan" : `${comp.teamSize} Orang`}
                    </span>
                    <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
                      Terdaftar: {comp._count.registrations} Orang
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {comp.description && (
                    <p className="text-sm text-arang/80 line-clamp-2">{comp.description}</p>
                  )}
                  {canRegister ? (
                    <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-merah hover:bg-merah-tua text-putih-kertas py-3 rounded-[12px] font-bold transition-colors">
                      Daftar Sekarang
                    </Link>
                  ) : (
                    <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-arang/5 hover:bg-arang/10 text-arang/80 py-3 rounded-[12px] font-bold transition-colors">
                      {isFull ? "Kuota Penuh (Lihat Detail)" : "Ditutup (Lihat Detail)"}
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {competitions.length === 0 && (
            <div className="text-center py-12 text-arang/60">
              Belum ada lomba yang tersedia.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
