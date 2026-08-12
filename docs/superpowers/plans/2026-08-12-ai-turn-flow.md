# AI Decisions + Turn-Flow API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 OpenAI-driven AI opponents, a turn-order orchestrator, a single `/api/action` endpoint, and a plain-text `/debug` page on top of the Phase 1 poker engine, so a full hand can actually be played end-to-end against real AI decisions.

**Architecture:** New turn-order logic (who acts next, is the betting round over, blind posting, dealer rotation) is added to the existing `tournamentEngine.ts`/new `turnOrchestrator.ts`. AI decisions go through a dependency-injectable `decideAction()` so tests never hit the real OpenAI API. A single Next.js Route Handler drives the whole loop per request using an in-memory, cookie-keyed session map.

**Tech Stack:** Existing Next.js + Vitest + pokersolver stack from Phase 1, plus the `openai` npm package.

**Note:** This is Phase 2 of `docs/superpowers/specs/2026-08-12-ai-holdem-tournament-design.md`, implementing `docs/superpowers/specs/2026-08-12-ai-turn-flow-design.md` in full. The 3D frontend (Phase 3) is out of scope; `/debug` stands in for it.

**Before Task 6 (API route):** This project's `AGENTS.md` warns that this Next.js version (16.3.0) may differ from typical training data on Route Handlers/`cookies()`. This plan's Task 6 code was written after reading `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` directly — if `npm run build` fails on that task with an API mismatch, re-read those files rather than guessing.

---

### Task 1: Extend Tournament State for Turn Tracking

Adds the fields turn orchestration needs (`currentBet`, `minRaise`, `actedThisRound`, `actionAnchorSeat`) and dealer button rotation, which Phase 1 didn't have.

**Files:**
- Modify: `src/lib/poker/tournamentEngine.ts`
- Test: `src/lib/poker/tournamentEngine.test.ts`

- [ ] **Step 1: Add the new tests to the existing test file**

Replace the full contents of `src/lib/poker/tournamentEngine.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import {
  createTournament, startHand, advanceStreet, resolveShowdown, isTournamentOver, getTournamentWinner,
} from './tournamentEngine';
import { Player } from './types';

function makePlayers(count: number, stack = 1000): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, name: `p${i}`, stack, holeCards: [], isFolded: false, isAllIn: false, seat: i,
  }));
}

describe('startHand', () => {
  it('deals two hole cards to each active player and removes them from the deck', () => {
    const hand = startHand(createTournament(makePlayers(3)));
    hand.players.forEach((p) => expect(p.holeCards.length).toBe(2));
    expect(hand.deck.length).toBe(52 - 3 * 2);
  });

  it('skips busted players', () => {
    const players = makePlayers(3);
    players[0].stack = 0;
    const hand = startHand(createTournament(players));
    expect(hand.players[0].holeCards.length).toBe(0);
    expect(hand.players[0].isFolded).toBe(true);
  });

  it('raises blinds every N hands', () => {
    let tournament = createTournament(makePlayers(2), 25, 2);
    for (let i = 0; i < 3; i++) tournament = startHand(tournament);
    expect(tournament.handNumber).toBe(3);
    expect(tournament.smallBlind).toBe(50);
  });

  it('rotates the dealer button each hand', () => {
    let tournament = createTournament(makePlayers(3));
    tournament = startHand(tournament);
    expect(tournament.dealerSeat).toBe(0);
    tournament = startHand(tournament);
    expect(tournament.dealerSeat).toBe(1);
  });

  it('resets betting round fields for the new hand', () => {
    const hand = startHand(createTournament(makePlayers(2)));
    expect(hand.currentBet).toBe(0);
    expect(hand.actedThisRound).toEqual([]);
  });
});

describe('advanceStreet', () => {
  it('deals the flop with 3 cards from preflop', () => {
    const flop = advanceStreet(startHand(createTournament(makePlayers(2))));
    expect(flop.street).toBe('flop');
    expect(flop.communityCards.length).toBe(3);
  });

  it('deals one card per street from flop through river', () => {
    let state = advanceStreet(startHand(createTournament(makePlayers(2))));
    state = advanceStreet(state);
    expect(state.street).toBe('turn');
    expect(state.communityCards.length).toBe(4);
    state = advanceStreet(state);
    expect(state.street).toBe('river');
    expect(state.communityCards.length).toBe(5);
  });

  it('resets currentBet and actedThisRound for the new betting round', () => {
    let state = startHand(createTournament(makePlayers(2)));
    state = { ...state, currentBet: 50, actedThisRound: ['p0', 'p1'] };
    const flop = advanceStreet(state);
    expect(flop.currentBet).toBe(0);
    expect(flop.actedThisRound).toEqual([]);
  });
});

describe('resolveShowdown', () => {
  it('awards the pot to the last player standing without a card comparison', () => {
    let state = startHand(createTournament(makePlayers(2)));
    state = {
      ...state,
      players: state.players.map((p, i) => ({ ...p, stack: 900, isFolded: i === 1 })),
      bets: { p0: 100, p1: 100 },
    };
    const { state: after, result } = resolveShowdown(state);
    expect(result.potsAwarded[0].winnerIds).toEqual(['p0']);
    expect(after.players.find((p) => p.id === 'p0')!.stack).toBe(1100);
  });
});

describe('tournament end detection', () => {
  it('is not over with multiple players holding chips', () => {
    expect(isTournamentOver(createTournament(makePlayers(3)))).toBe(false);
  });

  it('is over when only one player has chips left', () => {
    const players = makePlayers(2);
    players[1].stack = 0;
    const tournament = createTournament(players);
    expect(isTournamentOver(tournament)).toBe(true);
    expect(getTournamentWinner(tournament)?.id).toBe('p0');
  });
});
```

