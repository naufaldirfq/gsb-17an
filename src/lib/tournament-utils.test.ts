import { describe, it, expect } from "vitest";
import { generateHeatsStructure } from "./tournament-utils";

describe("generateHeatsStructure", () => {
  it("should generate structure for 9 teams with heatSize = 3 (2 rounds: 3 heats, then 1 heat)", () => {
    const teams = Array.from({ length: 9 }, (_, i) => `team-${i + 1}`);
    const matches = generateHeatsStructure(teams, 3);

    // Round 1: 3 heats, Round 2: 1 heat
    const round1Matches = matches.filter((m) => m.round === 1);
    const round2Matches = matches.filter((m) => m.round === 2);

    expect(round1Matches).toHaveLength(3);
    expect(round2Matches).toHaveLength(1);
    expect(matches).toHaveLength(4);

    // Check Round 1 team assignments
    expect(round1Matches[0].teamIds).toEqual(["team-1", "team-2", "team-3"]);
    expect(round1Matches[1].teamIds).toEqual(["team-4", "team-5", "team-6"]);
    expect(round1Matches[2].teamIds).toEqual(["team-7", "team-8", "team-9"]);

    // Check Round 1 labels (Semifinal - Heat X)
    expect(round1Matches[0].label).toBe("Semifinal - Heat 1");
    expect(round1Matches[1].label).toBe("Semifinal - Heat 2");
    expect(round1Matches[2].label).toBe("Semifinal - Heat 3");

    // Check Round 2 team assignments (should start empty)
    expect(round2Matches[0].teamIds).toEqual([]);
    
    // Check Round 2 label (Final)
    expect(round2Matches[0].label).toBe("Final");

    // Check routing: winners of all round 1 heats flow to the only round 2 heat
    const round2HeatId = round2Matches[0].id;
    expect(round1Matches[0].nextMatchId).toBe(round2HeatId);
    expect(round1Matches[1].nextMatchId).toBe(round2HeatId);
    expect(round1Matches[2].nextMatchId).toBe(round2HeatId);

    // Final heat has no next match
    expect(round2Matches[0].nextMatchId).toBeNull();
  });

  it("should generate structure for 12 teams with heatSize = 3 (3 rounds: 4 heats, then 2 heats, then 1 heat)", () => {
    const teams = Array.from({ length: 12 }, (_, i) => `team-${i + 1}`);
    const matches = generateHeatsStructure(teams, 3);

    // Round 1: 4 heats, Round 2: 2 heats, Round 3: 1 heat
    const round1Matches = matches.filter((m) => m.round === 1);
    const round2Matches = matches.filter((m) => m.round === 2);
    const round3Matches = matches.filter((m) => m.round === 3);

    expect(round1Matches).toHaveLength(4);
    expect(round2Matches).toHaveLength(2);
    expect(round3Matches).toHaveLength(1);
    expect(matches).toHaveLength(7);

    // Check Round 1 team assignments
    expect(round1Matches[0].teamIds).toEqual(["team-1", "team-2", "team-3"]);
    expect(round1Matches[1].teamIds).toEqual(["team-4", "team-5", "team-6"]);
    expect(round1Matches[2].teamIds).toEqual(["team-7", "team-8", "team-9"]);
    expect(round1Matches[3].teamIds).toEqual(["team-10", "team-11", "team-12"]);

    // Check Round 1 labels (Perempat Final - Heat X)
    expect(round1Matches[0].label).toBe("Perempat Final - Heat 1");
    expect(round1Matches[1].label).toBe("Perempat Final - Heat 2");
    expect(round1Matches[2].label).toBe("Perempat Final - Heat 3");
    expect(round1Matches[3].label).toBe("Perempat Final - Heat 4");

    // Check Round 2 & 3 team assignments (should start empty)
    expect(round2Matches[0].teamIds).toEqual([]);
    expect(round2Matches[1].teamIds).toEqual([]);
    expect(round3Matches[0].teamIds).toEqual([]);

    // Check Round 2 & 3 labels
    expect(round2Matches[0].label).toBe("Semifinal - Heat 1");
    expect(round2Matches[1].label).toBe("Semifinal - Heat 2");
    expect(round3Matches[0].label).toBe("Final");

    // Check routing:
    // Round 1 Heat 0 & 1 -> Round 2 Heat 0
    // Round 1 Heat 2 & 3 -> Round 2 Heat 1
    expect(round1Matches[0].nextMatchId).toBe(round2Matches[0].id);
    expect(round1Matches[1].nextMatchId).toBe(round2Matches[0].id);
    expect(round1Matches[2].nextMatchId).toBe(round2Matches[1].id);
    expect(round1Matches[3].nextMatchId).toBe(round2Matches[1].id);

    // Round 2 Heat 0 & 1 -> Round 3 Heat 0
    expect(round2Matches[0].nextMatchId).toBe(round3Matches[0].id);
    expect(round2Matches[1].nextMatchId).toBe(round3Matches[0].id);

    // Final heat has no next match
    expect(round3Matches[0].nextMatchId).toBeNull();
  });

  it("should handle edge case: 0 teams", () => {
    const matches = generateHeatsStructure([], 3);
    expect(matches).toEqual([]);
  });

  it("should handle edge case: 1 team", () => {
    const matches = generateHeatsStructure(["team-1"], 3);
    expect(matches).toHaveLength(1);
    expect(matches[0].round).toBe(1);
    expect(matches[0].position).toBe(0);
    expect(matches[0].label).toBe("Final");
    expect(matches[0].nextMatchId).toBeNull();
    expect(matches[0].teamIds).toEqual(["team-1"]);
  });

  it("should throw an error for invalid heatSize < 2", () => {
    expect(() => generateHeatsStructure(["team-1", "team-2"], 1)).toThrow("heatSize must be at least 2");
    expect(() => generateHeatsStructure(["team-1", "team-2"], 0)).toThrow("heatSize must be at least 2");
    expect(() => generateHeatsStructure(["team-1", "team-2"], -1)).toThrow("heatSize must be at least 2");
  });
});

