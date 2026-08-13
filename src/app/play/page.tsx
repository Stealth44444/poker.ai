'use client';

import { useCallback, useEffect, useState } from 'react';
import { PokerScene } from '@/components/scene/PokerScene';
import { useEventPlayback } from '@/hooks/useEventPlayback';
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
  const { isDone } = useEventPlayback(events);

  useEffect(() => {
    callAction().then((res) => {
      setState(res.state);
      setEvents(res.events);
      setValidActions(res.validActions);
    });
  }, []);

  const act = useCallback((type: ActionType, amount?: number) => {
    callAction({ playerId: HUMAN_ID, type, amount }).then((res) => {
      setState(res.state);
      setEvents(res.events);
      setValidActions(res.validActions);
    });
  }, []);

  if (!state) return <div>Loading...</div>;

  const human = state.players.find((p) => p.id === HUMAN_ID);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <PokerScene players={state.players} communityCards={state.communityCards} />
      {human && human.holeCards.length > 0 && (
        <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
          {human.holeCards.map((card) => (
            <div
              key={card}
              style={{
                width: 48,
                height: 68,
                background: 'white',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: card[1] === 'h' || card[1] === 'd' ? '#c0392b' : '#1a1a1a',
              }}
            >
              {card}
            </div>
          ))}
        </div>
      )}
      {isDone && (
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