- [ ] **Step 2: Run the new tests to see them fail**

Run: `npx vitest run src/lib/poker/tournamentEngine.test.ts`
Expected: FAIL — the "rotates the dealer button", "resets betting round fields", and "resets currentBet and actedThisRound" tests fail (`currentBet`/`actedThisRound` are `undefined`, dealer seat never changes).

- [ ] **Step 3: Replace `tournamentEngine.ts` with the extended implementation**

```ts
import { Card, Player, Street } from './types';
import { createDeck, shuffle, draw } from './deck';
import { determineWinners } from './handEvaluator';
import { calculateSidePots, Pot } from './sidePots';

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
}

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
  };
}

function nextActiveSeat(players: Player[], fromSeat: number): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (fromSeat + i) % n;
    const player = players.find((p) => p.seat === seat);
    if (player && player.stack > 0) return seat;
  }
  return fromSeat;
}

export function startHand(state: TournamentState): TournamentState {
  const dealerSeat = state.handNumber === 0 ? state.dealerSeat : nextActiveSeat(state.players, state.dealerSeat);
  const deck = shuffle(createDeck());
  let remaining = deck;
  const players = state.players.map((p) => {
    if (p.stack <= 0) return { ...p, holeCards: [], isFolded: true, isAllIn: false };
    const { drawn, remaining: rest } = draw(remaining, 2);
    remaining = rest;
    return { ...p, holeCards: drawn, isFolded: false, isAllIn: false };
  });

  const handNumber = state.handNumber + 1;
  const shouldRaiseBlinds = state.handNumber > 0 && handNumber % state.handsPerBlindLevel === 1;
  const smallBlind = shouldRaiseBlinds ? state.smallBlind * 2 : state.smallBlind;
  const bigBlind = smallBlind * 2;

  return {
    ...state,
    players,
    deck: remaining,
    communityCards: [],
    street: 'preflop',
    handNumber,
    smallBlind,
    bigBlind,
    bets: {},
    dealerSeat,
    currentBet: 0,
    minRaise: bigBlind,
    actedThisRound: [],
    actionAnchorSeat: dealerSeat,
  };
}

const NEXT_STREET: Record<Street, Street> = {
  preflop: 'flop',
  flop: 'turn',
  turn: 'river',
  river: 'showdown',
  showdown: 'showdown',
};
const CARDS_TO_DEAL: Record<Street, number> = { preflop: 3, flop: 1, turn: 1, river: 0, showdown: 0 };

export function advanceStreet(state: TournamentState): TournamentState {
  const { drawn, remaining } = draw(state.deck, CARDS_TO_DEAL[state.street]);
  return {
    ...state,
    street: NEXT_STREET[state.street],
    communityCards: [...state.communityCards, ...drawn],
    deck: remaining,
    currentBet: 0,
    minRaise: state.bigBlind,
    actedThisRound: [],
    actionAnchorSeat: state.dealerSeat,
  };
}

export interface HandResult {
  potsAwarded: { pot: Pot; winnerIds: string[]; amountPerWinner: number }[];
}

export function resolveShowdown(state: TournamentState): { state: TournamentState; result: HandResult } {
  const pots = calculateSidePots(state.players, state.bets);
  const potsAwarded = pots.map((pot) => {
    const contenders = pot.eligiblePlayerIds.map((id) => state.players.find((p) => p.id === id)!);
    const winnerIds = contenders.length === 1
      ? [contenders[0].id]
      : determineWinners(contenders.map((p) => ({ playerId: p.id, holeCards: p.holeCards })), state.communityCards);
    const amountPerWinner = Math.floor(pot.amount / winnerIds.length);
    return { pot, winnerIds, amountPerWinner };
  });

  const players = state.players.map((p) => {
    const won = potsAwarded.reduce((sum, award) => sum + (award.winnerIds.includes(p.id) ? award.amountPerWinner : 0), 0);
    return { ...p, stack: p.stack + won };
  });

  return { state: { ...state, players, bets: {} }, result: { potsAwarded } };
}

export function isTournamentOver(state: TournamentState): boolean {
  return state.players.filter((p) => p.stack > 0).length <= 1;
}

export function getTournamentWinner(state: TournamentState): Player | null {
  const remaining = state.players.filter((p) => p.stack > 0);
  return remaining.length === 1 ? remaining[0] : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/poker/tournamentEngine.test.ts`
