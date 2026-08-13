'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Card } from '@/lib/poker/types';

const CARDS_URL = '/props/playing-cards.glb';
// playing-cards.glb names each card mesh `<suit><index>_playingCards_Mat_0`,
// with 01 = ace through 13 = king.
const RANK_TO_INDEX: Record<string, string> = {
  A: '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06', '7': '07',
  '8': '08', '9': '09', T: '10', J: '11', Q: '12', K: '13',
};
const SUIT_TO_NAME: Record<string, string> = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' };

export function Card3D({
  card,
  position,
  rotation = [0, 0, 0],
  faceDown = false,
  flat = true,
  scale = 1,
}: {
  card: Card;
  position: [number, number, number];
  rotation?: [number, number, number];
  faceDown?: boolean;
  /** true (default) lays the card on the table; false keeps it upright facing +Z for HUD use. */
  flat?: boolean;
  /** 1 = the asset's native, roughly real-world card size (0.08 x 0.12). */
  scale?: number;
}) {
  const { scene } = useGLTF(CARDS_URL);
  const nodeName = `${SUIT_TO_NAME[card[1]]}${RANK_TO_INDEX[card[0]]}`;

  const { mesh, center } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    let src: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (!src && obj instanceof THREE.Mesh && obj.name.startsWith(nodeName)) src = obj as THREE.Mesh;
    });
    if (!src) return { mesh: null, center: new THREE.Vector3() };

    // clone() keeps only the mesh's local transform — bake the world matrix so
    // the card renders in place once detached from its original parents.
    const cloned = (src as THREE.Mesh).clone();
    cloned.matrix.copy((src as THREE.Mesh).matrixWorld);
    cloned.matrix.decompose(cloned.position, cloned.quaternion, cloned.scale);
    const box = new THREE.Box3().setFromObject(cloned);
    return { mesh: cloned, center: box.getCenter(new THREE.Vector3()) };
  }, [scene, nodeName]);

  if (!mesh) return null;

  // Source cards stand upright facing +Z: -90deg about X lays them face up,
  // +90deg lays them face down.
  const layRotation: [number, number, number] = flat
    ? [faceDown ? Math.PI / 2 : -Math.PI / 2, 0, 0]
    : [0, 0, 0];

  return (
    <group position={position} rotation={rotation}>
      <group rotation={layRotation} scale={scale}>
        <group position={[-center.x, -center.y, -center.z]}>
          <primitive object={mesh} />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(CARDS_URL);
