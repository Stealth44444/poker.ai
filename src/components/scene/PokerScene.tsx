'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { seatTransform } from '@/lib/scene/seatLayout';
import { TableView } from '@/lib/playback/derivePlayback';
import { LookAroundCamera } from './LookAroundCamera';
import { Room } from './Room';
import { Table } from './Table';
import { Avatar } from './Avatar';
import { Chair } from './Chair';
import { Card3D } from './Card3D';
import { ChipStack } from './ChipStack';
import { PlayerPlate, TransientText } from './PlayerPlate';

const HUMAN_SEAT = 0;
// Two avatar models alternated by seat for variety. sitting-2's fbx2gltf
// conversion bakes the FBX cm->m factor into its inverse bind matrices
// without compensating the bone hierarchy, so its skinned output renders at
// 1/100 scale — the x100 here cancels that, x0.5 sizes her to the table.
const AVATARS = [
  { url: '/avatars/sitting-idle.glb', scale: 1 },
  { url: '/avatars/sitting-2.glb', scale: 65 },
];
// leonard-garcia-table.glb: raw height (1.502 - 0.049) * 0.75 scale, placed at y=-0.4.
const TABLE_TOP_Y = 0.69;
// Ellipse just inside the felt where each player's hole cards sit.
const HOLE_CARD_RX = 0.52;
const HOLE_CARD_RZ = 1.45;

export interface SeatAction {
  playerId: string;
  badge: TransientText;
  talk: TransientText | null;
}

export function PokerScene({
  view,
  dealerSeat,
  turnPlayerId,
  seatAction,
  revealedCount,
  winnerIds,
}: {
  view: TableView;
  dealerSeat: number;
  turnPlayerId: string | null;
  seatAction: SeatAction | null;
  /** Number of showdown participants (seat order) whose cards are face-up. */
  revealedCount: number;
  winnerIds: string[];
}) {
  const { players, communityCards, bets } = view;
  const human = players.find((p) => p.seat === HUMAN_SEAT);
  const humanSeatPos = seatTransform(HUMAN_SEAT, players.length).position;
  // Sit the camera at the human's seat (just outside the table edge) at seated eye
  // height — scaling the seat position inward would put the viewpoint over the felt.
  const cameraPosition: [number, number, number] = [humanSeatPos[0], 1.15, humanSeatPos[2]];

  // Seat-ordered showdown participants; the first `revealedCount` show their cards.
  const revealOrder = players.filter((p) => !p.isFolded && p.seat !== HUMAN_SEAT && p.holeCards.length > 0);

  return (
    <Canvas
      camera={{ fov: 60 }}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <LookAroundCamera position={cameraPosition} />
      <Suspense fallback={null}>
        <Room />
        <Table />
        {players.map((p) => {
          const { position, rotationY } = seatTransform(p.seat, players.length);
          return <Chair key={`chair-${p.id}`} position={position} rotationY={rotationY} />;
        })}
        {players
          .filter((p) => p.seat !== HUMAN_SEAT)
          .map((p) => {
            const { position, rotationY } = seatTransform(p.seat, players.length);
            const avatar = AVATARS[p.seat % AVATARS.length];
            return <Avatar key={p.id} url={avatar.url} position={position} rotationY={rotationY} scale={avatar.scale} />;
          })}
        {players
          .filter((p) => p.seat !== HUMAN_SEAT)
          .map((p) => {
            const { position } = seatTransform(p.seat, players.length);
            return (
              <PlayerPlate
                key={`plate-${p.id}`}
                position={position}
                name={p.name}
                stack={p.stack}
                bet={bets[p.id] ?? 0}
                isDealer={p.seat === dealerSeat}
                isTurn={p.id === turnPlayerId}
                isFolded={p.isFolded}
                isAllIn={p.isAllIn}
                isWinner={winnerIds.includes(p.id)}
                badge={seatAction?.playerId === p.id ? seatAction.badge : null}
                talk={seatAction?.playerId === p.id ? seatAction.talk : null}
              />
            );
          })}
        {communityCards.map((card, i) => (
          <Card3D key={card} card={card} position={[i * 0.1 - (communityCards.length - 1) * 0.05, TABLE_TOP_Y + 0.005, 0]} />
        ))}
        {players
          .filter((p) => !p.isFolded && p.holeCards.length > 0)
          .map((p) => {
            // Face-down hole cards on the felt edge in front of each player,
            // spread slightly along the table-edge tangent at that seat.
            const angle = (p.seat / players.length) * Math.PI * 2;
            const cx = Math.sin(angle) * HOLE_CARD_RX;
            const cz = Math.cos(angle) * HOLE_CARD_RZ;
            const [tx, tz] = [Math.cos(angle), -Math.sin(angle)];
            const revealIndex = revealOrder.findIndex((r) => r.id === p.id);
            const faceUp = revealIndex >= 0 && revealIndex < revealedCount;
            return p.holeCards.map((card, i) => (
              <Card3D
                key={`${p.id}-${card}`}
                card={card}
                faceDown={!faceUp}
                position={[cx + tx * (i - 0.5) * 0.09, TABLE_TOP_Y + 0.005, cz + tz * (i - 0.5) * 0.09]}
              />
            ));
          })}
        {human && human.stack > 0 && (
          <ChipStack count={human.stack} position={[humanSeatPos[0] * 0.52 - 0.3, TABLE_TOP_Y, humanSeatPos[2] * 0.52]} />
        )}
      </Suspense>
    </Canvas>
  );
}
