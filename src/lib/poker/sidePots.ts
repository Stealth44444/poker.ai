import { Player } from './types';

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export function calculateSidePots(players: Player[], bets: Record<string, number>): Pot[] {
  const contributors = players.filter((p) => (bets[p.id] ?? 0) > 0);
  const thresholds = Array.from(new Set(contributors.map((p) => bets[p.id] ?? 0))).sort((a, b) => a - b);

  const pots: Pot[] = [];
  let previousThreshold = 0;

  for (const threshold of thresholds) {
    const layerSize = threshold - previousThreshold;
    if (layerSize <= 0) continue;

    const payingPlayers = contributors.filter((p) => (bets[p.id] ?? 0) >= threshold);
    const eligiblePlayerIds = payingPlayers.filter((p) => !p.isFolded).map((p) => p.id);
    const amount = layerSize * payingPlayers.length;

    if (eligiblePlayerIds.length > 0) {
      pots.push({ amount, eligiblePlayerIds });
    } else if (pots.length > 0) {
      pots[pots.length - 1].amount += amount;
    }

    previousThreshold = threshold;
  }

  return pots;
}
