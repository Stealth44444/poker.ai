import { describe, it, expect } from 'vitest';
import { raiseBounds, clampAmount, raisePresets } from './betMath';

describe('raiseBounds', () => {
  it('uses minRaise as the floor when there is no bet to raise over', () => {
    expect(raiseBounds({ currentBet: 0, minRaise: 50, humanBet: 0, humanStack: 1000 }))
      .toEqual({ minTotal: 50, maxTotal: 1000 });
  });

  it('adds minRaise on top of the current bet otherwise', () => {
    expect(raiseBounds({ currentBet: 200, minRaise: 150, humanBet: 50, humanStack: 400 }))
      .toEqual({ minTotal: 350, maxTotal: 450 });
  });

  it('caps the floor at all-in when the stack cannot cover a min-raise', () => {
    expect(raiseBounds({ currentBet: 200, minRaise: 200, humanBet: 0, humanStack: 300 }))
      .toEqual({ minTotal: 300, maxTotal: 300 });
  });
});

describe('clampAmount', () => {
  it('clamps into the bounds', () => {
    const bounds = { minTotal: 100, maxTotal: 500 };
    expect(clampAmount(50, bounds)).toBe(100);
    expect(clampAmount(700, bounds)).toBe(500);
    expect(clampAmount(300, bounds)).toBe(300);
  });
});

describe('raisePresets', () => {
  it('builds Min / pot-fraction / Pot / All-in presets clamped into bounds', () => {
    const presets = raisePresets(300, { minTotal: 100, maxTotal: 1000 });
    expect(presets).toEqual([
      { label: 'Min', amount: 100 },
      { label: '1/2 Pot', amount: 150 },
      { label: '2/3 Pot', amount: 200 },
      { label: 'Pot', amount: 300 },
      { label: 'All-in', amount: 1000 },
    ]);
  });

  it('clamps small-pot fractions up to the minimum', () => {
    const presets = raisePresets(60, { minTotal: 100, maxTotal: 1000 });
    expect(presets.find((p) => p.label === '1/2 Pot')!.amount).toBe(100);
  });
});
