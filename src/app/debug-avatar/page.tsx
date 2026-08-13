'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Avatar } from '@/components/scene/Avatar';

function BBoxLogger() {
  const { scene } = useThree();
  useEffect(() => {
    const timer = setTimeout(() => {
      scene.updateMatrixWorld(true);
      scene.traverse((obj) => {
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
          const mesh = obj as THREE.SkinnedMesh;
          const box = new THREE.Box3().setFromObject(mesh);
          console.log(
            `[debug-avatar] skinnedMesh "${mesh.name}" worldBox min=${JSON.stringify(box.min.toArray().map((v) => +v.toFixed(2)))} max=${JSON.stringify(box.max.toArray().map((v) => +v.toFixed(2)))} skeletonBones=${mesh.skeleton?.bones.length} visible=${mesh.visible}`
          );
          const skinnedBox = new THREE.Box3();
          mesh.computeBoundingBox();
          if (mesh.boundingBox) skinnedBox.copy(mesh.boundingBox);
          console.log(
            `[debug-avatar] skinnedMesh "${mesh.name}" computeBoundingBox(skinned) min=${JSON.stringify(skinnedBox.min.toArray().map((v) => +v.toFixed(2)))} max=${JSON.stringify(skinnedBox.max.toArray().map((v) => +v.toFixed(2)))}`
          );
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [scene]);
  return null;
}

export default function DebugAvatarPage() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 1, 4], fov: 50 }}>
        <color attach="background" args={['#dddddd']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 4, 3]} intensity={2} />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[1]} />
        <mesh position={[1.5, 0.25, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="red" />
        </mesh>
        <Suspense fallback={null}>
          <Avatar url="/avatars/sitting-2.glb" position={[0, 0, 0]} rotationY={0} scale={50} />
        </Suspense>
        <BBoxLogger />
      </Canvas>
    </div>
  );
}
