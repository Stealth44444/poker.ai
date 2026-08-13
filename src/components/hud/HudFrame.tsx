'use client';

import { ReactNode } from 'react';
import { color, cutCorners, panelBase } from './theme';

const TICK = (corner: 'tl' | 'br', accent: string): ReactNode => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    style={{
      position: 'absolute',
      pointerEvents: 'none',
      ...(corner === 'tl' ? { top: -1, left: -1 } : { bottom: -1, right: -1, transform: 'rotate(180deg)' }),
    }}
  >
    <path d="M1 9 V1 H9" fill="none" stroke={accent} strokeWidth="2" />
  </svg>
);

export function HudFrame({
  children,
  accent = color.gold,
  active = false,
  style,
}: {
  children: ReactNode;
  accent?: string;
  active?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        clipPath: cutCorners(10),
        ...panelBase,
        boxShadow: active ? `0 0 0 1px ${accent}, 0 0 22px ${accent}66, 0 4px 18px rgba(0,0,0,0.5)` : '0 4px 18px rgba(0,0,0,0.5)',
        transition: 'box-shadow 200ms ease',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 10,
          right: 10,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: active ? 1 : 0.5,
        }}
      />
      {TICK('tl', accent)}
      {TICK('br', accent)}
      {children}
    </div>
  );
}
