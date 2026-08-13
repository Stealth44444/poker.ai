'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function EnvironmentProp({
  url,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
}: {
  url: string;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(url);

  // Sketchfab exports often bake in the source scene's world offset (the model
  // can sit thousands of units from the origin) — recenter it horizontally and
  // drop its bottom to y=0 so `position` places it where it visually looks.
  const offset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    return [-center.x, -box.min.y, -center.z] as [number, number, number];
  }, [scene]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
