'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EPSILON = 0.0005;

/**
 * Returns a group ref whose position smoothly eases toward `target` every
 * frame (exponential damping, frame-rate independent) instead of snapping —
 * used so bet chips slide into place instead of popping in when a bet
 * changes. `lambda` is the damping rate: higher = snappier.
 *
 * Stops writing to the group once it's within EPSILON of the target so a
 * settled object doesn't force a matrix-world update every frame forever —
 * with many animated chip stacks/cards on screen at once, that idle churn
 * is enough to visibly strain headless/software WebGL rendering.
 */
export function useDampedVector3(target: [number, number, number], lambda = 8, initial?: [number, number, number]) {
  const ref = useRef<THREE.Group>(null);
  const initialized = useRef(false);
  const settled = useRef(false);
  const lastTarget = useRef(target);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;

    if (!initialized.current) {
      const start = initial ?? target;
      group.position.set(start[0], start[1], start[2]);
      initialized.current = true;
      lastTarget.current = target;
      settled.current = start === target;
      return;
    }

    const [tx, ty, tz] = target;
    const [ltx, lty, ltz] = lastTarget.current;
    if (tx !== ltx || ty !== lty || tz !== ltz) {
      settled.current = false;
      lastTarget.current = target;
    }
    if (settled.current) return;

    group.position.x = THREE.MathUtils.damp(group.position.x, tx, lambda, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, ty, lambda, delta);
    group.position.z = THREE.MathUtils.damp(group.position.z, tz, lambda, delta);

    const dx = group.position.x - tx;
    const dy = group.position.y - ty;
    const dz = group.position.z - tz;
    if (dx * dx + dy * dy + dz * dz < EPSILON * EPSILON) {
      group.position.set(tx, ty, tz);
      settled.current = true;
    }
  });

  return ref;
}
