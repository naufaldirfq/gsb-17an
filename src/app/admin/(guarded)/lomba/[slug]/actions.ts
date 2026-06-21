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
    if (comp.status === "ONGOING" || comp.status === "DONE") {
      return { error: "Cannot open registration after bracket has been generated." };
    }

    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: "REGISTRATION", registrationOpen: true },
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/lomba/[slug]`, "page");
    return { success: true };
  } catch (error) {
    console.error("Failed to open registration:", error);
    return { error: "Failed to open registration." };
  }
}

export async function generateBracketAction(competitionId: string) {
  try {
    await verifyAuth();
    
    // Fetch competition and registrations
    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        registrations: true,
      }
    });

    if (!comp) return { error: "Competition not found" };
    if (comp.status !== "LOCKED") return { error: "Competition must be LOCKED to generate bracket" };

    // 1. Shuffle participants
    const regs = [...comp.registrations];
    for (let i = regs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regs[i], regs[j]] = [regs[j], regs[i]];
    }

    // 2. Group into teams
    const teamSize = comp.teamSize;
    const numTeamsToForm = Math.floor(regs.length / teamSize);
    
    if (numTeamsToForm === 0) {
      return { error: "Not enough participants to form even one team." };
    }

    // Prepare teams and team members
    type TeamMemberInput = { id: string; teamId: string; registrationId: string };
    type TeamInput = { id: string; competitionId: string; name: string; members: TeamMemberInput[] };
    const newTeams: TeamInput[] = [];
    let regIndex = 0;
    
    for (let i = 0; i < numTeamsToForm; i++) {
      const teamId = crypto.randomUUID();
      const members = [];
      for (let j = 0; j < teamSize; j++) {
        members.push({
          id: crypto.randomUUID(),
          teamId: teamId,
          registrationId: regs[regIndex].id
        });
        regIndex++;
      }
      
      newTeams.push({
        id: teamId,
        competitionId: comp.id,
        name: `Tim ${i + 1}`,
        members
      });
    }

    // Use Prisma transaction to insert all
    await prisma.$transaction(async (tx) => {
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
            members: {
              create: t.members.map((m) => ({
                id: m.id,
                registrationId: m.registrationId
              }))
            }
          }
        });
      }

      // Generate Bracket
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

      // Insert Matches
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

      // Update competition status to ONGOING
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
