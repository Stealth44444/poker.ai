import { describe, it, expect } from 'vitest';
import { determineWinners, evaluateHand } from './handEvaluator';

describe('evaluateHand', () => {
  it('recognizes a flush from 7 cards', () => {
    const hand = evaluateHand(['Ad', 'Kd'], ['Qd', 'Jd', '2d', '3c', '4h']);
    expect(hand.name).toBe('Flush');
  });

  it('recognizes the wheel straight (A-2-3-4-5)', () => {
    const hand = evaluateHand(['Ad', '2c'], ['3h', '4s', '5d', '9c', 'Kh']);
    expect(hand.name).toBe('Straight');
  });
});

describe('determineWinners', () => {
  it('picks the single best hand', () => {
    const winners = determineWinners(
      [
        { playerId: 'p1', holeCards: ['Ad', 'Kd'] },
        { playerId: 'p2', holeCards: ['2c', '7h'] },
      ],
      ['Qd', 'Jd', '2d', '3c', '4h']
    );
    expect(winners).toEqual(['p1']);
  });

  it('splits the pot on a tie', () => {
    const winners = determineWinners(
      [
        { playerId: 'p1', holeCards: ['2c', '7h'] },
        { playerId: 'p2', holeCards: ['2d', '7s'] },
      ],
      ['Ad', 'Kd', 'Qd', 'Jc', '9h']
    );
    expect(winners.sort()).toEqual(['p1', 'p2']);
  });
});
