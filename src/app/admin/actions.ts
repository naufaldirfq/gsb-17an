"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_AUTH_COOKIE } from "@/lib/constants";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { PairingMode, BracketFormat, CompetitionStatus } from "@prisma/client";

export async function loginAction(prevState: unknown, formData: FormData) {
  const password = formData.get("password");
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (password === expectedPassword) {
    (await cookies()).set(ADMIN_AUTH_COOKIE, "authenticated", { path: "/" });
    redirect("/admin");
  }
  return { error: "Invalid password" };
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_AUTH_COOKIE);
  redirect("/admin/login");
}

const createCompetitionSchema = z.object({
  name: z.string().min(1, "Nama lomba harus diisi"),
  description: z.string().optional(),
  rules: z.string().optional(),
  teamSize: z.number().int().min(1),
  pairingMode: z.nativeEnum(PairingMode),
  bracketFormat: z.nativeEnum(BracketFormat),
  maxParticipants: z.number().int().optional().nullable(),
  heatSize: z.coerce.number().min(2).optional().nullable(),
}).refine(data => {
  if (data.bracketFormat === "RACE_HEATS") {
    return data.heatSize !== null && data.heatSize !== undefined;
  }
  return true;
}, {
  message: "Jumlah peserta per heat harus diisi untuk format Balap/Renang dan minimal 2",
  path: ["heatSize"]
});

export async function createCompetitionAction(formData: FormData) {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    return { error: "Unauthorized" };
  }

  const rawName = formData.get("name") as string;
  const teamSize = parseInt(formData.get("teamSize") as string) || 1;
  const maxParticipantsRaw = formData.get("maxParticipants") as string;
  const heatSizeRaw = formData.get("heatSize") as string;
  const heatSize = (heatSizeRaw && heatSizeRaw.trim() !== "") ? parseInt(heatSizeRaw) : null;
  
  const parsed = createCompetitionSchema.safeParse({
    name: rawName,
    description: formData.get("description") || undefined,
    rules: formData.get("rules") || undefined,
    teamSize,
    pairingMode: formData.get("pairingMode"),
    bracketFormat: formData.get("bracketFormat"),
    maxParticipants: maxParticipantsRaw ? parseInt(maxParticipantsRaw) : null,
    heatSize,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) {
    slug = `lomba-${Date.now().toString().slice(-4)}`;
  } else {
    const existing = await prisma.competition.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }
  }

  try {
    await prisma.competition.create({
      data: {
        ...parsed.data,
        slug,
        status: CompetitionStatus.REGISTRATION,
      },
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal membuat perlombaan" };
  }
}

export async function deleteParticipantAction(participantId: string) {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Find all registrations for this participant
      const registrations = await tx.registration.findMany({
        where: { participantId },
        include: { teamMember: true },
      });

      // For each registration, delete the team member if it exists
      for (const reg of registrations) {
        if (reg.teamMember) {
          const teamId = reg.teamMember.teamId;

          // Delete team member
          await tx.teamMember.delete({
            where: { id: reg.teamMember.id },
          });

          // Check if the team now has 0 members
          const remainingMembers = await tx.teamMember.count({
            where: { teamId },
          });
          if (remainingMembers === 0) {
            // Delete matches referencing this team
            await tx.match.deleteMany({
              where: {
                OR: [
                  { teamAId: teamId },
                  { teamBId: teamId },
                  { winnerTeamId: teamId },
                ],
              },
            });
            // Delete team
            await tx.team.delete({
              where: { id: teamId },
            });
          }
        }
      }

      // Delete registrations
      await tx.registration.deleteMany({
        where: { participantId },
      });

      // Finally, delete the participant
      await tx.participant.delete({
        where: { id: participantId },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Gagal menghapus peserta:", err);
    return { error: "Gagal menghapus peserta" };
  }
}

export async function deleteRegistrationAction(registrationId: string) {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Check if registration has a team member
      const reg = await tx.registration.findUnique({
        where: { id: registrationId },
        include: { teamMember: true },
      });

      if (reg?.teamMember) {
        const teamId = reg.teamMember.teamId;

        // Delete team member
        await tx.teamMember.delete({
          where: { id: reg.teamMember.id },
        });

        // Check if the team now has 0 members
        const remainingMembers = await tx.teamMember.count({
          where: { teamId },
        });
        if (remainingMembers === 0) {
          // Delete matches referencing this team
          await tx.match.deleteMany({
            where: {
              OR: [
                { teamAId: teamId },
                { teamBId: teamId },
                { winnerTeamId: teamId },
              ],
            },
          });
          // Delete team
          await tx.team.delete({
            where: { id: teamId },
          });
        }
      }

      // Delete registration
      await tx.registration.delete({
        where: { id: registrationId },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Gagal menghapus pendaftaran:", err);
    return { error: "Gagal menghapus pendaftaran" };
  }
}

export async function deleteCompetitionAction(competitionId: string) {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Break self-referential relationships on Matches in this competition
      await tx.match.updateMany({
        where: { competitionId },
        data: { nextMatchId: null },
      });

      // 2. Delete matches
      await tx.match.deleteMany({
        where: { competitionId },
      });

      // 3. Delete TeamMembers for teams in this competition
      await tx.teamMember.deleteMany({
        where: {
          team: {
            competitionId,
          },
        },
      });

      // 4. Delete Teams
      await tx.team.deleteMany({
        where: { competitionId },
      });

      // 5. Delete Registrations
      await tx.registration.deleteMany({
        where: { competitionId },
      });

      // 6. Delete Photos
      await tx.photo.deleteMany({
        where: { competitionId },
      });

      // 7. Delete the Competition itself
      await tx.competition.delete({
        where: { id: competitionId },
      });
    });

    return { success: true };
  } catch (err) {
    console.error("Gagal menghapus perlombaan:", err);
    return { error: "Gagal menghapus perlombaan" };
  }
}


