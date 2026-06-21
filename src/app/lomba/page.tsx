import prisma from "@/lib/prisma";
import Link from "next/link";

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
              <div key={comp.id} className="bg-surface border border-arang/10 rounded-[12px] p-5 flex flex-col gap-4">
                <div>
                  <h2 className="font-anton text-2xl text-merah tracking-wide">{comp.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-arang/5 text-arang px-2 py-1 rounded text-xs font-bold font-jetbrains">
                      {comp.teamSize === 1 ? "Perorangan" : `${comp.teamSize} Orang/Tim`}
                    </span>
                    {comp.maxParticipants && (
                      <span className="bg-arang/5 text-arang px-2 py-1 rounded text-xs font-bold font-jetbrains">
                        {comp._count.registrations} / {comp.maxParticipants} Kuota
                      </span>
                    )}
                  </div>
                  {comp.description && (
                    <p className="text-sm text-arang/80 mt-3 line-clamp-2">{comp.description}</p>
                  )}
                </div>

                {canRegister ? (
                  <Link 
                    href={`/lomba/${comp.slug}`}
                    className="inline-flex items-center justify-center w-full rounded-[12px] font-bold bg-merah hover:bg-merah-tua text-putih-kertas py-2 transition-colors"
                  >
                    Daftar Sekarang
                  </Link>
                ) : (
                  <button 
                    disabled
                    className="w-full rounded-[12px] font-bold bg-arang/20 text-arang/50 cursor-not-allowed py-2"
                  >
                    {isFull ? "Kuota Penuh" : "Pendaftaran Ditutup"}
                  </button>
                )}
              </div>
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
