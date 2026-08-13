# Game UX Design — Pot/Nameplates/Betting/Showdown

**Date:** 2026-08-13
**Status:** Approved by user

## Goal

Complete the in-game UX for the 3D poker game: player nameplates, pot/blind
display, turn indicator, raise amount controls, AI action/table-talk
presentation, and a staged showdown reveal.

## Decisions (from brainstorming)

- **Nameplates:** 3D-anchored DOM via drei `<Html>` above each avatar.
- **Raise input:** preset buttons (Min / ½ pot / ⅔ pot / Pot / All-in) plus a
  fine-tune slider.
- **Showdown:** staged reveal driven by the existing event playback hook.
- **AI actions:** action badge + speech bubble (tableTalk) on the nameplate.
- **Playback consistency:** per-event state snapshots from the server
  (approach A below).

## Architecture

### Problem

The server returns the final `TournamentState` plus an ordered `HandEvent[]`.
Events replay client-side on a timer (`useEventPlayback`, 1200ms apart). If
nameplates read the final state, stacks and the pot update before the
corresponding action badge appears.

### Chosen approach: per-event snapshots

Each `HandEvent` gains a `snapshot` — the display-relevant slice of state at
the moment the event occurred:

```ts
interface EventSnapshot {
  players: { id: string; stack: number; isFolded: boolean; isAllIn: boolean }[];
  bets: Record<string, number>;   // per-player, cumulative for the hand
  pot: number;                    // sum of bets
  communityCards: Card[];
  street: Street;
  currentBet: number;
}
```

`playUntilHumanOrHandEnd` fills it inside `applyAndRecord` and at the
street/showdown event push sites. Rejected alternatives: client-side replay of
events (duplicates engine logic, risk of divergence) and no synchronization
(stacks visibly jump ahead of the animation).

### Display state derivation

`useEventPlayback` additionally returns `displayState`: the snapshot of the
last visible event, or `null` before any event is visible (callers then fall
back to the server state). When playback finishes (`isDone`), callers switch
to the authoritative server state.

## Components

### PlayerPlate (new, per seat)

Anchored above each avatar with drei `<Html>` (inside the r3f canvas, at the
seat position + height offset). Shows:

- Name, current stack.
- Current-hand bet amount (from `snapshot.bets`), hidden when 0.
- Dealer button "D" when `seat === dealerSeat`.
- Turn highlight (glowing border) for the player whose action is pending:
  during playback, the `playerId` of the next not-yet-visible action event;
  after playback (`isDone`), the human seat if `validActions` is non-empty,
  otherwise no highlight.
- Folded players dimmed; all-in players tagged "ALL-IN".
- Transient action badge ("Raise 400", "Fold", …) shown for ~1.2s when that
  player's action event becomes visible.
- Speech bubble above the badge when the event carries `tableTalk`; visible
  ~2.5s.

### TableHUD (new, 2D overlay)

Fixed top-center DOM overlay: pot total, blind level (SB/BB), hand number,
current street. Reads `displayState`.

### BetControls (rework of the button row)

Bottom-center DOM overlay, visible only when it is the human's turn
(`isDone && validActions.length > 0`):

- Direct buttons: Fold, Check or Call N (whichever is valid).
- "Raise" opens an amount panel: presets Min / ½ Pot / ⅔ Pot / Pot / All-in,
  a slider between min and max, the chosen amount displayed, Confirm button.
- Min/max derivation (client-side, from state fields):
  - `minTotal = currentBet === 0 ? minRaise : currentBet + minRaise`
  - `maxTotal = humanBet + humanStack` (all-in)
  - Presets clamp into `[minTotal, maxTotal]`; pot-fraction presets compute
    from the current pot.
- Sends the existing `PlayerAction` shape (`bet`/`raise` with `amount`).

### Showdown sequence

Driven by the showdown event becoming visible:

1. Remaining (non-folded) players' hole cards flip face-up in seat order,
   0.6s apart (Card3D `faceDown` false per player, staggered by local timer).
2. Winner banner appears center-screen: "{name} wins {amount}" per awarded
   pot (from `potsAwarded`), plus winner nameplate highlight.
3. A "Next hand" button appears; clicking it POSTs with no action, which the
   server treats as "start next hand" for a finished hand.

Note: opponents' hole cards are already present client-side; the flip is a
presentation change only. (Server-side hole-card hiding is a known separate
issue, out of scope here.)

## Data flow

1. POST /api/action → `{ state, events (with snapshots), validActions }`.
2. `useEventPlayback` reveals events on schedule; `displayState` tracks the
   latest visible snapshot.
3. Scene + HUD components render from `displayState ?? state`.
4. On `isDone`, controls unlock if `validActions` is non-empty.

## Error handling

- Missing snapshot (old cached responses): components fall back to server
  state — all snapshot reads go through `displayState ?? state`.
- Raise amount out of bounds: clamp client-side; server `applyAction` already
  falls back to check/fold on invalid actions.
- Zero valid actions with hand unfinished (spectating an all-in runout):
  controls stay hidden; playback still runs.

## Testing

- Unit (vitest): snapshot correctness in `playUntilHumanOrHandEnd` (stacks/
  pot/bets per event), bet min/max/preset computation helper.
- Visual: extend `verify-room.js` flow — screenshot with nameplates visible,
  betting panel open, and a showdown frame.

## Out of scope

- Chip/card movement animations (separate follow-up).
- Server-side hole-card hiding.
- Sound.
