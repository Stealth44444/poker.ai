const DENOMINATIONS = [10000, 2000, 1000, 500, 200, 100];

/**
 * Greedy breakdown of `amount` into the largest available chip
 * denominations first, capped at `maxChips` total chips — a display detail
 * (matches ChipStack's existing MAX_CHIPS visual cap), not a ledger, so
 * value beyond what maxChips chips can represent at the smallest
 * denomination is simply dropped from the visual.
 */
export function breakDownAmount(amount: number, maxChips = 20): number[] {
  const chips: number[] = [];
  let remaining = amount;
  for (const denom of DENOMINATIONS) {
    while (remaining >= denom && chips.length < maxChips) {
      chips.push(denom);
      remaining -= denom;
    }
  }
  return chips;
}
