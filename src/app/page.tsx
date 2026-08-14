'use client';

import Link from 'next/link';
import { color, cutCorners, font } from '@/components/hud/theme';

export default function Home() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        background: `radial-gradient(ellipse at 50% 35%, #1a1408 0%, ${color.voidSolid} 70%)`,
        fontFamily: font.body,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: font.display,
            fontSize: 'clamp(48px, 9vw, 96px)',
            fontWeight: 700,
            letterSpacing: 6,
            color: color.gold,
            textShadow: `0 0 32px ${color.goldGlow}, 0 0 64px ${color.goldGlow}`,
            lineHeight: 1.1,
          }}
        >
          HOLD&apos;EM
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 15,
            letterSpacing: 4,
            color: color.textMuted,
          }}
        >
          9명의 AI 상대와 겨루는 텍사스 홀덤
        </div>
      </div>

      <Link
        href="/play"
        style={{
          clipPath: cutCorners(8),
          padding: '16px 44px',
          background: color.emerald,
          color: '#04220f',
          fontFamily: font.display,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          textDecoration: 'none',
          boxShadow: `0 0 22px ${color.emeraldGlow}`,
          transition: 'transform 120ms ease, box-shadow 120ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 0 32px ${color.emeraldGlow}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `0 0 22px ${color.emeraldGlow}`;
        }}
      >
        Enter Table
      </Link>

      <div style={{ fontSize: 12, letterSpacing: 1, color: color.textMuted, opacity: 0.7 }}>
        No Limit Hold&apos;em · 10,000 starting stack · Blinds rise every 10 hands
      </div>
    </div>
  );
}
