# AI Strategy, Tournament Info UX, Card/Chip Visual Detail — Design

**Date:** 2026-08-17
**Status:** Approved by user

## Goal

Three independent improvements bundled into one planning cycle since they were
approved together, but with no shared dependencies — each can be built and
verified on its own:

1. Ground AI decisions in actual numbers (hand strength, pot odds, position,
   opponent tendencies) instead of an LLM eyeballing raw cards.
2. Surface tournament-progress information the player currently has no way to
   see (blind countdown, stack standings, survivor count).
3. Make the existing card/chip assets do more work visually (chip
   denominations, card-flip highlight, a real dealer-button prop).

## 1. AI Strategy Grounding

### Problem

`decideAction.ts`'s prompt already includes stacks, action history, and pot/
call numbers (fixed earlier this session), but the model has no explicit
signal for hand strength, position, or how a specific opponent has been
playing — it has to infer everything from raw card notation and a plain
action log.

### Hand strength / pot odds

New pure module `src/lib/ai/handStrength.ts`:

- `preflopStrength(holeCards: Card[]): { tier: 'premium' | 'strong' | 'playable' | 'weak'; label: string }`
  — a simplified Chen-formula-style score (high card value, pair bonus,
  suited bonus, connector bonus) bucketed into 4 tiers. Not full equity —
  preflop equity vs. an unknown range is a much bigger undertaking
  (Monte Carlo simulation) and out of scope; a tier is enough to stop the
  model from treating 72o and AA as equivalent unknowns.
- `madeHandRank(holeCards: Card[], communityCards: Card[]): string | null`
  — postflop only (`communityCards.length >= 3`), reuses the existing
  `evaluateHand` from `handEvaluator.ts` and returns its `.name` (e.g.
  "Two Pair", "Flush") — the actual made hand, not an equity estimate.
  Returns `null` preflop.
- `potOddsPercent(toCall: number, pot: number): number` —
  `toCall / (pot + toCall) * 100`, rounded. `0` when `toCall` is `0`.

### Position

New pure module `src/lib/ai/position.ts`:

- `classifyPosition(seat: number, dealerSeat: number, totalSeats: number): 'button' | 'smallBlind' | 'bigBlind' | 'early' | 'middle' | 'late'`
  — seat offset from the dealer determines the label; blinds and button are
  exact offsets (0/1/2 from dealer), the rest split the remaining seats into
  three roughly equal bands by offset.

### Opponent tendencies

Needs state that persists **across hands** within a tournament (unlike
`actedThisRound`, which resets every street). Add to `TournamentState`
(`tournamentEngine.ts`):

```ts
export interface PlayerStats {
  actions: number;
  raises: number;
  folds: number;
  allIns: number;
}
// TournamentState gains:
playerStats: Record<string, PlayerStats>;
```

- `createTournament` initializes one zeroed `PlayerStats` per player.
- `startHand` does **not** touch `playerStats` (only per-hand fields reset).
- `turnOrchestrator.ts`'s `applyAndRecord` increments the acting player's
  counters based on `finalAction.type` (fold → `folds`, raise/bet → `raises`,
  all-in → `allIns`; every action increments `actions`) — folded-back
  (`isFallback`) actions still count, since they're what actually happened.
- New pure function `src/lib/ai/tendency.ts`:
  `describeTendency(stats: PlayerStats): string | null` — returns `null`
  below a sample-size floor (e.g. `actions < 5`, not enough data yet),
  otherwise a short label from the raise/fold ratios: "aggressive" (raises
  ≥35% of actions), "tight" (folds ≥55%), "loose" (folds <25%), or `null`
  (balanced — not worth mentioning).

### Wiring

`turnOrchestrator.ts`'s per-decision context-building gains three fields on
`DecisionContext` (`decideAction.ts`):

```ts
handStrengthHint: string;   // preflop tier label or postflop made-hand name
potOddsPercent: number;
position: string;           // classifyPosition(...) label
opponentReads: string;      // "Ace: aggressive; Rocky: tight" — other active
                             // players only, tendency === null omitted
```

The prompt gains one more sentence surfacing these before the existing
decision instruction. No change to the JSON response schema — this only
adds *input* context, the model still returns the same `{action, amount}`.

### Testing

- `handStrength.test.ts`: known hole-card pairs → expected tier (e.g. `AA` →
  premium, `72o` → weak); known board+hole combo → expected `madeHandRank`
  name; `potOddsPercent` against hand-computed examples.
- `position.test.ts`: table of (seat, dealerSeat, totalSeats) → expected
  label, including heads-up (2-seat) edge case where button and small blind
  are the same seat (matches existing `postBlinds` heads-up handling).
- `tendency.test.ts`: `describeTendency` against constructed `PlayerStats`
  (below floor → null, aggressive/tight/loose thresholds).
- `turnOrchestrator.test.ts`: extend to assert `playerStats` increments
  correctly after actions and survives a street/hand transition.
- `decideAction.test.ts`: extend the existing "captures the prompt" pattern
  to assert the new fields appear in the generated prompt text.

