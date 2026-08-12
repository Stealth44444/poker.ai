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

    const finalSessionId = sessionId ?? randomUUID();

    const result = await playUntilHumanOrHandEnd(state, HUMAN_ID, PERSONAS_BY_ID, decideAction, body.action);
    state = result.state;
    const events: HandEvent[] = result.events;

    sessions.set(finalSessionId, state);

    const human = state.players.find((p) => p.id === HUMAN_ID);
    const humanValidActions: ActionType[] = human && !human.isFolded ? validActions(state, HUMAN_ID) : [];

    const response = NextResponse.json({ sessionId: finalSessionId, state, events, validActions: humanValidActions });
    response.cookies.set('sessionId', finalSessionId, { httpOnly: true, sameSite: 'lax', path: '/' });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
