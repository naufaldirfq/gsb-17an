import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerAction, resetRateLimitCacheForTesting } from "./actions";

// Mock prisma for testing
vi.mock("@/lib/prisma", () => {
  return {
    default: {
      competition: {
        findUnique: vi.fn(),
      },
      participant: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      registration: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      setting: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb()), // mock transaction
    },
  };
});

// Mock next/headers
vi.mock("next/headers", () => {
  return {
    headers: vi.fn(async () => {
      const headersMap = new Map();
      headersMap.set("x-forwarded-for", "127.0.0.1");
      return {
        get: vi.fn((key: string) => headersMap.get(key)),
      };
    }),
  };
});

// Mock next/cache
vi.mock("next/cache", () => {
  return {
    revalidatePath: vi.fn(),
  };
});

describe("registerAction", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetRateLimitCacheForTesting();
    
    // Set default setting mock to null (defaults to July 31st 2026)
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.setting.findUnique as any).mockResolvedValue(null);
  });

  it("should fail if competition does not exist", async () => {
    // Arrange
    const formData = new FormData();
    formData.append("competitionId", "non-existent");
    formData.append("name", "Budi");
    formData.append("houseBlock", "C3");
    formData.append("houseNumber", "12A");
    formData.append("phone", "08123456789");

    // Mock prisma.competition.findUnique to return null
    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.competition.findUnique as any).mockResolvedValue(null);

    // Act
    const result = await registerAction(null, formData);

    // Assert
    expect(result.error).toBe(true);
    expect(result.message).toBe("Lomba tidak ditemukan.");
  });

  it("should fail if registration is closed", async () => {
    const formData = new FormData();
    formData.append("competitionId", "closed-comp");
    formData.append("name", "Budi");
    formData.append("houseBlock", "C3");
    formData.append("houseNumber", "12A");
    formData.append("phone", "08123456789");

    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.competition.findUnique as any).mockResolvedValue({
      id: "closed-comp",
      _count: { registrations: 0 },
      maxParticipants: null,
      registrationOpen: false,
      status: "LOCKED",
    });

    const result = await registerAction(null, formData);

    expect(result.error).toBe(true);
    expect(result.message).toBe("Pendaftaran lomba ini sudah ditutup.");
  });
  
  it("should rate limit after 5 attempts", async () => {
    const formData = new FormData();
    formData.append("competitionId", "any-comp");
    formData.append("name", "Budi");
    formData.append("houseBlock", "C3");
    formData.append("houseNumber", "12A");
    formData.append("phone", "08123456789");

    const prisma = (await import("@/lib/prisma")).default;
    // Mock the success flow
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.competition.findUnique as any).mockResolvedValue({
      id: "any-comp",
      _count: { registrations: 0 },
      maxParticipants: null,
      registrationOpen: true,
      status: "REGISTRATION",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.participant.upsert as any).mockResolvedValue({ id: "p1" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.registration.findUnique as any).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.registration.create as any).mockResolvedValue({});

    // First 5 attempts should succeed/pass rate limiter (they might fail on other things or succeed, but they won't get rate limited)
    for (let i = 0; i < 5; i++) {
      const result = await registerAction(null, formData);
      expect(result.message).not.toBe("Terlalu banyak permintaan pendaftaran. Silakan coba sesaat lagi.");
    }

    // 6th attempt must be rate limited
    const result = await registerAction(null, formData);
    expect(result.error).toBe(true);
    expect(result.message).toBe("Terlalu banyak permintaan pendaftaran. Silakan coba sesaat lagi.");
  });

  it.todo("should fail if quota is full");

  it.todo("should fail if participant already registered for the same competition");

  it.todo("should succeed if valid");

  it("should fail if registration deadline has passed", async () => {
    const formData = new FormData();
    formData.append("competitionId", "any-comp");
    formData.append("name", "Budi");
    formData.append("houseBlock", "C3");
    formData.append("houseNumber", "12A");
    formData.append("phone", "08123456789");

    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.competition.findUnique as any).mockResolvedValue({
      id: "any-comp",
      _count: { registrations: 0 },
      maxParticipants: null,
      registrationOpen: true,
      status: "REGISTRATION",
    });

    // Mock deadline setting in the past (yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.setting.findUnique as any).mockResolvedValue({
      key: "registrationDeadline",
      value: yesterday,
    });

    const result = await registerAction(null, formData);

    expect(result.error).toBe(true);
    expect(result.message).toBe("Pendaftaran sudah ditutup karena telah melewati batas waktu (deadline).");
  });

  it("should succeed/continue if registration deadline is in the future", async () => {
    const formData = new FormData();
    formData.append("competitionId", "any-comp");
    formData.append("name", "Budi");
    formData.append("houseBlock", "C3");
    formData.append("houseNumber", "12A");
    formData.append("phone", "08123456789");

    const prisma = (await import("@/lib/prisma")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.competition.findUnique as any).mockResolvedValue({
      id: "any-comp",
      _count: { registrations: 0 },
      maxParticipants: null,
      registrationOpen: true,
      status: "REGISTRATION",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.participant.upsert as any).mockResolvedValue({ id: "p1" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.registration.findUnique as any).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.registration.create as any).mockResolvedValue({});

    // Mock deadline setting in the future (tomorrow)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.setting.findUnique as any).mockResolvedValue({
      key: "registrationDeadline",
      value: tomorrow,
    });

    const result = await registerAction(null, formData);

    expect(result.error).toBe(false);
    expect(result.message).toBe("Pendaftaran berhasil!");
  });
});

