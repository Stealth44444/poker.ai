import { describe, it, expect } from 'vitest';
import { seatTransform } from './seatLayout';

describe('seatTransform', () => {
  it('places seat 0 at the north edge of the table', () => {
    const { position } = seatTransform(0, 10);
    expect(position[0]).toBeCloseTo(0, 5);
    expect(position[2]).toBeCloseTo(3.2, 5);
  });

  it('places the opposite seat at the south edge', () => {
    const { position } = seatTransform(5, 10);
    expect(position[0]).toBeCloseTo(0, 5);
    expect(position[2]).toBeCloseTo(-3.2, 5);
  });

  it('faces every seat toward the table center', () => {
    const { rotationY } = seatTransform(0, 10);
    expect(rotationY).toBeCloseTo(Math.PI, 5);
  });
});
