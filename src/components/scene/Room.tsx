import { Environment } from '@react-three/drei';

export function Room() {
  return (
    <>
      <Environment files="/hdri/fireplace_4k.hdr" background />
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#241a14" />
      </mesh>
    </>
  );
}
