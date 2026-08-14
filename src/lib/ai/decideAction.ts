import OpenAI from 'openai';
import { ActionType, Card } from '../poker/types';
import { Persona } from '../poker/personas';

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

  const opponentStacks = Object.entries(context.stacks)
    .map(([id, stack]) => `${id}: ${stack}`)
    .join(', ');

  const prompt = `You are ${persona.name}, a ${persona.style} poker player. ${persona.description}
Hole cards: ${context.holeCards.join(' ')}
Community cards: ${context.communityCards.join(' ') || '(none)'}
Pot: ${context.pot}. Amount to call: ${context.toCall}.
Your remaining stack: ${context.yourStack}.
Stacks at the table: ${opponentStacks || '(unknown)'}.
Action this hand so far: ${context.actionHistory.join('; ') || '(no actions yet)'}.
Valid actions: ${context.validActions.join(', ')}.
Pick one valid action that fits both your style and the situation — weigh your stack size, the pot, and what's already happened this hand. If multiple players have already raised each other this hand, only keep matching or reraising with a genuinely strong hand; otherwise call, or fold rather than escalate a losing spot. Going all-in should be a deliberate choice for a strong hand or a clear stack-pressure/pot-odds reason, not a reflexive default. If betting or raising, "amount" must be the TOTAL chips you have in front of you this street (not just the extra chips added), and must be between ${context.minBetOrRaiseAmount} and ${context.maxBetOrRaiseAmount} inclusive. Write "tableTalk" in natural, casual Korean (한국어) — one short in-character sentence, or null if you'd rather stay quiet this turn.`;

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
    const needsAmount = parsed.action === 'bet' || parsed.action === 'raise';
    if (needsAmount && (typeof parsed.amount !== 'number' || parsed.amount <= 0)) {
      return safeFallback(context);
    }
    if (
      needsAmount &&
      (parsed.amount! < context.minBetOrRaiseAmount || parsed.amount! > context.maxBetOrRaiseAmount)
    ) {
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
