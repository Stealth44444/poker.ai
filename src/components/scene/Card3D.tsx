import { Text } from '@react-three/drei';
import { Card } from '@/lib/poker/types';

const SUIT_COLOR: Record<string, string> = { s: '#1a1a1a', c: '#1a1a1a', h: '#c0392b', d: '#c0392b' };

export function Card3D({
  card,
  position,
  rotation = [0, 0, 0],
}: {
  card: Card;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const rank = card[0];
  const suit = card[1];
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.5, 0.02, 0.72]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <Text position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.18} color={SUIT_COLOR[suit] ?? '#1a1a1a'}>
        {rank}
        {suit}
      </Text>
    </group>
  );
}
