"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function closeRegistrationAction(competitionId: string) {
  await prisma.competition.update({
    where: { id: competitionId },
    data: { status: "LOCKED", registrationOpen: false },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/lomba/[slug]`, "page");
}

export async function openRegistrationAction(competitionId: string) {
  await prisma.competition.update({
    where: { id: competitionId },
    data: { status: "REGISTRATION", registrationOpen: true },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/lomba/[slug]`, "page");
}
