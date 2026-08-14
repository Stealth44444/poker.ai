import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSession, saveSession } from './sessionStore';
import { createTournament } from './tournamentEngine';
import { Player } from './types';

function makeState() {
  const players: Player[] = [
    { id: 'human', name: 'You', stack: 1000, holeCards: [], isFolded: false, isAllIn: false, seat: 0 },
  ];
  return createTournament(players);
}

describe('sessionStore', () => {
  let dir: string;

  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns undefined for a session that was never saved', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poker-session-test-'));
    expect(loadSession('nonexistent', dir)).toBeUndefined();
  });

  it('round-trips a saved session back to an equivalent state', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poker-session-test-'));
    const state = makeState();
    saveSession('abc-123', state, dir);
    expect(loadSession('abc-123', dir)).toEqual(state);
  });

  it('creates the sessions directory on first save if it does not exist', () => {
    dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poker-session-test-')), 'nested', 'sessions');
    expect(fs.existsSync(dir)).toBe(false);
    saveSession('abc-123', makeState(), dir);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('sanitizes the session id so it cannot escape the sessions directory', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poker-session-test-'));
    saveSession('../../evil', makeState(), dir);
    const filesInDir = fs.readdirSync(dir);
    expect(filesInDir).toEqual(['evil.json']);
  });
});
