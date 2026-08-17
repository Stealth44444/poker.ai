import { describe, it, expect } from 'vitest';
import { classifyPosition } from './position';

describe('classifyPosition', () => {
  it('labels the dealer seat as button', () => {
    expect(classifyPosition(0, 0, 10)).toBe('button');
  });

  it('labels the seat after the dealer as small blind', () => {
    expect(classifyPosition(1, 0, 10)).toBe('smallBlind');
  });

  it('labels two seats after the dealer as big blind', () => {
    expect(classifyPosition(2, 0, 10)).toBe('bigBlind');
  });

  it('splits the remaining seats into early/middle/late bands', () => {
    expect(classifyPosition(4, 0, 10)).toBe('early');
    expect(classifyPosition(6, 0, 10)).toBe('middle');
    expect(classifyPosition(9, 0, 10)).toBe('late');
  });

  it('offsets correctly when the dealer is not seat 0', () => {
    // dealer=8: small blind=9, big blind=0
    expect(classifyPosition(9, 8, 10)).toBe('smallBlind');
    expect(classifyPosition(0, 8, 10)).toBe('bigBlind');
  });

  it('treats heads-up as button vs. big blind only, matching postBlinds', () => {
    expect(classifyPosition(0, 0, 2)).toBe('button');
    expect(classifyPosition(1, 0, 2)).toBe('bigBlind');
  });
});
