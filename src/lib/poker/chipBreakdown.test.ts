import { describe, it, expect } from 'vitest';
import { breakDownAmount } from './chipBreakdown';

describe('breakDownAmount', () => {
  it('breaks a round amount into the largest denominations first', () => {
    expect(breakDownAmount(3300)).toEqual([2000, 1000, 200, 100]);
  });

  it('drops a remainder smaller than the smallest denomination', () => {
    expect(breakDownAmount(150)).toEqual([100]);
  });

  it('caps the total chip count at maxChips', () => {
    expect(breakDownAmount(100000, 5)).toHaveLength(5);
  });

  it('returns an empty list for zero', () => {
    expect(breakDownAmount(0)).toEqual([]);
  });
});
