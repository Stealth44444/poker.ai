import { describe, it, expect } from 'vitest';
import { nextActiveSeatAfter, postBlinds, findNextToAct, playUntilHumanOrHandEnd, DecisionFn } from './turnOrchestrator';
import { createTournament, startHand } from './tournamentEngine';
import { Player } from './types';
import { Persona } from './personas';

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

describe('findNextToAct', () => {
  it('returns the player after the action anchor who still owes chips', () => {
    const state = postBlinds(startHand(createTournament(makePlayers(3, 1000), 25)));
    expect(findNextToAct(state)).toBe('p0');
  });

  it('returns null once everyone has matched the bet and acted', () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const settled = { ...state, actedThisRound: ['p0', 'p1'], bets: { p0: 50, p1: 50 } };
    expect(findNextToAct(settled)).toBeNull();
  });
});

describe('playUntilHumanOrHandEnd', () => {
  const persona: Persona = { id: 'p1', name: 'Bot', style: 'loose', description: 'Calls a lot.' };
  const alwaysCheckOrCall: DecisionFn = async (context) => {
    if (context.validActions.includes('check')) return { action: 'check' };
    return { action: 'call' };
  };

  it('returns immediately without calling the AI when it is already the human turn', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    let called = false;
    const spyDecisionFn: DecisionFn = async () => {
      called = true;
      return { action: 'check' };
    };
    const { events } = await playUntilHumanOrHandEnd(state, 'p0', { p1: persona }, spyDecisionFn);
    expect(events).toEqual([]);
    expect(called).toBe(false);
  });

  it('plays AI turns after a human action and stops back at the human on the next street', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { state: after, events } = await playUntilHumanOrHandEnd(
      state,
      'p0',
      { p1: persona },
      alwaysCheckOrCall,
      { playerId: 'p0', type: 'call' }
    );
    expect(after.street).toBe('flop');
    expect(events.map((e) => e.type)).toEqual(['action', 'action', 'street', 'action']);
  });

  it('resolves the hand immediately when the human folds', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { events } = await playUntilHumanOrHandEnd(
      state,
      'p0',
      { p1: persona },
      alwaysCheckOrCall,
      { playerId: 'p0', type: 'fold' }
    );
    expect(events[events.length - 1].type).toBe('showdown');
    expect(events[events.length - 1].potsAwarded?.[0].winnerIds).toEqual(['p1']);
  });

  it('attaches a snapshot with stacks, bets, and pot to each event', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { events } = await playUntilHumanOrHandEnd(
      state, 'p0', { p1: persona }, alwaysCheckOrCall, { playerId: 'p0', type: 'call' }
    );
    const first = events[0];
    expect(first.type).toBe('action');
    expect(first.snapshot!.bets).toEqual({ p0: 50, p1: 50 });
    expect(first.snapshot!.pot).toBe(100);
    expect(first.snapshot!.players.find((p) => p.id === 'p0')!.stack).toBe(950);

    const streetEvent = events.find((e) => e.type === 'street')!;
    expect(streetEvent.snapshot!.street).toBe('flop');
    expect(streetEvent.snapshot!.communityCards).toHaveLength(3);
    expect(streetEvent.snapshot!.currentBet).toBe(0);
  });

  it('snapshots awarded stacks and cleared bets on the showdown event', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { events } = await playUntilHumanOrHandEnd(
      state, 'p0', { p1: persona }, alwaysCheckOrCall, { playerId: 'p0', type: 'fold' }
    );
    const showdown = events[events.length - 1];
    expect(showdown.type).toBe('showdown');
    expect(showdown.snapshot!.pot).toBe(0);
    expect(showdown.snapshot!.bets).toEqual({});
    // p1 posted 50, wins the 75 pot: 1000 - 50 + 75
    expect(showdown.snapshot!.players.find((p) => p.id === 'p1')!.stack).toBe(1025);
  });

  it('accumulates playerStats for every action taken during the hand', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { state: after } = await playUntilHumanOrHandEnd(
      state, 'p0', { p1: persona }, alwaysCheckOrCall, { playerId: 'p0', type: 'call' }
    );
    // p0's initial call is the only action recorded for the human; the AI
    // (p1) acts once on the preflop round and once more after the flop —
    // matches the ['action', 'action', 'street', 'action'] event sequence
    // from the playback test above.
    expect(after.playerStats.p0.actions).toBe(1);
    expect(after.playerStats.p1.actions).toBe(2);
  });

  it('passes hand-strength, pot-odds, position, and opponent-read context to the decision function', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(3, 1000), 25)));
    let capturedContext: Parameters<DecisionFn>[0] | null = null;
    const capturingDecisionFn: DecisionFn = async (context) => {
      if (!capturedContext) capturedContext = context;
      if (context.validActions.includes('check')) return { action: 'check' };
      return { action: 'call' };
    };
    await playUntilHumanOrHandEnd(
      state, 'p0', { p1: persona, p2: persona }, capturingDecisionFn, { playerId: 'p0', type: 'fold' }
    );
    expect(capturedContext).not.toBeNull();
    expect(typeof capturedContext!.handStrengthHint).toBe('string');
    expect(typeof capturedContext!.potOddsPercent).toBe('number');
    expect(['button', 'smallBlind', 'bigBlind', 'early', 'middle', 'late']).toContain(capturedContext!.position);
    expect(typeof capturedContext!.opponentReads).toBe('string');
  });
});
