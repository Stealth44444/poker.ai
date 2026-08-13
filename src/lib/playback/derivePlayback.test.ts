import { describe, it, expect } from 'vitest';
import { derivePlayback, actionLabel, deriveView } from './derivePlayback';
import { EventSnapshot, HandEvent } from '@/lib/poker/turnOrchestrator';
import { Player } from '@/lib/poker/types';

function snap(pot: number, overrides: Partial<EventSnapshot> = {}): EventSnapshot {
  return { players: [], bets: {}, pot, communityCards: [], street: 'preflop', currentBet: 0, ...overrides };
}

const events: HandEvent[] = [
  { type: 'action', playerId: 'a', action: 'call', snapshot: snap(100) },
  { type: 'street', street: 'flop', snapshot: snap(100) },
  { type: 'action', playerId: 'b', action: 'raise', amount: 400, snapshot: snap(500) },
];

describe('derivePlayback', () => {
  it('has no display state and points at the first actor before any event is visible', () => {
    const d = derivePlayback(events, 0);
    expect(d.displayState).toBeNull();
    expect(d.upcomingActorId).toBe('a');
    expect(d.latestEvent).toBeNull();
  });

  it('tracks the last visible snapshot and the next hidden actor', () => {
    const d = derivePlayback(events, 1);
    expect(d.displayState!.pot).toBe(100);
    expect(d.upcomingActorId).toBe('b');
    expect(d.latestEvent).toBe(events[0]);
  });

  it('uses the final snapshot and no upcoming actor when playback is done', () => {
    const d = derivePlayback(events, 3);
    expect(d.displayState!.pot).toBe(500);
    expect(d.upcomingActorId).toBeNull();
    expect(d.latestEvent).toBe(events[2]);
  });
});

describe('actionLabel', () => {
  it('formats actions with and without amounts', () => {
    expect(actionLabel({ type: 'action', action: 'fold' })).toBe('Fold');
    expect(actionLabel({ type: 'action', action: 'check' })).toBe('Check');
    expect(actionLabel({ type: 'action', action: 'call' })).toBe('Call');
    expect(actionLabel({ type: 'action', action: 'raise', amount: 400 })).toBe('Raise 400');
    expect(actionLabel({ type: 'action', action: 'bet', amount: 200 })).toBe('Bet 200');
    expect(actionLabel({ type: 'action', action: 'all-in' })).toBe('All-in');
  });
});

describe('deriveView', () => {
  const players: Player[] = [
    { id: 'a', name: 'A', stack: 900, holeCards: ['As', 'Ks'], isFolded: true, isAllIn: false, seat: 0 },
    { id: 'b', name: 'B', stack: 1100, holeCards: [], isFolded: false, isAllIn: false, seat: 1 },
  ];
  const state = { players, bets: { a: 50, b: 100 }, communityCards: ['2h', '3d', '4c'] as Player['holeCards'] };

  it('falls back to server state without a snapshot', () => {
    const view = deriveView(state, null);
    expect(view.players).toEqual(players);
    expect(view.pot).toBe(150);
    expect(view.communityCards).toEqual(state.communityCards);
  });

  it('overrides stacks and flags from the snapshot but keeps names and hole cards', () => {
    const snapshot = snap(80, {
      players: [
        { id: 'a', stack: 950, isFolded: false, isAllIn: false },
        { id: 'b', stack: 1000, isFolded: false, isAllIn: true },
      ],
      bets: { a: 50, b: 30 },
      communityCards: [],
    });
    const view = deriveView(state, snapshot);
    const a = view.players.find((p) => p.id === 'a')!;
    expect(a.stack).toBe(950);
    expect(a.isFolded).toBe(false);
    expect(a.name).toBe('A');
    expect(a.holeCards).toEqual(['As', 'Ks']);
    expect(view.players.find((p) => p.id === 'b')!.isAllIn).toBe(true);
    expect(view.bets).toEqual({ a: 50, b: 30 });
    expect(view.pot).toBe(80);
    expect(view.communityCards).toEqual([]);
  });
});
