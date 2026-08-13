'use client';

import { useState } from 'react';
import { ActionType } from '@/lib/poker/types';
import { RaiseBounds, clampAmount, raisePresets } from '@/lib/poker/betMath';
import { HudFrame } from './HudFrame';
import { color, cutCorners, font } from './theme';

function ActionButton({
  label,
  accent,
  glow,
  onClick,
}: {
  label: string;
  accent: string;
  glow: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        clipPath: cutCorners(8),
        padding: '13px 26px',
        background: 'rgba(6, 7, 10, 0.9)',
        border: `1.5px solid ${accent}`,
        color: accent,
        fontFamily: font.display,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: `0 0 16px ${glow}`,
        transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 0 24px ${glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = `0 0 16px ${glow}`;
      }}
    >
      {label}
    </button>
  );
}

export function BetControls({
  validActions,
  toCall,
  pot,
  bounds,
  sliderStep,
  onAction,
}: {
  validActions: ActionType[];
  toCall: number;
  pot: number;
  bounds: RaiseBounds;
  /** Chip granularity of the fine-tune slider (the small blind). */
  sliderStep: number;
  onAction: (type: ActionType, amount?: number) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [amount, setAmount] = useState(bounds.minTotal);

  const canRaise = validActions.includes('bet') || validActions.includes('raise');
  const raiseType: ActionType = validActions.includes('bet') ? 'bet' : 'raise';

  const confirm = () => {
    const clamped = clampAmount(amount, bounds);
    if (clamped >= bounds.maxTotal) onAction('all-in');
    else onAction(raiseType, clamped);
    setPanelOpen(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        animation: 'hud-fade-up 260ms ease-out',
      }}
    >
      {panelOpen && canRaise && (
        <HudFrame accent={color.gold} active style={{ width: 360 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px 18px' }}>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
              {raisePresets(pot, bounds).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setAmount(preset.amount)}
                  style={{
                    flex: 1,
                    clipPath: cutCorners(4),
                    padding: '6px 4px',
                    background: amount === preset.amount ? color.gold : 'rgba(255,255,255,0.06)',
                    color: amount === preset.amount ? '#241a00' : color.textMuted,
                    border: 'none',
                    fontFamily: font.body,
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    cursor: 'pointer',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              className="hud-range"
              min={bounds.minTotal}
              max={bounds.maxTotal}
              step={sliderStep}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: color.textMuted }}>AMOUNT</div>
                <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: color.gold, textShadow: `0 0 10px ${color.goldGlow}` }}>
                  {clampAmount(amount, bounds).toLocaleString()}
                </div>
              </div>
              <button
                onClick={confirm}
                style={{
                  clipPath: cutCorners(6),
                  padding: '10px 22px',
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
                Confirm
              </button>
            </div>
          </div>
        </HudFrame>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {validActions.includes('fold') && (
          <ActionButton label="Fold" accent={color.crimson} glow={color.crimsonGlow} onClick={() => onAction('fold')} />
        )}
        {validActions.includes('check') && (
          <ActionButton label="Check" accent={color.emerald} glow={color.emeraldGlow} onClick={() => onAction('check')} />
        )}
        {validActions.includes('call') && (
          <ActionButton label={`Call ${toCall.toLocaleString()}`} accent={color.emerald} glow={color.emeraldGlow} onClick={() => onAction('call')} />
        )}
        {canRaise && (
          <ActionButton
            label={raiseType === 'bet' ? 'Bet' : 'Raise'}
            accent={color.gold}
            glow={color.goldGlow}
            onClick={() => {
              setAmount(bounds.minTotal);
              setPanelOpen((open) => !open);
            }}
          />
        )}
      </div>
    </div>
  );
}