Expected: `11 passed`

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `npm test`
Expected: `27 passed` (deck 3, handEvaluator 4, bettingEngine 6, sidePots 3, tournamentEngine 11)

- [ ] **Step 6: Commit**

```bash
git add src/lib/poker/tournamentEngine.ts src/lib/poker/tournamentEngine.test.ts
git commit -m "feat: add turn-tracking fields and dealer rotation to tournament state"
```

---

### Task 2: AI Personas

**Files:**
- Create: `src/lib/poker/personas.ts`
- Test: `src/lib/poker/personas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { PERSONAS } from './personas';

describe('PERSONAS', () => {
  it('defines exactly 9 personas', () => {
    expect(PERSONAS.length).toBe(9);
  });

  it('has unique ids', () => {
    const ids = PERSONAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('uses only valid styles', () => {
    const validStyles = ['aggressive', 'tight', 'loose', 'bluffer'];
    PERSONAS.forEach((p) => expect(validStyles).toContain(p.style));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/poker/personas.test.ts`
Expected: FAIL with "Cannot find module './personas'"

- [ ] **Step 3: Implement the personas**

```ts
export type PersonaStyle = 'aggressive' | 'tight' | 'loose' | 'bluffer';

export interface Persona {
  id: string;
  name: string;
  style: PersonaStyle;
  description: string;
}

export const PERSONAS: Persona[] = [
  { id: 'ai1', name: 'Ace', style: 'aggressive', description: 'Bets and raises often to pressure opponents. Rarely just calls.' },
  { id: 'ai2', name: 'Rocky', style: 'tight', description: 'Only plays strong hands. Folds quickly when unsure.' },
  { id: 'ai3', name: 'Marina', style: 'loose', description: 'Plays a wide range of hands and stays in pots to see more cards.' },
  { id: 'ai4', name: 'Duke', style: 'bluffer', description: 'Frequently bets with weak hands to represent strength.' },
  { id: 'ai5', name: 'Sable', style: 'aggressive', description: 'Applies constant pressure with big bets, especially in position.' },
  { id: 'ai6', name: 'Willow', style: 'tight', description: 'Patient and conservative, waits for premium hands before committing chips.' },
  { id: 'ai7', name: 'Diesel', style: 'loose', description: 'Enjoys action and calls down with a wide range of hands.' },
  { id: 'ai8', name: 'Nova', style: 'bluffer', description: 'Mixes in well-timed bluffs to keep opponents guessing.' },
  { id: 'ai9', name: 'Reed', style: 'aggressive', description: 'Raises frequently to build big pots when holding decent cards.' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/poker/personas.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/poker/personas.ts src/lib/poker/personas.test.ts
git commit -m "feat: add 9 AI personas"
```

---

### Task 3: AI Decision Module

Calls OpenAI with a strict JSON schema and falls back to a safe action on any failure. Uses dependency injection (`deps.client`) so tests never make a real network call.

**Files:**
- Create: `src/lib/ai/decideAction.ts`
- Test: `src/lib/ai/decideAction.test.ts`

- [ ] **Step 1: Install the OpenAI SDK**

Run: `npm install openai`

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { decideAction, ChatClient } from './decideAction';
import { Persona } from '../poker/personas';

const persona: Persona = { id: 'ai1', name: 'Ace', style: 'aggressive', description: 'Bets big and often.' };

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
    const client = makeClient(JSON.stringify({ action: 'call', amount: null, tableTalk: 'Fine, I call.' }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 20, stacks: {}, actionHistory: [], validActions: ['fold', 'call', 'raise', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'call', amount: undefined, tableTalk: 'Fine, I call.' });
  });

  it('falls back to a safe action when the model returns an illegal action', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: 50, tableTalk: 'Raise!' }));
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 0, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'bet', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back to fold when check is not available and the API errors', async () => {
    const client: ChatClient = { chat: { completions: { create: vi.fn().mockRejectedValue(new Error('network down')) } } };
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 50, stacks: {}, actionHistory: [], validActions: ['fold', 'call', 'raise', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'fold', isFallback: true });
  });

  it('falls back when the call takes longer than the timeout', async () => {
    const client: ChatClient = {
      chat: { completions: { create: vi.fn(() => new Promise(() => {})) } },
    };
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 0, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'bet', 'all-in'] },
      persona,
      { client, timeoutMs: 20 }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/decideAction.test.ts`
Expected: FAIL with "Cannot find module './decideAction'"

- [ ] **Step 4: Implement the decision module**

```ts
import OpenAI from 'openai';
import { ActionType, Card } from '../poker/types';
import { Persona } from '../poker/personas';

