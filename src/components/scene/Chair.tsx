import { EnvironmentProp } from './EnvironmentProp';

export function Chair({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  return <EnvironmentProp url="/props/chair.glb" position={position} rotationY={rotationY} scale={0.052} />;
}
