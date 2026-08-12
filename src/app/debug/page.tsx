'use client';

import { useState } from 'react';

interface HandEvent {
  type: 'action' | 'street' | 'showdown';
  playerId?: string;
  action?: string;
  amount?: number;
  tableTalk?: string;
  isFallback?: boolean;
  street?: string;
  potsAwarded?: { winnerIds: string[]; amountPerWinner: number }[];
}

interface PlayerView {
  id: string;
  name: string;
  stack: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
}

interface TournamentStateView {
  players: PlayerView[];
  communityCards: string[];
  street: string;
  bets: Record<string, number>;
}

interface ActionResponse {
  sessionId: string;
  state: TournamentStateView;
  events: HandEvent[];
  validActions: string[];
  error?: string;
}

export default function DebugPage() {
  const [data, setData] = useState<ActionResponse | null>(null);
  const [raiseAmount, setRaiseAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  async function callAction(action?: { type: string; amount?: number }) {
    setLoading(true);
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action ? { action: { playerId: 'human', ...action } } : {}),
      });
      const json: ActionResponse = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  const pot = data ? Object.values(data.state.bets).reduce((a, b) => a + b, 0) : 0;

  return (
    <main style={{ padding: 24, fontFamily: 'monospace' }}>
      <h1>Poker Debug</h1>
      <button onClick={() => callAction()} disabled={loading}>Start / Next Hand</button>

      {data?.error && <p style={{ color: 'red' }}>Error: {data.error}</p>}

      {data && (
        <>
          <p>Street: {data.state.street} | Pot: {pot}</p>
          <p>Community: {data.state.communityCards.join(' ') || '-'}</p>

          <table border={1} cellPadding={4}>
            <thead>
              <tr><th>Name</th><th>Stack</th><th>Cards</th><th>Folded</th><th>All-in</th></tr>
            </thead>
            <tbody>
              {data.state.players.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.stack}</td>
                  <td>{p.holeCards.join(' ')}</td>
                  <td>{p.isFolded ? 'Y' : ''}</td>
                  <td>{p.isAllIn ? 'Y' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Valid actions</h3>
          <div>
            {data.validActions.map((a) => (
              <button
                key={a}
                onClick={() => callAction(a === 'bet' || a === 'raise' ? { type: a, amount: raiseAmount } : { type: a })}
              >
                {a}
              </button>
            ))}
            {(data.validActions.includes('bet') || data.validActions.includes('raise')) && (
              <input type="number" value={raiseAmount} onChange={(e) => setRaiseAmount(Number(e.target.value))} />
            )}
          </div>

          <h3>Event log</h3>
          <ul>
            {data.events.map((e, i) => (
              <li key={i}>
                {e.type === 'action' &&
                  `${e.playerId}: ${e.action}${e.amount ? ' ' + e.amount : ''}${e.tableTalk ? ' — "' + e.tableTalk + '"' : ''}${e.isFallback ? ' (fallback)' : ''}`}
                {e.type === 'street' && `-- ${e.street} --`}
                {e.type === 'showdown' && `Showdown: ${JSON.stringify(e.potsAwarded)}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