export interface DecisionContext {
  holeCards: Card[];
  communityCards: Card[];
  pot: number;
  toCall: number;
  stacks: Record<string, number>;
  actionHistory: string[];
  validActions: ActionType[];
}

export interface Decision {
  action: ActionType;
  amount?: number;
  tableTalk?: string;
  isFallback?: boolean;
}

export interface ChatClient {
  chat: {
    completions: {
      create: (params: Record<string, unknown>) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
}

let defaultClient: ChatClient | null = null;
function getDefaultClient(): ChatClient {
  if (!defaultClient) {
    defaultClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as unknown as ChatClient;
  }
  return defaultClient;
}

function safeFallback(context: DecisionContext): Decision {
  const action: ActionType = context.validActions.includes('check') ? 'check' : 'fold';
  return { action, isFallback: true };
}

const DECISION_SCHEMA = {
  name: 'poker_decision',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['fold', 'check', 'call', 'bet', 'raise', 'all-in'] },
      amount: { type: ['number', 'null'] },
      tableTalk: { type: ['string', 'null'] },
    },
    required: ['action', 'amount', 'tableTalk'],
    additionalProperties: false,
  },
} as const;

export async function decideAction(
  context: DecisionContext,
  persona: Persona,
  deps: { client?: ChatClient; timeoutMs?: number } = {}
): Promise<Decision> {
  const client = deps.client ?? getDefaultClient();
  const timeoutMs = deps.timeoutMs ?? 5000;

  const prompt = `You are ${persona.name}, a ${persona.style} poker player. ${persona.description}
Hole cards: ${context.holeCards.join(' ')}
Community cards: ${context.communityCards.join(' ') || '(none)'}
Pot: ${context.pot}. Amount to call: ${context.toCall}.
Valid actions: ${context.validActions.join(', ')}.
Pick one valid action. If betting or raising, set amount to the total chips you are putting in front of you this street.`;

  try {
    const response = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_schema', json_schema: DECISION_SCHEMA },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);

    const content = response.choices[0]?.message.content;
    if (!content) return safeFallback(context);

    const parsed = JSON.parse(content) as { action: string; amount: number | null; tableTalk: string | null };
    if (!context.validActions.includes(parsed.action as ActionType)) {
      return safeFallback(context);
    }

    return {
      action: parsed.action as ActionType,
      amount: parsed.amount ?? undefined,
      tableTalk: parsed.tableTalk ?? undefined,
    };
  } catch {
    return safeFallback(context);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/decideAction.test.ts`
Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/ai/decideAction.ts src/lib/ai/decideAction.test.ts
git commit -m "feat: add OpenAI-backed AI decision module with safe fallback"
```

---

### Task 4: Turn Orchestrator — Seat Order & Blinds

**Files:**
- Create: `src/lib/poker/turnOrchestrator.ts`
- Test: `src/lib/poker/turnOrchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { nextActiveSeatAfter, postBlinds } from './turnOrchestrator';
import { createTournament, startHand } from './tournamentEngine';
import { Player } from './types';

function makePlayers(count: number, stack = 1000): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, name: `p${i}`, stack, holeCards: [], isFolded: false, isAllIn: false, seat: i,
  }));
}

describe('nextActiveSeatAfter', () => {
  it('returns the next non-folded player clockwise', () => {
    const state = createTournament(makePlayers(4));
    state.players[1].isFolded = true;
    expect(nextActiveSeatAfter(state, 0)).toBe('p2');
  });

  it('skips all-in players', () => {
    const state = createTournament(makePlayers(3));
    state.players[1].isAllIn = true;
    expect(nextActiveSeatAfter(state, 0)).toBe('p2');
  });

  it('returns null when no active players remain', () => {
    const state = createTournament(makePlayers(2));
    state.players.forEach((p) => (p.isFolded = true));
    expect(nextActiveSeatAfter(state, 0)).toBeNull();
  });
});

describe('postBlinds', () => {
  it('takes small blind from the seat after the dealer and big blind from the next, in 3+ handed play', () => {
    const state = startHand(createTournament(makePlayers(3, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.bets.p1).toBe(25);
    expect(posted.bets.p2).toBe(50);
    expect(posted.currentBet).toBe(50);
    expect(posted.players.find((p) => p.id === 'p1')!.stack).toBe(975);
  });

  it('sets the action anchor to the big blind seat so action starts after it', () => {
    const state = startHand(createTournament(makePlayers(3, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.actionAnchorSeat).toBe(2);
  });

  it('makes the dealer the small blind in heads-up play', () => {
    const state = startHand(createTournament(makePlayers(2, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.bets.p0).toBe(25);
    expect(posted.bets.p1).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/poker/turnOrchestrator.test.ts`
Expected: FAIL with "Cannot find module './turnOrchestrator'"

- [ ] **Step 3: Implement seat order and blind posting**

```ts
import { TournamentState } from './tournamentEngine';

export function nextActiveSeatAfter(state: TournamentState, fromSeat: number): string | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (fromSeat + i) % n;
    const player = state.players.find((p) => p.seat === seat);
    if (player && !player.isFolded && !player.isAllIn) return player.id;
  }
  return null;
}

function postForcedBet(state: TournamentState, playerId: string, amount: number): TournamentState {
  const players = state.players.map((p) => ({ ...p }));
  const player = players.find((p) => p.id === playerId)!;
  const toPost = Math.min(amount, player.stack);
  player.stack -= toPost;
  if (player.stack === 0) player.isAllIn = true;
  const bets = { ...state.bets, [playerId]: (state.bets[playerId] ?? 0) + toPost };
  return { ...state, players, bets };
}

export function postBlinds(state: TournamentState): TournamentState {
  const activeCount = state.players.filter((p) => !p.isFolded).length;
  const dealerPlayer = state.players.find((p) => p.seat === state.dealerSeat);
  const dealerIsSmallBlind = activeCount === 2 && !!dealerPlayer && !dealerPlayer.isFolded;

  const sbId = dealerIsSmallBlind ? dealerPlayer!.id : nextActiveSeatAfter(state, state.dealerSeat);
  if (!sbId) return state;
  let working = postForcedBet(state, sbId, state.smallBlind);

  const sbSeat = working.players.find((p) => p.id === sbId)!.seat;
  const bbId = nextActiveSeatAfter(working, sbSeat);
  if (!bbId) return working;
  working = postForcedBet(working, bbId, state.bigBlind);
  const bbSeat = working.players.find((p) => p.id === bbId)!.seat;

  return { ...working, currentBet: state.bigBlind, minRaise: state.bigBlind, actionAnchorSeat: bbSeat };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/poker/turnOrchestrator.test.ts`
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add src/lib/poker/turnOrchestrator.ts src/lib/poker/turnOrchestrator.test.ts
git commit -m "feat: add seat order and blind posting to turn orchestrator"
```

---

### Task 5: Turn Orchestrator — Full Hand Loop

Extends `turnOrchestrator.ts` with `findNextToAct` (turn-order + round-completion in one) and `playUntilHumanOrHandEnd`, the function the API route will call.

**Files:**
- Modify: `src/lib/poker/turnOrchestrator.ts`
- Test: `src/lib/poker/turnOrchestrator.test.ts`

- [ ] **Step 1: Add the new tests — replace the full contents of `turnOrchestrator.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { nextActiveSeatAfter, postBlinds, findNextToAct, playUntilHumanOrHandEnd, DecisionFn } from './turnOrchestrator';
import { createTournament, startHand } from './tournamentEngine';
import { Player } from './types';
import { Persona } from './personas';

function makePlayers(count: number, stack = 1000): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, name: `p${i}`, stack, holeCards: [], isFolded: false, isAllIn: false, seat: i,
  }));
}

