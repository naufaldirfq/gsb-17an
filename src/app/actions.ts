"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { registerSchema } from "@/lib/validations";
import { headers } from "next/headers";

const ipCache = new Map<string, number[]>();
const LIMIT_WINDOW = 60 * 1000; // 1 minute
const LIMIT_MAX = 5; // 5 registrations per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipCache.get(ip) || [];
  const activeTimestamps = timestamps.filter(t => now - t < LIMIT_WINDOW);
  
  if (activeTimestamps.length >= LIMIT_MAX) {
    return true;
  }
  
  activeTimestamps.push(now);
  ipCache.set(ip, activeTimestamps);
  return false;
}

export async function resetRateLimitCacheForTesting() {
  ipCache.clear();
}

export async function registerAction(prevState: unknown, formData: FormData) {
  try {
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    if (isRateLimited(ip)) {
      return { error: true, message: "Terlalu banyak permintaan pendaftaran. Silakan coba sesaat lagi." };
    }

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

    const deadlineSetting = await prisma.setting.findUnique({
      where: { key: "registrationDeadline" },
    });
    const deadlineStr = deadlineSetting?.value || "2026-07-31T23:59:59+07:00";
    if (new Date() > new Date(deadlineStr)) {
      return { error: true, message: "Pendaftaran sudah ditutup karena telah melewati batas waktu (deadline)." };
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

    // Upsert participant by name and phone
    const participant = await prisma.participant.upsert({
      where: {
        name_phone: {
          name,
          phone,
        },
      },
      update: {
        houseBlock,
        houseNumber,
      },
      create: {
        name,
        phone,
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
      return { error: true, message: "Peserta dengan nama dan nomor WhatsApp ini sudah terdaftar di lomba ini." };
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
