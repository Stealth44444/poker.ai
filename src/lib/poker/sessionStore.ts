import fs from 'node:fs';
import path from 'node:path';
import { TournamentState } from './tournamentEngine';

// Sessions live in-memory for the hot path (see route.ts), but that Map is
// lost on every `next dev` restart or serverless cold start. Writing each
// session through to a JSON file survives that — no new dependency, no
// external service, appropriate for this project's single-instance scale.
const DEFAULT_SESSIONS_DIR = path.join(process.cwd(), '.data', 'sessions');

function sessionFilePath(sessionId: string, dir: string): string {
  // sessionId is always a randomUUID() from the caller, but strip anything
  // that isn't a safe filename character regardless, ruling out path traversal.
  const safeId = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
  return path.join(dir, `${safeId}.json`);
}

export function loadSession(sessionId: string, dir: string = DEFAULT_SESSIONS_DIR): TournamentState | undefined {
  try {
    const raw = fs.readFileSync(sessionFilePath(sessionId, dir), 'utf8');
    return JSON.parse(raw) as TournamentState;
  } catch {
    return undefined;
  }
}

export function saveSession(sessionId: string, state: TournamentState, dir: string = DEFAULT_SESSIONS_DIR): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sessionFilePath(sessionId, dir), JSON.stringify(state));
}
