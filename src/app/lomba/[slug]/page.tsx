import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrationForm } from "@/components/registration-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WhatsAppShare } from "./whatsapp-share";
import { getStandingsForCompetition } from "@/app/admin/(guarded)/lomba/[slug]/actions";

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
          matchTeams: {
            include: {
              team: true,
            },
          },
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

  const isGroupKnockout = competition.bracketFormat === "GROUP_KNOCKOUT";
  const isRoundRobin = competition.bracketFormat === "ROUND_ROBIN";
  const isCustomFormat = competition.bracketFormat === "RACE_HEATS" || competition.bracketFormat === "LEADERBOARD";

  const groupMatches = competition.matches.filter(m => m.label && (m.label.startsWith("Grup") || m.label === "Round Robin"));
  const knockoutMatches = competition.matches.filter(m => !m.label || (!m.label.startsWith("Grup") && m.label !== "Round Robin"));

  const standings = (isGroupKnockout || isRoundRobin) && competition.matches.length > 0
    ? await getStandingsForCompetition(competition.id)
    : null;

  return (
    <main className="flex flex-col items-center w-full min-h-screen px-6 py-12">
      <div className="max-w-md w-full flex flex-col gap-8">
        <div>
          <Link href="/lomba" className="text-arang/60 text-sm font-medium hover:text-merah transition-colors" aria-label="Kembali ke Daftar Lomba">
            &larr; Kembali ke Daftar
          </Link>
          <h1 className="font-anton text-4xl text-merah mt-4 tracking-tight">{competition.name}</h1>
          
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
            {competition.registrationRequired && (
              <span className="bg-arang/5 text-arang px-2 py-1 rounded text-xs font-bold font-jetbrains">
                Terdaftar: {competition._count.registrations} Orang
              </span>
            )}
          </div>
        </div>

        {competition.description && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-xl text-arang tracking-tight">Deskripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-arang/80 leading-relaxed whitespace-pre-wrap">{competition.description}</p>
            </CardContent>
          </Card>
        )}

        {competition.rules && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-xl text-arang tracking-tight">Peraturan Lomba</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-arang/80 leading-relaxed whitespace-pre-wrap">{competition.rules}</p>
            </CardContent>
          </Card>
        )}

        {(competition.heldAt || competition.location || !competition.registrationRequired) && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-xl text-arang tracking-tight">Informasi Pelaksanaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-arang/80">
              {competition.heldAt && (
                <div>
                  <span className="font-bold text-gray-500 block text-xs uppercase font-jetbrains">Waktu & Tanggal</span>
                  <p className="mt-0.5 font-medium text-arang">{competition.heldAt}</p>
                </div>
              )}
              {competition.location && (
                <div>
                  <span className="font-bold text-gray-500 block text-xs uppercase font-jetbrains">Lokasi</span>
                  <p className="mt-0.5 font-medium text-arang">{competition.location}</p>
                </div>
              )}
              {!competition.heldAt && !competition.location && (
                <p className="text-arang/60 italic">Detail waktu dan tempat akan segera diumumkan.</p>
              )}
            </CardContent>
          </Card>
        )}

        {competition.registrationRequired && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-2xl text-arang tracking-tight">Pendaftaran</CardTitle>
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
        )}

        {standings && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-xl text-arang tracking-tight">Klasemen Sementara</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(standings).map(([groupName, groupStandings]) => (
                <div key={groupName} className="border border-border rounded-lg overflow-hidden bg-surface">
                  <div className="bg-arang/5 px-4 py-2 border-b border-border font-bold text-sm text-arang">
                    {competition.bracketFormat === "GROUP_KNOCKOUT" ? `Grup ${groupName}` : "Klasemen Liga"}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse text-left">
                      <thead>
                        <tr className="border-b border-border bg-arang/5 text-xs text-arang/60 font-semibold font-jetbrains">
                          <th className="py-2 px-3 text-center">Pos</th>
                          <th className="py-2 px-3">Tim</th>
                          <th className="py-2 px-3 text-center">P</th>
                          <th className="py-2 px-3 text-center">M</th>
                          <th className="py-2 px-3 text-center">K</th>
                          <th className="py-2 px-3 text-center">+/-</th>
                          <th className="py-2 px-3 text-center">PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupStandings.map((row, idx) => (
                          <tr key={row.team.id} className={`border-b border-border last:border-0 ${idx < 2 && competition.bracketFormat === "GROUP_KNOCKOUT" ? "bg-emas/5" : ""}`}>
                            <td className="py-2 px-3 text-center font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-arang">
                              {row.team.name}
                              {idx < 2 && competition.bracketFormat === "GROUP_KNOCKOUT" && (
                                <span className="ml-2 bg-emas/10 text-emas border border-emas/20 rounded px-1 py-0.5 text-[9px] font-bold font-jetbrains">Lolos</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-jetbrains">{row.played}</td>
                            <td className="py-2 px-3 text-center font-jetbrains text-green-600 font-semibold">{row.won}</td>
                            <td className="py-2 px-3 text-center font-jetbrains text-red-600 font-semibold">{row.lost}</td>
                            <td className="py-2 px-3 text-center font-jetbrains font-bold">
                              {row.scoreFor - row.scoreAgainst >= 0 ? `+${row.scoreFor - row.scoreAgainst}` : row.scoreFor - row.scoreAgainst}
                            </td>
                            <td className="py-2 px-3 text-center font-jetbrains font-bold text-arang">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="font-anton text-xl text-arang tracking-tight">Jadwal & Hasil</CardTitle>
            <Link href={`/lomba/${slug}/bagan`} className="text-xs font-semibold text-merah hover:underline">
              {competition.bracketFormat === "LEADERBOARD" ? "Lihat Klasemen" : "Lihat Bagan"} &rarr;
            </Link>
          </CardHeader>
          <CardContent>
            {competition.matches && competition.matches.filter(m => m.status !== "BYE").length === 0 ? (
              <p className="text-sm text-arang/60 text-center py-4">Belum ada pertandingan dijadwalkan.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Group stage matches list */}
                {(isGroupKnockout || isRoundRobin) && groupMatches.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-arang/50 px-1">Pertandingan Babak Grup</h3>
                    <div className="flex flex-col gap-3">
                      {groupMatches
                        .filter((m) => m.status !== "BYE")
                        .map((match) => (
                          <div key={match.id} className="p-3 border border-border rounded-lg bg-surface flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs text-arang/60 font-semibold font-jetbrains">
                              <span>{match.label}</span>
                              <span>Ronde {match.round}</span>
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
                  </div>
                )}

                {/* Knockout stage matches list */}
                {isGroupKnockout && knockoutMatches.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-arang/50 px-1">Pertandingan Babak Gugur</h3>
                    <div className="flex flex-col gap-3">
                      {knockoutMatches
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
                  </div>
                )}

                {/* Standard matches list for Single Elimination */}
                {!isGroupKnockout && !isRoundRobin && !isCustomFormat && (
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

                {/* Custom matches list for Heats and Leaderboard */}
                {isCustomFormat && (
                  <div className="flex flex-col gap-3">
                    {competition.matches
                      .filter((m) => m.status !== "BYE")
                      .map((match) => (
                        <div key={match.id} className="p-3 border border-border rounded-lg bg-surface flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs text-arang/60 font-semibold font-jetbrains">
                            <span>{match.label || `Ronde ${match.round}`}</span>
                            <span>Match {match.position + 1}</span>
                          </div>
                          
                          <div className="text-sm text-arang flex flex-wrap gap-x-1 items-center">
                            <span className="font-semibold text-arang/60">Peserta:</span>
                            {match.matchTeams && match.matchTeams.length > 0 ? (
                              <div className="inline-flex flex-wrap gap-x-1.5">
                                {match.matchTeams.map((mt, idx) => {
                                  const isWinner = mt.isWinner || mt.rank === 1;
                                  return (
                                    <span key={mt.id} className={isWinner ? "text-emas font-bold" : "text-arang font-medium"}>
                                      {mt.team.name}
                                      {idx < match.matchTeams.length - 1 ? "," : ""}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-arang/40 font-medium">Belum ada tim</span>
                            )}
                          </div>

                          {match.status === "COMPLETED" && (
                            <div className="mt-1 text-xs space-y-0.5 border-t border-arang/5 pt-1">
                              {match.matchTeams
                                ?.filter((mt) => mt.rank !== null)
                                .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
                                .map((mt) => (
                                  <div key={mt.id} className={mt.isWinner || mt.rank === 1 ? "text-emas font-bold" : "text-arang/70"}>
                                    Juara {mt.rank}: {mt.team.name}
                                  </div>
                                ))}
                            </div>
                          )}

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
              </div>
            )}
          </CardContent>
        </Card>

        {competition.registrationRequired && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-anton text-xl text-arang tracking-tight">Daftar Peserta ({competition._count.registrations})</CardTitle>
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
        )}

      </div>
    </main>
  );
}
