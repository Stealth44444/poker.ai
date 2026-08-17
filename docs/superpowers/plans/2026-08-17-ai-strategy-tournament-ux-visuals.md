# AI Strategy, Tournament Info UX, Card/Chip Visual Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground AI decisions in real numbers (hand strength, pot odds, position, opponent tendencies), surface tournament-progress info the player currently can't see (blind countdown, stack standings), and make the chip/card assets do more visual work (denomination-correct chip colors, a card-flip glint, a physical dealer button).

**Architecture:** Three independent subsystems sharing no code, built in dependency order within each: pure logic modules first (`handStrength.ts`, `position.ts`, `tendency.ts`, `chipBreakdown.ts`) each with unit tests, then the stateful wiring that consumes them (`tournamentEngine.ts`'s `playerStats`, `turnOrchestrator.ts`'s per-decision context, `decideAction.ts`'s prompt), then the presentational layer (HUD components, `ChipStack.tsx`, `DealtCard.tsx`, `DealerButton.tsx`) verified live via Playwright screenshots — matching this codebase's existing split between tested pure logic and screenshot-verified visuals.

**Tech Stack:** Next.js (see `node_modules/next/dist/docs/` before writing app-router code), React 19, @react-three/fiber + drei, vitest, playwright (visual checks).

**Spec:** `docs/superpowers/specs/2026-08-17-ai-strategy-tournament-ux-visuals-design.md`

---

## File map

| File | Role |
|---|---|
| `src/lib/ai/handStrength.ts` (create) | `preflopStrength`, `madeHandRank`, `potOddsPercent` |
| `src/lib/ai/handStrength.test.ts` (create) | tests for the above |
| `src/lib/ai/position.ts` (create) | `classifyPosition` |
| `src/lib/ai/position.test.ts` (create) | tests |
| `src/lib/poker/tournamentEngine.ts` (modify) | `PlayerStats` interface, `playerStats` field on `TournamentState`, initialized in `createTournament` |
| `src/lib/poker/tournamentEngine.test.ts` (modify) | `playerStats` init/persistence tests |
| `src/lib/ai/tendency.ts` (create) | `describeTendency` |
| `src/lib/ai/tendency.test.ts` (create) | tests |
| `src/lib/ai/decideAction.ts` (modify) | 4 new `DecisionContext` fields + prompt sentence |
| `src/lib/ai/decideAction.test.ts` (modify) | updated context literals + new prompt-content test |
| `src/lib/poker/turnOrchestrator.ts` (modify) | increments `playerStats`; computes and passes the 4 new context fields |
| `src/lib/poker/turnOrchestrator.test.ts` (modify) | `playerStats` accumulation + context-passing tests |
| `src/components/hud/TableHUD.tsx` (modify) | blind-countdown line |
| `src/components/hud/StackLeaderboard.tsx` (create) | stack-sorted sidebar + survivor count |
| `src/lib/poker/chipBreakdown.ts` (create) | `breakDownAmount` |
| `src/lib/poker/chipBreakdown.test.ts` (create) | tests |
| `src/components/scene/ChipStack.tsx` (modify) | denomination-aware mesh selection |
| `src/components/scene/DealtCard.tsx` (modify) | flip-glint plane |
| `src/components/scene/DealerButton.tsx` (create) | procedural gold disc |
| `src/components/scene/PokerScene.tsx` (modify) | renders `DealerButton` |
| `src/app/play/page.tsx` (modify) | passes `handsPerBlindLevel` to `TableHUD`, renders `StackLeaderboard` |
| `scripts/verify-strategy-tournament-visuals.js` (create) | playwright screenshots: HUD, chip denominations, flip glint |

Conventions: 2-space indent, single quotes, `@/` imports, comments only for non-obvious constraints. Run tests with `npx vitest run <file>`.

---

## Domain 1: AI Strategy Grounding

### Task 1: Hand strength / pot odds module

**Files:**
- Create: `src/lib/ai/handStrength.ts`
- Test: `src/lib/ai/handStrength.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { preflopStrength, madeHandRank, potOddsPercent } from './handStrength';

describe('preflopStrength', () => {
  it('rates AA as premium', () => {
    expect(preflopStrength(['Ah', 'Ad']).tier).toBe('premium');
  });

  it('rates AKo as premium', () => {
    expect(preflopStrength(['Ah', 'Kd']).tier).toBe('premium');
  });

  it('rates 77 as strong', () => {
    expect(preflopStrength(['7h', '7d']).tier).toBe('strong');
  });

  it('rates 76 suited as playable', () => {
    expect(preflopStrength(['7h', '6h']).tier).toBe('playable');
  });

  it('rates 72 offsuit as weak', () => {
    expect(preflopStrength(['7h', '2d']).tier).toBe('weak');
  });
});

describe('madeHandRank', () => {
  it('returns null preflop', () => {
    expect(madeHandRank(['Ah', 'Kd'], [])).toBeNull();
  });

  it('names the made hand once the flop is out', () => {
    expect(madeHandRank(['Ad', 'Kd'], ['Qd', 'Jd', '2d'])).toBe('Flush');
  });
});

describe('potOddsPercent', () => {
  it('is 0 when there is nothing to call', () => {
    expect(potOddsPercent(0, 500)).toBe(0);
  });

  it('computes the call-to-pot ratio as a percent', () => {
    // toCall 100 into a pot of 300 -> 100 / (300 + 100) = 25%
    expect(potOddsPercent(100, 300)).toBe(25);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/ai/handStrength.test.ts`
Expected: FAIL — `Cannot find module './handStrength'`

- [ ] **Step 3: Implement `handStrength.ts`**

```ts
import { Card, Rank } from '@/lib/poker/types';
import { evaluateHand } from '@/lib/poker/handEvaluator';

const RANK_ORDER: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RANK_NUMERIC: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i + 2])
) as Record<Rank, number>;

// Simplified Chen-formula base value per high card: face cards get flat
// premiums, number cards use half their rank.
const CHEN_HIGH_CARD_VALUE: Record<Rank, number> = {
  A: 10, K: 8, Q: 7, J: 6, T: 5,
  '9': 4.5, '8': 4, '7': 3.5, '6': 3, '5': 2.5, '4': 2, '3': 1.5, '2': 1,
};

export type PreflopTier = 'premium' | 'strong' | 'playable' | 'weak';

export interface PreflopStrength {
  tier: PreflopTier;
  score: number;
}

/**
 * Simplified Chen-formula preflop score: the high card's base value
 * (doubled and floored at 5 for pairs), +2 for suited, then a gap penalty
 * for how far apart the ranks sit — bucketed into four tiers. Not full
 * equity against an unknown range (that needs Monte Carlo simulation, out
 * of scope) but enough to stop the model from treating 72o and AA the same.
 */
export function preflopStrength(holeCards: Card[]): PreflopStrength {
  const [a, b] = holeCards;
  const rankA = a[0] as Rank;
  const rankB = b[0] as Rank;
  const suited = a[1] === b[1];
  const paired = rankA === rankB;
  const numA = RANK_NUMERIC[rankA];
  const numB = RANK_NUMERIC[rankB];
  const highRank = numA >= numB ? rankA : rankB;
  const lowNum = Math.min(numA, numB);
  const highNum = Math.max(numA, numB);

  let score = CHEN_HIGH_CARD_VALUE[highRank];
  if (paired) {
    score = Math.max(score * 2, 5);
  } else {
    if (suited) score += 2;
    const gap = highNum - lowNum - 1;
    if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else if (gap >= 4) score -= 5;
  }
  score = Math.max(score, 0);

  let tier: PreflopTier;
  if (score >= 10) tier = 'premium';
  else if (score >= 7) tier = 'strong';
  else if (score >= 4) tier = 'playable';
  else tier = 'weak';

  return { tier, score };
}

/** Postflop only — the actual made hand category (not an equity estimate). Returns null preflop. */
export function madeHandRank(holeCards: Card[], communityCards: Card[]): string | null {
  if (communityCards.length < 3) return null;
  return evaluateHand(holeCards, communityCards).name;
}

export function potOddsPercent(toCall: number, pot: number): number {
  if (toCall <= 0) return 0;
  return Math.round((toCall / (pot + toCall)) * 100);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/ai/handStrength.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/handStrength.ts src/lib/ai/handStrength.test.ts
git commit -m "feat: add preflop hand-strength and pot-odds scoring"
```

---

### Task 2: Position classification module

**Files:**
- Create: `src/lib/ai/position.ts`
- Test: `src/lib/ai/position.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { classifyPosition } from './position';

describe('classifyPosition', () => {
  it('labels the dealer seat as button', () => {
    expect(classifyPosition(0, 0, 10)).toBe('button');
  });

  it('labels the seat after the dealer as small blind', () => {
    expect(classifyPosition(1, 0, 10)).toBe('smallBlind');
  });

  it('labels two seats after the dealer as big blind', () => {
    expect(classifyPosition(2, 0, 10)).toBe('bigBlind');
  });

  it('splits the remaining seats into early/middle/late bands', () => {
    expect(classifyPosition(4, 0, 10)).toBe('early');
    expect(classifyPosition(6, 0, 10)).toBe('middle');
    expect(classifyPosition(9, 0, 10)).toBe('late');
  });

  it('offsets correctly when the dealer is not seat 0', () => {
    // dealer=8: small blind=9, big blind=0
    expect(classifyPosition(9, 8, 10)).toBe('smallBlind');
    expect(classifyPosition(0, 8, 10)).toBe('bigBlind');
  });

  it('treats heads-up as button vs. big blind only, matching postBlinds', () => {
    expect(classifyPosition(0, 0, 2)).toBe('button');
    expect(classifyPosition(1, 0, 2)).toBe('bigBlind');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/ai/position.test.ts`
Expected: FAIL — `Cannot find module './position'`

- [ ] **Step 3: Implement `position.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/ai/position.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/position.ts src/lib/ai/position.test.ts
git commit -m "feat: add table-position classification"
```

---

### Task 3: `playerStats` on `TournamentState`

**Files:**
- Modify: `src/lib/poker/tournamentEngine.ts`
- Modify: `src/lib/poker/tournamentEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/poker/tournamentEngine.test.ts` (reuses `makePlayers` already defined at the top of the file):

```ts
describe('playerStats', () => {
  it('initializes zeroed stats for every player', () => {
    const tournament = createTournament(makePlayers(3));
    expect(tournament.playerStats).toEqual({
      p0: { actions: 0, raises: 0, folds: 0, allIns: 0 },
      p1: { actions: 0, raises: 0, folds: 0, allIns: 0 },
      p2: { actions: 0, raises: 0, folds: 0, allIns: 0 },
    });
  });

  it('is left untouched by startHand', () => {
    let tournament = createTournament(makePlayers(2));
    tournament = {
      ...tournament,
      playerStats: { ...tournament.playerStats, p0: { actions: 3, raises: 1, folds: 0, allIns: 0 } },
    };
    tournament = startHand(tournament);
    expect(tournament.playerStats.p0).toEqual({ actions: 3, raises: 1, folds: 0, allIns: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/poker/tournamentEngine.test.ts`
Expected: FAIL — `tournament.playerStats` is `undefined`

- [ ] **Step 3: Add `PlayerStats` and wire it into `TournamentState`**

In `src/lib/poker/tournamentEngine.ts`, add above the `TournamentState` interface:

```ts
export interface PlayerStats {
  actions: number;
  raises: number;
  folds: number;
  allIns: number;
}

function zeroPlayerStats(): PlayerStats {
  return { actions: 0, raises: 0, folds: 0, allIns: 0 };
}
```

Add the field to `TournamentState`:

```ts
export interface TournamentState {
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  street: Street;
  dealerSeat: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  handsPerBlindLevel: number;
  bets: Record<string, number>;
  currentBet: number;
  minRaise: number;
  actedThisRound: string[];
  actionAnchorSeat: number;
  playerStats: Record<string, PlayerStats>;
}
```

Initialize it in `createTournament`:

```ts
export function createTournament(players: Player[], startingSmallBlind = 25, handsPerBlindLevel = 10): TournamentState {
  return {
    players,
    deck: [],
    communityCards: [],
    street: 'preflop',
    dealerSeat: 0,
    smallBlind: startingSmallBlind,
    bigBlind: startingSmallBlind * 2,
    handNumber: 0,
    handsPerBlindLevel,
    bets: {},
    currentBet: 0,
    minRaise: startingSmallBlind * 2,
    actedThisRound: [],
    actionAnchorSeat: 0,
    playerStats: Object.fromEntries(players.map((p) => [p.id, zeroPlayerStats()])),
  };
}
```

`startHand` spreads `...state` into its return value already, so `playerStats` passes through untouched with no further changes needed there.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/poker/tournamentEngine.test.ts`
Expected: PASS (all tests, including the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/lib/poker/tournamentEngine.ts src/lib/poker/tournamentEngine.test.ts
git commit -m "feat: track per-player action stats across a tournament"
```

---

### Task 4: Opponent tendency module

**Files:**
- Create: `src/lib/ai/tendency.ts`
- Test: `src/lib/ai/tendency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/ai/tendency.test.ts`
Expected: FAIL — `Cannot find module './tendency'`

- [ ] **Step 3: Implement `tendency.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/ai/tendency.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/tendency.ts src/lib/ai/tendency.test.ts
git commit -m "feat: derive opponent tendency reads from tracked stats"
```

---

### Task 5: Wire the new fields into `decideAction`'s context and prompt

**Files:**
- Modify: `src/lib/ai/decideAction.ts`
- Modify: `src/lib/ai/decideAction.test.ts`

- [ ] **Step 1: Replace `decideAction.test.ts` with the updated version**

Every existing test constructs a `DecisionContext` literal, so each one needs the 4 new required fields. Replace the full file:

```ts
import { describe, it, expect, vi } from 'vitest';
import { decideAction, ChatClient } from './decideAction';
import { Persona } from '../poker/personas';

const persona: Persona = { id: 'ai1', name: 'Ace', style: 'aggressive', description: 'Bets big and often.' };

const baseStrategyContext = {
  handStrengthHint: 'weak',
  potOddsPercent: 0,
  position: 'button',
  opponentReads: '',
};

function makeClient(content: string | null): ChatClient {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { content } }] }),
      },
    },
  };
}

describe('decideAction', () => {
  it('returns the parsed decision when the model responds with a valid action', async () => {
    const client = makeClient(JSON.stringify({ action: 'call', amount: null }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 20, minBetOrRaiseAmount: 40, maxBetOrRaiseAmount: 1000, yourStack: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'call', 'raise', 'all-in'], ...baseStrategyContext },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'call', amount: undefined });
  });

  it('falls back to a safe action when the model returns an illegal action', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: 50 }));
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, yourStack: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'bet', 'all-in'], ...baseStrategyContext },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back when the model raises for more than the max allowed amount', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: 5000 }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, yourStack: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'raise', 'all-in'], ...baseStrategyContext },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back when the model raises below the minimum allowed amount', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: 5 }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, yourStack: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'raise', 'all-in'], ...baseStrategyContext },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back when the model raises without providing a positive amount', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: null }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, yourStack: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'raise', 'all-in'], ...baseStrategyContext },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back to fold when check is not available and the API errors', async () => {
    const client: ChatClient = { chat: { completions: { create: vi.fn().mockRejectedValue(new Error('network down')) } } };
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 50, minBetOrRaiseAmount: 100, maxBetOrRaiseAmount: 1000, yourStack: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'call', 'raise', 'all-in'], ...baseStrategyContext },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'fold', isFallback: true });
  });

  it('falls back when the call takes longer than the timeout', async () => {
    const client: ChatClient = {
      chat: {
        completions: {
          create: vi.fn(() => new Promise<{ choices: { message: { content: string | null } }[] }>(() => {})),
        },
      },
    };
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, yourStack: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'bet', 'all-in'], ...baseStrategyContext },
      persona,
      { client, timeoutMs: 20 }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('tells the model the valid bet/raise amount range', async () => {
    let capturedPrompt = '';
    const client: ChatClient = {
      chat: {
        completions: {
          create: vi.fn((params: Record<string, unknown>) => {
            const messages = params.messages as { content: string }[];
            capturedPrompt = messages[0].content;
            return Promise.resolve({
              choices: [{ message: { content: JSON.stringify({ action: 'check', amount: null }) } }],
            });
          }),
        },
      },
    };
    await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 300, maxBetOrRaiseAmount: 9000, yourStack: 8700, stacks: {}, actionHistory: [], validActions: ['check', 'bet', 'fold'], ...baseStrategyContext },
      persona,
      { client }
    );
    expect(capturedPrompt).toContain('300');
    expect(capturedPrompt).toContain('9000');
  });

  it('tells the model its own remaining stack and the other stacks at the table', async () => {
    let capturedPrompt = '';
    const client: ChatClient = {
      chat: {
        completions: {
          create: vi.fn((params: Record<string, unknown>) => {
            const messages = params.messages as { content: string }[];
            capturedPrompt = messages[0].content;
            return Promise.resolve({
              choices: [{ message: { content: JSON.stringify({ action: 'check', amount: null }) } }],
            });
          }),
        },
      },
    };
    await decideAction(
      {
        holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 8700,
        yourStack: 8700, stacks: { ai1: 8700, ai2: 4300 }, actionHistory: [], validActions: ['check', 'bet', 'fold'], ...baseStrategyContext,
      },
      persona,
      { client }
    );
    expect(capturedPrompt).toContain('8700');
    expect(capturedPrompt).toContain('4300');
  });

  it('tells the model the action history so far this hand', async () => {
    let capturedPrompt = '';
    const client: ChatClient = {
      chat: {
        completions: {
          create: vi.fn((params: Record<string, unknown>) => {
            const messages = params.messages as { content: string }[];
            capturedPrompt = messages[0].content;
            return Promise.resolve({
              choices: [{ message: { content: JSON.stringify({ action: 'check', amount: null }) } }],
            });
          }),
        },
      },
    };
    await decideAction(
      {
        holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 8700,
        yourStack: 8700, stacks: {}, actionHistory: ['ai2 raise 300', 'ai3 fold'], validActions: ['check', 'bet', 'fold'], ...baseStrategyContext,
      },
      persona,
      { client }
    );
    expect(capturedPrompt).toContain('ai2 raise 300');
    expect(capturedPrompt).toContain('ai3 fold');
  });

  it('tells the model its hand-strength read, pot odds, position, and opponent reads', async () => {
    let capturedPrompt = '';
    const client: ChatClient = {
      chat: {
        completions: {
          create: vi.fn((params: Record<string, unknown>) => {
            const messages = params.messages as { content: string }[];
            capturedPrompt = messages[0].content;
            return Promise.resolve({
              choices: [{ message: { content: JSON.stringify({ action: 'check', amount: null }) } }],
            });
          }),
        },
      },
    };
    await decideAction(
      {
        holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 8700,
        yourStack: 8700, stacks: {}, actionHistory: [], validActions: ['check', 'bet', 'fold'],
        handStrengthHint: 'premium', potOddsPercent: 33, position: 'late', opponentReads: 'Ace: aggressive; Rocky: tight',
      },
      persona,
      { client }
    );
    expect(capturedPrompt).toContain('premium');
    expect(capturedPrompt).toContain('33');
    expect(capturedPrompt).toContain('late');
    expect(capturedPrompt).toContain('Ace: aggressive; Rocky: tight');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/ai/decideAction.test.ts`
Expected: FAIL — TypeScript errors (`DecisionContext` doesn't have `handStrengthHint`, etc.) and the last test's assertions fail

- [ ] **Step 3: Add the fields and prompt sentence in `decideAction.ts`**

Add the 4 fields to `DecisionContext`:

```ts
export interface DecisionContext {
  holeCards: Card[];
  communityCards: Card[];
  pot: number;
  toCall: number;
  minBetOrRaiseAmount: number;
  maxBetOrRaiseAmount: number;
  /** The deciding player's own remaining stack (chips not yet committed this street). */
  yourStack: number;
  stacks: Record<string, number>;
  actionHistory: string[];
  validActions: ActionType[];
  /** Preflop tier label (e.g. "premium") or postflop made-hand name (e.g. "Two Pair"). */
  handStrengthHint: string;
  potOddsPercent: number;
  position: string;
  /** e.g. "Ace: aggressive; Rocky: tight" — other active players only, empty string if none tracked yet. */
  opponentReads: string;
}
```

Insert one sentence into the prompt template, right before the `Valid actions:` line:

```ts
  const prompt = `You are ${persona.name}, a ${persona.style} poker player. ${persona.description}
Hole cards: ${context.holeCards.join(' ')}
Community cards: ${context.communityCards.join(' ') || '(none)'}
Pot: ${context.pot}. Amount to call: ${context.toCall}.
Your remaining stack: ${context.yourStack}.
Stacks at the table: ${opponentStacks || '(unknown)'}.
Action this hand so far: ${context.actionHistory.join('; ') || '(no actions yet)'}.
Your hand-strength read: ${context.handStrengthHint}. Pot odds to call: ${context.potOddsPercent}%. Your position: ${context.position}.${context.opponentReads ? ` Opponent reads — ${context.opponentReads}.` : ''}
Valid actions: ${context.validActions.join(', ')}.
Pick one valid action that fits both your style and the situation — weigh your stack size, the pot, and what's already happened this hand. If multiple players have already raised each other this hand, only keep matching or reraising with a genuinely strong hand; otherwise call, or fold rather than escalate a losing spot. Going all-in should be a deliberate choice for a strong hand or a clear stack-pressure/pot-odds reason, not a reflexive default. If betting or raising, "amount" must be the TOTAL chips you have in front of you this street (not just the extra chips added), and must be between ${context.minBetOrRaiseAmount} and ${context.maxBetOrRaiseAmount} inclusive.`;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/ai/decideAction.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/decideAction.ts src/lib/ai/decideAction.test.ts
git commit -m "feat: surface hand-strength, pot-odds, position, and opponent reads in AI prompts"
```

---

### Task 6: Wire `playerStats` increments and the new context fields into `turnOrchestrator`

**Files:**
- Modify: `src/lib/poker/turnOrchestrator.ts`
- Modify: `src/lib/poker/turnOrchestrator.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the `playUntilHumanOrHandEnd` describe block in `src/lib/poker/turnOrchestrator.test.ts` (reuses `makePlayers`, `persona`, `alwaysCheckOrCall` already defined in that block):

```ts
  it('accumulates playerStats for every action taken during the hand', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { state: after } = await playUntilHumanOrHandEnd(
      state, 'p0', { p1: persona }, alwaysCheckOrCall, { playerId: 'p0', type: 'call' }
    );
    // p0's initial call is the only action recorded for the human; the AI
    // (p1) acts once on the preflop round and once more after the flop —
    // matches the ['action', 'action', 'street', 'action'] event sequence
    // from the playback test above.
    expect(after.playerStats.p0.actions).toBe(1);
    expect(after.playerStats.p1.actions).toBe(2);
  });

  it('passes hand-strength, pot-odds, position, and opponent-read context to the decision function', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(3, 1000), 25)));
    let capturedContext: Parameters<DecisionFn>[0] | null = null;
    const capturingDecisionFn: DecisionFn = async (context) => {
      if (!capturedContext) capturedContext = context;
      if (context.validActions.includes('check')) return { action: 'check' };
      return { action: 'call' };
    };
    await playUntilHumanOrHandEnd(
      state, 'p0', { p1: persona, p2: persona }, capturingDecisionFn, { playerId: 'p0', type: 'fold' }
    );
    expect(capturedContext).not.toBeNull();
    expect(typeof capturedContext!.handStrengthHint).toBe('string');
    expect(typeof capturedContext!.potOddsPercent).toBe('number');
    expect(['button', 'smallBlind', 'bigBlind', 'early', 'middle', 'late']).toContain(capturedContext!.position);
    expect(typeof capturedContext!.opponentReads).toBe('string');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/poker/turnOrchestrator.test.ts`
Expected: FAIL — `playerStats` accumulation is 0, and `capturedContext` fields are `undefined` (TypeScript will also flag the missing `DecisionContext` fields once Task 5 lands, so run this after Task 5 is committed)

- [ ] **Step 3: Implement the wiring in `turnOrchestrator.ts`**

Add imports:

```ts
import { TournamentState, advanceStreet, resolveShowdown, HandResult } from './tournamentEngine';
import { applyAction, validActions } from './bettingEngine';
import { ActionType, Card, PlayerAction, Street } from './types';
import { Persona } from './personas';
import { DecisionContext, Decision } from '../ai/decideAction';
import { preflopStrength, madeHandRank, potOddsPercent } from '../ai/handStrength';
import { classifyPosition } from '../ai/position';
import { describeTendency } from '../ai/tendency';
```

Add a helper above `playUntilHumanOrHandEnd`:

```ts
function incrementPlayerStats(
  stats: TournamentState['playerStats'],
  playerId: string,
  actionType: ActionType
): TournamentState['playerStats'] {
  const current = stats[playerId];
  const next = { ...current, actions: current.actions + 1 };
  if (actionType === 'fold') next.folds += 1;
  else if (actionType === 'bet' || actionType === 'raise') next.raises += 1;
  else if (actionType === 'all-in') next.allIns += 1;
  return { ...stats, [playerId]: next };
}
```

In `applyAndRecord`, add `playerStats` to the state update (counts fallback actions too, since `finalAction.type` is what actually happened):

```ts
    state = {
      ...state,
      players: result.players,
      currentBet: result.currentBet,
      minRaise: result.minRaise,
      bets: result.bets,
      actedThisRound: [...state.actedThisRound, finalAction.playerId],
      playerStats: incrementPlayerStats(state.playerStats, finalAction.playerId, finalAction.type),
    };
```

Replace the decision-building block inside the `while (true)` loop:

```ts
    const player = state.players.find((p) => p.id === nextId)!;
    const persona = personasById[nextId];
    const pot = Object.values(state.bets).reduce((sum, b) => sum + b, 0);
    const committed = state.bets[nextId] ?? 0;
    const toCall = state.currentBet - committed;
    const minBetOrRaiseAmount = state.currentBet === 0 ? state.minRaise : state.currentBet + state.minRaise;
    const maxBetOrRaiseAmount = committed + player.stack;
    const madeRank = madeHandRank(player.holeCards, state.communityCards);
    const handStrengthHint = madeRank ?? preflopStrength(player.holeCards).tier;
    const opponentReads = state.players
      .filter((p) => p.id !== nextId && !p.isFolded)
      .map((p) => {
        const tendency = describeTendency(state.playerStats[p.id]);
        return tendency ? `${p.name}: ${tendency}` : null;
      })
      .filter((entry): entry is string => entry !== null)
      .join('; ');
    const decision = await decisionFn(
      {
        holeCards: player.holeCards,
        communityCards: state.communityCards,
        pot,
        toCall,
        minBetOrRaiseAmount,
        maxBetOrRaiseAmount,
        yourStack: player.stack,
        stacks: Object.fromEntries(state.players.map((p) => [p.id, p.stack])),
        actionHistory: events
          .filter((e) => e.type === 'action')
          .map((e) => `${e.playerId} ${e.action}${e.amount ? ' ' + e.amount : ''}`),
        validActions: validActions(state, nextId),
        handStrengthHint,
        potOddsPercent: potOddsPercent(toCall, pot),
        position: classifyPosition(player.seat, state.dealerSeat, state.players.length),
        opponentReads,
      },
      persona
    );

    applyAndRecord({ playerId: nextId, type: decision.action, amount: decision.amount }, decision.isFallback);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/poker/turnOrchestrator.test.ts`
Expected: PASS (all tests, including the 2 new ones)

- [ ] **Step 5: Run the full test suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: PASS (all files)

- [ ] **Step 6: Commit**

```bash
git add src/lib/poker/turnOrchestrator.ts src/lib/poker/turnOrchestrator.test.ts
git commit -m "feat: wire hand-strength, pot-odds, position, and opponent reads into AI decisions"
```

---

## Domain 2: Tournament Info UX

### Task 7: Blind countdown in `TableHUD`

**Files:**
- Modify: `src/components/hud/TableHUD.tsx`
- Modify: `src/app/play/page.tsx`

No unit test — presentational, verified live in Task 13 (consistent with every other HUD component in this codebase).

- [ ] **Step 1: Add the `handsPerBlindLevel` prop and countdown line**

In `src/components/hud/TableHUD.tsx`, update the props and add the derived countdown:

```tsx
export function TableHUD({
  pot,
  street,
  handNumber,
  smallBlind,
  bigBlind,
  handsPerBlindLevel,
  communityCards,
}: {
  pot: number;
  street: Street;
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  handsPerBlindLevel: number;
  communityCards: Card[];
}) {
  const slots = Array.from({ length: BOARD_SLOTS }, (_, i) => communityCards[i] ?? null);
  const handsUntilBlindIncrease = handsPerBlindLevel - ((handNumber - 1) % handsPerBlindLevel);
```

Add one line inside the existing blinds/hand-number column, right after `HAND #{handNumber}`:

```tsx
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: color.textMuted, letterSpacing: 1 }}>
              <span style={{ color: color.cyan, fontWeight: 600 }}>{STREET_LABELS[street]}</span>
              <span>
                BLINDS {smallBlind}/{bigBlind}
              </span>
              <span>HAND #{handNumber}</span>
              <span>BLIND UP IN {handsUntilBlindIncrease}</span>
            </div>
```

- [ ] **Step 2: Pass the new prop from `play/page.tsx`**

In `src/app/play/page.tsx`, add `handsPerBlindLevel={state.handsPerBlindLevel}` to the existing `<TableHUD>` call:

```tsx
      <TableHUD
        pot={view.pot}
        street={displayState?.street ?? state.street}
        handNumber={state.handNumber}
        smallBlind={state.smallBlind}
        bigBlind={state.bigBlind}
        handsPerBlindLevel={state.handsPerBlindLevel}
        communityCards={view.communityCards}
      />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/hud/TableHUD.tsx src/app/play/page.tsx
git commit -m "feat: show a blind-increase countdown in the table HUD"
```

---

### Task 8: Stack leaderboard

**Files:**
- Create: `src/components/hud/StackLeaderboard.tsx`
- Modify: `src/app/play/page.tsx`

No unit test — presentational, verified live in Task 13.

- [ ] **Step 1: Create `StackLeaderboard.tsx`**

```tsx
'use client';

import { Player } from '@/lib/poker/types';
import { HudFrame } from './HudFrame';
import { color, font, hudZIndex } from './theme';

/**
 * Top-right stack standings — opposite TableHUD's top-center, clear of
 * HoleCardsHUD's bottom-right corner. Reads state.players directly: stack
 * rankings don't need to be frame-accurate to mid-hand event playback the
 * way the pot readout does.
 */
export function StackLeaderboard({ players, humanId }: { players: Player[]; humanId: string }) {
  const alive = players.filter((p) => p.stack > 0).length;
  const sorted = [...players].sort((a, b) => b.stack - a.stack);

  return (
    <div style={{ position: 'absolute', top: 18, right: 18, zIndex: hudZIndex, pointerEvents: 'none' }}>
      <HudFrame accent={color.gold}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px 12px', minWidth: 160 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: color.textMuted }}>
            {alive}/{players.length} 남음
          </div>
          {sorted.map((p) => {
            const busted = p.stack === 0;
            const isHuman = p.id === humanId;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontSize: 12,
                  fontFamily: font.body,
                  color: busted ? color.textMuted : isHuman ? color.cyan : color.text,
                  opacity: busted ? 0.5 : 1,
                  textDecoration: busted ? 'line-through' : 'none',
                }}
              >
                <span>{p.name}</span>
                <span style={{ fontWeight: isHuman ? 700 : 400 }}>{p.stack.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </HudFrame>
    </div>
  );
}
```

- [ ] **Step 2: Render it in `play/page.tsx`**

Add the import:

```tsx
import { StackLeaderboard } from '@/components/hud/StackLeaderboard';
```

Render it alongside the other HUD overlays (right after the `<TableHUD>` call):

```tsx
      <StackLeaderboard players={state.players} humanId={HUMAN_ID} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/hud/StackLeaderboard.tsx src/app/play/page.tsx
git commit -m "feat: add a stack leaderboard with survivor count"
```

---

## Domain 3: Card/Chip Visual Detail

### Task 9: Chip denomination breakdown

**Files:**
- Create: `src/lib/poker/chipBreakdown.ts`
- Test: `src/lib/poker/chipBreakdown.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { breakDownAmount } from './chipBreakdown';

describe('breakDownAmount', () => {
  it('breaks a round amount into the largest denominations first', () => {
    expect(breakDownAmount(3300)).toEqual([2000, 1000, 200, 100]);
  });

  it('drops a remainder smaller than the smallest denomination', () => {
    expect(breakDownAmount(150)).toEqual([100]);
  });

  it('caps the total chip count at maxChips', () => {
    expect(breakDownAmount(100000, 5)).toHaveLength(5);
  });

  it('returns an empty list for zero', () => {
    expect(breakDownAmount(0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/poker/chipBreakdown.test.ts`
Expected: FAIL — `Cannot find module './chipBreakdown'`

- [ ] **Step 3: Implement `chipBreakdown.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/poker/chipBreakdown.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/poker/chipBreakdown.ts src/lib/poker/chipBreakdown.test.ts
git commit -m "feat: add greedy chip-denomination breakdown"
```

---

### Task 10: Denomination-aware `ChipStack`

**Files:**
- Modify: `src/components/scene/ChipStack.tsx`

No unit test — visual, verified live in Task 13.

- [ ] **Step 1: Replace `ChipStack.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { breakDownAmount } from '@/lib/poker/chipBreakdown';

const CHIPS_URL = '/props/poker-chips.glb';
// The chip meshes are already close to real-world size (~48mm across); the
// table works out to ~1.3x real scale, so this keeps chips proportionate.
const CHIP_SCALE = 1.05;
const MAX_CHIPS = 20;

// Matches the six mesh names in poker-chips.glb: Poker_Chip_10k,
// Poker_Chip_100, Poker_chip_200 (lowercase c), Poker_Chip_500,
// Poker_Chip_1000, Poker_Chip_2000.
const NAME_PATTERN = /Poker_[Cc]hip_(\d+)(k)?/;

function denominationFromName(name: string): number | null {
  const match = name.match(NAME_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2] ? value * 1000 : value;
}

export function ChipStack({ count, position }: { count: number; position: [number, number, number] }) {
  const { scene } = useGLTF(CHIPS_URL);

  // The asset holds six differently-colored chips, one per denomination —
  // grab each by name (baked to world space and recentered with its bottom
  // at y=0, so stacked chips sit flush on each other) instead of relying on
  // traversal order, so the color rendered always matches the value.
  const { variantsByDenomination, chipHeight } = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const byDenomination = new Map<number, THREE.Group>();
    let height = 0;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const denomination = denominationFromName(obj.name);
        if (denomination === null) return;
        const cloned = obj.clone();
        cloned.matrix.copy(obj.matrixWorld);
        cloned.matrix.decompose(cloned.position, cloned.quaternion, cloned.scale);
        const box = new THREE.Box3().setFromObject(cloned);
        const center = box.getCenter(new THREE.Vector3());
        cloned.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
        height = Math.max(height, box.max.y - box.min.y);
        const wrapper = new THREE.Group();
        wrapper.add(cloned);
        byDenomination.set(denomination, wrapper);
      }
    });
    return { variantsByDenomination: byDenomination, chipHeight: height };
  }, [scene]);

  if (variantsByDenomination.size === 0) return null;
  const fallback = variantsByDenomination.values().next().value!;
  const denominations = breakDownAmount(count, MAX_CHIPS);

  return (
    <group position={position} scale={CHIP_SCALE}>
      {denominations.map((denomination, i) => (
        <group key={i} position={[0, i * chipHeight, 0]}>
          <primitive object={(variantsByDenomination.get(denomination) ?? fallback).clone()} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(CHIPS_URL);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/ChipStack.tsx
git commit -m "feat: color chip stacks by denomination instead of traversal order"
```

---

### Task 11: Card-flip glint

**Files:**
- Modify: `src/components/scene/DealtCard.tsx`

No unit test — visual, verified live in Task 13.

- [ ] **Step 1: Add the glint constant and material ref**

Add near the top of `DealtCard.tsx`, alongside the other tuning constants:

```ts
const GLINT_HALF_WINDOW = 0.35;
```

Add a ref inside the component body, alongside the other refs:

```ts
  const glintMaterial = useRef<THREE.MeshBasicMaterial>(null);
```

- [ ] **Step 2: Drive the glint's opacity from the existing flip `useFrame` block**

Replace the rotation portion of the `useFrame` callback:

```ts
    const rg = rotGroup.current;
    if (rg) {
      const targetAngle = faceDown ? FACE_DOWN_ANGLE : FACE_UP_ANGLE;
      if (Math.abs(currentAngle.current - targetAngle) > ANGLE_EPSILON) rotSettled.current = false;
      if (!rotSettled.current) {
        currentAngle.current = THREE.MathUtils.damp(currentAngle.current, targetAngle, FLIP_LAMBDA, delta);
        rg.rotation.x = currentAngle.current;
        const gm = glintMaterial.current;
        if (gm) gm.opacity = Math.max(0, 1 - Math.abs(currentAngle.current) / GLINT_HALF_WINDOW);
        if (Math.abs(currentAngle.current - targetAngle) < ANGLE_EPSILON) {
          currentAngle.current = targetAngle;
          rg.rotation.x = targetAngle;
          rotSettled.current = true;
          // Settled cards sit face-down or face-up, well outside the glint
          // window — clear it explicitly rather than leaving a stale value.
          if (gm) gm.opacity = 0;
        }
      }
    }
```

- [ ] **Step 3: Add the glint plane to the JSX**

Replace the return statement:

```tsx
  return (
    <group ref={posGroup} rotation={[0, rotationY, 0]}>
      <group ref={rotGroup} scale={scale}>
        <Card3D card={card} position={[0, 0, 0]} flat={false} />
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[0.08, 0.12]} />
          <meshBasicMaterial
            ref={glintMaterial}
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/DealtCard.tsx
git commit -m "feat: add a glint flash to the card-flip midpoint"
```

---

### Task 12: Dealer button prop

**Files:**
- Create: `src/components/scene/DealerButton.tsx`
- Modify: `src/components/scene/PokerScene.tsx`

No unit test — visual, verified live in Task 13.

- [ ] **Step 1: Create `DealerButton.tsx`**

```tsx
'use client';

import { color } from '@/components/hud/theme';

/** A small procedural gold disc marking the dealer's seat on the felt — no
 * suitable existing asset for this, and it's simple enough not to need one. */
export function DealerButton({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.045, 0.045, 0.012, 24]} />
      <meshStandardMaterial color={color.gold} emissive={color.gold} emissiveIntensity={0.35} metalness={0.6} roughness={0.35} />
    </mesh>
  );
}
```

- [ ] **Step 2: Render it in `PokerScene.tsx`**

Add the import:

```tsx
import { DealerButton } from './DealerButton';
```

Insert right after `<Table />` (before the chair-rendering block), reusing the already-destructured `players` and the `dealerSeat` prop plus the existing `HOLE_CARD_RX`/`HOLE_CARD_RZ`/`TABLE_TOP_Y` constants:

```tsx
        <Room />
        <Table />
        {(() => {
          // Same seat placed on the felt just beside the dealer's hole
          // cards — a physical version of the "D" badge PlayerPlate already
          // shows, not new state.
          const angle = (dealerSeat / players.length) * Math.PI * 2;
          const dx = Math.sin(angle) * HOLE_CARD_RX;
          const dz = Math.cos(angle) * HOLE_CARD_RZ;
          const tx = Math.cos(angle);
          const tz = -Math.sin(angle);
          const buttonOffset = 0.16;
          return (
            <DealerButton
              position={[dx + tx * buttonOffset, TABLE_TOP_Y + 0.006, dz + tz * buttonOffset]}
            />
          );
        })()}
        {players
          .filter((p) => p.seat !== HUMAN_SEAT)
          .map((p) => {
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/scene/DealerButton.tsx src/components/scene/PokerScene.tsx
git commit -m "feat: add a physical dealer-button prop to the table"
```

---

### Task 13: Live verification of the tournament-UX and visual-detail work

**Files:**
- Create: `scripts/verify-strategy-tournament-visuals.js`

- [ ] **Step 1: Write the verification script**

```js
// Screenshots the tournament-UX and visual-detail additions: blind
// countdown + stack leaderboard + dealer button on load, a raised bet
// showing mixed chip denominations, and the showdown card-flip glint.
// Requires `npm run dev` on :3000.
// Usage: node scripts/verify-strategy-tournament-visuals.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 300)));

  try {
    await page.goto('http://localhost:3000/play', { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'strategy-check-hud.png' });
    console.log('saved strategy-check-hud.png (blind countdown + stack leaderboard + dealer button)');

    for (let round = 0; round < 6; round++) {
      const raiseButton = page.getByRole('button', { name: /Raise|Bet/ }).first();
      const hasRaise = await raiseButton.isVisible().catch(() => false);
      if (hasRaise) {
        await raiseButton.dispatchEvent('click');
        await page.waitForTimeout(300);
        const slider = page.locator('input[type=range]');
        const max = await slider.getAttribute('max');
        if (max) {
          await slider.evaluate((el, value) => {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }, max);
        }
        await page.getByRole('button', { name: 'Confirm' }).dispatchEvent('click');
        console.log(`  round ${round}: raised to max`);
      } else {
        const callButton = page.getByRole('button', { name: /Call/ });
        const checkButton = page.getByRole('button', { name: 'Check' });
        if (await callButton.isVisible().catch(() => false)) {
          await callButton.dispatchEvent('click');
          console.log(`  round ${round}: called`);
        } else if (await checkButton.isVisible().catch(() => false)) {
          await checkButton.dispatchEvent('click');
          console.log(`  round ${round}: checked`);
        } else {
          console.log(`  round ${round}: no human action offered, waiting`);
        }
      }
      await page.waitForTimeout(6000);
    }
    await page.screenshot({ path: 'strategy-check-chips.png' });
    console.log('saved strategy-check-chips.png (chip denominations on a large bet)');

    const foldButton = page.getByRole('button', { name: 'Fold' });
    const hasFold = await foldButton.isVisible().catch(() => false);
    if (hasFold) {
      await foldButton.dispatchEvent('click');
      console.log('folded, watching the showdown reveal for the flip glint...');
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(150);
        await page.screenshot({ path: `strategy-check-glint-${i}.png` });
      }
      console.log('saved strategy-check-glint-0..19.png (scan these for a bright mid-flip frame)');
    } else {
      console.log('fold not offered, skipping the showdown glint capture');
    }
  } catch (err) {
    console.log('[error]', String(err).slice(0, 500));
    await page.screenshot({ path: 'strategy-check-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
```

- [ ] **Step 2: Start the dev server in the background**

Run: `npm run dev` (background)
Expected: server listening on `http://localhost:3000`

- [ ] **Step 3: Run the script**

Run: `node scripts/verify-strategy-tournament-visuals.js`
Expected: console log lines for each round, ending in either the glint screenshot sequence or a "fold not offered" message; no `[error]` line

- [ ] **Step 4: Inspect the screenshots**

Read `strategy-check-hud.png` and confirm:
- `StackLeaderboard` visible top-right, sorted by stack, human's row in cyan, `10/10 남음` header
- `TableHUD`'s blinds column shows a `BLIND UP IN N` line
- A small gold disc (`DealerButton`) visible on the felt beside the dealer's hole cards

Read `strategy-check-chips.png` and confirm the bet-chip stack(s) show more than one distinct chip color (denomination-correct), not a uniform repeating cycle.

Read a handful of `strategy-check-glint-*.png` frames spanning the sequence and confirm at least one frame shows a bright white flash on a flipping card (the edge-on midpoint) that isn't present in the neighboring frames.

If any check fails, fix the relevant Task (7/8/10/11/12) and rerun the script before proceeding.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-strategy-tournament-visuals.js
git commit -m "test: add a playwright script for the tournament-UX and visual-detail work"
```

---

## Final check

- [ ] Run the full test suite once more: `npx vitest run` — expect all tests passing.
- [ ] Run `npx tsc --noEmit` once more — expect no errors.
- [ ] Run `npx eslint` — expect no errors.
