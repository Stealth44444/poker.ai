import { describe, it, expect } from 'vitest';
import { calculateSidePots } from './sidePots';
import { Player } from './types';

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return { id, name: id, stack: 0, holeCards: [], isFolded: false, isAllIn: false, seat: 0, ...overrides };
}

describe('calculateSidePots', () => {
  it('creates a main pot and one side pot for a single short all-in', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    const bets = { p1: 50, p2: 100, p3: 100 };
    expect(calculateSidePots(players, bets)).toEqual([
      { amount: 150, eligiblePlayerIds: ['p1', 'p2', 'p3'] },
      { amount: 100, eligiblePlayerIds: ['p2', 'p3'] },
    ]);
  });

  it('excludes folded players from eligibility but keeps their chips in the pot', () => {
    const players = [makePlayer('p1', { isFolded: true }), makePlayer('p2'), makePlayer('p3')];
    const bets = { p1: 50, p2: 100, p3: 100 };
    expect(calculateSidePots(players, bets)).toEqual([
      { amount: 150, eligiblePlayerIds: ['p2', 'p3'] },
      { amount: 100, eligiblePlayerIds: ['p2', 'p3'] },
    ]);
  });

  it('returns a single pot when no one is short all-in', () => {
    const players = [makePlayer('p1'), makePlayer('p2')];
    const bets = { p1: 100, p2: 100 };
    expect(calculateSidePots(players, bets)).toEqual([{ amount: 200, eligiblePlayerIds: ['p1', 'p2'] }]);
  });
});
