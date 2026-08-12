export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerAction {
  playerId: string;
  type: ActionType;
  amount?: number;
}

export interface Player {
  id: string;
  name: string;
  stack: number;
  holeCards: Card[];
  isFolded: boolean;
  isAllIn: boolean;
  seat: number;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
