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
});

export async function createCompetitionAction(formData: FormData) {
  const authCookie = (await cookies()).get(ADMIN_AUTH_COOKIE);
  if (authCookie?.value !== "authenticated") {
    return { error: "Unauthorized" };
  }

  const rawName = formData.get("name") as string;
  const teamSize = parseInt(formData.get("teamSize") as string) || 1;
  const maxParticipantsRaw = formData.get("maxParticipants") as string;
  
  const parsed = createCompetitionSchema.safeParse({
    name: rawName,
    description: formData.get("description") || undefined,
    rules: formData.get("rules") || undefined,
    teamSize,
    pairingMode: formData.get("pairingMode"),
    bracketFormat: formData.get("bracketFormat"),
    maxParticipants: maxParticipantsRaw ? parseInt(maxParticipantsRaw) : null,
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

