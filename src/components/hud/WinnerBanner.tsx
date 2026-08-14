'use client';

import { HandResult } from '@/lib/poker/tournamentEngine';
import { Player } from '@/lib/poker/types';
import { HudFrame } from './HudFrame';
import { color, cutCorners, font } from './theme';

export function WinnerBanner({
  potsAwarded,
  players,
  tournamentWinnerName,
  onNextHand,
}: {
  potsAwarded: HandResult['potsAwarded'];
  players: Player[];
  /** Present once the tournament itself has been won — swaps the button to start a new one. */
  tournamentWinnerName?: string | null;
  onNextHand: () => void;
}) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  return (
    <div
      style={{
        position: 'absolute',
        top: '36%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'hud-fade-up 340ms ease-out',
      }}
    >
      <HudFrame accent={color.gold} active style={{ minWidth: 320 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 38px 26px' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: color.textMuted }}>HAND RESULT</div>
          {potsAwarded.map((award, i) => (
            <div
              key={i}
              style={{
                fontFamily: font.display,
                fontSize: 22,
                fontWeight: 700,
                color: color.gold,
                textShadow: `0 0 16px ${color.goldGlow}`,
                textAlign: 'center',
                animation: 'hud-pulse 1.8s ease-in-out infinite',
              }}
            >
              {award.winnerIds.map(nameOf).join(', ')} +{award.amountPerWinner.toLocaleString()}
            </div>
          ))}
          {tournamentWinnerName && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 4 }}>
              <div style={{ width: 160, height: 1, background: color.hairline }} />
              <div style={{ fontSize: 10, letterSpacing: 3, color: color.textMuted, paddingTop: 8 }}>TOURNAMENT CHAMPION</div>
              <div
                style={{
                  fontFamily: font.display,
                  fontSize: 26,
                  fontWeight: 700,
                  color: color.gold,
                  textShadow: `0 0 20px ${color.goldGlow}`,
                }}
              >
                {tournamentWinnerName}
              </div>
            </div>
          )}
          <button
            onClick={onNextHand}
            style={{
              clipPath: cutCorners(6),
              padding: '11px 28px',
              background: color.emerald,
              border: 'none',
              color: '#04220f',
              fontFamily: font.display,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: `0 0 14px ${color.emeraldGlow}`,
            }}
          >
            {tournamentWinnerName ? 'New Tournament' : 'Next Hand'}
          </button>
        </div>
      </HudFrame>
    </div>
  );
}
