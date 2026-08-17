import { Card, Rank } from '@/lib/poker/types';
import { evaluateHand } from '@/lib/poker/handEvaluator';

const RANK_ORDER: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RANK_NUMERIC: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i + 2])
) as Record<Rank, number>;

// Simplified Chen-formula base value per high card: face cards get flat
// premiums, number cards use half their rank.
const CHEN_HIGH_CARD_VALUE: Record<Rank, number> = {
  A: 10, K: 8, Q: 7, J: 6, T: 5,
  '9': 4.5, '8': 4, '7': 3.5, '6': 3, '5': 2.5, '4': 2, '3': 1.5, '2': 1,
};

export type PreflopTier = 'premium' | 'strong' | 'playable' | 'weak';

export interface PreflopStrength {
  tier: PreflopTier;
  score: number;
}

/**
 * Simplified Chen-formula preflop score: the high card's base value
 * (doubled and floored at 5 for pairs), +2 for suited, then a gap penalty
 * for how far apart the ranks sit — bucketed into four tiers. Not full
 * equity against an unknown range (that needs Monte Carlo simulation, out
 * of scope) but enough to stop the model from treating 72o and AA the same.
 */
export function preflopStrength(holeCards: Card[]): PreflopStrength {
  const [a, b] = holeCards;
  const rankA = a[0] as Rank;
  const rankB = b[0] as Rank;
  const suited = a[1] === b[1];
  const paired = rankA === rankB;
  const numA = RANK_NUMERIC[rankA];
  const numB = RANK_NUMERIC[rankB];
  const highRank = numA >= numB ? rankA : rankB;
  const lowNum = Math.min(numA, numB);
  const highNum = Math.max(numA, numB);

  let score = CHEN_HIGH_CARD_VALUE[highRank];
  if (paired) {
    score = Math.max(score * 2, 5);
  } else {
    if (suited) score += 2;
    const gap = highNum - lowNum - 1;
    if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else if (gap >= 4) score -= 5;
  }
  score = Math.max(score, 0);

  let tier: PreflopTier;
  if (score >= 10) tier = 'premium';
  else if (score >= 7) tier = 'strong';
  else if (score >= 4) tier = 'playable';
  else tier = 'weak';

  return { tier, score };
}

/** Postflop only — the actual made hand category (not an equity estimate). Returns null preflop. */
export function madeHandRank(holeCards: Card[], communityCards: Card[]): string | null {
  if (communityCards.length < 3) return null;
  return evaluateHand(holeCards, communityCards).name;
}

export function potOddsPercent(toCall: number, pot: number): number {
  if (toCall <= 0) return 0;
  return Math.round((toCall / (pot + toCall)) * 100);
}
