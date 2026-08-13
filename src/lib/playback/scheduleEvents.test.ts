import { describe, it, expect } from 'vitest';
import { scheduleEvents } from './scheduleEvents';
import { HandEvent } from '@/lib/poker/turnOrchestrator';

describe('scheduleEvents', () => {
  it('assigns increasing timestamps spaced by the delay', () => {
    const events: HandEvent[] = [
      { type: 'action', playerId: 'p1', action: 'call' },
      { type: 'action', playerId: 'p2', action: 'fold' },
      { type: 'street', street: 'flop' },
    ];
    expect(scheduleEvents(events, 1200)).toEqual([
      { event: events[0], atMs: 0 },
      { event: events[1], atMs: 1200 },
      { event: events[2], atMs: 2400 },
    ]);
  });

  it('returns an empty schedule for no events', () => {
    expect(scheduleEvents([], 1200)).toEqual([]);
  });
});
