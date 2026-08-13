export function Table() {
  return (
    <mesh position={[0, -0.4, 0]} rotation={[0, 0, 0]}>
      <cylinderGeometry args={[2.6, 2.6, 0.3, 48]} />
      <meshStandardMaterial color="#1e5631" />
    </mesh>
  );
}
