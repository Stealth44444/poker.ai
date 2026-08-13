'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Card, Player } from '@/lib/poker/types';
import { seatTransform } from '@/lib/scene/seatLayout';
import { LookAroundCamera } from './LookAroundCamera';
import { Room } from './Room';
import { Table } from './Table';
import { Avatar } from './Avatar';
import { Card3D } from './Card3D';
import { ChipStack } from './ChipStack';

const HUMAN_SEAT = 0;
const AVATAR_URL = '/avatars/sitting-idle.glb';

export function PokerScene({ players, communityCards }: { players: Player[]; communityCards: Card[] }) {
  const human = players.find((p) => p.seat === HUMAN_SEAT);
  const humanSeatPos = seatTransform(HUMAN_SEAT, players.length).position;
  const cameraPosition: [number, number, number] = [humanSeatPos[0] * 0.4, 1.2, humanSeatPos[2] * 0.4];

  return (
    <Canvas camera={{ fov: 60 }}>
      <ambientLight intensity={0.7} />
      <spotLight position={[0, 6, 0]} angle={0.6} penumbra={0.5} intensity={800} color="#fff2d0" castShadow={false} />
      <pointLight position={[0, 2, 3]} intensity={40} color="#ffe9c4" />
      <LookAroundCamera position={cameraPosition} />
      <Suspense fallback={null}>
        <Room />
      </Suspense>
      <Table />
      <Suspense fallback={null}>
        {players
          .filter((p) => p.seat !== HUMAN_SEAT)
          .map((p) => {
            const { position, rotationY } = seatTransform(p.seat, players.length);
            return <Avatar key={p.id} url={AVATAR_URL} position={position} rotationY={rotationY} />;
          })}
        {communityCards.map((card, i) => (
          <Card3D key={card} card={card} position={[i * 0.55 - (communityCards.length - 1) * 0.275, 0, 0]} />
        ))}
      </Suspense>
      {human && human.stack > 0 && (
        <ChipStack count={human.stack} position={[humanSeatPos[0] * 0.6, -0.35, humanSeatPos[2] * 0.6]} />
      )}
    </Canvas>
  );
}
