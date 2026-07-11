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
import { getStandingsForCompetition } from "./actions";
import { AddParticipantModal } from "./add-participant-modal";
import { EditParticipantModal } from "./edit-participant-modal";
import { EditCompetitionModal } from "./edit-competition-modal";

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
          winnerTeam: true,
          nextMatch: true,
          matchTeams: {
            include: {
              team: true
            }
          },
          competition: {
            select: {
              bracketFormat: true
            }
          }
        }
      }
    }
  });

  if (!comp) return notFound();

  const isRegistration = comp.status === "REGISTRATION";
  const isOngoing = comp.status === "ONGOING" || comp.status === "DONE";
  const hasCompletedMatches = comp.matches.some(m => m.status === "COMPLETED");

  const isGroupKnockout = comp.bracketFormat === "GROUP_KNOCKOUT";
  const isRoundRobin = comp.bracketFormat === "ROUND_ROBIN";

  const groupMatches = comp.matches.filter(m => m.label && (m.label.startsWith("Grup") || m.label === "Round Robin"));
  const knockoutMatches = comp.matches.filter(m => !m.label || (!m.label.startsWith("Grup") && m.label !== "Round Robin"));

  const hasKnockoutMatches = knockoutMatches.length > 0;
  const allGroupMatchesCompleted = groupMatches.length > 0 && groupMatches.every(m => m.status === "COMPLETED");

  // Fetch standings if group/round-robin format and matches are generated
  const standings = (isGroupKnockout || isRoundRobin) && comp.matches.length > 0
    ? await getStandingsForCompetition(comp.id)
    : null;

  const existingParticipants = await prisma.participant.findMany({
    where: {
      registrations: {
        none: { competitionId: comp.id }
      }
    },
    orderBy: { name: 'asc' }
  });

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
          <EditCompetitionModal competition={comp} hasMatches={comp.matches.length > 0} />
          <RegistrationActions 
            competitionId={comp.id} 
            isRegistration={isRegistration} 
            hasMatches={comp.matches.length > 0} 
          />
          <BracketActions 
            competitionId={comp.id} 
            status={comp.status} 
            hasCompletedMatches={hasCompletedMatches} 
            bracketFormat={comp.bracketFormat}
            hasKnockoutMatches={hasKnockoutMatches}
            allGroupMatchesCompleted={allGroupMatchesCompleted}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-arang">Daftar Pendaftar ({comp.registrations.length})</h2>
          <AddParticipantModal competitionId={comp.id} existingParticipants={existingParticipants} />
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
                    <div className="flex items-center gap-1">
                      <EditParticipantModal participant={reg.participant} />
                      <DeleteButton
                        id={reg.id}
                        action={deleteRegistrationAction}
                        confirmMessage={`Apakah Anda yakin ingin menghapus pendaftaran "${reg.participant.name}" dari perlombaan "${comp.name}"? Jika tim/bagan sudah terbentuk, bagan/tim yang bersangkutan akan terpengaruh.`}
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      />
                    </div>
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
                  {isGroupKnockout && <TableHead>Grup</TableHead>}
                  <TableHead>Anggota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comp.teams.map(team => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    {isGroupKnockout && (
                      <TableCell>
                        <Badge variant="secondary">Grup {team.group || "-"}</Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      {team.members.map(m => m.registration.participant.name).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {standings && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-arang">Klasemen Babak Grup</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(standings).map(([groupName, groupStandings]) => (
                  <div key={groupName} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-arang/5 border-b border-gray-200">
                      <h3 className="font-bold text-arang">
                        {isGroupKnockout ? `Grup ${groupName}` : "Round Robin"}
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px] text-center">Pos</TableHead>
                          <TableHead>Tim</TableHead>
                          <TableHead className="text-center">P</TableHead>
                          <TableHead className="text-center">M</TableHead>
                          <TableHead className="text-center">K</TableHead>
                          <TableHead className="text-center">+/-</TableHead>
                          <TableHead className="text-center">PTS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupStandings.map((row, idx) => (
                          <TableRow key={row.team.id} className={idx < 2 && isGroupKnockout ? "bg-emas/5" : ""}>
                            <TableCell className="text-center font-bold">{idx + 1}</TableCell>
                            <TableCell className="font-medium">
                              {row.team.name}
                              {idx < 2 && isGroupKnockout && (
                                <Badge variant="outline" className="ml-2 text-emas border-emas bg-emas/10 text-[10px] px-1 py-0 font-jetbrains font-bold">Lolos</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-jetbrains">{row.played}</TableCell>
                            <TableCell className="text-center font-jetbrains text-green-600 font-semibold">{row.won}</TableCell>
                            <TableCell className="text-center font-jetbrains text-red-600 font-semibold">{row.lost}</TableCell>
                            <TableCell className="text-center font-jetbrains font-bold">
                              {row.scoreFor - row.scoreAgainst >= 0 ? `+${row.scoreFor - row.scoreAgainst}` : row.scoreFor - row.scoreAgainst}
                            </TableCell>
                            <TableCell className="text-center font-jetbrains font-bold text-arang">{row.points}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group matches list */}
          {(isGroupKnockout || isRoundRobin) && groupMatches.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-arang">Daftar Pertandingan Babak Grup</h2>
              </div>
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Grup</TableHead>
                    <TableHead>Ronde</TableHead>
                    <TableHead>Tim A</TableHead>
                    <TableHead>Tim B</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {groupMatches.map(match => {
                     const matchIsCustom = match.competition?.bracketFormat === "RACE_HEATS" || match.competition?.bracketFormat === "LEADERBOARD";
                     return (
                       <TableRow key={match.id}>
                         <TableCell><Badge variant="secondary">{match.label}</Badge></TableCell>
                         <TableCell>Ronde {match.round}</TableCell>
                         {matchIsCustom ? (
                           <TableCell colSpan={2}>
                             <div className="font-semibold text-arang">Peserta:</div>
                             <div className="text-sm text-gray-600">
                               {match.matchTeams?.map(mt => mt.team.name).join(", ") || "Belum ada tim"}
                             </div>
                           </TableCell>
                         ) : (
                           <>
                             <TableCell>{match.teamA?.name || "-"}</TableCell>
                             <TableCell>{match.teamB?.name || "-"}</TableCell>
                           </>
                         )}
                         <TableCell>
                           <Badge variant={match.status === "BYE" ? "secondary" : "default"}>
                             {match.status}
                           </Badge>
                           {matchIsCustom ? (
                             match.status === "COMPLETED" && (
                               <div className="mt-1 text-xs space-y-0.5">
                                 {match.matchTeams
                                   ?.filter((mt) => mt.rank !== null)
                                   .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
                                   .map((mt) => (
                                     <div key={mt.id} className="text-green-600 font-semibold">
                                       Juara {mt.rank}: {mt.team.name}
                                     </div>
                                   ))}
                               </div>
                             )
                           ) : (
                             match.winnerTeam && (
                               <span className="ml-2 text-sm text-green-600 font-semibold">
                                 Pemenang: {match.winnerTeam.name}
                               </span>
                             )
                           )}
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
                     );
                   })}
                 </TableBody>
              </Table>
            </div>
          )}

          {/* Knockout matches list / Standard Matches List */}
          {(!isGroupKnockout && !isRoundRobin) ? (
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
                   {comp.matches.map(match => {
                     const matchIsCustom = match.competition?.bracketFormat === "RACE_HEATS" || match.competition?.bracketFormat === "LEADERBOARD";
                     return (
                       <TableRow key={match.id}>
                         <TableCell>{match.label || `Ronde ${match.round}`}</TableCell>
                         <TableCell>Match {match.position + 1}</TableCell>
                         {matchIsCustom ? (
                           <TableCell colSpan={2}>
                             <div className="font-semibold text-arang">Peserta:</div>
                             <div className="text-sm text-gray-600">
                               {match.matchTeams?.map(mt => mt.team.name).join(", ") || "Belum ada tim"}
                             </div>
                           </TableCell>
                         ) : (
                           <>
                             <TableCell>{match.teamA?.name || "-"}</TableCell>
                             <TableCell>{match.teamB?.name || "-"}</TableCell>
                           </>
                         )}
                         <TableCell>
                           <Badge variant={match.status === "BYE" ? "secondary" : "default"}>
                             {match.status}
                           </Badge>
                           {matchIsCustom ? (
                             match.status === "COMPLETED" && (
                               <div className="mt-1 text-xs space-y-0.5">
                                 {match.matchTeams
                                   ?.filter((mt) => mt.rank !== null)
                                   .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
                                   .map((mt) => (
                                     <div key={mt.id} className="text-green-600 font-semibold">
                                       Juara {mt.rank}: {mt.team.name}
                                     </div>
                                   ))}
                               </div>
                             )
                           ) : (
                             match.winnerTeam && (
                               <span className="ml-2 text-sm text-green-600 font-semibold">
                                 Pemenang: {match.winnerTeam.name}
                               </span>
                             )
                           )}
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
                     );
                   })}
                 </TableBody>
               </Table>
             </div>
           ) : (
             isGroupKnockout && hasKnockoutMatches && (
               <div className="bg-white rounded-lg shadow border border-gray-200">
                 <div className="p-4 border-b border-gray-200">
                   <h2 className="text-xl font-semibold text-arang">Daftar Pertandingan Babak Gugur</h2>
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
                     {knockoutMatches.map(match => {
                       const matchIsCustom = match.competition?.bracketFormat === "RACE_HEATS" || match.competition?.bracketFormat === "LEADERBOARD";
                       return (
                         <TableRow key={match.id}>
                           <TableCell>{match.label || `Ronde ${match.round}`}</TableCell>
                           <TableCell>Match {match.position + 1}</TableCell>
                           {matchIsCustom ? (
                             <TableCell colSpan={2}>
                               <div className="font-semibold text-arang">Peserta:</div>
                               <div className="text-sm text-gray-600">
                                 {match.matchTeams?.map(mt => mt.team.name).join(", ") || "Belum ada tim"}
                               </div>
                             </TableCell>
                           ) : (
                             <>
                               <TableCell>{match.teamA?.name || "-"}</TableCell>
                               <TableCell>{match.teamB?.name || "-"}</TableCell>
                             </>
                           )}
                           <TableCell>
                             <Badge variant={match.status === "BYE" ? "secondary" : "default"}>
                               {match.status}
                             </Badge>
                             {matchIsCustom ? (
                               match.status === "COMPLETED" && (
                                 <div className="mt-1 text-xs space-y-0.5">
                                   {match.matchTeams
                                     ?.filter((mt) => mt.rank !== null)
                                     .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
                                     .map((mt) => (
                                       <div key={mt.id} className="text-green-600 font-semibold">
                                         Juara {mt.rank}: {mt.team.name}
                                       </div>
                                     ))}
                                 </div>
                               )
                             ) : (
                               match.winnerTeam && (
                                 <span className="ml-2 text-sm text-green-600 font-semibold">
                                   Pemenang: {match.winnerTeam.name}
                                 </span>
                               )
                             )}
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
                       );
                     })}
                   </TableBody>
                 </Table>
               </div>
             )
           )}
        </div>
      )}
    </div>
  );
}
