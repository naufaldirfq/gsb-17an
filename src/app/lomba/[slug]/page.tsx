import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrationForm } from "@/components/registration-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WhatsAppShare } from "./whatsapp-share";

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
      matches: {
        include: {
          teamA: true,
          teamB: true,
          winnerTeam: true,
        },
        orderBy: [
          { round: "asc" },
          { position: "asc" }
        ]
      }
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
          <Link href="/lomba" className="text-arang/60 text-sm font-medium hover:text-merah transition-colors" aria-label="Kembali ke Daftar Lomba">
            &larr; Kembali ke Daftar
          </Link>
          <h1 className="font-anton text-4xl text-merah mt-4 tracking-wide">{competition.name}</h1>
          
          <div className="mt-4">
            <WhatsAppShare competitionName={competition.name} />
            <a href={`/print/lomba/${competition.slug}`} target="_blank" className="inline-flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white py-2 px-3 rounded-md text-xs font-semibold transition-colors mt-2">
              Cetak Detail Lomba 🖨️
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
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
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-xl text-arang tracking-wide">Deskripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-arang/80 leading-relaxed whitespace-pre-wrap">{competition.description}</p>
            </CardContent>
          </Card>
        )}

        {competition.rules && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-xl text-arang tracking-wide">Peraturan Lomba</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-arang/80 leading-relaxed whitespace-pre-wrap">{competition.rules}</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-anton text-2xl text-arang tracking-wide">Pendaftaran</CardTitle>
          </CardHeader>
          <CardContent>
            {!canRegister ? (
              <div className="p-4 bg-merah/10 text-merah-tua rounded-lg text-sm font-medium text-center border border-merah/20">
                {isFull ? "Maaf, kuota pendaftaran sudah penuh." : "Pendaftaran untuk lomba ini sudah ditutup."}
              </div>
            ) : (
              <RegistrationForm competitionId={competition.id} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="font-anton text-xl text-arang tracking-wide">Jadwal & Hasil</CardTitle>
            <Link href={`/lomba/${slug}/bagan`} className="text-xs font-semibold text-merah hover:underline">
              Lihat Bagan &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            {competition.matches && competition.matches.filter(m => m.status !== "BYE").length === 0 ? (
              <p className="text-sm text-arang/60 text-center py-4">Belum ada pertandingan dijadwalkan.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {competition.matches
                  .filter((m) => m.status !== "BYE")
                  .map((match) => (
                    <div key={match.id} className="p-3 border border-border rounded-lg bg-surface flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs text-arang/60 font-semibold font-jetbrains">
                        <span>{match.label || `Ronde ${match.round}`}</span>
                        <span>Match {match.position + 1}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className={match.winnerTeamId === match.teamAId ? 'font-bold text-merah' : 'text-arang'}>
                          {match.teamA?.name || "TBD"}
                        </span>
                        <span className="text-xs font-bold text-arang/40">VS</span>
                        <span className={match.winnerTeamId === match.teamBId ? 'font-bold text-merah' : 'text-arang'}>
                          {match.teamB?.name || "TBD"}
                        </span>
                      </div>

                      {(match.court || match.scheduledAt) && (
                        <div className="text-xs text-arang/60 mt-1 font-medium bg-arang/5 py-0.5 px-1.5 rounded inline-block self-start">
                          {match.court || ""}
                          {match.court && match.scheduledAt && " • "}
                          {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-anton text-xl text-arang tracking-wide">Daftar Peserta ({competition._count.registrations})</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
