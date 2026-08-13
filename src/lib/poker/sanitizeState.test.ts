import { describe, it, expect } from 'vitest';
import { sanitizeStateForClient } from './sanitizeState';
import { createTournament } from './tournamentEngine';
import { Card, Player } from './types';

function makeState() {
  const players: Player[] = [
    { id: 'human', name: 'You', stack: 900, holeCards: ['Ah', 'Kh'], isFolded: false, isAllIn: false, seat: 0 },
    { id: 'ai1', name: 'Ace', stack: 800, holeCards: ['2c', '7d'], isFolded: false, isAllIn: false, seat: 1 },
    { id: 'ai2', name: 'Rocky', stack: 0, holeCards: ['Qs', 'Qd'], isFolded: true, isAllIn: false, seat: 2 },
  ];
  const state = createTournament(players);
  const deck: Card[] = ['Th', '9h', '8h'];
  return { ...state, deck };
}

describe('sanitizeStateForClient', () => {
  it('always keeps the human player their own hole cards', () => {
    const sanitized = sanitizeStateForClient(makeState(), 'human', false);
    expect(sanitized.players.find((p) => p.id === 'human')!.holeCards).toEqual(['Ah', 'Kh']);
  });

  it('hides opponent hole cards mid-hand regardless of fold status', () => {
    const sanitized = sanitizeStateForClient(makeState(), 'human', false);
    expect(sanitized.players.find((p) => p.id === 'ai1')!.holeCards).toEqual([]);
    expect(sanitized.players.find((p) => p.id === 'ai2')!.holeCards).toEqual([]);
  });

  it('reveals non-folded opponents at showdown but keeps folded hands hidden', () => {
    const sanitized = sanitizeStateForClient(makeState(), 'human', true);
    expect(sanitized.players.find((p) => p.id === 'ai1')!.holeCards).toEqual(['2c', '7d']);
    expect(sanitized.players.find((p) => p.id === 'ai2')!.holeCards).toEqual([]);
  });

  it('never exposes the remaining deck', () => {
    const sanitized = sanitizeStateForClient(makeState(), 'human', true);
    expect(sanitized.deck).toEqual([]);
  });
});
