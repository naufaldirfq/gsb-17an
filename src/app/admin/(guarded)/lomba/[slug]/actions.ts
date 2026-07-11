"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/constants";
import { MatchStatus, Slot } from "@prisma/client";

async function verifyAuth() {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    throw new Error("Unauthorized");
  }
}

export async function closeRegistrationAction(competitionId: string) {
  try {
    await verifyAuth();
    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: "LOCKED", registrationOpen: false },
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/lomba/[slug]`, "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to close registration:", error);
    return { error: "Failed to close registration." };
  }
}

export async function openRegistrationAction(competitionId: string) {
  try {
    await verifyAuth();
    
    const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
    if (!comp) return { error: "Competition not found" };

    await prisma.$transaction(async (tx) => {
      // Find all dummy participants registered to this competition
      const dummyRegistrations = await tx.registration.findMany({
        where: {
          competitionId,
          participant: {
            phone: {
              startsWith: "08-PANITIA-",
            },
          },
        },
        select: {
          id: true,
          participantId: true,
        },
      });

      const dummyParticipantIds = dummyRegistrations.map((r) => r.participantId);
      const dummyRegistrationIds = dummyRegistrations.map((r) => r.id);

      // Delete matches
      await tx.match.deleteMany({ where: { competitionId } });

      // Delete team members
      await tx.teamMember.deleteMany({ where: { team: { competitionId } } });

      // Delete teams
      await tx.team.deleteMany({ where: { competitionId } });

      if (dummyRegistrationIds.length > 0) {
        // Delete registration records for dummies
        await tx.registration.deleteMany({
          where: {
            id: { in: dummyRegistrationIds },
          },
        });

        // Delete dummy participants
        await tx.participant.deleteMany({
          where: {
            id: { in: dummyParticipantIds },
          },
        });
      }

      // Reopen registration
      await tx.competition.update({
        where: { id: competitionId },
        data: { status: "REGISTRATION", registrationOpen: true },
      });
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/lomba/[slug]`, "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to open registration:", error);
    return { error: "Failed to open registration." };
  }
}

