import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteCompetitionAction, editCompetitionAction } from "./actions";
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
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
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

// Mock next/cache
vi.mock("next/cache", () => {
  return {
    revalidatePath: vi.fn(),
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

describe("editCompetitionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail if unauthorized", async () => {
    mockGet.mockReturnValue(undefined);
    const formData = new FormData();
    formData.append("name", "New Name");

    const result = await editCompetitionAction("comp-1", formData);

    expect(result.error).toBe("Unauthorized");
    expect(prisma.competition.update).not.toHaveBeenCalled();
  });

  it("should fail if competition not found", async () => {
    mockGet.mockReturnValue({ value: "authenticated" });
    vi.mocked(prisma.competition.findUnique).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("name", "New Name");

    const result = await editCompetitionAction("comp-1", formData);

    expect(result.error).toBe("Perlombaan tidak ditemukan");
  });

  it("should successfully update fields when authorized and matches do not exist", async () => {
    mockGet.mockReturnValue({ value: "authenticated" });
    vi.mocked(prisma.competition.findUnique).mockResolvedValue({
      id: "comp-1",
      name: "Old Name",
      status: "REGISTRATION",
      matches: [],
      registrations: [],
    } as any);
    vi.mocked(prisma.competition.findFirst).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("name", "New Name");
    formData.append("description", "New Desc");
    formData.append("teamSize", "2");
    formData.append("pairingMode", "RANDOM");
    formData.append("bracketFormat", "SINGLE_ELIM");

    const result = await editCompetitionAction("comp-1", formData);

    expect(result.success).toBe(true);
    expect(prisma.competition.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: expect.objectContaining({
        name: "New Name",
        description: "New Desc",
        teamSize: 2,
        pairingMode: "RANDOM",
        bracketFormat: "SINGLE_ELIM",
      }),
    });
  });

  it("should not update structural fields if matches exist", async () => {
    mockGet.mockReturnValue({ value: "authenticated" });
    vi.mocked(prisma.competition.findUnique).mockResolvedValue({
      id: "comp-1",
      name: "Old Name",
      status: "ONGOING",
      matches: [{ id: "match-1" }],
      registrations: [],
    } as any);
    vi.mocked(prisma.competition.findFirst).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("name", "New Name");
    formData.append("description", "New Desc");
    formData.append("teamSize", "2");
    formData.append("pairingMode", "RANDOM");
    formData.append("bracketFormat", "SINGLE_ELIM");

    const result = await editCompetitionAction("comp-1", formData);

    expect(result.success).toBe(true);
    expect(prisma.competition.update).toHaveBeenCalledWith({
      where: { id: "comp-1" },
      data: expect.objectContaining({
        name: "New Name",
        description: "New Desc",
      }),
    });
    // Check structural fields are not in the update payload
    const updateCall = vi.mocked(prisma.competition.update).mock.calls[0][0];
    expect(updateCall.data.teamSize).toBeUndefined();
    expect(updateCall.data.pairingMode).toBeUndefined();
    expect(updateCall.data.bracketFormat).toBeUndefined();
  });
});