## 2. Tournament Info UX

### Blind countdown

Pure derivation, no new state: blinds raise when
`handNumber % handsPerBlindLevel === 1` (existing logic in `startHand`), so
`handsUntilBlindIncrease = handsPerBlindLevel - ((handNumber - 1) % handsPerBlindLevel)`
— e.g. with the default `handsPerBlindLevel = 10`, hand 1 → 10 hands left,
hand 10 → 1 hand left, hand 11 (just raised) → 10 hands left again. Added as
a line in the existing `TableHUD` component — no new component needed.

### Stack leaderboard + survivor count

New component `src/components/hud/StackLeaderboard.tsx`: a slim vertical
panel (matches `HudFrame` styling) anchored to a screen edge (right side,
below `HoleCardsHUD`'s corner so they don't collide — top-right, opposite
`TableHUD`'s top-center). Shows all 10 players sorted by `stack` descending:
name, stack, a small "busted" treatment (dimmed, strikethrough-ish) for
`stack === 0`, and the human's own row highlighted (reuse the gold/cyan
accent language). A header line shows survivor count: `{alive}/10 남음`
where `alive = players.filter(p => p.stack > 0).length`.

Rendered in `play/page.tsx` alongside the other HUD overlays, reading
`state.players` directly (no snapshot sync needed — stack rankings don't
need to be frame-accurate to mid-hand animation the way the pot readout
does).

### Testing

Both are presentational; no unit tests, consistent with every other HUD
component in this codebase (`TableHUD`, `BetControls`, `WinnerBanner`, etc.
are all unverified by unit test, verified live via Playwright screenshots
per this project's established pattern). The countdown math is trivial
enough to inline rather than extract into a separately-tested function.

## 3. Card/Chip Visual Detail

### Chip denominations

`public/props/poker-chips.glb` already contains six named chip meshes
(`Poker_Chip_10k`, `Poker_Chip_100`, `Poker_chip_200`, `Poker_Chip_500`,
`Poker_Chip_1000`, `Poker_Chip_2000`) but `ChipStack.tsx` currently cycles
through them by array index (`variants[i % variants.length]`) regardless of
the actual bet amount — the color never matches the value.

New pure function `src/lib/poker/chipBreakdown.ts`:

- `breakDownAmount(amount: number, maxChips = 20): number[]` — greedy
  breakdown of `amount` into the largest available denominations first
  (`[10000, 2000, 1000, 500, 200, 100]`), capped at `maxChips` total chips
  (extra value beyond what `maxChips` chips can represent at the smallest
  denomination is dropped — matches the existing `MAX_CHIPS = 20` visual cap,
  this is a display detail, not a ledger).

`ChipStack.tsx` changes: build a `Record<denomination, meshVariant>` by
parsing each traversed mesh's `name` for its denomination (regex against the
known labels) instead of relying on traversal order, then render
`breakDownAmount(count)` mapping each value to its matching mesh.

### Card-flip highlight

`DealtCard.tsx`'s flip already tracks a continuous angle via
`currentAngle.current` (damped toward `FACE_DOWN_ANGLE`/`FACE_UP_ANGLE`). Add
a lightweight glint: a thin emissive-white plane, child of the same
`rotGroup`, scaled to zero opacity normally, whose opacity is driven from
the same per-frame `useFrame` callback as a function of how close
`currentAngle.current` is to the edge-on midpoint (`0` radians) — peaks at
the midpoint, fades on either side over a narrow window (e.g. ±0.35 rad).
Pure `useFrame`-driven opacity, no new state, no shader work.

### Dealer button prop

No suitable existing asset — a small procedural mesh instead of sourcing
another download. New component `src/components/scene/DealerButton.tsx`: a
flattened cylinder (`THREE.CylinderGeometry`), gold-toned emissive material
matching the HUD's `color.gold`, positioned on the felt just in front of the
dealer's seat (reuse `seatTransform` + a small inward offset, similar to how
`HOLE_CARD_RX`/`RZ` place cards). Rendered in `PokerScene.tsx` once,
positioned by `dealerSeat` from `TableView`/props — same data already used
for `PlayerPlate`'s "D" badge, this is a second, physical representation of
the same fact, not new state.

### Testing

All three are visual; verified via the existing `scripts/verify-game-ux.js`-
style Playwright screenshot flow (extended to reach a state with a chip bet
over 1000 to see mixed denominations, and a showdown to see the flip glint),
consistent with how every other 3D/visual change this session was verified.
`chipBreakdown.ts`'s pure function gets unit tests (it's pure logic,
separated from rendering — same pattern as `betMath.ts`).

## Out of scope

- Full postflop equity calculation (Monte Carlo simulation against opponent
  ranges) — `madeHandRank` gives a categorical signal instead.
- Persisting `playerStats` across tournament restarts — resets with a new
  tournament, matches how stacks already work.
- Hand history / replay UI, mobile/responsive layout, deployment readiness —
  raised during brainstorming as other candidate directions, deferred.
