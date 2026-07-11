export interface GeneratedHeatMatch {
  id: string;
  round: number;
  position: number;
  label: string;
  nextMatchId: string | null;
  teamIds: string[];
}

/**
 * Generates a browser-safe random suffix for ID uniqueness.
 */
function getRandomSuffix(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Calculates the sizes of heats for a given number of teams and maximum heat size,
 * distributing the teams as evenly as possible.
 */
function getHeatSizes(numTeams: number, heatSize: number): number[] {
  if (numTeams <= 0) return [];
  if (numTeams <= heatSize) return [numTeams];
  const numHeats = Math.ceil(numTeams / heatSize);
  const baseSize = Math.floor(numTeams / numHeats);
  const remainder = numTeams % numHeats;
  const sizes: number[] = [];
  for (let i = 0; i < numHeats; i++) {
    sizes.push(i < remainder ? baseSize + 1 : baseSize);
  }
  return sizes;
}

/**
 * Generates a deterministic heat bracket structure for multi-competitor heats.
 * Exactly 1 winner advances from each heat to the next round.
 */
export function generateHeatsStructure(teams: string[], heatSize: number): GeneratedHeatMatch[] {
  if (teams.length === 0) {
    return [];
  }
  if (heatSize < 2) {
    throw new Error("heatSize must be at least 2");
  }

  // Special case: single team (though unusual)
  if (teams.length === 1) {
    return [{
      id: `heat-1-0-${getRandomSuffix()}`,
      round: 1,
      position: 0,
      label: "Final",
      nextMatchId: null,
      teamIds: teams
    }];
  }

  // Calculate heats structure round-by-round
  let currentTeamsCount = teams.length;
  const roundHeatsCounts: number[] = [];

  while (currentTeamsCount > 1) {
    const heatsInRound = Math.ceil(currentTeamsCount / heatSize);
    roundHeatsCounts.push(heatsInRound);
    if (heatsInRound === 1) {
      break;
    }
    currentTeamsCount = heatsInRound;
  }

  const roundsMatches: GeneratedHeatMatch[][] = [];

  // Create match structures for each round
  for (let roundIdx = 0; roundIdx < roundHeatsCounts.length; roundIdx++) {
    const round = roundIdx + 1;
    const heatsCount = roundHeatsCounts[roundIdx];
    const roundMatchesList: GeneratedHeatMatch[] = [];
    
    for (let position = 0; position < heatsCount; position++) {
      const id = `heat-${round}-${position}-${getRandomSuffix()}`;
      
      let label = "";
      const isLastRound = round === roundHeatsCounts.length;
      const isSecondToLast = round === roundHeatsCounts.length - 1;
      const isThirdToLast = round === roundHeatsCounts.length - 2;

      if (isLastRound) {
        label = "Final";
      } else if (isSecondToLast) {
        label = heatsCount > 1 ? `Semifinal - Heat ${position + 1}` : "Semifinal";
      } else if (isThirdToLast) {
        label = heatsCount > 1 ? `Perempat Final - Heat ${position + 1}` : "Perempat Final";
      } else {
        label = `Babak ${round} - Heat ${position + 1}`;
      }
      
      roundMatchesList.push({
        id,
        round,
        position,
        label,
        nextMatchId: null,
        teamIds: [],
      });
    }
    roundsMatches.push(roundMatchesList);
  }

  // Route winners from round r to round r + 1
  for (let r = 0; r < roundsMatches.length - 1; r++) {
    const currentRoundMatches = roundsMatches[r];
    const nextRoundMatches = roundsMatches[r + 1];
    
    const H_curr = currentRoundMatches.length;
    const nextSizes = getHeatSizes(H_curr, heatSize);
    
    let currentHeatIdx = 0;
    for (let nextHeatIdx = 0; nextHeatIdx < nextRoundMatches.length; nextHeatIdx++) {
      const nextHeat = nextRoundMatches[nextHeatIdx];
      const size = nextSizes[nextHeatIdx];
      for (let s = 0; s < size; s++) {
        currentRoundMatches[currentHeatIdx].nextMatchId = nextHeat.id;
        currentHeatIdx++;
      }
    }
  }

  // Seed initial teams into Round 1
  const round1Matches = roundsMatches[0];
  const round1Sizes = getHeatSizes(teams.length, heatSize);

  let teamIdx = 0;
  for (let heatIdx = 0; heatIdx < round1Matches.length; heatIdx++) {
    const match = round1Matches[heatIdx];
    const size = round1Sizes[heatIdx];
    for (let s = 0; s < size; s++) {
      match.teamIds.push(teams[teamIdx]);
      teamIdx++;
    }
  }

  return roundsMatches.flat();
}
