'use client';

import { Player } from '@/lib/poker/types';
import { HudFrame } from './HudFrame';
import { color, font, hudZIndex } from './theme';

/**
 * Top-right stack standings — opposite TableHUD's top-center, clear of
 * HoleCardsHUD's bottom-right corner. Reads state.players directly: stack
 * rankings don't need to be frame-accurate to mid-hand event playback the
 * way the pot readout does.
 */
export function StackLeaderboard({ players, humanId }: { players: Player[]; humanId: string }) {
  const alive = players.filter((p) => p.stack > 0).length;
  const sorted = [...players].sort((a, b) => b.stack - a.stack);

  return (
    <div style={{ position: 'absolute', top: 18, right: 18, zIndex: hudZIndex, pointerEvents: 'none' }}>
      <HudFrame accent={color.gold}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px 12px', minWidth: 160 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: color.textMuted }}>
            {alive}/{players.length} 남음
          </div>
          {sorted.map((p) => {
            const busted = p.stack === 0;
            const isHuman = p.id === humanId;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontSize: 12,
                  fontFamily: font.body,
                  color: busted ? color.textMuted : isHuman ? color.cyan : color.text,
                  opacity: busted ? 0.5 : 1,
                  textDecoration: busted ? 'line-through' : 'none',
                }}
              >
                <span>{p.name}</span>
                <span style={{ fontWeight: isHuman ? 700 : 400 }}>{p.stack.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </HudFrame>
    </div>
  );
}
