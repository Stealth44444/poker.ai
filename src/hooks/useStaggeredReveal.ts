'use client';

import { useEffect, useState } from 'react';

/** Counts 0..count while `active`, one step every `stepMs`; resets when inactive. */
export function useStaggeredReveal(active: boolean, count: number, stepMs = 600): number {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!active) {
      setRevealed(0);
      return;
    }
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setRevealed(i + 1), (i + 1) * stepMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [active, count, stepMs]);

  return revealed;
}
