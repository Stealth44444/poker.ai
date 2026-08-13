import { HandEvent } from '@/lib/poker/turnOrchestrator';

export interface ScheduledEvent {
  event: HandEvent;
  atMs: number;
}

export function scheduleEvents(events: HandEvent[], delayMs: number): ScheduledEvent[] {
  return events.map((event, i) => ({ event, atMs: i * delayMs }));
}