describe('nextActiveSeatAfter', () => {
  it('returns the next non-folded player clockwise', () => {
    const state = createTournament(makePlayers(4));
    state.players[1].isFolded = true;
    expect(nextActiveSeatAfter(state, 0)).toBe('p2');
  });

  it('skips all-in players', () => {
    const state = createTournament(makePlayers(3));
    state.players[1].isAllIn = true;
    expect(nextActiveSeatAfter(state, 0)).toBe('p2');
  });

  it('returns null when no active players remain', () => {
    const state = createTournament(makePlayers(2));
    state.players.forEach((p) => (p.isFolded = true));
    expect(nextActiveSeatAfter(state, 0)).toBeNull();
  });
});

describe('postBlinds', () => {
  it('takes small blind from the seat after the dealer and big blind from the next, in 3+ handed play', () => {
    const state = startHand(createTournament(makePlayers(3, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.bets.p1).toBe(25);
    expect(posted.bets.p2).toBe(50);
    expect(posted.currentBet).toBe(50);
    expect(posted.players.find((p) => p.id === 'p1')!.stack).toBe(975);
  });

  it('sets the action anchor to the big blind seat so action starts after it', () => {
    const state = startHand(createTournament(makePlayers(3, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.actionAnchorSeat).toBe(2);
  });

  it('makes the dealer the small blind in heads-up play', () => {
    const state = startHand(createTournament(makePlayers(2, 1000), 25));
    const posted = postBlinds(state);
    expect(posted.bets.p0).toBe(25);
    expect(posted.bets.p1).toBe(50);
  });
});

describe('findNextToAct', () => {
  it('returns the player after the action anchor who still owes chips', () => {
    const state = postBlinds(startHand(createTournament(makePlayers(3, 1000), 25)));
    expect(findNextToAct(state)).toBe('p0');
  });

  it('returns null once everyone has matched the bet and acted', () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const settled = { ...state, actedThisRound: ['p0', 'p1'], bets: { p0: 50, p1: 50 } };
    expect(findNextToAct(settled)).toBeNull();
  });
});

describe('playUntilHumanOrHandEnd', () => {
  const persona: Persona = { id: 'p1', name: 'Bot', style: 'loose', description: 'Calls a lot.' };
  const alwaysCheckOrCall: DecisionFn = async (context) => {
    if (context.validActions.includes('check')) return { action: 'check' };
    return { action: 'call' };
  };

  it('returns immediately without calling the AI when it is already the human turn', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    let called = false;
    const spyDecisionFn: DecisionFn = async () => {
      called = true;
      return { action: 'check' };
    };
    const { events } = await playUntilHumanOrHandEnd(state, 'p0', { p1: persona }, spyDecisionFn);
    expect(events).toEqual([]);
    expect(called).toBe(false);
  });

  it('plays AI turns after a human action and stops back at the human on the next street', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { state: after, events } = await playUntilHumanOrHandEnd(
      state,
      'p0',
      { p1: persona },
      alwaysCheckOrCall,
      { playerId: 'p0', type: 'call' }
    );
    expect(after.street).toBe('flop');
    expect(events.map((e) => e.type)).toEqual(['action', 'action', 'street', 'action']);
  });

  it('resolves the hand immediately when the human folds', async () => {
    const state = postBlinds(startHand(createTournament(makePlayers(2, 1000), 25)));
    const { events } = await playUntilHumanOrHandEnd(
      state,
      'p0',
      { p1: persona },
      alwaysCheckOrCall,
      { playerId: 'p0', type: 'fold' }
    );
    expect(events[events.length - 1].type).toBe('showdown');
    expect(events[events.length - 1].potsAwarded?.[0].winnerIds).toEqual(['p1']);
  });
});
```

- [ ] **Step 2: Run test to verify only the new describe blocks fail**

Run: `npx vitest run src/lib/poker/turnOrchestrator.test.ts`
Expected: FAIL — `findNextToAct` and `playUntilHumanOrHandEnd` are not exported yet; `nextActiveSeatAfter`/`postBlinds` tests still pass.

- [ ] **Step 3: Replace `turnOrchestrator.ts` with the full implementation**

```ts
import { TournamentState, advanceStreet, resolveShowdown, HandResult } from './tournamentEngine';
import { applyAction, validActions } from './bettingEngine';
import { ActionType, PlayerAction, Street } from './types';
import { Persona } from './personas';
import { DecisionContext, Decision } from '../ai/decideAction';

export function nextActiveSeatAfter(state: TournamentState, fromSeat: number): string | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (fromSeat + i) % n;
    const player = state.players.find((p) => p.seat === seat);
    if (player && !player.isFolded && !player.isAllIn) return player.id;
  }
  return null;
}

