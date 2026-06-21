import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerAction } from "./actions";

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
      $transaction: vi.fn((cb) => cb()), // mock transaction
    },
  };
});

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it.todo("should fail if registration is closed");
  
  it.todo("should fail if quota is full");

  it.todo("should fail if participant already registered for the same competition");

  it.todo("should succeed if valid");
});
