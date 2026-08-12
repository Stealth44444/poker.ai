import { describe, it, expect } from 'vitest';
import { PERSONAS } from './personas';

describe('PERSONAS', () => {
  it('defines exactly 9 personas', () => {
    expect(PERSONAS.length).toBe(9);
  });

  it('has unique ids', () => {
    const ids = PERSONAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('uses only valid styles', () => {
    const validStyles = ['aggressive', 'tight', 'loose', 'bluffer'];
    PERSONAS.forEach((p) => expect(validStyles).toContain(p.style));
  });
});
