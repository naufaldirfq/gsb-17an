import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RegistrationActions } from "./registration-actions";
import { BracketActions } from "./bracket-actions";
import { MatchScoreModal } from "./match-score-modal";
import { MatchScheduleModal } from "./match-schedule-modal";
import { DeleteButton } from "@/app/admin/(guarded)/delete-button";
import { deleteRegistrationAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function CompetitionManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const comp = await prisma.competition.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      registrations: {
        include: { participant: true },
        orderBy: { createdAt: 'asc' }
      },
      teams: {
        include: { members: { include: { registration: { include: { participant: true } } } } },
        orderBy: { name: 'asc' }
      },
      matches: {
        orderBy: [
          { round: 'asc' },
          { position: 'asc' }
        ],
        include: {
          teamA: true,
          teamB: true,
          winnerTeam: true
        }
      }
    }
  });

  if (!comp) return notFound();

  const isRegistration = comp.status === "REGISTRATION";
  const isOngoing = comp.status === "ONGOING" || comp.status === "DONE";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-arang">{comp.name}</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            Status: <Badge variant={isRegistration ? "default" : "secondary"}>{comp.status}</Badge>
          </p>
        </div>
        <div className="flex gap-4">
          <RegistrationActions competitionId={comp.id} isRegistration={isRegistration} />
          <BracketActions competitionId={comp.id} status={comp.status} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-arang">Daftar Pendaftar ({comp.registrations.length})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>No. HP</TableHead>
              <TableHead>Blok/Rumah</TableHead>
              <TableHead>Tanggal Daftar</TableHead>
              <TableHead className="w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comp.registrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-500">Belum ada peserta yang mendaftar.</TableCell>
              </TableRow>
            ) : (
              comp.registrations.map(reg => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.participant.name}</TableCell>
                  <TableCell>{reg.participant.phone}</TableCell>
                  <TableCell>{reg.participant.houseBlock} - {reg.participant.houseNumber}</TableCell>
                  <TableCell>{reg.createdAt.toLocaleDateString("id-ID")}</TableCell>
                  <TableCell>
                    <DeleteButton
                      id={reg.id}
                      action={deleteRegistrationAction}
                      confirmMessage={`Apakah Anda yakin ingin menghapus pendaftaran "${reg.participant.name}" dari perlombaan "${comp.name}"? Jika tim/bagan sudah terbentuk, bagan/tim yang bersangkutan akan terpengaruh.`}
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(isOngoing || comp.matches.length > 0 || comp.teams.length > 0) && (
        <div className="space-y-6 mt-8">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-arang">Daftar Tim ({comp.teams.length})</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Tim</TableHead>
                  <TableHead>Anggota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comp.teams.map(team => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      {team.members.map(m => m.registration.participant.name).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-arang">Daftar Pertandingan (Bagan)</h2>
            </div>
            <Table>
               <TableHeader>
                <TableRow>
                  <TableHead>Ronde</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Tim A</TableHead>
                  <TableHead>Tim B</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jadwal</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comp.matches.map(match => (
                  <TableRow key={match.id}>
                    <TableCell>{match.label || `Ronde ${match.round}`}</TableCell>
                    <TableCell>Match {match.position + 1}</TableCell>
                    <TableCell>{match.teamA?.name || "-"}</TableCell>
                    <TableCell>{match.teamB?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={match.status === "BYE" ? "secondary" : "default"}>
                        {match.status}
                      </Badge>
                      {match.winnerTeam && <span className="ml-2 text-sm text-green-600">Pemenang: {match.winnerTeam.name}</span>}
                    </TableCell>
                    <TableCell>
                      {match.court || match.scheduledAt ? (
                        <div className="text-xs">
                          <p className="font-semibold text-arang">{match.court || "Tanpa Lapangan"}</p>
                          <p className="text-gray-500">
                            {match.scheduledAt ? new Date(match.scheduledAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Belum dijadwalkan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {match.status !== "BYE" && (
                        <div className="flex gap-2">
                          <MatchScheduleModal match={match} />
                          <MatchScoreModal match={match} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
