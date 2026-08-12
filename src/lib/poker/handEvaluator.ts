import { Hand } from 'pokersolver';
import { Card } from './types';

export interface PlayerHand {
  playerId: string;
  holeCards: Card[];
}

interface EvaluatedHand {
  playerId: string;
  hand: Hand;
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): Hand {
  return Hand.solve([...holeCards, ...communityCards]);
}

export function determineWinners(players: PlayerHand[], communityCards: Card[]): string[] {
  const evaluated: EvaluatedHand[] = players.map((p) => ({
    playerId: p.playerId,
    hand: evaluateHand(p.holeCards, communityCards),
  }));
  const winningHands = Hand.winners(evaluated.map((e) => e.hand));
  return evaluated.filter((e) => winningHands.includes(e.hand)).map((e) => e.playerId);
}