export async function generateBracketAction(
  competitionId: string,
  leftoverResolution?: {
    action: "MERGE" | "ADD_PANITIA";
  }
) {
  try {
    await verifyAuth();
    
    // Fetch competition and registrations with participant details
    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        registrations: {
          include: {
            participant: true,
          },
        },
      }
    });

    if (!comp) return { error: "Competition not found" };
    if (comp.status !== "LOCKED" && comp.status !== "ONGOING" && comp.status !== "DONE") {
      return { error: "Pendaftaran harus ditutup terlebih dahulu sebelum membuat bagan." };
    }

    // Check if any match is already completed
    const completedMatchesCount = await prisma.match.count({
      where: {
        competitionId,
        status: "COMPLETED",
      },
    });
    if (completedMatchesCount > 0) {
      return { error: "Bagan tidak dapat diubah/diacak karena sudah ada pertandingan yang selesai." };
    }

    // Check for leftovers
    const regs = [...comp.registrations];
    const teamSize = comp.teamSize;
    const remainder = regs.length % teamSize;

    if (remainder !== 0 && !leftoverResolution) {
      const leftovers = regs.slice(regs.length - remainder).map(r => r.participant.name);
      return {
        error: "LEFTOVERS_DETECTED",
        leftovers
      };
    }

    // 1. Shuffle participants
    for (let i = regs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regs[i], regs[j]] = [regs[j], regs[i]];
    }

    // Use Prisma transaction to insert all
    const result = await prisma.$transaction(async (tx) => {
      // If resolving via ADD_PANITIA, create dummy registrations first
      if (remainder !== 0 && leftoverResolution?.action === "ADD_PANITIA") {
        const needed = teamSize - remainder;
        for (let i = 0; i < needed; i++) {
          const dummyPhone = `08-PANITIA-${crypto.randomUUID().slice(0, 8)}`;
          const dummyName = `Panitia Penyelamat ${i + 1}`;
          
          const part = await tx.participant.create({
            data: {
              name: dummyName,
              phone: dummyPhone,
              houseBlock: "P",
              houseNumber: "0",
            }
          });
          
          const reg = await tx.registration.create({
            data: {
              competitionId,
              participantId: part.id,
            },
            include: {
              participant: true,
            }
          });
          
          regs.push(reg);
        }
      }

      // Group into teams
      const numTeamsToForm = Math.floor(regs.length / teamSize);
      if (numTeamsToForm === 0) {
        throw new Error("Not enough participants to form even one team.");
      }

      // Prepare teams and team members
      type TeamMemberInput = { id: string; teamId: string; registrationId: string; name: string };
      type TeamInput = { id: string; competitionId: string; name: string; members: TeamMemberInput[]; group?: string | null };
      const newTeams: TeamInput[] = [];
      let regIndex = 0;
      
      for (let i = 0; i < numTeamsToForm; i++) {
        const teamId = crypto.randomUUID();
        const members = [];
        const memberNames: string[] = [];

        for (let j = 0; j < teamSize; j++) {
          const reg = regs[regIndex];
          const part = reg.participant;
          const houseInfo = part.houseBlock && part.houseNumber
            ? `${part.houseBlock}-${part.houseNumber}`
            : (part.houseBlock || part.houseNumber || "");

          const formattedName = houseInfo
            ? `${part.name} ${houseInfo}`
            : part.name;

          members.push({
            id: crypto.randomUUID(),
            teamId: teamId,
            registrationId: reg.id,
            name: formattedName
          });

          memberNames.push(formattedName);
          regIndex++;
        }
        
        const teamName = memberNames.join(" X ");
        
        newTeams.push({
          id: teamId,
          competitionId: comp.id,
          name: teamName,
          members
        });
      }

      // If resolving via MERGE, distribute remaining leftovers into formed teams
      if (remainder !== 0 && leftoverResolution?.action === "MERGE") {
        for (let i = regIndex; i < regs.length; i++) {
          const reg = regs[i];
          const part = reg.participant;
          const houseInfo = part.houseBlock && part.houseNumber
            ? `${part.houseBlock}-${part.houseNumber}`
            : (part.houseBlock || part.houseNumber || "");

          const formattedName = houseInfo
            ? `${part.name} ${houseInfo}`
            : part.name;

          // Pick a random team to merge into
          const randomTeamIndex = Math.floor(Math.random() * numTeamsToForm);
          const targetTeam = newTeams[randomTeamIndex];
          
          targetTeam.members.push({
            id: crypto.randomUUID(),
            teamId: targetTeam.id,
            registrationId: reg.id,
            name: formattedName
          });
          
          targetTeam.name = `${targetTeam.name} X ${formattedName}`;
        }
      }

      // Determine format
      const isGroupKnockout = comp.bracketFormat === "GROUP_KNOCKOUT";
      const isRoundRobin = comp.bracketFormat === "ROUND_ROBIN";

      let numGroups = 1;
      if (isGroupKnockout) {
        if (numTeamsToForm >= 8) {
          numGroups = 4;
        } else if (numTeamsToForm >= 4) {
          numGroups = 2;
        } else {
          numGroups = 1;
        }
      }

      const groupNames = ["A", "B", "C", "D"].slice(0, numGroups);

      // Assign groups
      newTeams.forEach((t, idx) => {
        if (isGroupKnockout) {
          t.group = groupNames[idx % numGroups];
        } else if (isRoundRobin) {
          t.group = "A";
        } else {
          t.group = null;
        }
      });

      // Clear existing teams and matches just in case
      await tx.match.deleteMany({ where: { competitionId } });
      await tx.teamMember.deleteMany({ where: { team: { competitionId } } });
      await tx.team.deleteMany({ where: { competitionId } });

      // Insert Teams
      for (const t of newTeams) {
        await tx.team.create({
          data: {
            id: t.id,
            competitionId: t.competitionId,
            name: t.name,
            group: t.group,
            members: {
              create: t.members.map((m) => ({
                id: m.id,
                registrationId: m.registrationId
              }))
            }
          }
        });
      }

      if (isRoundRobin || isGroupKnockout) {
        // Generate Round Robin matches for each group
        const allGroupMatches: any[] = [];
        for (const groupName of groupNames) {
          const groupTeams = newTeams.filter(t => t.group === groupName);
          const n = groupTeams.length;
          if (n === 0) continue;

          const dummy = { id: "BYE" };
          const isOdd = n % 2 !== 0;
          const activeTeams = isOdd ? [...groupTeams, dummy] : [...groupTeams];
          const numActive = activeTeams.length;
          const numRounds = numActive - 1;
          const matchesPerRound = numActive / 2;

          let matchIndex = 0;
          for (let r = 1; r <= numRounds; r++) {
            for (let i = 0; i < matchesPerRound; i++) {
              const home = activeTeams[i];
              const away = activeTeams[numActive - 1 - i];

              if (home.id !== "BYE" && away.id !== "BYE") {
                allGroupMatches.push({
                  id: crypto.randomUUID(),
                  competitionId: comp.id,
                  round: r,
                  position: matchIndex++,
                  label: isGroupKnockout ? `Grup ${groupName}` : "Round Robin",
                  teamAId: home.id,
                  teamBId: away.id,
                  status: "READY",
                  winnerTeamId: null,
                  nextMatchId: null,
                  nextSlot: null,
                });
              }
            }

            // Rotate
            const last = activeTeams.pop()!;
            activeTeams.splice(1, 0, last);
          }
        }

        await tx.match.createMany({
          data: allGroupMatches
        });

      } else {
        // Single Elimination (original logic)
        const totalRounds = Math.max(1, Math.ceil(Math.log2(numTeamsToForm)));
        const P = Math.pow(2, totalRounds);

        type MatchInput = {
          id: string;
          competitionId: string;
          round: number;
          position: number;
          label: string | null;
          teamAId: string | null;
          teamBId: string | null;
          status: MatchStatus;
          winnerTeamId: string | null;
          nextMatchId: string | null;
          nextSlot: Slot | null;
        };

        const matches: MatchInput[] = [];
        for (let r = 1; r <= totalRounds; r++) {
          const numMatches = Math.pow(2, totalRounds - r);
          for (let p = 0; p < numMatches; p++) {
            let label = null;
            if (r === totalRounds) label = "Final";
            else if (r === totalRounds - 1) label = "Semifinal";
            else if (r === totalRounds - 2) label = "Quarterfinal";

            matches.push({
              id: crypto.randomUUID(),
              competitionId: comp.id,
              round: r,
              position: p,
              label,
              teamAId: null,
              teamBId: null,
              status: "PENDING",
              winnerTeamId: null,
              nextMatchId: null,
              nextSlot: null,
            });
          }
        }

        const getMatch = (r: number, p: number) => matches.find(m => m.round === r && m.position === p);

        for (let r = 1; r < totalRounds; r++) {
          const numMatches = Math.pow(2, totalRounds - r);
          for (let p = 0; p < numMatches; p++) {
            const current = getMatch(r, p);
            const nextMatch = getMatch(r + 1, Math.floor(p / 2));
            if (current && nextMatch) {
              current.nextMatchId = nextMatch.id;
              current.nextSlot = p % 2 === 0 ? "A" : "B";
            }
          }
        }

        const round1Matches = matches.filter(m => m.round === 1);
        for (let p = 0; p < round1Matches.length; p++) {
          const match = round1Matches[p];
          const teamAIndex = p;
          const teamBIndex = p + P / 2;

          const teamA = newTeams[teamAIndex];
          const teamB = newTeams[teamBIndex];

          if (teamA) match.teamAId = teamA.id;
          if (teamB) match.teamBId = teamB.id;

          if (match.teamAId && !match.teamBId) {
            match.status = "BYE";
            match.winnerTeamId = match.teamAId;
            
            if (match.nextMatchId) {
              const nextMatch = matches.find(m => m.id === match.nextMatchId);
              if (nextMatch) {
                if (match.nextSlot === "A") nextMatch.teamAId = match.winnerTeamId;
                else if (match.nextSlot === "B") nextMatch.teamBId = match.winnerTeamId;
              }
            }
          } else if (!match.teamAId && !match.teamBId) {
            match.status = "BYE";
          }
        }

        await tx.match.createMany({
          data: matches.slice().reverse().map(m => ({
            id: m.id,
            competitionId: m.competitionId,
            round: m.round,
            position: m.position,
            label: m.label,
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            status: m.status,
            winnerTeamId: m.winnerTeamId,
            nextMatchId: m.nextMatchId,
            nextSlot: m.nextSlot,
          }))
        });
      }

      await tx.competition.update({
        where: { id: comp.id },
        data: { status: "ONGOING" }
      });
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/lomba/[slug]`, "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to generate bracket:", error);
    return { error: "Failed to generate bracket." };
  }
}

export async function submitScoreAction(matchId: string, payload: { scoreA: number; scoreB: number; winnerTeamId: string }) {
  try {
    await verifyAuth();

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { competition: true }
    });

    if (!match) return { error: "Match not found" };

    if (payload.winnerTeamId !== match.teamAId && payload.winnerTeamId !== match.teamBId) {
      return { error: "Invalid winner team ID" };
    }

    await prisma.$transaction(async (tx) => {
      if (match.nextMatchId) {
        const nextMatch = await tx.match.findUnique({ where: { id: match.nextMatchId } });
        if (nextMatch?.status === "COMPLETED") {
          throw new Error("Cannot overwrite a completed next match.");
        }
      }

      // 1. Update the current match
      await tx.match.update({
        where: { id: matchId },
        data: {
          scoreA: payload.scoreA,
          scoreB: payload.scoreB,
          winnerTeamId: payload.winnerTeamId,
          status: "COMPLETED"
        }
      });

      // 2. Advance winner to the next match if any
      if (match.nextMatchId && payload.winnerTeamId) {
        const updateData = match.nextSlot === "A" 
          ? { teamAId: payload.winnerTeamId } 
          : { teamBId: payload.winnerTeamId };
          
        await tx.match.update({
          where: { id: match.nextMatchId },
          data: updateData
        });
      } else if (!match.nextMatchId) {
        // This is the final match, we can mark competition as DONE
        await tx.competition.update({
          where: { id: match.competitionId },
          data: { status: "DONE" }
        });
      }
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/lomba/[slug]`, "page");
    revalidatePath(`/lomba/[slug]/bagan`, "page");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to submit score:", error);
    const message = error instanceof Error ? error.message : "Failed to submit score.";
    return { error: message };
  }
}

