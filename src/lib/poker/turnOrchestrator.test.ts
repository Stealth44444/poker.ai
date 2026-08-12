import { describe, it, expect } from 'vitest';
import { nextActiveSeatAfter, postBlinds } from './turnOrchestrator';
import { createTournament, startHand } from './tournamentEngine';
import { Player } from './types';

function makePlayers(count: number, stack = 1000): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, name: `p${i}`, stack, holeCards: [], isFolded: false, isAllIn: false, seat: i,
  }));
}

describe('nextActiveSeatAfter', () => {
  it('returns the next non-folded player clockwise', () => {
    const state = createTournament(makePlayers(4));
    state.players[1].isFolded = true;
    expect(nextActiveSeatAfter(state, 0)).toBe('p2');
  });

  it('skips all-in players', () => {
    const state = createTournament(makePlayers(3));
    state.players[1].isAllIn = true;
    expect(nextActiveSeatAfter(state, 0)).toBe('p2');
  });

  it('returns null when no active players remain', () => {
    const state = createTournament(makePlayers(2));
    state.players.forEach((p) => (p.isFolded = true));
    expect(nextActiveSeatAfter(state, 0)).toBeNull();
  });
});

describe('postBlinds', () => {
  it('takes small blind from the seat after the dealer and big blind from the next, in 3+ handed play', () => {
    const state = startHand(createTournament(makePlayers(3, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.bets.p1).toBe(25);
    expect(posted.bets.p2).toBe(50);
    expect(posted.currentBet).toBe(50);
    expect(posted.players.find((p) => p.id === 'p1')!.stack).toBe(975);
  });

  it('sets the action anchor to the big blind seat so action starts after it', () => {
    const state = startHand(createTournament(makePlayers(3, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.actionAnchorSeat).toBe(2);
  });

  it('makes the dealer the small blind in heads-up play', () => {
    const state = startHand(createTournament(makePlayers(2, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.bets.p0).toBe(25);
    expect(posted.bets.p1).toBe(50);
  });
});
