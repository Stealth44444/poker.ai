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

  it('falls back when the model raises without providing a positive amount', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: null, tableTalk: 'Raise!' }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'raise', 'all-in'] },
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
      chat: {
        completions: {
          create: vi.fn(() => new Promise<{ choices: { message: { content: string | null } }[] }>(() => {})),
        },
      },
    };
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 0, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'bet', 'all-in'] },
      persona,
      { client, timeoutMs: 20 }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });
});
