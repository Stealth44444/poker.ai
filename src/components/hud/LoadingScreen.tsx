'use client';

import { HudFrame } from './HudFrame';
import { color, font } from './theme';

export function LoadingScreen({ label = 'DEALING YOU IN' }: { label?: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: color.voidSolid,
      }}
    >
      <HudFrame accent={color.gold} active style={{ minWidth: 280 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '32px 44px' }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              border: `3px solid ${color.hairline}`,
              borderTopColor: color.gold,
              animation: 'hud-spin 0.9s linear infinite',
            }}
          />
          <div
            style={{
              fontFamily: font.display,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 3,
              color: color.gold,
              textShadow: `0 0 12px ${color.goldGlow}`,
              animation: 'hud-pulse 1.6s ease-in-out infinite',
            }}
          >
            {label}
          </div>
        </div>
      </HudFrame>
    </div>
  );
}
