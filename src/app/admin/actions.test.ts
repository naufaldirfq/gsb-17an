import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteCompetitionAction } from "./actions";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => {
  return {
    default: {
      match: {
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      teamMember: {
        deleteMany: vi.fn(),
      },
      team: {
        deleteMany: vi.fn(),
      },
      registration: {
        deleteMany: vi.fn(),
      },
      photo: {
        deleteMany: vi.fn(),
      },
      competition: {
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return await cb(prisma);
      }),
    },
  };
});

// Mock next/headers
const mockGet = vi.fn();
vi.mock("next/headers", () => {
  return {
    cookies: vi.fn(async () => {
      return {
        get: mockGet,
      };
    }),
  };
});

describe("deleteCompetitionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail if unauthorized", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await deleteCompetitionAction("comp-1");

    expect(result.error).toBe("Unauthorized");
    expect(prisma.competition.delete).not.toHaveBeenCalled();
  });

  it("should successfully delete a competition inside transaction when authorized", async () => {
    mockGet.mockReturnValue({ value: "authenticated" });

    const result = await deleteCompetitionAction("comp-1");

    expect(result.success).toBe(true);
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
      data: { nextMatchId: null },
    });
    expect(prisma.match.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.teamMember.deleteMany).toHaveBeenCalledWith({
      where: {
        team: {
          competitionId: "comp-1",
        },
      },
    });
    expect(prisma.team.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.registration.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.photo.deleteMany).toHaveBeenCalledWith({
      where: { competitionId: "comp-1" },
    });
    expect(prisma.competition.delete).toHaveBeenCalledWith({
      where: { id: "comp-1" },
    });
  });
});
