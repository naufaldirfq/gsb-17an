import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrationForm } from "@/components/registration-form";

export const dynamic = "force-dynamic";

export default async function LombaDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const competition = await prisma.competition.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { registrations: true },
      },
      registrations: {
        include: {
          participant: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!competition) {
    notFound();
  }

  const isFull = competition.maxParticipants && competition._count.registrations >= competition.maxParticipants;
  const isOpen = competition.registrationOpen && competition.status === "REGISTRATION";
  const canRegister = isOpen && !isFull;

  return (
    <main className="flex flex-col items-center w-full min-h-screen px-6 py-12">
      <div className="max-w-md w-full flex flex-col gap-8">
        <div>
          <Link href="/lomba" className="text-arang/60 text-sm font-medium hover:text-merah transition-colors">
            &larr; Kembali ke Daftar
          </Link>
          <h1 className="font-anton text-4xl text-merah mt-4 tracking-wide">{competition.name}</h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-arang/5 text-arang px-2 py-1 rounded text-xs font-bold font-jetbrains">
              {competition.teamSize === 1 ? "Perorangan" : `${competition.teamSize} Orang/Tim`}
            </span>
            {competition.maxParticipants && (
              <span className="bg-arang/5 text-arang px-2 py-1 rounded text-xs font-bold font-jetbrains">
                {competition._count.registrations} / {competition.maxParticipants} Kuota
              </span>
            )}
          </div>
        </div>

        {competition.description && (
          <div className="bg-surface border border-border rounded-[12px] p-5">
            <h3 className="font-anton text-xl text-arang tracking-wide mb-2">Deskripsi</h3>
            <p className="text-sm text-arang/80 leading-relaxed whitespace-pre-wrap">{competition.description}</p>
          </div>
        )}

        {competition.rules && (
          <div className="bg-surface border border-border rounded-[12px] p-5">
            <h3 className="font-anton text-xl text-arang tracking-wide mb-2">Peraturan Lomba</h3>
            <p className="text-sm text-arang/80 leading-relaxed whitespace-pre-wrap">{competition.rules}</p>
          </div>
        )}

        <div className="bg-surface border border-border rounded-[12px] p-5">
          <h3 className="font-anton text-2xl text-arang tracking-wide">Pendaftaran</h3>
          {!canRegister ? (
            <div className="mt-4 p-4 bg-merah/10 text-merah-tua rounded-lg text-sm font-medium text-center border border-merah/20">
              {isFull ? "Maaf, kuota pendaftaran sudah penuh." : "Maaf, pendaftaran belum dibuka atau sudah ditutup."}
            </div>
          ) : (
            <RegistrationForm competitionId={competition.id} />
          )}
        </div>

        <div className="bg-surface border border-border rounded-[12px] p-5">
          <h3 className="font-anton text-xl text-arang tracking-wide mb-4">Daftar Peserta ({competition._count.registrations})</h3>
          {competition.registrations.length === 0 ? (
            <p className="text-sm text-arang/60 text-center py-4">Belum ada peserta yang mendaftar.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {competition.registrations.map((reg, idx) => (
                <li key={reg.id} className="flex justify-between items-center pb-3 border-b border-arang/5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="font-jetbrains text-merah/60 font-bold text-sm w-4">{idx + 1}.</span>
                    <span className="font-medium text-arang">{reg.participant.name}</span>
                  </div>
                  <span className="text-xs bg-arang/5 px-2 py-1 rounded font-jetbrains font-bold text-arang/60">
                    Blok {reg.participant.houseBlock}-{reg.participant.houseNumber}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </main>
  );
}
