'use client';

import { Card } from '@/lib/poker/types';
import { font, suitColor, suitGlyph } from './theme';

/** Compact 2D card badge for HUD contexts (board, hole cards) where the 3D
 * table is too far from camera to read card faces at a glance. */
export function MiniCard({ card, size = 40 }: { card: Card | null; size?: number }) {
  if (!card) {
    return (
      <div
        style={{
          width: size,
          height: size * 1.4,
          borderRadius: 4,
          border: '1.5px dashed rgba(255,255,255,0.18)',
        }}
      />
    );
  }
  const rank = card[0];
  const suit = card[1];
  return (
    <div
      style={{
        width: size,
        height: size * 1.4,
        borderRadius: 4,
        background: '#f4f1ea',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        fontFamily: font.display,
        color: suitColor[suit] ?? '#222',
      }}
    >
      <span style={{ fontSize: size * 0.42, fontWeight: 700, lineHeight: 1 }}>{rank}</span>
      <span style={{ fontSize: size * 0.36, lineHeight: 1 }}>{suitGlyph[suit]}</span>
    </div>
  );
}
