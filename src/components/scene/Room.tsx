import { Environment } from '@react-three/drei';
import { EnvironmentProp } from './EnvironmentProp';

export function Room() {
  return (
    <>
      <color attach="background" args={['#050506']} />
      <fog attach="fog" args={['#050506', 6, 18]} />
      <Environment files="/hdri/fireplace_4k.hdr" background={false} />
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#241a14" />
      </mesh>
      <EnvironmentProp url="/props/dalek-ship.glb" position={[0, -0.55, 0]} />
    </>
  );
}
