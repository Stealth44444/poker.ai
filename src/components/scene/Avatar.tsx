'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

export function Avatar({
  url,
  position,
  rotationY,
  scale = 1,
}: {
  url: string;
  position: [number, number, number];
  rotationY: number;
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  // Each seat needs its own copy of the skeleton — reusing the cached scene
  // directly across instances reparents the same nodes and breaks animation bindings.
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    // Skinned meshes keep their bind-pose bounding sphere, which can sit far
    // from where the animation actually places the body (Mixamo rigs animate
    // the hips to the origin) — three.js then frustum-culls a visible avatar.
    cloned.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) obj.frustumCulled = false;
    });
    return cloned;
  }, [scene]);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const first = animations[0]?.name;
    if (first) actions[first]?.reset().fadeIn(0.3).play();
    return () => {
      if (first) actions[first]?.fadeOut(0.3);
    };
  }, [actions, animations]);

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload('/avatars/sitting-idle.glb');
useGLTF.preload('/avatars/sitting-2.glb');
useGLTF.preload('/avatars/sitting-3.glb');
useGLTF.preload('/avatars/sitting-4.glb');
useGLTF.preload('/avatars/sitting-5.glb');
useGLTF.preload('/avatars/sitting-6.glb');
useGLTF.preload('/avatars/sitting-7.glb');
useGLTF.preload('/avatars/sitting-8.glb');
useGLTF.preload('/avatars/sitting-9.glb');
