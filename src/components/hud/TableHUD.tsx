'use client';

import { Card, Street } from '@/lib/poker/types';
import { HudFrame } from './HudFrame';
import { MiniCard } from './MiniCard';
import { color, font } from './theme';

const STREET_LABELS: Record<Street, string> = {
  preflop: 'PRE-FLOP', flop: 'FLOP', turn: 'TURN', river: 'RIVER', showdown: 'SHOWDOWN',
};

const BOARD_SLOTS = 5;

export function TableHUD({
  pot,
  street,
  handNumber,
  smallBlind,
  bigBlind,
  communityCards,
}: {
  pot: number;
  street: Street;
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  communityCards: Card[];
}) {
  const slots = Array.from({ length: BOARD_SLOTS }, (_, i) => communityCards[i] ?? null);

  return (
    <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
      <HudFrame accent={color.gold} active>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 26px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: color.textMuted }}>POT</div>
              <div
                style={{
                  fontFamily: font.display,
                  fontSize: 30,
                  fontWeight: 700,
                  color: color.gold,
                  textShadow: `0 0 14px ${color.goldGlow}`,
                  lineHeight: 1.1,
                }}
              >
                {pot.toLocaleString()}
              </div>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: color.hairline }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: color.textMuted, letterSpacing: 1 }}>
              <span style={{ color: color.cyan, fontWeight: 600 }}>{STREET_LABELS[street]}</span>
              <span>
                BLINDS {smallBlind}/{bigBlind}
              </span>
              <span>HAND #{handNumber}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {slots.map((card, i) => (
              <MiniCard key={i} card={card} size={34} />
            ))}
          </div>
        </div>
      </HudFrame>
    </div>
  );
}