function postForcedBet(state: TournamentState, playerId: string, amount: number): TournamentState {
  const players = state.players.map((p) => ({ ...p }));
  const player = players.find((p) => p.id === playerId)!;
  const toPost = Math.min(amount, player.stack);
  player.stack -= toPost;
  if (player.stack === 0) player.isAllIn = true;
  const bets = { ...state.bets, [playerId]: (state.bets[playerId] ?? 0) + toPost };
  return { ...state, players, bets };
}

export function postBlinds(state: TournamentState): TournamentState {
  const activeCount = state.players.filter((p) => !p.isFolded).length;
  const dealerPlayer = state.players.find((p) => p.seat === state.dealerSeat);
  const dealerIsSmallBlind = activeCount === 2 && !!dealerPlayer && !dealerPlayer.isFolded;

  const sbId = dealerIsSmallBlind ? dealerPlayer!.id : nextActiveSeatAfter(state, state.dealerSeat);
  if (!sbId) return state;
  let working = postForcedBet(state, sbId, state.smallBlind);

  const sbSeat = working.players.find((p) => p.id === sbId)!.seat;
  const bbId = nextActiveSeatAfter(working, sbSeat);
  if (!bbId) return working;
  working = postForcedBet(working, bbId, state.bigBlind);
  const bbSeat = working.players.find((p) => p.id === bbId)!.seat;

  return { ...working, currentBet: state.bigBlind, minRaise: state.bigBlind, actionAnchorSeat: bbSeat };
}

export function findNextToAct(state: TournamentState): string | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (state.actionAnchorSeat + i) % n;
    const player = state.players.find((p) => p.seat === seat);
    if (!player || player.isFolded || player.isAllIn) continue;
    const hasActed = state.actedThisRound.includes(player.id);
    const owes = (state.bets[player.id] ?? 0) < state.currentBet;
    if (!hasActed || owes) return player.id;
  }
  return null;
}

export interface HandEvent {
  type: 'action' | 'street' | 'showdown';
  playerId?: string;
  action?: ActionType;
  amount?: number;
  tableTalk?: string;
  isFallback?: boolean;
  street?: Street;
  potsAwarded?: HandResult['potsAwarded'];
}

export type DecisionFn = (context: DecisionContext, persona: Persona) => Promise<Decision>;

