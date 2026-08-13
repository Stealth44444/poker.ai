'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Card } from '@/lib/poker/types';
import { Card3D } from './Card3D';
import { color, cutCorners, font } from '@/components/hud/theme';

/**
 * Screen-corner display of the player's own hand, rendered with the same card
 * asset as the table but upright and large enough to read at a glance.
 */
export function HoleCardsHUD({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 18,
        bottom: 18,
        width: 240,
        height: 190,
        pointerEvents: 'none',
        clipPath: cutCorners(10),
        background: 'rgba(6, 7, 10, 0.55)',
        border: `1px solid ${color.panelBorder}`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 14,
          fontFamily: font.body,
          fontSize: 10,
          letterSpacing: 2,
          color: color.textMuted,
        }}
      >
        YOUR HAND
      </div>
      <Canvas camera={{ fov: 35, position: [0, 0, 0.3] }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[0.5, 1, 2]} intensity={1.8} />
        <Suspense fallback={null}>
          {cards.map((card, i) => (
            <Card3D
              key={card}
              card={card}
              flat={false}
              position={[(i - (cards.length - 1) / 2) * 0.09, 0, 0]}
              rotation={[0, 0, (i - (cards.length - 1) / 2) * -0.08]}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
