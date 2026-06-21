import prisma from "@/lib/prisma";
import { AutoPrint } from "@/components/auto-print";

export const dynamic = "force-dynamic";

export default async function OverallReportPrintPage() {
  const competitions = await prisma.competition.findMany({
    include: {
      registrations: { include: { participant: true } },
      teams: true,
    }
  });

  const participants = await prisma.participant.findMany();

  // Group wins by houseBlock to build a leaderboard
  const blockScores: Record<string, { gold: number }> = {};
  const champions: Array<{ comp: string; winner: string; block: string }> = [];

  const matches = await prisma.match.findMany({
    where: { label: "Final", status: "COMPLETED" },
    include: { 
      winnerTeam: { 
        include: { 
          members: { 
            include: { 
              registration: { 
                include: { 
                  participant: true 
                } 
              } 
            } 
          } 
        } 
      }, 
      competition: true 
    }
  });

  for (const m of matches) {
    if (m.winnerTeam) {
      const names = m.winnerTeam.members.map(mb => mb.registration.participant.name).join(" & ");
      const blocks = m.winnerTeam.members.map(mb => mb.registration.participant.houseBlock).join("/");
      champions.push({ comp: m.competition.name, winner: names, block: blocks });
      
      m.winnerTeam.members.forEach(mb => {
        const b = mb.registration.participant.houseBlock;
        if (!blockScores[b]) blockScores[b] = { gold: 0 };
        blockScores[b].gold += 1;
      });
    }
  }

  const leaderboard = Object.entries(blockScores)
    .map(([block, stats]) => ({ block, ...stats }))
    .sort((a, b) => b.gold - a.gold);

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen">
      <AutoPrint />
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">LAPORAN KEGIATAN LOMBA 17-AN GSB</h1>
        <p className="text-sm font-medium uppercase mt-1">Green Serpong Bintaro — HUT RI ke-81</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border p-4 text-center">
          <p className="text-sm uppercase text-gray-600">Total Lomba</p>
          <p className="text-2xl font-bold">{competitions.length}</p>
        </div>
        <div className="border p-4 text-center">
          <p className="text-sm uppercase text-gray-600">Total Peserta Terdaftar</p>
          <p className="text-2xl font-bold">{participants.length}</p>
        </div>
        <div className="border p-4 text-center">
          <p className="text-sm uppercase text-gray-600">Lomba Selesai</p>
          <p className="text-2xl font-bold">{matches.length}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold border-b pb-2 mb-3">Klasemen Perolehan Medali (Blok)</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-2">Peringkat</th>
              <th className="border p-2">Blok Rumah</th>
              <th className="border p-2">Medali Emas</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((item, idx) => (
              <tr key={item.block}>
                <td className="border p-2">{idx + 1}</td>
                <td className="border p-2">Blok {item.block}</td>
                <td className="border p-2">{item.gold} 🥇</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={3} className="border p-4 text-center text-gray-500">Belum ada medali yang diperoleh.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-bold border-b pb-2 mb-3">Daftar Pemenang Lomba</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-2">Perlombaan</th>
              <th className="border p-2">Juara 1 (Pemenang)</th>
              <th className="border p-2">Blok Rumah</th>
            </tr>
          </thead>
          <tbody>
            {champions.map((item) => (
              <tr key={item.comp}>
                <td className="border p-2 font-medium">{item.comp}</td>
                <td className="border p-2">{item.winner}</td>
                <td className="border p-2">{item.block}</td>
              </tr>
            ))}
            {champions.length === 0 && (
              <tr>
                <td colSpan={3} className="border p-4 text-center text-gray-500">Pertandingan final belum selesai.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