export async function playUntilHumanOrHandEnd(
  initialState: TournamentState,
  humanPlayerId: string,
  personasById: Record<string, Persona>,
  decisionFn: DecisionFn,
  humanAction?: PlayerAction
): Promise<{ state: TournamentState; events: HandEvent[] }> {
  const events: HandEvent[] = [];
  let state = initialState;

  const applyAndRecord = (action: PlayerAction, isFallback?: boolean, tableTalk?: string) => {
    const result = applyAction(state, action);
    state = {
      ...state,
      players: result.players,
      currentBet: result.currentBet,
      minRaise: result.minRaise,
      bets: result.bets,
      actedThisRound: [...state.actedThisRound, action.playerId],
    };
    events.push({ type: 'action', playerId: action.playerId, action: action.type, amount: action.amount, tableTalk, isFallback });
  };

  if (humanAction) {
    applyAndRecord(humanAction);
  }

  while (true) {
    const remaining = state.players.filter((p) => !p.isFolded);
    if (remaining.length === 1) {
      const { state: after, result } = resolveShowdown(state);
      state = after;
      events.push({ type: 'showdown', potsAwarded: result.potsAwarded });
      return { state, events };
    }

    const nextId = findNextToAct(state);

    if (!nextId) {
      if (state.street === 'river') {
        const { state: after, result } = resolveShowdown(state);
        state = after;
        events.push({ type: 'showdown', potsAwarded: result.potsAwarded });
        return { state, events };
      }
      state = advanceStreet(state);
      events.push({ type: 'street', street: state.street });
      continue;
    }

    if (nextId === humanPlayerId) {
      return { state, events };
    }

    const player = state.players.find((p) => p.id === nextId)!;
    const persona = personasById[nextId];
    const pot = Object.values(state.bets).reduce((sum, b) => sum + b, 0);
    const decision = await decisionFn(
      {
        holeCards: player.holeCards,
        communityCards: state.communityCards,
        pot,
        toCall: state.currentBet - (state.bets[nextId] ?? 0),
        stacks: Object.fromEntries(state.players.map((p) => [p.id, p.stack])),
        actionHistory: events
          .filter((e) => e.type === 'action')
          .map((e) => `${e.playerId} ${e.action}${e.amount ? ' ' + e.amount : ''}`),
        validActions: validActions(state, nextId),
      },
      persona
    );

    applyAndRecord({ playerId: nextId, type: decision.action, amount: decision.amount }, decision.isFallback, decision.tableTalk);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/poker/turnOrchestrator.test.ts`
Expected: `11 passed`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `45 passed` (deck 3, handEvaluator 4, bettingEngine 6, sidePots 3, tournamentEngine 11, personas 3, decideAction 4, turnOrchestrator 11)

- [ ] **Step 6: Commit**

```bash
git add src/lib/poker/turnOrchestrator.ts src/lib/poker/turnOrchestrator.test.ts
git commit -m "feat: add full turn-order loop (playUntilHumanOrHandEnd)"
```

---

### Task 6: API Route (`/api/action`)

Single endpoint that creates/loads a session, starts a hand if needed, applies the human's action (if any), runs AI turns, and returns the updated state + event log.

**Files:**
- Create: `src/app/api/action/route.ts`

- [ ] **Step 1: Implement the route handler**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { createTournament, startHand, TournamentState } from '@/lib/poker/tournamentEngine';
import { postBlinds, playUntilHumanOrHandEnd, HandEvent } from '@/lib/poker/turnOrchestrator';
import { validActions } from '@/lib/poker/bettingEngine';
import { PlayerAction, Player, ActionType } from '@/lib/poker/types';
import { PERSONAS, Persona } from '@/lib/poker/personas';
import { decideAction } from '@/lib/ai/decideAction';

const sessions = new Map<string, TournamentState>();
const HUMAN_ID = 'human';
const PERSONAS_BY_ID: Record<string, Persona> = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));

function createNewTournament(): TournamentState {
  const players: Player[] = [
    { id: HUMAN_ID, name: 'You', stack: 10000, holeCards: [], isFolded: false, isAllIn: false, seat: 0 },
    ...PERSONAS.map((persona, i) => ({
      id: persona.id,
      name: persona.name,
      stack: 10000,
      holeCards: [],
      isFolded: false,
      isAllIn: false,
      seat: i + 1,
    })),
  ];
  return createTournament(players, 25, 10);
}

interface ActionRequestBody {
  action?: PlayerAction;
}

export async function POST(request: NextRequest) {
  try {
    const body: ActionRequestBody = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('sessionId')?.value;
    let state = sessionId ? sessions.get(sessionId) : undefined;

    if (!state) {
      sessionId = randomUUID();
      state = postBlinds(startHand(createNewTournament()));
    } else if (!body.action) {
      state = postBlinds(startHand(state));
    }

    const result = await playUntilHumanOrHandEnd(state, HUMAN_ID, PERSONAS_BY_ID, decideAction, body.action);
    state = result.state;
    const events: HandEvent[] = result.events;

    sessions.set(sessionId, state);

    const human = state.players.find((p) => p.id === HUMAN_ID);
    const humanValidActions: ActionType[] = human && !human.isFolded ? validActions(state, HUMAN_ID) : [];

    const response = NextResponse.json({ sessionId, state, events, validActions: humanValidActions });
    response.cookies.set('sessionId', sessionId, { httpOnly: true, sameSite: 'lax', path: '/' });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: build completes successfully. If it fails on a Route Handler or `cookies()` API mismatch, re-read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `.../04-functions/cookies.md` and adjust — don't guess from general Next.js knowledge, this version has confirmed differences from older docs.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/action/route.ts
git commit -m "feat: add /api/action route handler"
```

---

### Task 7: Debug Page (`/debug`)

Plain-text stand-in for the eventual 3D frontend. Shows every player's cards (including AI), the event log in full immediately (no animated delay), and action buttons for the human.

**Files:**
- Create: `src/app/debug/page.tsx`

- [ ] **Step 1: Implement the debug page**

```tsx
'use client';

import { useState } from 'react';

interface HandEvent {
  type: 'action' | 'street' | 'showdown';
  playerId?: string;
  action?: string;
  amount?: number;
  tableTalk?: string;
  isFallback?: boolean;
  street?: string;
  potsAwarded?: { winnerIds: string[]; amountPerWinner: number }[];
}

interface PlayerView {
  id: string;
  name: string;
  stack: number;
  holeCards: string[];
  isFolded: boolean;
  isAllIn: boolean;
}

interface TournamentStateView {
  players: PlayerView[];
  communityCards: string[];
  street: string;
  bets: Record<string, number>;
}

interface ActionResponse {
  sessionId: string;
  state: TournamentStateView;
  events: HandEvent[];
  validActions: string[];
  error?: string;
}

export default function DebugPage() {
  const [data, setData] = useState<ActionResponse | null>(null);
  const [raiseAmount, setRaiseAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  async function callAction(action?: { type: string; amount?: number }) {
    setLoading(true);
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action ? { action: { playerId: 'human', ...action } } : {}),
      });
      const json: ActionResponse = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  const pot = data ? Object.values(data.state.bets).reduce((a, b) => a + b, 0) : 0;

  return (
    <main style={{ padding: 24, fontFamily: 'monospace' }}>
      <h1>Poker Debug</h1>
      <button onClick={() => callAction()} disabled={loading}>Start / Next Hand</button>

      {data?.error && <p style={{ color: 'red' }}>Error: {data.error}</p>}

      {data && (
        <>
          <p>Street: {data.state.street} | Pot: {pot}</p>
          <p>Community: {data.state.communityCards.join(' ') || '-'}</p>

          <table border={1} cellPadding={4}>
            <thead>
              <tr><th>Name</th><th>Stack</th><th>Cards</th><th>Folded</th><th>All-in</th></tr>
            </thead>
            <tbody>
              {data.state.players.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.stack}</td>
                  <td>{p.holeCards.join(' ')}</td>
                  <td>{p.isFolded ? 'Y' : ''}</td>
                  <td>{p.isAllIn ? 'Y' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Valid actions</h3>
          <div>
            {data.validActions.map((a) => (
              <button
                key={a}
                onClick={() => callAction(a === 'bet' || a === 'raise' ? { type: a, amount: raiseAmount } : { type: a })}
              >
                {a}
              </button>
            ))}
            {(data.validActions.includes('bet') || data.validActions.includes('raise')) && (
              <input type="number" value={raiseAmount} onChange={(e) => setRaiseAmount(Number(e.target.value))} />
            )}
          </div>

          <h3>Event log</h3>
          <ul>
            {data.events.map((e, i) => (
              <li key={i}>
                {e.type === 'action' &&
                  `${e.playerId}: ${e.action}${e.amount ? ' ' + e.amount : ''}${e.tableTalk ? ' — "' + e.tableTalk + '"' : ''}${e.isFallback ? ' (fallback)' : ''}`}
                {e.type === 'street' && `-- ${e.street} --`}
                {e.type === 'showdown' && `Showdown: ${JSON.stringify(e.potsAwarded)}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Manually verify the full loop with the real OpenAI key**

Run: `npm run dev`

Open `http://localhost:3000/debug` in a browser, click "Start / Next Hand", and play a few hands using the action buttons.

Expected: AI players' cards are visible in the table, the event log shows AI actions (and occasional table talk) between your turns, and clicking through fold/call/raise progresses hands to showdown without server errors. If an AI decision shows `(fallback)`, check the terminal running `npm run dev` for the actual OpenAI error.

- [ ] **Step 3: Commit**

```bash
git add src/app/debug/page.tsx
git commit -m "feat: add debug page for playing full hands against AI"
```

---

## What's Next

3D 1인칭 프론트엔드 (React Three Fiber, Ready Player Me/Mixamo 아바타, 이벤트 딜레이 재생)가 `/debug`를 대체하는 마지막 단계로 남아있습니다 (스펙 섹션 6 참고).
