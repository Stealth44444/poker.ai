import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, draw } from './deck';

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck();
    expect(deck.length).toBe(52);
    expect(new Set(deck).size).toBe(52);
  });
});

describe('shuffle', () => {
  it('preserves all cards but changes their order', () => {
    const deck = createDeck();
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const shuffled = shuffle(deck, rng);
    expect(shuffled.length).toBe(52);
    expect([...shuffled].sort().join(',')).toBe([...deck].sort().join(','));
    expect(shuffled.join(',')).not.toBe(deck.join(','));
  });
});

describe('draw', () => {
  it('draws the given count from the top and returns the remainder', () => {
    const deck = createDeck();
    const { drawn, remaining } = draw(deck, 2);
    expect(drawn).toEqual([deck[0], deck[1]]);
    expect(remaining.length).toBe(50);
  });
});
