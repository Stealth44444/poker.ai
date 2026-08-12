import { TournamentState } from './tournamentEngine';

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
