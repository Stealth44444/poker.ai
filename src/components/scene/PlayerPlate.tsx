'use client';

import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { ActionType } from '@/lib/poker/types';
import { color, cutCorners, font } from '@/components/hud/theme';

export interface ActionBadge {
  text: string;
  actionType: ActionType;
  /** Changes every time a new value should retrigger the show timer. */
  key: number;
}

// Shows `value` for `ms` after each key change, then hides.
function useTransient<T>(value: T | null, ms: number): T | null {
  const [shown, setShown] = useState<T | null>(null);
  useEffect(() => {
    if (!value) return;
    setShown(value);
    const timer = setTimeout(() => setShown(null), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return shown;
}

// Mirrors BetControls' Fold=crimson / Check-Call=emerald / Bet-Raise-All-in=gold
// language so the badge that flashes above a seat reads as part of the same system.
const BADGE_COLOR: Record<ActionType, { bg: string; fg: string; glow: string }> = {
  fold: { bg: color.crimson, fg: '#2a0508', glow: color.crimsonGlow },
  check: { bg: color.emerald, fg: '#04220f', glow: color.emeraldGlow },
  call: { bg: color.emerald, fg: '#04220f', glow: color.emeraldGlow },
  bet: { bg: color.gold, fg: '#241a00', glow: color.goldGlow },
  raise: { bg: color.gold, fg: '#241a00', glow: color.goldGlow },
  'all-in': { bg: color.gold, fg: '#241a00', glow: color.goldGlow },
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
  badge: ActionBadge | null;
}) {
  const visibleBadge = useTransient(badge, 1200);

  const accent = isWinner ? color.gold : isTurn ? color.cyan : 'rgba(255,255,255,0.12)';
  const glow = isWinner ? color.goldGlow : isTurn ? color.cyanGlow : 'transparent';
  const badgeColor = visibleBadge ? BADGE_COLOR[visibleBadge.actionType] : null;

  return (
    <group position={position}>
      <Html center position={[0, 1.75, 0]} distanceFactor={6} zIndexRange={[20, 0]}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: isFolded ? 0.4 : 1, fontFamily: font.body }}>
          {visibleBadge && badgeColor && (
            <div
              style={{
                padding: '3px 12px',
                clipPath: cutCorners(5),
                background: badgeColor.bg,
                color: badgeColor.fg,
                fontFamily: font.display,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                boxShadow: `0 0 12px ${badgeColor.glow}`,
              }}
            >
              {visibleBadge.text.toUpperCase()}
            </div>
          )}
          <div
            style={{
              position: 'relative',
              minWidth: 128,
              padding: '7px 14px 8px',
              clipPath: cutCorners(6),
              background: 'rgba(6, 7, 10, 0.86)',
              border: `1px solid ${accent}`,
              boxShadow: glow !== 'transparent' ? `0 0 14px ${glow}, 0 2px 10px rgba(0,0,0,0.5)` : '0 2px 10px rgba(0,0,0,0.5)',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: 0.3, color: color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {isDealer && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: color.gold,
                    color: '#241a00',
                    fontFamily: font.display,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  D
                </span>
              )}
              <span>{name}</span>
              {isAllIn && <span style={{ color: color.crimson, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>ALL-IN</span>}
            </div>
            <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 700, color: color.gold, marginTop: 1 }}>
              {stack.toLocaleString()}
            </div>
            {bet > 0 && (
              <div style={{ fontSize: 11, color: color.emerald, fontWeight: 600, letterSpacing: 0.3 }}>BET {bet.toLocaleString()}</div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}
