'use client';

import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';

export interface TransientText {
  text: string;
  /** Changes every time a new value should retrigger the show timer. */
  key: number;
}

// Shows `value` for `ms` after each key change, then hides.
function useTransient(value: TransientText | null, ms: number): TransientText | null {
  const [shown, setShown] = useState<TransientText | null>(null);
  useEffect(() => {
    if (!value) return;
    setShown(value);
    const timer = setTimeout(() => setShown(null), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return shown;
}

const PLATE_STYLE: React.CSSProperties = {
  minWidth: 110,
  padding: '4px 10px',
  borderRadius: 8,
  background: 'rgba(10, 10, 14, 0.78)',
  color: '#eee',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  textAlign: 'center',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

export function PlayerPlate({
  position,
  name,
  stack,
  bet,
  isDealer,
  isTurn,
  isFolded,
  isAllIn,
  isWinner,
  badge,
  talk,
}: {
  position: [number, number, number];
  name: string;
  stack: number;
  bet: number;
  isDealer: boolean;
  isTurn: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isWinner: boolean;
  badge: TransientText | null;
  talk: TransientText | null;
}) {
  const visibleBadge = useTransient(badge, 1200);
  const visibleTalk = useTransient(talk, 2500);

  const border = isWinner
    ? '2px solid #ffd54a'
    : isTurn
      ? '2px solid #6ecbff'
      : '2px solid transparent';

  return (
    <group position={position}>
      <Html center position={[0, 1.75, 0]} distanceFactor={6} zIndexRange={[20, 0]}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: isFolded ? 0.45 : 1 }}>
          {visibleTalk && (
            <div style={{ ...PLATE_STYLE, background: 'rgba(240, 240, 245, 0.92)', color: '#222', maxWidth: 220, whiteSpace: 'normal' }}>
              {visibleTalk.text}
            </div>
          )}
          {visibleBadge && (
            <div style={{ ...PLATE_STYLE, background: 'rgba(110, 203, 255, 0.92)', color: '#03222f', fontWeight: 700 }}>
              {visibleBadge.text}
            </div>
          )}
          <div style={{ ...PLATE_STYLE, border, boxShadow: isTurn ? '0 0 10px rgba(110, 203, 255, 0.8)' : 'none' }}>
            <div style={{ fontWeight: 700 }}>
              {isDealer && (
                <span style={{ display: 'inline-block', width: 16, height: 16, lineHeight: '16px', borderRadius: 8, background: '#ffd54a', color: '#000', marginRight: 5, fontSize: 11 }}>
                  D
                </span>
              )}
              {name}
              {isAllIn && <span style={{ color: '#ff8a65', marginLeft: 5 }}>ALL-IN</span>}
            </div>
            <div>{stack.toLocaleString()}</div>
            {bet > 0 && <div style={{ color: '#9fd89f' }}>Bet {bet.toLocaleString()}</div>}
          </div>
        </div>
      </Html>
    </group>
  );
}
