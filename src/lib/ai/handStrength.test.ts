import { describe, it, expect } from 'vitest';
import { preflopStrength, madeHandRank, potOddsPercent } from './handStrength';

describe('preflopStrength', () => {
  it('rates AA as premium', () => {
    expect(preflopStrength(['Ah', 'Ad']).tier).toBe('premium');
  });

  it('rates AKo as premium', () => {
    expect(preflopStrength(['Ah', 'Kd']).tier).toBe('premium');
  });

  it('rates 77 as strong', () => {
    expect(preflopStrength(['7h', '7d']).tier).toBe('strong');
  });

  it('rates 76 suited as playable', () => {
    expect(preflopStrength(['7h', '6h']).tier).toBe('playable');
  });

  it('rates 72 offsuit as weak', () => {
    expect(preflopStrength(['7h', '2d']).tier).toBe('weak');
  });
});

describe('madeHandRank', () => {
  it('returns null preflop', () => {
    expect(madeHandRank(['Ah', 'Kd'], [])).toBeNull();
  });

  it('names the made hand once the flop is out', () => {
    expect(madeHandRank(['Ad', 'Kd'], ['Qd', 'Jd', '2d'])).toBe('Flush');
  });
});

describe('potOddsPercent', () => {
  it('is 0 when there is nothing to call', () => {
    expect(potOddsPercent(0, 500)).toBe(0);
  });

  it('computes the call-to-pot ratio as a percent', () => {
    // toCall 100 into a pot of 300 -> 100 / (300 + 100) = 25%
    expect(potOddsPercent(100, 300)).toBe(25);
  });
});
