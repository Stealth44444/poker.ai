export interface RaiseBounds {
  /** Smallest legal total bet (chips committed this street including prior bet). */
  minTotal: number;
  /** All-in total: chips already committed plus remaining stack. */
  maxTotal: number;
}

export function raiseBounds(args: {
  currentBet: number;
  minRaise: number;
  humanBet: number;
  humanStack: number;
}): RaiseBounds {
  const maxTotal = args.humanBet + args.humanStack;
  const legalMin = args.currentBet === 0 ? args.minRaise : args.currentBet + args.minRaise;
  return { minTotal: Math.min(legalMin, maxTotal), maxTotal };
}

export function clampAmount(amount: number, bounds: RaiseBounds): number {
  return Math.min(Math.max(amount, bounds.minTotal), bounds.maxTotal);
}

export function raisePresets(pot: number, bounds: RaiseBounds): { label: string; amount: number }[] {
  return [
    { label: 'Min', amount: bounds.minTotal },
    { label: '1/2 Pot', amount: clampAmount(Math.round(pot / 2), bounds) },
    { label: '2/3 Pot', amount: clampAmount(Math.round((pot * 2) / 3), bounds) },
    { label: 'Pot', amount: clampAmount(pot, bounds) },
    { label: 'All-in', amount: bounds.maxTotal },
  ];
}
