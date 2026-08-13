import { Player, PlayerAction, ActionType } from './types';

export interface BettingRoundState {
  players: Player[];
  currentBet: number;
  minRaise: number;
  bets: Record<string, number>;
}

export function validActions(state: BettingRoundState, playerId: string): ActionType[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isFolded || player.isAllIn) return [];

  const owed = state.currentBet - (state.bets[playerId] ?? 0);
  const actions: ActionType[] = ['fold'];

  actions.push(owed <= 0 ? 'check' : 'call');

  if (player.stack > owed) {
    actions.push(state.currentBet === 0 ? 'bet' : 'raise');
  }
  if (player.stack > 0) {
    actions.push('all-in');
  }

  return actions;
}

export function applyAction(state: BettingRoundState, action: PlayerAction): BettingRoundState {
  const players = state.players.map((p) => ({ ...p }));
  const player = players.find((p) => p.id === action.playerId);
  if (!player) throw new Error(`Unknown player: ${action.playerId}`);

  const bets = { ...state.bets };
  const committed = bets[player.id] ?? 0;
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;

  switch (action.type) {
    case 'fold':
      player.isFolded = true;
      break;
    case 'check':
      break;
    case 'call': {
      const owed = Math.min(currentBet - committed, player.stack);
      player.stack -= owed;
      bets[player.id] = committed + owed;
      if (player.stack === 0) player.isAllIn = true;
      break;
    }
    case 'bet':
    case 'raise': {
      const amount = action.amount ?? 0;
      const maxAmount = committed + player.stack;
      const raiseSize = amount - currentBet;
      const isShoveShortOfMinRaise = amount >= maxAmount;
      if (raiseSize < minRaise && !isShoveShortOfMinRaise) {
        throw new Error(`Raise of ${raiseSize} is below minimum raise of ${minRaise}`);
      }
      if (amount > maxAmount) {
        throw new Error(`Bet/raise of ${amount} exceeds available chips (max ${maxAmount})`);
      }
      const toPutIn = amount - committed;
      player.stack -= toPutIn;
      bets[player.id] = amount;
      minRaise = Math.max(minRaise, raiseSize);
      currentBet = amount;
      if (player.stack === 0) player.isAllIn = true;
      break;
    }
    case 'all-in': {
      const allInAmount = committed + player.stack;
      bets[player.id] = allInAmount;
      player.stack = 0;
      player.isAllIn = true;
      if (allInAmount > currentBet) {
        minRaise = Math.max(minRaise, allInAmount - currentBet);
        currentBet = allInAmount;
      }
      break;
    }
  }

  return { players, currentBet, minRaise, bets };
}
