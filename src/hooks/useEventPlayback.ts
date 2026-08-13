'use client';

import { useEffect, useState } from 'react';
import { HandEvent } from '@/lib/poker/turnOrchestrator';
import { scheduleEvents } from '@/lib/playback/scheduleEvents';
import { derivePlayback } from '@/lib/playback/derivePlayback';

export function useEventPlayback(events: HandEvent[], delayMs = 1200) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (events.length === 0) return;
    const schedule = scheduleEvents(events, delayMs);
    const timers = schedule.map(({ atMs }, i) => setTimeout(() => setVisibleCount(i + 1), atMs));
    return () => timers.forEach(clearTimeout);
  }, [events, delayMs]);

  return {
    visibleEvents: events.slice(0, visibleCount),
    isDone: visibleCount >= events.length,
    visibleCount,
    ...derivePlayback(events, visibleCount),
  };
}
