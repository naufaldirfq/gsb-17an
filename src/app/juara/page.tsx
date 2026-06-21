import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";

export const metadata = {
  title: "Hall of Fame - Gema Semarak Bangsa",
  description: "Daftar juara lomba Gema Semarak Bangsa",
};

export const dynamic = "force-dynamic";

export default async function JuaraPage() {
  const competitions = await prisma.competition.findMany({
    where: {
      status: "DONE",
    },
    include: {
      matches: {
        where: {
          nextMatchId: null,
          status: "COMPLETED",
        },
        include: {
          winnerTeam: {
            include: {
              members: {
                include: {
                  registration: {
                    include: {
                      participant: true,
                    },
                  },
                },
              },
            },
          },
          teamA: {
            include: {
              members: {
                include: {
                  registration: {
                    include: {
                      participant: true,
                    },
                  },
                },
              },
            },
          },
          teamB: {
            include: {
              members: {
                include: {
                  registration: {
                    include: {
                      participant: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="flex flex-col items-center w-full min-h-screen px-6 py-12 bg-putih-kertas">
      <div className="max-w-4xl w-full flex flex-col gap-10">
        <div className="text-center space-y-4">
          <h1 className="font-anton text-5xl md:text-6xl text-arang tracking-wide uppercase drop-shadow-sm">
            Hall <span className="text-emas">of</span> Fame
          </h1>
          <p className="text-arang/80 max-w-xl mx-auto font-medium">
            Penghargaan tertinggi bagi para pemenang yang telah berjuang dan menunjukkan sportivitas terbaik di Gema Semarak Bangsa.
          </p>
        </div>

        {competitions.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-border rounded-xl">
            <Trophy className="w-16 h-16 text-border mx-auto mb-4" />
            <p className="text-arang/60 font-medium text-lg">Belum ada lomba yang selesai.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {competitions.map((comp) => {
              // Find the final match
              const finalMatch = comp.matches[0];
              if (!finalMatch || !finalMatch.winnerTeam) return null;

              const isTeamAWinner = finalMatch.winnerTeamId === finalMatch.teamAId;
              const champion = finalMatch.winnerTeam;
              const runnerUp = isTeamAWinner ? finalMatch.teamB : finalMatch.teamA;

              return (
                <Card key={comp.id} className="border-emas/20 overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emas/5 to-transparent pointer-events-none" />
                  <CardHeader className="bg-emas/10 border-b border-emas/20 pb-4 relative">
                    <CardTitle className="font-anton text-2xl text-arang tracking-wide flex items-center justify-between">
                      {comp.name}
                      <Trophy className="w-6 h-6 text-emas" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 relative z-10 flex flex-col gap-6">
                    {/* Champion */}
                    <div className="flex flex-col items-center text-center p-4 bg-emas/10 rounded-xl border border-emas/30 shadow-[0_0_15px_rgba(201,150,46,0.15)]">
                      <div className="bg-emas text-arang w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-md">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <h3 className="font-anton text-xl text-arang tracking-wide mb-1 uppercase">Juara 1</h3>
                      <p className="font-bold text-lg mb-2">{champion.name}</p>
                      <div className="flex flex-wrap justify-center gap-2 text-sm text-arang/80">
                        {champion.members.map((member) => (
                          <span key={member.id} className="bg-surface px-2 py-1 rounded shadow-sm border border-border">
                            {member.registration.participant.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Runner Up */}
                    {runnerUp && runnerUp.members.length > 0 && (
                      <div className="flex flex-col items-center text-center p-4 bg-surface rounded-xl border border-border/50">
                        <div className="bg-arang/10 text-arang/60 w-8 h-8 rounded-full flex items-center justify-center mb-2">
                          <Medal className="w-4 h-4" />
                        </div>
                        <h3 className="font-anton text-sm text-arang/60 tracking-wide mb-1">Juara 2</h3>
                        <p className="font-semibold text-arang">{runnerUp.name}</p>
                        <div className="flex flex-wrap justify-center gap-1.5 text-xs text-arang/60 mt-1">
                          {runnerUp.members.map((member) => (
                            <span key={member.id}>
                              {member.registration.participant.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        <div className="text-center mt-8">
          <Link href="/" className="inline-block px-6 py-3 bg-surface border border-border text-arang font-medium rounded-lg hover:bg-arang/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Kembali ke Beranda">
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
