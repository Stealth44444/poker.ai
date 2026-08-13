'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const CHIPS_URL = '/props/poker-chips.glb';
// The chip meshes are already close to real-world size (~48mm across); the
// table works out to ~1.3x real scale, so this keeps chips proportionate.
const CHIP_SCALE = 1.05;
const MAX_CHIPS = 20;

export function ChipStack({ count, position }: { count: number; position: [number, number, number] }) {
  const { scene } = useGLTF(CHIPS_URL);

  // The asset holds six differently-colored chips in a row — grab each one,
  // baked to world space and recentered with its bottom at y=0, so stacked
  // chips can sit flush on each other. Spacing uses the measured thickness.
  const { variants, chipHeight } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const meshes: THREE.Group[] = [];
    let height = 0;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const cloned = obj.clone();
        cloned.matrix.copy(obj.matrixWorld);
        cloned.matrix.decompose(cloned.position, cloned.quaternion, cloned.scale);
        const box = new THREE.Box3().setFromObject(cloned);
        const center = box.getCenter(new THREE.Vector3());
        cloned.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
        height = Math.max(height, box.max.y - box.min.y);
        const wrapper = new THREE.Group();
        wrapper.add(cloned);
        meshes.push(wrapper);
      }
    });
    return { variants: meshes, chipHeight: height };
  }, [scene]);

  if (variants.length === 0) return null;
  const chips = Math.min(Math.ceil(count / 100), MAX_CHIPS);

  return (
    <group position={position} scale={CHIP_SCALE}>
      {Array.from({ length: chips }).map((_, i) => (
        <group key={i} position={[0, i * chipHeight, 0]}>
          <primitive object={variants[i % variants.length].clone()} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(CHIPS_URL);
