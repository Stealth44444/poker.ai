'use client';

import { useEffect, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function Avatar({
  url,
  position,
  rotationY,
}: {
  url: string;
  position: [number, number, number];
  rotationY: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const first = animations[0]?.name;
    if (first) actions[first]?.reset().fadeIn(0.3).play();
    return () => {
      if (first) actions[first]?.fadeOut(0.3);
    };
  }, [actions, animations]);

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/avatars/sitting-idle.glb');
