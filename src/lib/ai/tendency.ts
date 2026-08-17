import { PlayerStats } from '@/lib/poker/tournamentEngine';

const SAMPLE_FLOOR = 5;

/**
 * Short tendency label from an opponent's action history so far this
 * tournament — null below a sample-size floor (not enough data yet) or
 * when the raise/fold ratios don't clear a threshold (a balanced player
 * isn't worth mentioning).
 */
export function describeTendency(stats: PlayerStats): string | null {
  if (stats.actions < SAMPLE_FLOOR) return null;
  const raiseRate = stats.raises / stats.actions;
  const foldRate = stats.folds / stats.actions;
  if (raiseRate >= 0.35) return 'aggressive';
  if (foldRate >= 0.55) return 'tight';
  if (foldRate < 0.25) return 'loose';
  return null;
}
