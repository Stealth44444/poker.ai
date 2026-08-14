import { TournamentState, advanceStreet, resolveShowdown, HandResult } from './tournamentEngine';
import { applyAction, validActions } from './bettingEngine';
import { ActionType, Card, PlayerAction, Street } from './types';
import { Persona } from './personas';
import { DecisionContext, Decision } from '../ai/decideAction';

export function nextActiveSeatAfter(state: TournamentState, fromSeat: number): string | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (fromSeat + i) % n;
    const player = state.players.find((p) => p.seat === seat);
    if (player && !player.isFolded && !player.isAllIn) return player.id;
  }
  return null;
}

function postForcedBet(state: TournamentState, playerId: string, amount: number): TournamentState {
  const players = state.players.map((p) => ({ ...p }));
  const player = players.find((p) => p.id === playerId)!;
  const toPost = Math.min(amount, player.stack);
  player.stack -= toPost;
  if (player.stack === 0) player.isAllIn = true;
  const bets = { ...state.bets, [playerId]: (state.bets[playerId] ?? 0) + toPost };
  return { ...state, players, bets };
}

export function postBlinds(state: TournamentState): TournamentState {
  const activeCount = state.players.filter((p) => !p.isFolded).length;
  const dealerPlayer = state.players.find((p) => p.seat === state.dealerSeat);
  const dealerIsSmallBlind = activeCount === 2 && !!dealerPlayer && !dealerPlayer.isFolded;

  const sbId = dealerIsSmallBlind ? dealerPlayer!.id : nextActiveSeatAfter(state, state.dealerSeat);
  if (!sbId) return state;
  let working = postForcedBet(state, sbId, state.smallBlind);

  const sbSeat = working.players.find((p) => p.id === sbId)!.seat;
  const bbId = nextActiveSeatAfter(working, sbSeat);
  if (!bbId) return working;
  working = postForcedBet(working, bbId, state.bigBlind);
  const bbSeat = working.players.find((p) => p.id === bbId)!.seat;

  return { ...working, currentBet: state.bigBlind, minRaise: state.bigBlind, actionAnchorSeat: bbSeat };
}

export function findNextToAct(state: TournamentState): string | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (state.actionAnchorSeat + i) % n;
    const player = state.players.find((p) => p.seat === seat);
    if (!player || player.isFolded || player.isAllIn) continue;
    const hasActed = state.actedThisRound.includes(player.id);
    const owes = (state.bets[player.id] ?? 0) < state.currentBet;
    if (!hasActed || owes) return player.id;
  }
  return null;
}

// Display-relevant slice of state at the moment an event occurred, so the UI
// can show stacks/pot in sync with delayed event playback instead of jumping
// ahead to the final server state.
export interface EventSnapshot {
  players: { id: string; stack: number; isFolded: boolean; isAllIn: boolean }[];
  bets: Record<string, number>;
  pot: number;
  communityCards: Card[];
  street: Street;
  currentBet: number;
}

function takeSnapshot(state: TournamentState): EventSnapshot {
  return {
    players: state.players.map(({ id, stack, isFolded, isAllIn }) => ({ id, stack, isFolded, isAllIn })),
    bets: { ...state.bets },
    pot: Object.values(state.bets).reduce((sum, b) => sum + b, 0),
    communityCards: [...state.communityCards],
    street: state.street,
    currentBet: state.currentBet,
  };
}

export interface HandEvent {
  type: 'action' | 'street' | 'showdown';
  playerId?: string;
  action?: ActionType;
  amount?: number;
  isFallback?: boolean;
  street?: Street;
  potsAwarded?: HandResult['potsAwarded'];
  snapshot?: EventSnapshot;
}

export type DecisionFn = (context: DecisionContext, persona: Persona) => Promise<Decision>;

export async function playUntilHumanOrHandEnd(
  initialState: TournamentState,
  humanPlayerId: string,
  personasById: Record<string, Persona>,
  decisionFn: DecisionFn,
  humanAction?: PlayerAction
): Promise<{ state: TournamentState; events: HandEvent[] }> {
  const events: HandEvent[] = [];
  let state = initialState;

  const applyAndRecord = (action: PlayerAction, isFallback?: boolean) => {
    let finalAction = action;
    let fellBack = isFallback;
    let result;
    try {
      result = applyAction(state, finalAction);
    } catch {
      const safeType: ActionType = validActions(state, action.playerId).includes('check') ? 'check' : 'fold';
      finalAction = { playerId: action.playerId, type: safeType };
      fellBack = true;
      result = applyAction(state, finalAction);
    }
    state = {
      ...state,
      players: result.players,
      currentBet: result.currentBet,
      minRaise: result.minRaise,
      bets: result.bets,
      actedThisRound: [...state.actedThisRound, finalAction.playerId],
    };
    events.push({ type: 'action', playerId: finalAction.playerId, action: finalAction.type, amount: finalAction.amount, isFallback: fellBack, snapshot: takeSnapshot(state) });
  };

  if (humanAction) {
    applyAndRecord(humanAction);
  }

  while (true) {
    const remaining = state.players.filter((p) => !p.isFolded);
    if (remaining.length === 1) {
      const { state: after, result } = resolveShowdown(state);
      state = after;
      events.push({ type: 'showdown', potsAwarded: result.potsAwarded, snapshot: takeSnapshot(state) });
      return { state, events };
    }

    const nextId = findNextToAct(state);

    if (!nextId) {
      if (state.street === 'river') {
        const { state: after, result } = resolveShowdown(state);
        state = after;
        events.push({ type: 'showdown', potsAwarded: result.potsAwarded, snapshot: takeSnapshot(state) });
        return { state, events };
      }
      state = advanceStreet(state);
      events.push({ type: 'street', street: state.street, snapshot: takeSnapshot(state) });
      continue;
    }

    if (nextId === humanPlayerId) {
      return { state, events };
    }

    const player = state.players.find((p) => p.id === nextId)!;
    const persona = personasById[nextId];
    const pot = Object.values(state.bets).reduce((sum, b) => sum + b, 0);
    const committed = state.bets[nextId] ?? 0;
    const minBetOrRaiseAmount = state.currentBet === 0 ? state.minRaise : state.currentBet + state.minRaise;
    const maxBetOrRaiseAmount = committed + player.stack;
    const decision = await decisionFn(
      {
        holeCards: player.holeCards,
        communityCards: state.communityCards,
        pot,
        toCall: state.currentBet - committed,
        minBetOrRaiseAmount,
        maxBetOrRaiseAmount,
        yourStack: player.stack,
        stacks: Object.fromEntries(state.players.map((p) => [p.id, p.stack])),
        actionHistory: events
          .filter((e) => e.type === 'action')
          .map((e) => `${e.playerId} ${e.action}${e.amount ? ' ' + e.amount : ''}`),
        validActions: validActions(state, nextId),
      },
      persona
    );

    applyAndRecord({ playerId: nextId, type: decision.action, amount: decision.amount }, decision.isFallback);
  }
}
