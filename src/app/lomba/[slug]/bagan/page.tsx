import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { getStandingsForCompetition } from "@/app/admin/(guarded)/lomba/[slug]/actions";

export const dynamic = "force-dynamic";

export default async function PublicBracketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const competition = await prisma.competition.findUnique({
    where: { slug },
    include: {
      matches: {
        include: {
          teamA: true,
          teamB: true,
          winnerTeam: true,
          competition: true,
          matchTeams: {
            include: {
              team: true,
            },
          },
        },
        orderBy: [
          { round: 'asc' },
          { position: 'asc' }
        ]
      }
    },
  });

  if (!competition) {
    notFound();
  }

  const isGroupKnockout = competition.bracketFormat === "GROUP_KNOCKOUT";
  const isRoundRobin = competition.bracketFormat === "ROUND_ROBIN";
  const isLeaderboard = competition.bracketFormat === "LEADERBOARD";
  const isRaceHeats = competition.bracketFormat === "RACE_HEATS";

  const groupMatches = competition.matches.filter(m => m.label && (m.label.startsWith("Grup") || m.label === "Round Robin"));
  const knockoutMatches = competition.matches.filter(m => !m.label || (!m.label.startsWith("Grup") && m.label !== "Round Robin"));

  const hasMatches = competition.matches.length > 0;
  const hasKnockoutMatches = knockoutMatches.length > 0;

  const standings = (isGroupKnockout || isRoundRobin) && hasMatches
    ? await getStandingsForCompetition(competition.id)
    : null;

  // For LEADERBOARD format
  if (isLeaderboard) {
    const leaderboardMatch = competition.matches[0];
    const leaderboardParticipants = leaderboardMatch?.matchTeams || [];
    const sortedLeaderboard = [...leaderboardParticipants].sort((a, b) => {
      if (a.rank === null && b.rank === null) return 0;
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });

    const getMedalBadge = (rank: number | null) => {
      if (rank === null) return null;
      if (rank === 1) {
        return (
          <Badge className="bg-emas/10 text-emas border border-emas/30 hover:bg-emas/15 font-bold font-jakarta text-xs flex items-center gap-1">
            🥇 Juara 1
          </Badge>
        );
      }
      if (rank === 2) {
        return (
          <Badge className="bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-150 font-bold font-jakarta text-xs flex items-center gap-1">
            🥈 Juara 2
          </Badge>
        );
      }
      if (rank === 3) {
        return (
          <Badge className="bg-[#B08D57]/10 text-[#B08D57] border border-[#B08D57]/30 hover:bg-[#B08D57]/15 font-bold font-jakarta text-xs flex items-center gap-1">
            🥉 Juara 3
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-arang/60 border-border font-medium text-xs">
          Peringkat {rank}
        </Badge>
      );
    };

    return (
      <main className="flex flex-col items-center w-full min-h-screen px-6 py-12 bg-putih-kertas">
        <div className="max-w-4xl w-full flex flex-col gap-8">
          <div>
            <Link href={`/lomba/${slug}`} className="text-arang/60 text-sm font-medium hover:text-merah transition-colors">
              &larr; Kembali ke Detail Lomba
            </Link>
            <div className="flex items-center justify-between mt-4">
              <h1 className="font-anton text-4xl text-merah tracking-tight">Klasemen {competition.name}</h1>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-anton text-2xl text-arang tracking-tight">Papan Peringkat (Leaderboard)</h2>
            {!leaderboardMatch || sortedLeaderboard.length === 0 ? (
              <div className="text-center p-12 bg-surface rounded-xl border border-border">
                <h2 className="text-xl font-bold text-arang">Hasil klasemen belum tersedia</h2>
                <p className="text-arang/60 mt-2">Pertandingan belum selesai atau peringkat belum diinput oleh admin.</p>
              </div>
            ) : (
              <Card className="border-border bg-surface overflow-hidden shadow-md">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse text-left">
                      <thead>
                        <tr className="border-b border-border bg-arang/5 text-xs text-arang/60 font-semibold font-jetbrains">
                          <th className="py-3 px-4 text-center w-16">Rank</th>
                          <th className="py-3 px-4">Nama Tim / Peserta</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLeaderboard.map((mt) => {
                          const hasRank = mt.rank !== null;
                          
                          return (
                            <tr key={mt.id} className={`border-b border-border last:border-0 hover:bg-arang/5 transition-colors ${
                              mt.rank === 1 ? "bg-emas/5" : ""
                            }`}>
                              <td className="py-4 px-4 text-center font-bold font-jetbrains">
                                {hasRank ? mt.rank : "-"}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <span className={`font-semibold text-base ${mt.rank === 1 ? "text-emas" : "text-arang"}`}>
                                    {mt.team.name}
                                  </span>
                                  {mt.rank !== null && (
                                    <div className="inline-flex self-start sm:self-center">
                                      {getMedalBadge(mt.rank)}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                {mt.isWinner && (
                                  <Badge className="bg-emas hover:bg-emas text-white font-bold text-xs uppercase tracking-wider">
                                    Winner 🎉
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    );
  }

  // For RACE_HEATS format
  if (isRaceHeats) {
    const heatsByRound = competition.matches.reduce((acc, match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, typeof competition.matches>);

    const heatRounds = Object.keys(heatsByRound).map(Number).sort((a, b) => a - b);

    return (
      <main className="flex flex-col items-center w-full min-h-screen px-6 py-12 bg-putih-kertas">
        <div className="max-w-6xl w-full flex flex-col gap-8">
          <div>
            <Link href={`/lomba/${slug}`} className="text-arang/60 text-sm font-medium hover:text-merah transition-colors">
              &larr; Kembali ke Detail Lomba
            </Link>
            <div className="flex items-center justify-between mt-4">
              <h1 className="font-anton text-4xl text-merah tracking-tight">Bagan Babak {competition.name}</h1>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-anton text-2xl text-arang tracking-tight">Jadwal & Hasil Heats</h2>
            
            {heatRounds.length === 0 ? (
              <div className="text-center p-12 bg-surface rounded-xl border border-border">
                <h2 className="text-xl font-bold text-arang">Heats belum tersedia</h2>
                <p className="text-arang/60 mt-2">Pendaftaran mungkin masih berlangsung atau heats belum di-generate oleh admin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-6">
                <div className="flex gap-6 min-w-[800px] md:min-w-full">
                  {heatRounds.map(round => {
                    const matches = heatsByRound[round];
                    const roundLabel = matches[0]?.label || `Round ${round}`;
                    
                    return (
                      <div key={round} className="flex-1 min-w-[280px] max-w-[360px] space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <h3 className="font-anton text-xl text-arang tracking-tight">{roundLabel}</h3>
                          <Badge variant="secondary" className="font-jetbrains text-xs">
                            {matches.length} Heat{matches.length > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          {matches.map(match => {
                            const sortedMatchTeams = [...match.matchTeams].sort((a, b) => {
                              if (a.rank === null && b.rank === null) return 0;
                              if (a.rank === null) return 1;
                              if (b.rank === null) return -1;
                              return a.rank - b.rank;
                            });
                            
                            return (
                              <Card key={match.id} className="border-border bg-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="bg-arang/5 px-4 py-2 flex justify-between items-center border-b border-border">
                                  <span className="text-xs font-jetbrains font-bold text-arang/60">
                                    Heat {match.position + 1}
                                  </span>
                                  <Badge variant={match.status === "COMPLETED" ? "default" : match.status === "BYE" ? "secondary" : "outline"} className={match.status === "COMPLETED" ? "bg-merah hover:bg-merah-tua" : ""}>
                                    {match.status}
                                  </Badge>
                                </div>
                                
                                <CardContent className="p-4 space-y-2">
                                  {sortedMatchTeams.length === 0 ? (
                                    <p className="text-xs text-arang/40 text-center py-2">Belum ada peserta</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {sortedMatchTeams.map(mt => {
                                        const isWinner = mt.isWinner || mt.rank === 1;
                                        return (
                                          <div 
                                            key={mt.id} 
                                            className={`flex justify-between items-center p-2 rounded-md transition-colors ${
                                              isWinner 
                                                ? "border-2 border-emas bg-emas/10 font-bold" 
                                                : "border border-border/40 bg-arang/5"
                                            }`}
                                          >
                                            <span className={`text-sm ${isWinner ? "text-emas font-bold" : "text-arang font-medium"}`}>
                                              {mt.team.name}
                                            </span>
                                            {mt.rank !== null && (
                                              <Badge className={`text-[10px] font-bold ${
                                                isWinner 
                                                  ? "bg-emas hover:bg-emas text-white" 
                                                  : "bg-arang/10 text-arang/75 hover:bg-arang/15"
                                              }`}>
                                                Juara {mt.rank}
                                              </Badge>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {(match.court || match.scheduledAt) && (
                                    <div className="flex flex-col gap-1 pt-2 border-t border-border/20 text-[10px] text-arang/60 font-medium">
                                      {match.scheduledAt && (
                                        <div className="flex items-center gap-1">
                                          <CalendarIcon className="w-3.5 h-3.5 text-arang/40" />
                                          <span>{new Date(match.scheduledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                                        </div>
                                      )}
                                      {match.court && (
                                        <div className="flex items-center gap-1">
                                          <MapPinIcon className="w-3.5 h-3.5 text-arang/40" />
                                          <span>{match.court}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (!hasMatches) {
    return (
      <main className="flex flex-col items-center w-full min-h-screen px-6 py-12 bg-putih-kertas">
        <div className="max-w-3xl w-full flex flex-col gap-8">
          <div>
            <Link href={`/lomba/${slug}`} className="text-arang/60 text-sm font-medium hover:text-merah transition-colors">
              &larr; Kembali ke Detail Lomba
            </Link>
            <h1 className="font-anton text-4xl text-merah mt-4 tracking-tight">Bagan {competition.name}</h1>
          </div>
          <div className="text-center p-12 bg-surface rounded-xl border border-border">
            <h2 className="text-xl font-bold text-arang">Bagan belum tersedia</h2>
            <p className="text-arang/60 mt-2">Pendaftaran mungkin masih berlangsung atau bagan belum di-generate oleh admin.</p>
          </div>
        </div>
      </main>
    );
  }

  const matchesByRound = (isGroupKnockout || isRoundRobin ? knockoutMatches : competition.matches).reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof competition.matches>);

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <main className="flex flex-col items-center w-full min-h-screen px-6 py-12 bg-putih-kertas">
      <div className="max-w-4xl w-full flex flex-col gap-8">
        <div>
          <Link href={`/lomba/${slug}`} className="text-arang/60 text-sm font-medium hover:text-merah transition-colors">
            &larr; Kembali ke Detail Lomba
          </Link>
          <div className="flex items-center justify-between mt-4">
            <h1 className="font-anton text-4xl text-merah tracking-tight">Bagan {competition.name}</h1>
          </div>
        </div>

        {standings && (
          <div className="space-y-6">
            <h2 className="font-anton text-2xl text-arang tracking-tight">Klasemen Sementara</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(standings).map(([groupName, groupStandings]) => (
                <div key={groupName} className="border border-border rounded-lg overflow-hidden bg-surface">
                  <div className="bg-arang/5 px-4 py-2 border-b border-border font-bold text-sm text-arang">
                    {isGroupKnockout ? `Grup ${groupName}` : "Klasemen Liga"}
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
                          <tr key={row.team.id} className={`border-b border-border last:border-0 ${idx < 2 && isGroupKnockout ? "bg-emas/5" : ""}`}>
                            <td className="py-2 px-3 text-center font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-arang">
                              {row.team.name}
                              {idx < 2 && isGroupKnockout && (
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
            </div>
          </div>
        )}

        {/* Group matches list */}
        {(isGroupKnockout || isRoundRobin) && groupMatches.length > 0 && (
          <div className="space-y-6">
            <h2 className="font-anton text-2xl text-arang tracking-tight">Pertandingan Babak Grup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupMatches.map(match => (
                <Card key={match.id} className="border-border bg-surface overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col">
                      <div className="bg-arang/5 px-4 py-2 flex justify-between items-center border-b border-border">
                        <span className="text-xs font-jetbrains font-bold text-arang/60">
                          {match.label} • Ronde {match.round}
                        </span>
                        <Badge variant={match.status === "COMPLETED" ? "default" : match.status === "BYE" ? "secondary" : "outline"} className={match.status === "COMPLETED" ? "bg-merah hover:bg-merah-tua" : ""}>
                          {match.status}
                        </Badge>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        <div className={`flex justify-between items-center p-2 rounded ${match.winnerTeamId === match.teamAId ? 'bg-emas/20 border border-emas/50' : 'bg-transparent'}`}>
                          <span className={`font-medium ${match.teamA ? 'text-arang' : 'text-arang/40'}`}>
                            {match.teamA?.name || "TBD"}
                          </span>
                          <span className="font-jetbrains font-bold text-lg">
                            {match.scoreA !== null ? match.scoreA : '-'}
                          </span>
                        </div>
                        
                        <div className={`flex justify-between items-center p-2 rounded ${match.winnerTeamId === match.teamBId ? 'bg-emas/20 border border-emas/50' : 'bg-transparent'}`}>
                          <span className={`font-medium ${match.teamB ? 'text-arang' : 'text-arang/40'}`}>
                            {match.teamB?.name || "TBD"}
                          </span>
                          <span className="font-jetbrains font-bold text-lg">
                            {match.scoreB !== null ? match.scoreB : '-'}
                          </span>
                        </div>
                      </div>
                      
                      {(match.court || match.scheduledAt) && (
                        <div className="bg-arang/5 px-4 py-2 flex gap-4 border-t border-border text-xs text-arang/70">
                          {match.scheduledAt && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              <span>{match.scheduledAt.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                            </div>
                          )}
                          {match.court && (
                            <div className="flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3" />
                              <span>{match.court}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-12">
          {rounds.length > 0 && (isGroupKnockout ? hasKnockoutMatches : true) && (
            <h2 className="font-anton text-2xl text-arang tracking-tight">
              {isGroupKnockout ? "Bagan Babak Gugur" : "Bagan Pertandingan"}
            </h2>
          )}
          {rounds.map(round => {
            const matches = matchesByRound[round];
            const roundLabel = matches[0].label || `Round ${round}`;
            
            return (
              <div key={round} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="font-anton text-2xl text-arang tracking-tight">{roundLabel}</h2>
                  <div className="h-px bg-border flex-1"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map(match => (
                    <Card key={match.id} className="border-border bg-surface overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <div className="flex flex-col">
                          <div className="bg-arang/5 px-4 py-2 flex justify-between items-center border-b border-border">
                            <span className="text-xs font-jetbrains font-bold text-arang/60">
                              Match {match.position + 1}
                            </span>
                            <Badge variant={match.status === "COMPLETED" ? "default" : match.status === "BYE" ? "secondary" : "outline"} className={match.status === "COMPLETED" ? "bg-merah hover:bg-merah-tua" : ""}>
                              {match.status}
                            </Badge>
                          </div>
                          
                          <div className="p-4 space-y-3">
                            <div className={`flex justify-between items-center p-2 rounded ${match.winnerTeamId === match.teamAId ? 'bg-emas/20 border border-emas/50' : 'bg-transparent'}`}>
                              <span className={`font-medium ${match.teamA ? 'text-arang' : 'text-arang/40'}`}>
                                {match.teamA?.name || "TBD"}
                              </span>
                              <span className="font-jetbrains font-bold text-lg">
                                {match.scoreA !== null ? match.scoreA : '-'}
                              </span>
                            </div>
                            
                            <div className={`flex justify-between items-center p-2 rounded ${match.winnerTeamId === match.teamBId ? 'bg-emas/20 border border-emas/50' : 'bg-transparent'}`}>
                              <span className={`font-medium ${match.teamB ? 'text-arang' : 'text-arang/40'}`}>
                                {match.teamB?.name || "TBD"}
                              </span>
                              <span className="font-jetbrains font-bold text-lg">
                                {match.scoreB !== null ? match.scoreB : '-'}
                              </span>
                            </div>
                          </div>
                          
                          {(match.court || match.scheduledAt) && (
                            <div className="bg-arang/5 px-4 py-2 flex gap-4 border-t border-border text-xs text-arang/70">
                              {match.scheduledAt && (
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3" />
                                  <span>{match.scheduledAt.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                                </div>
                              )}
                              {match.court && (
                                <div className="flex items-center gap-1">
                                  <MapPinIcon className="w-3 h-3" />
                                  <span>{match.court}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
