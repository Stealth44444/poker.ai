import { describe, it, expect } from 'vitest';
import { validActions, applyAction, BettingRoundState } from './bettingEngine';
import { Player } from './types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'P1', stack: 1000, holeCards: [], isFolded: false, isAllIn: false, seat: 0,
    ...overrides,
  };
}

describe('validActions', () => {
  it('offers check and bet when no bet is owed', () => {
    const state: BettingRoundState = { players: [makePlayer()], currentBet: 0, minRaise: 20, bets: {} };
    const actions = validActions(state, 'p1');
    expect(actions).toEqual(expect.arrayContaining(['check', 'bet', 'fold', 'all-in']));
    expect(actions).not.toContain('call');
  });

  it('offers call and raise when a bet is owed', () => {
    const state: BettingRoundState = { players: [makePlayer()], currentBet: 100, minRaise: 100, bets: { p1: 0 } };
    const actions = validActions(state, 'p1');
    expect(actions).toEqual(expect.arrayContaining(['call', 'raise', 'fold', 'all-in']));
  });

  it('returns no actions for a folded player', () => {
    const state: BettingRoundState = {
      players: [makePlayer({ isFolded: true })], currentBet: 0, minRaise: 20, bets: {},
    };
    expect(validActions(state, 'p1')).toEqual([]);
  });
});

describe('applyAction', () => {
  it('moves stack to the pot on call', () => {
    const state: BettingRoundState = { players: [makePlayer({ stack: 1000 })], currentBet: 100, minRaise: 100, bets: { p1: 0 } };
    const next = applyAction(state, { playerId: 'p1', type: 'call' });
    expect(next.players[0].stack).toBe(900);
    expect(next.bets.p1).toBe(100);
  });

  it('rejects a raise below the minimum', () => {
    const state: BettingRoundState = { players: [makePlayer({ stack: 1000 })], currentBet: 100, minRaise: 100, bets: { p1: 0 } };
    expect(() => applyAction(state, { playerId: 'p1', type: 'raise', amount: 150 })).toThrow();
  });

  it('marks a player all-in when their stack hits zero on call', () => {
    const state: BettingRoundState = { players: [makePlayer({ stack: 50 })], currentBet: 100, minRaise: 100, bets: { p1: 0 } };
    const next = applyAction(state, { playerId: 'p1', type: 'call' });
    expect(next.players[0].stack).toBe(0);
    expect(next.players[0].isAllIn).toBe(true);
  });
});
