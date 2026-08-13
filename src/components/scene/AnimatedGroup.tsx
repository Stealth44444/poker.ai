'use client';

import { ReactNode } from 'react';
import { useDampedVector3 } from '@/hooks/useDampedVector3';

/** Positions its children at `target`, easing there from `from` (or from
 * `target` itself, i.e. no motion) instead of snapping. */
export function AnimatedGroup({
  target,
  from,
  lambda,
  children,
}: {
  target: [number, number, number];
  from?: [number, number, number];
  lambda?: number;
  children: ReactNode;
}) {
  const ref = useDampedVector3(target, lambda, from);
  return <group ref={ref}>{children}</group>;
}
