import { describe, it, expect } from 'vitest';
import { seatTransform } from './seatLayout';

describe('seatTransform', () => {
  it('places seat 0 at the north edge of the table', () => {
    const { position } = seatTransform(0, 10);
    expect(position[0]).toBeCloseTo(0, 5);
    expect(position[2]).toBeCloseTo(2.471, 5);
  });

  it('places the opposite seat at the south edge', () => {
    const { position } = seatTransform(5, 10);
    expect(position[0]).toBeCloseTo(0, 5);
    expect(position[2]).toBeCloseTo(-2.471, 5);
  });

  it('places a side seat close to the table (short axis)', () => {
    const { position } = seatTransform(2.5, 10);
    expect(position[0]).toBeCloseTo(1.374, 5);
    expect(position[2]).toBeCloseTo(0, 5);
  });

  it('faces every seat toward the table center', () => {
    const seat0 = seatTransform(0, 10);
    expect(seat0.rotationY).toBeCloseTo(Math.PI, 5);

    const seat3 = seatTransform(3, 10);
    expect(seat3.rotationY).toBeCloseTo((3 / 10) * Math.PI * 2 + Math.PI, 5);
  });
});
