import { Card, Player, Street } from './types';
import { createDeck, shuffle, draw } from './deck';
import { determineWinners } from './handEvaluator';
import { calculateSidePots, Pot } from './sidePots';

export interface TournamentState {
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  street: Street;
  dealerSeat: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  handsPerBlindLevel: number;
  bets: Record<string, number>;
}

export function createTournament(players: Player[], startingSmallBlind = 25, handsPerBlindLevel = 10): TournamentState {
  return {
    players,
    deck: [],
    communityCards: [],
    street: 'preflop',
    dealerSeat: 0,
    smallBlind: startingSmallBlind,
    bigBlind: startingSmallBlind * 2,
    handNumber: 0,
    handsPerBlindLevel,
    bets: {},
  };
}

export function startHand(state: TournamentState): TournamentState {
  const deck = shuffle(createDeck());
  let remaining = deck;
  const players = state.players.map((p) => {
    if (p.stack <= 0) return { ...p, holeCards: [], isFolded: true, isAllIn: false };
    const { drawn, remaining: rest } = draw(remaining, 2);
    remaining = rest;
    return { ...p, holeCards: drawn, isFolded: false, isAllIn: false };
  });

  const handNumber = state.handNumber + 1;
  const shouldRaiseBlinds = state.handNumber > 0 && handNumber % state.handsPerBlindLevel === 1;
  const smallBlind = shouldRaiseBlinds ? state.smallBlind * 2 : state.smallBlind;

  return {
    ...state,
    players,
    deck: remaining,
    communityCards: [],
    street: 'preflop',
    handNumber,
    smallBlind,
    bigBlind: smallBlind * 2,
    bets: {},
  };
}

const NEXT_STREET: Record<Street, Street> = {
  preflop: 'flop',
  flop: 'turn',
  turn: 'river',
  river: 'showdown',
  showdown: 'showdown',
};
const CARDS_TO_DEAL: Record<Street, number> = { preflop: 3, flop: 1, turn: 1, river: 0, showdown: 0 };

export function advanceStreet(state: TournamentState): TournamentState {
  const { drawn, remaining } = draw(state.deck, CARDS_TO_DEAL[state.street]);
  return {
    ...state,
    street: NEXT_STREET[state.street],
    communityCards: [...state.communityCards, ...drawn],
    deck: remaining,
  };
}

export interface HandResult {
  potsAwarded: { pot: Pot; winnerIds: string[]; amountPerWinner: number }[];
}

export function resolveShowdown(state: TournamentState): { state: TournamentState; result: HandResult } {
  const pots = calculateSidePots(state.players, state.bets);
  const potsAwarded = pots.map((pot) => {
    const contenders = pot.eligiblePlayerIds.map((id) => state.players.find((p) => p.id === id)!);
    const winnerIds = contenders.length === 1
      ? [contenders[0].id]
      : determineWinners(contenders.map((p) => ({ playerId: p.id, holeCards: p.holeCards })), state.communityCards);
    const amountPerWinner = Math.floor(pot.amount / winnerIds.length);
    return { pot, winnerIds, amountPerWinner };
  });

  const players = state.players.map((p) => {
    const won = potsAwarded.reduce((sum, award) => sum + (award.winnerIds.includes(p.id) ? award.amountPerWinner : 0), 0);
    return { ...p, stack: p.stack + won };
  });

  return { state: { ...state, players, bets: {} }, result: { potsAwarded } };
}

export function isTournamentOver(state: TournamentState): boolean {
  return state.players.filter((p) => p.stack > 0).length <= 1;
}

export function getTournamentWinner(state: TournamentState): Player | null {
  const remaining = state.players.filter((p) => p.stack > 0);
  return remaining.length === 1 ? remaining[0] : null;
}
