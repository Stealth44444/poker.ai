'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Extracts just the meshes using `materialName` out of a larger GLTF scene
 * (e.g. pulling only the table felt out of a scene that also bundles cards
 * and chips), recentered so its own footprint sits at the given `position`.
 */
export function GLTFPart({
  url,
  materialName,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
}: {
  url: string;
  materialName: string;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(url);

  const recentered = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const group = new THREE.Group();
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const material = obj.material as THREE.Material | THREE.Material[];
      const names = Array.isArray(material) ? material.map((m) => m.name) : [material.name];
      if (!names.includes(materialName)) return;

      // obj.clone() only copies the mesh's own local transform, not the
      // accumulated transform from its ancestors — bake the world matrix in
      // so the mesh renders correctly once detached and re-parented here.
      const cloned = obj.clone();
      cloned.matrix.copy(obj.matrixWorld);
      cloned.matrix.decompose(cloned.position, cloned.quaternion, cloned.scale);
      group.add(cloned);
    });

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.set(-center.x, -box.min.y, -center.z);
    return group;
  }, [scene, materialName]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={recentered} />
    </group>
  );
}
