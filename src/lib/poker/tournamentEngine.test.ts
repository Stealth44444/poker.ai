import { describe, it, expect } from 'vitest';
import {
  createTournament, startHand, advanceStreet, resolveShowdown, isTournamentOver, getTournamentWinner,
} from './tournamentEngine';
import { Player } from './types';

function makePlayers(count: number, stack = 1000): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, name: `p${i}`, stack, holeCards: [], isFolded: false, isAllIn: false, seat: i,
  }));
}

describe('startHand', () => {
  it('deals two hole cards to each active player and removes them from the deck', () => {
    const hand = startHand(createTournament(makePlayers(3)));
    hand.players.forEach((p) => expect(p.holeCards.length).toBe(2));
    expect(hand.deck.length).toBe(52 - 3 * 2);
  });

  it('skips busted players', () => {
    const players = makePlayers(3);
    players[0].stack = 0;
    const hand = startHand(createTournament(players));
    expect(hand.players[0].holeCards.length).toBe(0);
    expect(hand.players[0].isFolded).toBe(true);
  });

  it('raises blinds every N hands', () => {
    let tournament = createTournament(makePlayers(2), 25, 2);
    for (let i = 0; i < 3; i++) tournament = startHand(tournament);
    expect(tournament.handNumber).toBe(3);
    expect(tournament.smallBlind).toBe(50);
  });

  it('rotates the dealer button each hand', () => {
    let tournament = createTournament(makePlayers(3));
    tournament = startHand(tournament);
    expect(tournament.dealerSeat).toBe(0);
    tournament = startHand(tournament);
    expect(tournament.dealerSeat).toBe(1);
  });

  it('resets betting round fields for the new hand', () => {
    const hand = startHand(createTournament(makePlayers(2)));
    expect(hand.currentBet).toBe(0);
    expect(hand.actedThisRound).toEqual([]);
  });
});

describe('advanceStreet', () => {
  it('deals the flop with 3 cards from preflop', () => {
    const flop = advanceStreet(startHand(createTournament(makePlayers(2))));
    expect(flop.street).toBe('flop');
    expect(flop.communityCards.length).toBe(3);
  });

  it('deals one card per street from flop through river', () => {
    let state = advanceStreet(startHand(createTournament(makePlayers(2))));
    state = advanceStreet(state);
    expect(state.street).toBe('turn');
    expect(state.communityCards.length).toBe(4);
    state = advanceStreet(state);
    expect(state.street).toBe('river');
    expect(state.communityCards.length).toBe(5);
  });

  it('resets currentBet and actedThisRound for the new betting round', () => {
    let state = startHand(createTournament(makePlayers(2)));
    state = { ...state, currentBet: 50, actedThisRound: ['p0', 'p1'] };
    const flop = advanceStreet(state);
    expect(flop.currentBet).toBe(0);
    expect(flop.actedThisRound).toEqual([]);
  });
});

describe('resolveShowdown', () => {
  it('awards the pot to the last player standing without a card comparison', () => {
    let state = startHand(createTournament(makePlayers(2)));
    state = {
      ...state,
      players: state.players.map((p, i) => ({ ...p, stack: 900, isFolded: i === 1 })),
      bets: { p0: 100, p1: 100 },
    };
    const { state: after, result } = resolveShowdown(state);
    expect(result.potsAwarded[0].winnerIds).toEqual(['p0']);
    expect(after.players.find((p) => p.id === 'p0')!.stack).toBe(1100);
  });
});

describe('tournament end detection', () => {
  it('is not over with multiple players holding chips', () => {
    expect(isTournamentOver(createTournament(makePlayers(3)))).toBe(false);
  });

  it('is over when only one player has chips left', () => {
    const players = makePlayers(2);
    players[1].stack = 0;
    const tournament = createTournament(players);
    expect(isTournamentOver(tournament)).toBe(true);
    expect(getTournamentWinner(tournament)?.id).toBe('p0');
  });
});
