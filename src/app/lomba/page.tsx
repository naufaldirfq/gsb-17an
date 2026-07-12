import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatIndonesianDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LombaList() {
  const competitions = await prisma.competition.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  const deadlineSetting = await prisma.setting.findUnique({
    where: { key: "registrationDeadline" },
  });
  const deadlineStr = deadlineSetting?.value || "2026-07-31T23:59:59+07:00";
  const deadline = new Date(deadlineStr);
  const isPastDeadline = new Date() > deadline;

  return (
    <main className="flex flex-col items-center w-full min-h-screen px-6 py-12">
      <div className="max-w-md w-full flex flex-col gap-8">
        <div>
          <Link href="/" className="text-arang/60 text-sm font-medium hover:text-merah transition-colors">
            &larr; Kembali
          </Link>
          <h1 className="font-anton text-4xl text-arang mt-4 tracking-wide">DAFTAR LOMBA</h1>
          <p className="text-arang/80 font-medium mt-1">Pilih lomba yang ingin Anda ikuti</p>

          <div className={`border rounded-xl p-4 flex flex-col gap-1 mt-4 ${isPastDeadline ? 'bg-gray-100 border-gray-200' : 'bg-merah/5 border-merah/10'}`}>
            <span className={`text-xs font-semibold uppercase tracking-wider font-jetbrains ${isPastDeadline ? 'text-gray-500' : 'text-merah'}`}>
              {isPastDeadline ? "❌ Pendaftaran Telah Ditutup" : "⏳ Batas Akhir Pendaftaran"}
            </span>
            <span className={`text-sm font-bold ${isPastDeadline ? 'text-gray-600 line-through' : 'text-arang'}`}>
              {formatIndonesianDate(deadlineStr)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {competitions.map((comp) => {
            const registrationRequired = comp.registrationRequired ?? true;
            const isFull = comp.maxParticipants && comp._count.registrations >= comp.maxParticipants;
            const isOpen = comp.registrationOpen && comp.status === "REGISTRATION";
            const canRegister = isOpen && !isFull && registrationRequired && !isPastDeadline;

            return (
              <Card key={comp.id} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="font-anton text-2xl text-merah tracking-wide">{comp.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
                      {comp.teamSize === 1 ? "Perorangan" : `${comp.teamSize} Orang`}
                    </span>
                    {registrationRequired && (
                      <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
                        Terdaftar: {comp._count.registrations} Orang
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {comp.description && (
                    <p className="text-sm text-arang/80 line-clamp-2">{comp.description}</p>
                  )}
                  {!registrationRequired ? (
                    <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-gray-800 hover:bg-gray-900 text-putih-kertas py-3 rounded-[12px] font-bold transition-colors">
                      Lihat Informasi
                    </Link>
                  ) : canRegister ? (
                    <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-merah hover:bg-merah-tua text-putih-kertas py-3 rounded-[12px] font-bold transition-colors">
                      Daftar Sekarang
                    </Link>
                  ) : (
                    <Link href={`/lomba/${comp.slug}`} className="w-full inline-block text-center bg-arang/5 hover:bg-arang/10 text-arang/80 py-3 rounded-[12px] font-bold transition-colors">
                      {isPastDeadline ? "Batas Waktu Terlewati (Lihat Detail)" : isFull ? "Kuota Penuh (Lihat Detail)" : "Ditutup (Lihat Detail)"}
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

