export function ChipStack({ count, position }: { count: number; position: [number, number, number] }) {
  const chips = Math.min(Math.ceil(count / 100), 40);
  return (
    <group position={position}>
      {Array.from({ length: chips }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.018, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.016, 24]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#c0392b' : '#1a1a1a'} />
        </mesh>
      ))}
    </group>
  );
}
