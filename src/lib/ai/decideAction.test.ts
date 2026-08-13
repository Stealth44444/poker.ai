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
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 20, minBetOrRaiseAmount: 40, maxBetOrRaiseAmount: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'call', 'raise', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'call', amount: undefined, tableTalk: 'Fine, I call.' });
  });

  it('falls back to a safe action when the model returns an illegal action', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: 50, tableTalk: 'Raise!' }));
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'bet', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back when the model raises for more than the max allowed amount', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: 5000, tableTalk: 'All of it!' }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'raise', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back when the model raises below the minimum allowed amount', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: 5, tableTalk: 'Small raise.' }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'raise', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back when the model raises without providing a positive amount', async () => {
    const client = makeClient(JSON.stringify({ action: 'raise', amount: null, tableTalk: 'Raise!' }));
    const decision = await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'raise', 'all-in'] },
      persona,
      { client }
    );
    expect(decision).toEqual({ action: 'check', isFallback: true });
  });

  it('falls back to fold when check is not available and the API errors', async () => {
    const client: ChatClient = { chat: { completions: { create: vi.fn().mockRejectedValue(new Error('network down')) } } };
    const decision = await decideAction(
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 50, minBetOrRaiseAmount: 100, maxBetOrRaiseAmount: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'call', 'raise', 'all-in'] },
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
      { holeCards: ['2c', '7h'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 20, maxBetOrRaiseAmount: 1000, stacks: {}, actionHistory: [], validActions: ['fold', 'check', 'bet', 'all-in'] },
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
              choices: [{ message: { content: JSON.stringify({ action: 'check', amount: null, tableTalk: null }) } }],
            });
          }),
        },
      },
    };
    await decideAction(
      { holeCards: ['Ad', 'Kd'], communityCards: [], pot: 100, toCall: 0, minBetOrRaiseAmount: 300, maxBetOrRaiseAmount: 9000, stacks: {}, actionHistory: [], validActions: ['check', 'bet', 'fold'] },
      persona,
      { client }
    );
    expect(capturedPrompt).toContain('300');
    expect(capturedPrompt).toContain('9000');
  });
});
