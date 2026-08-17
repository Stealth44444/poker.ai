export type PositionLabel = 'button' | 'smallBlind' | 'bigBlind' | 'early' | 'middle' | 'late';

/**
 * Labels a seat relative to the dealer button. Offsets 0/1/2 from the
 * dealer are exact (button/small blind/big blind — heads-up the button and
 * small blind collapse into the same seat, matching turnOrchestrator's
 * postBlinds heads-up rule). The remaining seats split evenly into
 * early/middle/late bands by how far they sit after the big blind.
 */
export function classifyPosition(seat: number, dealerSeat: number, totalSeats: number): PositionLabel {
  const offset = ((seat - dealerSeat) % totalSeats + totalSeats) % totalSeats;

  if (totalSeats === 2) {
    return offset === 0 ? 'button' : 'bigBlind';
  }

  if (offset === 0) return 'button';
  if (offset === 1) return 'smallBlind';
  if (offset === 2) return 'bigBlind';

  const remainingSeats = totalSeats - 3;
  const bandIndex = offset - 3;
  const bandSize = remainingSeats / 3;
  if (bandIndex < bandSize) return 'early';
  if (bandIndex < bandSize * 2) return 'middle';
  return 'late';
}
