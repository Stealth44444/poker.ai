'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { breakDownAmount } from '@/lib/poker/chipBreakdown';

const CHIPS_URL = '/props/poker-chips.glb';
// The chip meshes are already close to real-world size (~48mm across); the
// table works out to ~1.3x real scale, so this keeps chips proportionate.
const CHIP_SCALE = 1.05;
const MAX_CHIPS = 20;

// poker-chips.glb names each chip's *wrapper group* descriptively
// (Poker_Chip_10k_0, Poker_Chip_100_1, Poker_chip_200_2 (lowercase c),
// Poker_Chip_500_3, Poker_Chip_1000_4, Poker_Chip_2000_5) — the mesh itself
// underneath is auto-named ("Object_4", etc.) by the exporter, so the
// denomination has to be read off the parent, not the mesh.
const NAME_PATTERN = /Poker_[Cc]hip_(\d+)(k)?/;

function denominationFromName(name: string): number | null {
  const match = name.match(NAME_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2] ? value * 1000 : value;
}

export function ChipStack({ count, position }: { count: number; position: [number, number, number] }) {
  const { scene } = useGLTF(CHIPS_URL);

  // Grab each chip mesh by its wrapper group's name (baked to world space and
  // recentered with its bottom at y=0, so stacked chips sit flush on each
  // other) instead of relying on traversal order, so the color rendered
  // always matches the value.
  const { variantsByDenomination, chipHeight } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const byDenomination = new Map<number, THREE.Group>();
    let height = 0;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const denomination = denominationFromName(obj.parent?.name ?? '');
        if (denomination === null) return;
        const cloned = obj.clone();
        cloned.matrix.copy(obj.matrixWorld);
        cloned.matrix.decompose(cloned.position, cloned.quaternion, cloned.scale);
        const box = new THREE.Box3().setFromObject(cloned);
        const center = box.getCenter(new THREE.Vector3());
        cloned.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
        height = Math.max(height, box.max.y - box.min.y);
        const wrapper = new THREE.Group();
        wrapper.add(cloned);
        byDenomination.set(denomination, wrapper);
      }
    });
    return { variantsByDenomination: byDenomination, chipHeight: height };
  }, [scene]);

  if (variantsByDenomination.size === 0) return null;
  const fallback = variantsByDenomination.values().next().value!;
  const denominations = breakDownAmount(count, MAX_CHIPS);

  return (
    <group position={position} scale={CHIP_SCALE}>
      {denominations.map((denomination, i) => (
        <group key={i} position={[0, i * chipHeight, 0]}>
          <primitive object={(variantsByDenomination.get(denomination) ?? fallback).clone()} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(CHIPS_URL);
