'use client';

import { HudFrame } from './HudFrame';
import { color, cutCorners, font } from './theme';

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'hud-fade-up 260ms ease-out',
      }}
    >
      <HudFrame accent={color.crimson} active style={{ minWidth: 300 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '22px 32px' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: color.textMuted }}>CONNECTION LOST</div>
          <div style={{ fontFamily: font.body, fontSize: 15, color: color.text, textAlign: 'center' }}>{message}</div>
          <button
            onClick={onRetry}
            style={{
              clipPath: cutCorners(6),
              padding: '10px 26px',
              background: color.crimson,
              border: 'none',
              color: '#2a0508',
              fontFamily: font.display,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: `0 0 14px ${color.crimsonGlow}`,
            }}
          >
            Retry
          </button>
        </div>
      </HudFrame>
    </div>
  );
}
