'use client';

import { color } from '@/components/hud/theme';

/** A small procedural gold disc marking the dealer's seat on the felt — no
 * suitable existing asset for this, and it's simple enough not to need one. */
export function DealerButton({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.045, 0.045, 0.012, 24]} />
      <meshStandardMaterial color={color.gold} emissive={color.gold} emissiveIntensity={0.35} metalness={0.6} roughness={0.35} />
    </mesh>
  );
}
