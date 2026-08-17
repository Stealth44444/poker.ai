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
import { DealtCard } from './DealtCard';
import { ChipStack } from './ChipStack';
import { AnimatedGroup } from './AnimatedGroup';
import { PlayerPlate, ActionBadge } from './PlayerPlate';

const HUMAN_SEAT = 0;
// Avatar models alternated by seat for variety. sitting-2's fbx2gltf
// conversion bakes the FBX cm->m factor into its inverse bind matrices
// without compensating the bone hierarchy, so its skinned output renders at
// 1/100 scale — the x100 here cancels that, x0.5 sizes her to the table.
// sitting-3 doesn't have that bug (checked via debug-avatar's bbox logger:
// its "Body" mesh sits at ~1.9x sitting-idle's height at scale 1) — 0.5
// brings it in line with the other two. sitting-4 and sitting-5..9 share
// sitting-idle's "ChNN" mesh-naming convention and, likewise, need no
// correction (all checked the same way before being added here).
const AVATARS = [
  { url: '/avatars/sitting-idle.glb', scale: 1 },
  { url: '/avatars/sitting-2.glb', scale: 65 },
  { url: '/avatars/sitting-3.glb', scale: 0.5 },
  { url: '/avatars/sitting-4.glb', scale: 1 },
  { url: '/avatars/sitting-5.glb', scale: 1 },
  { url: '/avatars/sitting-6.glb', scale: 1 },
  { url: '/avatars/sitting-7.glb', scale: 1 },
  { url: '/avatars/sitting-8.glb', scale: 1 },
  { url: '/avatars/sitting-9.glb', scale: 1 },
];
// leonard-garcia-table.glb: raw height (1.502 - 0.049) * 0.75 scale, placed at y=-0.4.
const TABLE_TOP_Y = 0.69;
// Ellipse just inside the felt where each player's hole cards sit.
const HOLE_CARD_RX = 0.52;
const HOLE_CARD_RZ = 1.45;
// Shared point cards visually deal in from and chips fly out of/into —
// reads as "the dealer/pot", independent of any one seat.
const TABLE_CENTER: [number, number, number] = [0, TABLE_TOP_Y + 0.01, 0];

export interface SeatAction {
  playerId: string;
  badge: ActionBadge;
}

export interface Payout {
  playerId: string;
  amount: number;
}

export function PokerScene({
  view,
  dealerSeat,
  turnPlayerId,
  seatAction,
  revealedCount,
  winnerIds,
  payouts,
}: {
  view: TableView;
  dealerSeat: number;
  turnPlayerId: string | null;
  seatAction: SeatAction | null;
  /** Number of showdown participants (seat order) whose cards are face-up. */
  revealedCount: number;
  winnerIds: string[];
  /** Chips animate from the table center to each winner's seat once the hand resolves. */
  payouts: Payout[];
}) {
  const { players, communityCards, bets } = view;
  const human = players.find((p) => p.seat === HUMAN_SEAT);
  const humanSeatPos = seatTransform(HUMAN_SEAT, players.length).position;
  // Sit the camera at the human's seat (just outside the table edge) at seated eye
  // height, pulled back slightly along the seat's own outward direction — with 10
  // seats around the felt, the two immediately flanking the human sit at a wide
  // bearing; pulling back (combined with CAMERA_FOV below) brings every seat inside
  // the default view instead of requiring a drag-to-look for the neighbors.
  const CAMERA_PULLBACK = 0.6;
  const CAMERA_FOV = 74;
  const seatDist = Math.hypot(humanSeatPos[0], humanSeatPos[2]);
  const pullBackScale = (seatDist + CAMERA_PULLBACK) / seatDist;
  const cameraPosition: [number, number, number] = [humanSeatPos[0] * pullBackScale, 1.15, humanSeatPos[2] * pullBackScale];

  // Seat-ordered showdown participants; the first `revealedCount` show their cards.
  const revealOrder = players.filter((p) => !p.isFolded && p.seat !== HUMAN_SEAT && p.holeCards.length > 0);

  return (
    <Canvas
      camera={{ fov: CAMERA_FOV }}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <LookAroundCamera position={cameraPosition} />
      <Suspense fallback={null}>
        <Room />
        <Table />
        {players
          .filter((p) => p.seat !== HUMAN_SEAT)
          .map((p) => {
            // The human's own chair sits between their (pulled-back) camera and the
            // table — rendering it would block the view, the same reason their own
            // avatar is skipped below.
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
              />
            );
          })}
        {communityCards.map((card, i) => (
          <DealtCard
            key={card}
            card={card}
            origin={TABLE_CENTER}
            faceDown={false}
            position={[i * 0.1 - (communityCards.length - 1) * 0.05, TABLE_TOP_Y + 0.005, 0]}
          />
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
              <DealtCard
                key={`${p.id}-${card}`}
                card={card}
                origin={TABLE_CENTER}
                faceDown={!faceUp}
                position={[cx + tx * (i - 0.5) * 0.09, TABLE_TOP_Y + 0.005, cz + tz * (i - 0.5) * 0.09]}
              />
            ));
          })}
        {players
          .filter((p) => (bets[p.id] ?? 0) > 0)
          .map((p) => {
            // Bet chips sit between the pot and the player's hole cards — a
            // smaller radius than HOLE_CARD_R* so they read as "in front of"
            // the cards rather than on top of them.
            const angle = (p.seat / players.length) * Math.PI * 2;
            const bx = Math.sin(angle) * HOLE_CARD_RX * 0.55;
            const bz = Math.cos(angle) * HOLE_CARD_RZ * 0.62;
            return (
              <AnimatedGroup key={`bet-chips-${p.id}`} target={[bx, TABLE_TOP_Y + 0.005, bz]} from={humanSeatPos}>
                <ChipStack count={bets[p.id]} position={[0, 0, 0]} />
              </AnimatedGroup>
            );
          })}
        {payouts.map((award) => {
          const winner = players.find((p) => p.id === award.playerId);
          if (!winner) return null;
          const { position: seatPos } = seatTransform(winner.seat, players.length);
          const target: [number, number, number] = [seatPos[0] * 0.55, TABLE_TOP_Y + 0.01, seatPos[2] * 0.55];
          return (
            <AnimatedGroup key={`payout-${award.playerId}`} target={target} from={TABLE_CENTER} lambda={3.2}>
              <ChipStack count={award.amount} position={[0, 0, 0]} />
            </AnimatedGroup>
          );
        })}
        {human && human.stack > 0 && (
          <ChipStack count={human.stack} position={[humanSeatPos[0] * 0.52 - 0.3, TABLE_TOP_Y, humanSeatPos[2] * 0.52]} />
        )}
      </Suspense>
    </Canvas>
  );
}
