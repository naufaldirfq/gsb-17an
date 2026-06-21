import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/auto-print";

export const dynamic = "force-dynamic";

export default async function CompetitionPrintPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comp = await prisma.competition.findUnique({
    where: { slug },
    include: {
      registrations: { include: { participant: true }, orderBy: { createdAt: "asc" } },
      matches: { include: { teamA: true, teamB: true, winnerTeam: true }, orderBy: [{ round: "asc" }, { position: "asc" }] },
    }
  });

  if (!comp) return notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen">
      <AutoPrint />
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight uppercase">LAPORAN DETAIL PERLOMBAAN</h1>
        <p className="text-lg font-semibold text-red-600 mt-1">{comp.name}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold border-b pb-1 mb-2">Informasi Umum</h2>
        <p className="text-sm"><strong>Status:</strong> {comp.status}</p>
        <p className="text-sm"><strong>Tipe Pasangan:</strong> {comp.pairingMode}</p>
        <p className="text-sm"><strong>Ukuran Tim:</strong> {comp.teamSize} orang</p>
        {comp.description && <p className="text-sm mt-2"><strong>Deskripsi:</strong> {comp.description}</p>}
      </div>

      <div className="mb-6 print-page-break">
        <h2 className="text-lg font-bold border-b pb-1 mb-2">Daftar Pendaftar ({comp.registrations.length})</h2>
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-2">No</th>
              <th className="border p-2">Nama</th>
              <th className="border p-2">Blok/No. Rumah</th>
              <th className="border p-2">No. HP / WA</th>
            </tr>
          </thead>
          <tbody>
            {comp.registrations.map((reg, idx) => (
              <tr key={reg.id}>
                <td className="border p-2">{idx + 1}</td>
                <td className="border p-2 font-medium">{reg.participant.name}</td>
                <td className="border p-2">{reg.participant.houseBlock} - {reg.participant.houseNumber}</td>
                <td className="border p-2">{reg.participant.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-bold border-b pb-1 mb-2">Jadwal & Hasil Pertandingan</h2>
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-2">Ronde</th>
              <th className="border p-2">Pertandingan</th>
              <th className="border p-2">Jadwal & Court</th>
              <th className="border p-2">Hasil / Skor</th>
            </tr>
          </thead>
          <tbody>
            {comp.matches.map((m) => (
              <tr key={m.id}>
                <td className="border p-2">{m.label || `Ronde ${m.round}`}</td>
                <td className="border p-2">
                  {m.teamA?.name || "?"} vs {m.teamB?.name || "?"}
                </td>
                <td className="border p-2">
                  {m.court ? `${m.court}` : ""}
                  {m.scheduledAt ? ` (${new Date(m.scheduledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })})` : "Belum dijadwalkan"}
                </td>
                <td className="border p-2">
                  {m.status === "COMPLETED" ? (
                    <span className="font-semibold text-green-700">
                      {m.scoreA} - {m.scoreB} (Pemenang: {m.winnerTeam?.name})
                    </span>
                  ) : m.status === "BYE" ? (
                    <span className="text-gray-500 italic">BYE</span>
                  ) : (
                    <span className="text-gray-400 italic">Belum dimainkan</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
