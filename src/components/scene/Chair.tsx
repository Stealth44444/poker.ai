import { EnvironmentProp } from './EnvironmentProp';

export function Chair({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  // The chair model's backrest sits on its +X side (front faces -X), while the
  // avatars face +Z at rotationY=0 — offset by +90deg so both agree per seat.
  return <EnvironmentProp url="/props/chair.glb" position={position} rotationY={rotationY + Math.PI / 2} scale={0.052} />;
}
