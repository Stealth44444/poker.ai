'use client';

import { Street } from '@/lib/poker/types';

const STREET_LABELS: Record<Street, string> = {
  preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown',
};

export function TableHUD({
  pot,
  street,
  handNumber,
  smallBlind,
  bigBlind,
}: {
  pot: number;
  street: Street;
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 18,
        alignItems: 'baseline',
        padding: '8px 18px',
        borderRadius: 10,
        background: 'rgba(10, 10, 14, 0.72)',
        color: '#eee',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 700 }}>Pot {pot.toLocaleString()}</span>
      <span>{STREET_LABELS[street]}</span>
      <span>
        Blinds {smallBlind}/{bigBlind}
      </span>
      <span>Hand #{handNumber}</span>
    </div>
  );
}
