'use client';

import { color, cutCorners, font } from './theme';

/** Small non-blocking indicator shown while an action request is in flight —
 * without it, the multi-second (sometimes 60s+) wait for AI decisions to
 * resolve looks identical to the UI having frozen. */
export function ActionPending() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 24px',
        clipPath: cutCorners(8),
        background: 'rgba(6, 7, 10, 0.9)',
        border: `1.5px solid ${color.panelBorder}`,
        animation: 'hud-fade-up 200ms ease-out',
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: `2px solid ${color.hairline}`,
          borderTopColor: color.gold,
          animation: 'hud-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontFamily: font.display, fontSize: 12, letterSpacing: 1.5, color: color.textMuted }}>
        WAITING FOR TABLE
      </span>
    </div>
  );
}
