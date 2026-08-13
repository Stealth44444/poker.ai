'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Card } from '@/lib/poker/types';
import { Card3D } from './Card3D';

const FACE_DOWN_ANGLE = Math.PI / 2;
const FACE_UP_ANGLE = -Math.PI / 2;
const POSITION_LAMBDA = 6;
const FLIP_LAMBDA = 7;
const POSITION_EPSILON = 0.0005;
const ANGLE_EPSILON = 0.002;

/**
 * Wraps Card3D with a deal-in slide (eased from `origin` toward `position`)
 * and a smooth flip whenever `faceDown` toggles, instead of the instant
 * teleport/snap Card3D does on its own. Both are driven by direct ref
 * mutation in useFrame so cards animate at full frame rate without
 * triggering a React re-render every tick — and both stop writing once
 * settled, so idle cards (the common case) don't force a matrix update
 * every frame indefinitely.
 */
export function DealtCard({
  card,
  position,
  origin,
  faceDown,
  rotationY = 0,
  scale = 1,
}: {
  card: Card;
  position: [number, number, number];
  /** Where the card visually deals in from — e.g. the table center. */
  origin: [number, number, number];
  faceDown: boolean;
  rotationY?: number;
  scale?: number;
}) {
  const posGroup = useRef<THREE.Group>(null);
  const rotGroup = useRef<THREE.Group>(null);
  const initializedPos = useRef(false);
  const posSettled = useRef(false);
  const lastPosition = useRef(position);
  const currentAngle = useRef(faceDown ? FACE_DOWN_ANGLE : FACE_UP_ANGLE);
  const rotSettled = useRef(true);

  useFrame((_, delta) => {
    const pg = posGroup.current;
    if (pg) {
      if (!initializedPos.current) {
        pg.position.set(origin[0], origin[1], origin[2]);
        initializedPos.current = true;
        lastPosition.current = position;
        posSettled.current = false;
      }
      const [px, py, pz] = position;
      const [lpx, lpy, lpz] = lastPosition.current;
      if (px !== lpx || py !== lpy || pz !== lpz) {
        posSettled.current = false;
        lastPosition.current = position;
      }
      if (!posSettled.current) {
        pg.position.x = THREE.MathUtils.damp(pg.position.x, px, POSITION_LAMBDA, delta);
        pg.position.y = THREE.MathUtils.damp(pg.position.y, py, POSITION_LAMBDA, delta);
        pg.position.z = THREE.MathUtils.damp(pg.position.z, pz, POSITION_LAMBDA, delta);
        const dx = pg.position.x - px;
        const dy = pg.position.y - py;
        const dz = pg.position.z - pz;
        if (dx * dx + dy * dy + dz * dz < POSITION_EPSILON * POSITION_EPSILON) {
          pg.position.set(px, py, pz);
          posSettled.current = true;
        }
      }
    }

    const rg = rotGroup.current;
    if (rg) {
      const targetAngle = faceDown ? FACE_DOWN_ANGLE : FACE_UP_ANGLE;
      if (Math.abs(currentAngle.current - targetAngle) > ANGLE_EPSILON) rotSettled.current = false;
      if (!rotSettled.current) {
        currentAngle.current = THREE.MathUtils.damp(currentAngle.current, targetAngle, FLIP_LAMBDA, delta);
        rg.rotation.x = currentAngle.current;
        if (Math.abs(currentAngle.current - targetAngle) < ANGLE_EPSILON) {
          currentAngle.current = targetAngle;
          rg.rotation.x = targetAngle;
          rotSettled.current = true;
        }
      }
    }
  });

  return (
    <group ref={posGroup} rotation={[0, rotationY, 0]}>
      <group ref={rotGroup} scale={scale}>
        <Card3D card={card} position={[0, 0, 0]} flat={false} />
      </group>
    </group>
  );
}
