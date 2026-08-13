'use client';

import { useCallback, useEffect, useState } from 'react';
import { PokerScene, SeatAction } from '@/components/scene/PokerScene';
import { HoleCardsHUD } from '@/components/scene/HoleCardsHUD';
import { useEventPlayback } from '@/hooks/useEventPlayback';
import { actionLabel, deriveView } from '@/lib/playback/derivePlayback';
import { TournamentState } from '@/lib/poker/tournamentEngine';
import { HandEvent } from '@/lib/poker/turnOrchestrator';
import { ActionType, PlayerAction } from '@/lib/poker/types';

interface ActionResponse {
  state: TournamentState;
  events: HandEvent[];
  validActions: ActionType[];
}

const HUMAN_ID = 'human';

async function callAction(action?: PlayerAction): Promise<ActionResponse> {
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return res.json();
}

export default function PlayPage() {
  const [state, setState] = useState<TournamentState | null>(null);
  const [events, setEvents] = useState<HandEvent[]>([]);
  const [validActions, setValidActions] = useState<ActionType[]>([]);
  const { isDone, visibleCount, displayState, upcomingActorId, latestEvent } = useEventPlayback(events);

  const applyResponse = useCallback((res: ActionResponse) => {
    setState(res.state);
    setEvents(res.events);
    setValidActions(res.validActions);
  }, []);

  useEffect(() => {
    callAction().then(applyResponse);
  }, [applyResponse]);

  const act = useCallback(
    (type: ActionType, amount?: number) => {
      callAction({ playerId: HUMAN_ID, type, amount }).then(applyResponse);
    },
    [applyResponse]
  );

  if (!state) return <div>Loading...</div>;

  const view = deriveView(state, displayState);
  const human = view.players.find((p) => p.id === HUMAN_ID);
  const handEnded = events.length > 0 && events[events.length - 1].type === 'showdown';
  const isHumanTurn = isDone && !handEnded && validActions.length > 0;
  const turnPlayerId = !isDone ? upcomingActorId : isHumanTurn ? HUMAN_ID : null;

  const seatAction: SeatAction | null =
    latestEvent?.type === 'action' && latestEvent.playerId
      ? {
          playerId: latestEvent.playerId,
          badge: { text: actionLabel(latestEvent), key: visibleCount },
          talk: latestEvent.tableTalk ? { text: latestEvent.tableTalk, key: visibleCount } : null,
        }
      : null;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <PokerScene
        view={view}
        dealerSeat={state.dealerSeat}
        turnPlayerId={turnPlayerId}
        seatAction={seatAction}
        revealedCount={0}
        winnerIds={[]}
      />
      {human && <HoleCardsHUD cards={human.holeCards} />}
      {isHumanTurn && (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
          {validActions.map((type) => (
            <button key={type} onClick={() => act(type)}>
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