export async function scheduleMatchAction(
  matchId: string,
  court: string,
  scheduledAtRaw: string
) {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    return { error: "Unauthorized" };
  }

  try {
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    await prisma.match.update({
      where: { id: matchId },
      data: { court, scheduledAt }
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/lomba/[slug]`, "page");
    revalidatePath(`/lomba/[slug]`, "page");
    revalidatePath(`/lomba/[slug]/bagan`, "page");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Gagal menjadwalkan pertandingan" };
  }
}

export async function getStandingsForCompetition(competitionId: string) {
  const teams = await prisma.team.findMany({
    where: { competitionId },
    include: { members: { include: { registration: { include: { participant: true } } } } }
  });

  const matches = await prisma.match.findMany({
    where: {
      competitionId,
      label: { startsWith: "Grup" },
      status: "COMPLETED"
    }
  });

  // Initialize standings for each team
  const standingsMap = new Map<string, {
    team: typeof teams[0];
    played: number;
    won: number;
    lost: number;
    scoreFor: number;
    scoreAgainst: number;
    points: number;
  }>();

  for (const team of teams) {
    standingsMap.set(team.id, {
      team,
      played: 0,
      won: 0,
      lost: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      points: 0
    });
  }

  for (const match of matches) {
    if (match.teamAId && match.teamBId && match.scoreA !== null && match.scoreB !== null) {
      const statsA = standingsMap.get(match.teamAId);
      const statsB = standingsMap.get(match.teamBId);

      if (statsA && statsB) {
        statsA.played++;
        statsB.played++;

        statsA.scoreFor += match.scoreA;
        statsA.scoreAgainst += match.scoreB;

        statsB.scoreFor += match.scoreB;
        statsB.scoreAgainst += match.scoreA;

        if (match.winnerTeamId === match.teamAId) {
          statsA.won++;
          statsA.points += 3;
          statsB.lost++;
        } else if (match.winnerTeamId === match.teamBId) {
          statsB.won++;
          statsB.points += 3;
          statsA.lost++;
        }
      }
    }
  }

  const standingsList = Array.from(standingsMap.values());

  // Sort: group first, then points desc, then diff desc, then scoreFor desc
  standingsList.sort((a, b) => {
    const groupA = a.team.group || "";
    const groupB = b.team.group || "";
    if (groupA !== groupB) {
      return groupA.localeCompare(groupB);
    }

    if (b.points !== a.points) {
      return b.points - a.points;
    }

    const diffA = a.scoreFor - a.scoreAgainst;
    const diffB = b.scoreFor - b.scoreAgainst;
    if (diffB !== diffA) {
      return diffB - diffA;
    }

    return b.scoreFor - a.scoreFor;
  });

  // Group the standings list by group name
  const groupedStandings: Record<string, typeof standingsList> = {};
  for (const item of standingsList) {
    const g = item.team.group || "Default";
    if (!groupedStandings[g]) {
      groupedStandings[g] = [];
    }
    groupedStandings[g].push(item);
  }

  return groupedStandings;
}

export async function generateKnockoutBracketAction(competitionId: string) {
  try {
    await verifyAuth();

    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: { matches: true }
    });

    if (!comp) return { error: "Competition not found" };
    if (comp.bracketFormat !== "GROUP_KNOCKOUT") {
      return { error: "Format perlombaan bukan Group + Knockout." };
    }

    // Check if there are already knockout matches (matches without "Grup" label)
    const hasKnockoutMatches = comp.matches.some(m => !m.label || !m.label.startsWith("Grup"));
    if (hasKnockoutMatches) {
      return { error: "Babak gugur sudah dibuat." };
    }

    // Check if all group stage matches are completed
    const groupMatches = comp.matches.filter(m => m.label && m.label.startsWith("Grup"));
    const uncompletedGroupMatches = groupMatches.filter(m => m.status !== "COMPLETED");

    if (groupMatches.length === 0) {
      return { error: "Belum ada pertandingan babak grup yang terbuat." };
    }

    if (uncompletedGroupMatches.length > 0) {
      return { error: "Semua pertandingan babak grup harus selesai terlebih dahulu." };
    }

    // Calculate standings to find qualifying teams
    const standings = await getStandingsForCompetition(competitionId);
    const groups = Object.keys(standings).sort();

    // Collect top 2 teams from each group
    const qualifiedTeams: any[] = [];
    for (const groupName of groups) {
      const groupList = standings[groupName];
      if (groupList[0]) qualifiedTeams.push(groupList[0].team);
      if (groupList[1]) qualifiedTeams.push(groupList[1].team);
    }

    const n = qualifiedTeams.length;
    if (n === 0) {
      return { error: "Tidak ada tim yang memenuhi syarat untuk babak gugur." };
    }

    // Determine starting round for knockout
    const maxGroupRound = comp.matches.reduce((max, m) => {
      if (m.label && m.label.startsWith("Grup") && m.round > max) {
        return m.round;
      }
      return max;
    }, 0);

    const startRound = maxGroupRound + 1;

    // Based on qualified teams count, generate the knockout bracket
    let totalKnockoutRounds = 1;
    if (n > 4) {
      totalKnockoutRounds = 3; // Quarterfinals, Semifinals, Final
    } else if (n > 2) {
      totalKnockoutRounds = 2; // Semifinals, Final
    }

    type MatchInput = {
      id: string;
      competitionId: string;
      round: number;
      position: number;
      label: string | null;
      teamAId: string | null;
      teamBId: string | null;
      status: MatchStatus;
      winnerTeamId: string | null;
      nextMatchId: string | null;
      nextSlot: Slot | null;
    };

    const knockoutMatches: MatchInput[] = [];

    // Create match shells
    for (let r = 1; r <= totalKnockoutRounds; r++) {
      const numMatches = Math.pow(2, totalKnockoutRounds - r);
      for (let p = 0; p < numMatches; p++) {
        let label = null;
        if (r === totalKnockoutRounds) label = "Final";
        else if (r === totalKnockoutRounds - 1) label = "Semifinal";
        else if (r === totalKnockoutRounds - 2) label = "Quarterfinal";

        knockoutMatches.push({
          id: crypto.randomUUID(),
          competitionId: comp.id,
          round: startRound + r - 1, // Round offset
          position: p,
          label,
          teamAId: null,
          teamBId: null,
          status: "PENDING",
          winnerTeamId: null,
          nextMatchId: null,
          nextSlot: null,
        });
      }
    }

    const getMatch = (r: number, p: number) => knockoutMatches.find(m => m.round === (startRound + r - 1) && m.position === p);

    // Link matches
    for (let r = 1; r < totalKnockoutRounds; r++) {
      const numMatches = Math.pow(2, totalKnockoutRounds - r);
      for (let p = 0; p < numMatches; p++) {
        const current = getMatch(r, p);
        const nextMatch = getMatch(r + 1, Math.floor(p / 2));
        if (current && nextMatch) {
          current.nextMatchId = nextMatch.id;
          current.nextSlot = p % 2 === 0 ? "A" : "B";
        }
      }
    }

    const firstRoundMatches = knockoutMatches.filter(m => m.round === startRound);

    if (totalKnockoutRounds === 2) {
      // Semifinal (4 teams)
      const groupATeams = standings["A"] || [];
      const groupBTeams = standings["B"] || [];

      const A1 = groupATeams[0]?.team;
      const A2 = groupATeams[1]?.team;
      const B1 = groupBTeams[0]?.team;
      const B2 = groupBTeams[1]?.team;

      // Match 1 (position 0): A1 vs B2
      const m1 = firstRoundMatches.find(m => m.position === 0);
      if (m1) {
        if (A1) m1.teamAId = A1.id;
        if (B2) m1.teamBId = B2.id;
      }

      // Match 2 (position 1): B1 vs A2
      const m2 = firstRoundMatches.find(m => m.position === 1);
      if (m2) {
        if (B1) m2.teamAId = B1.id;
        if (A2) m2.teamBId = A2.id;
      }
    } else if (totalKnockoutRounds === 3) {
      // Quarterfinal (8 teams from groups A, B, C, D)
      const groupATeams = standings["A"] || [];
      const groupBTeams = standings["B"] || [];
      const groupCTeams = standings["C"] || [];
      const groupDTeams = standings["D"] || [];

      const A1 = groupATeams[0]?.team;
      const A2 = groupATeams[1]?.team;
      const B1 = groupBTeams[0]?.team;
      const B2 = groupBTeams[1]?.team;
      const C1 = groupCTeams[0]?.team;
      const C2 = groupCTeams[1]?.team;
      const D1 = groupDTeams[0]?.team;
      const D2 = groupDTeams[1]?.team;

      // QF 1 (pos 0): A1 vs B2
      const qf1 = firstRoundMatches.find(m => m.position === 0);
      if (qf1) {
        if (A1) qf1.teamAId = A1.id;
        if (B2) qf1.teamBId = B2.id;
      }
      // QF 2 (pos 1): C1 vs D2
      const qf2 = firstRoundMatches.find(m => m.position === 1);
      if (qf2) {
        if (C1) qf2.teamAId = C1.id;
        if (D2) qf2.teamBId = D2.id;
      }
      // QF 3 (pos 2): B1 vs A2
      const qf3 = firstRoundMatches.find(m => m.position === 2);
      if (qf3) {
        if (B1) qf3.teamAId = B1.id;
        if (A2) qf3.teamBId = A2.id;
      }
      // QF 4 (pos 3): D1 vs C2
      const qf4 = firstRoundMatches.find(m => m.position === 3);
      if (qf4) {
        if (D1) qf4.teamAId = D1.id;
        if (C2) qf4.teamBId = C2.id;
      }
    } else {
      // 1 Group -> Final (2 teams)
      const groupATeams = standings["A"] || [];
      const A1 = groupATeams[0]?.team;
      const A2 = groupATeams[1]?.team;

      const f = firstRoundMatches.find(m => m.position === 0);
      if (f) {
        if (A1) f.teamAId = A1.id;
        if (A2) f.teamBId = A2.id;
      }
    }

    // Resolve byes for the first round of knockout
    for (const match of firstRoundMatches) {
      if (match.teamAId && !match.teamBId) {
        match.status = "BYE";
        match.winnerTeamId = match.teamAId;

        if (match.nextMatchId) {
          const nextMatch = knockoutMatches.find(m => m.id === match.nextMatchId);
          if (nextMatch) {
            if (match.nextSlot === "A") nextMatch.teamAId = match.winnerTeamId;
            else if (match.nextSlot === "B") nextMatch.teamBId = match.winnerTeamId;
          }
        }
      } else if (!match.teamAId && match.teamBId) {
        match.status = "BYE";
        match.winnerTeamId = match.teamBId;

        if (match.nextMatchId) {
          const nextMatch = knockoutMatches.find(m => m.id === match.nextMatchId);
          if (nextMatch) {
            if (match.nextSlot === "A") nextMatch.teamAId = match.winnerTeamId;
            else if (match.nextSlot === "B") nextMatch.teamBId = match.winnerTeamId;
          }
        }
      } else if (match.teamAId && match.teamBId) {
        match.status = "READY";
      } else {
        match.status = "BYE";
      }
    }

    // Insert knockout matches
    await prisma.match.createMany({
      data: knockoutMatches.map(m => ({
        id: m.id,
        competitionId: m.competitionId,
        round: m.round,
        position: m.position,
        label: m.label,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        status: m.status,
        winnerTeamId: m.winnerTeamId,
        nextMatchId: m.nextMatchId,
        nextSlot: m.nextSlot,
      }))
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/lomba/[slug]`, "page");
    revalidatePath(`/lomba/[slug]`, "page");
    revalidatePath(`/lomba/[slug]/bagan`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to generate knockout stage:", error);
    return { error: "Failed to generate knockout stage." };
  }
}
