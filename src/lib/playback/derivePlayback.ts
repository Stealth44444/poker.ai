import { EventSnapshot, HandEvent } from '@/lib/poker/turnOrchestrator';
import { Card, Player } from '@/lib/poker/types';

export interface PlaybackDisplay {
  /** Snapshot of the last visible event; null before any event is visible. */
  displayState: EventSnapshot | null;
  /** Player whose action event is next in the not-yet-visible queue. */
  upcomingActorId: string | null;
  latestEvent: HandEvent | null;
}

export function derivePlayback(events: HandEvent[], visibleCount: number): PlaybackDisplay {
  const visible = events.slice(0, visibleCount);
  const lastWithSnapshot = [...visible].reverse().find((e) => e.snapshot);
  const upcoming = events.slice(visibleCount).find((e) => e.type === 'action');
  return {
    displayState: lastWithSnapshot?.snapshot ?? null,
    upcomingActorId: upcoming?.playerId ?? null,
    latestEvent: visible.length > 0 ? visible[visible.length - 1] : null,
  };
}

const ACTION_LABELS: Record<string, string> = {
  fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', 'all-in': 'All-in',
};

export function actionLabel(event: Pick<HandEvent, 'action' | 'amount'>): string {
  const base = ACTION_LABELS[event.action ?? ''] ?? '';
  return event.amount && (event.action === 'bet' || event.action === 'raise') ? `${base} ${event.amount}` : base;
}

export interface TableView {
  players: Player[];
  bets: Record<string, number>;
  pot: number;
  communityCards: Card[];
}

/** Server state merged with the current display snapshot: snapshot wins for
 *  stacks/flags/bets/board, server state keeps identity fields (name, cards, seat). */
export function deriveView(
  state: { players: Player[]; bets: Record<string, number>; communityCards: Card[] },
  snapshot: EventSnapshot | null
): TableView {
  if (!snapshot) {
    return {
      players: state.players,
      bets: state.bets,
      pot: Object.values(state.bets).reduce((sum, b) => sum + b, 0),
      communityCards: state.communityCards,
    };
  }
  return {
    players: state.players.map((p) => {
      const d = snapshot.players.find((s) => s.id === p.id);
      return d ? { ...p, stack: d.stack, isFolded: d.isFolded, isAllIn: d.isAllIn } : p;
    }),
    bets: snapshot.bets,
    pot: snapshot.pot,
    communityCards: snapshot.communityCards,
  };
}
