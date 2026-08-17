import { describe, it, expect } from 'vitest';
import { describeTendency } from './tendency';

describe('describeTendency', () => {
  it('returns null below the sample-size floor', () => {
    expect(describeTendency({ actions: 4, raises: 4, folds: 0, allIns: 0 })).toBeNull();
  });

  it('labels a high raise rate aggressive', () => {
    expect(describeTendency({ actions: 10, raises: 4, folds: 2, allIns: 0 })).toBe('aggressive');
  });

  it('labels a high fold rate tight', () => {
    expect(describeTendency({ actions: 10, raises: 1, folds: 6, allIns: 0 })).toBe('tight');
  });

  it('labels a low fold rate loose', () => {
    expect(describeTendency({ actions: 10, raises: 2, folds: 1, allIns: 0 })).toBe('loose');
  });

  it('returns null for a balanced player', () => {
    expect(describeTendency({ actions: 10, raises: 2, folds: 3, allIns: 0 })).toBeNull();
  });
});
