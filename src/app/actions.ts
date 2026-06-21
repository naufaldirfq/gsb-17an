"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { registerSchema } from "@/lib/validations";

export async function registerAction(prevState: unknown, formData: FormData) {
  try {
    const rawData = {
      competitionId: formData.get("competitionId") as string,
      name: formData.get("name") as string,
      houseBlock: formData.get("houseBlock") as string,
      houseNumber: formData.get("houseNumber") as string,
      phone: formData.get("phone") as string,
    };

    const validatedData = registerSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        error: true,
        message: "Periksa kembali form anda.",
        fieldErrors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { competitionId, name, houseBlock, houseNumber, phone } = validatedData.data;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!competition) {
      return { error: true, message: "Lomba tidak ditemukan." };
    }

    if (!competition.registrationOpen || competition.status !== "REGISTRATION") {
      return { error: true, message: "Pendaftaran lomba ini sudah ditutup." };
    }

    // Check capacity
    // NOTE: There is a known limitation here regarding race conditions.
    // In a high-concurrency scenario, multiple requests might pass this check simultaneously 
    // before the registrations are created, potentially exceeding the maxParticipants.
    // A more robust solution would involve a database transaction with a row lock on the competition.
    if (competition.maxParticipants && competition._count.registrations >= competition.maxParticipants) {
      return { error: true, message: "Kuota pendaftaran sudah penuh." };
    }

    // Upsert participant by phone
    const participant = await prisma.participant.upsert({
      where: { phone },
      update: {
        name,
        houseBlock,
        houseNumber,
      },
      create: {
        phone,
        name,
        houseBlock,
        houseNumber,
      },
    });

    // Check duplicate registration
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        competitionId_participantId: {
          competitionId,
          participantId: participant.id,
        },
      },
    });

    if (existingRegistration) {
      return { error: true, message: "Nomor HP ini sudah terdaftar di lomba ini." };
    }

    await prisma.registration.create({
      data: {
        competitionId,
        participantId: participant.id,
      },
    });

    revalidatePath("/lomba/[slug]", "page");
    revalidatePath("/lomba");

    return { error: false, message: "Pendaftaran berhasil!" };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: true, message: "Terjadi kesalahan saat mendaftar. Silakan coba lagi." };
  }
}
