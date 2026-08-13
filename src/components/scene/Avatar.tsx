'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
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
  // Each seat needs its own copy of the skeleton — reusing the cached scene
  // directly across instances reparents the same nodes and breaks animation bindings.
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
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
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload('/avatars/sitting-idle.glb');
