import { TournamentState } from './tournamentEngine';

/**
 * Strips information the client should never see: the remaining deck (would
 * let a client predict upcoming board cards), and every opponent's hole
 * cards except at showdown, and even then only for players who didn't fold —
 * real poker never requires a folded hand to be shown. The engine itself
 * always operates on the real, unredacted state; this only runs on the
 * value sent back over HTTP.
 */
export function sanitizeStateForClient(
  state: TournamentState,
  humanId: string,
  revealShowdown: boolean
): TournamentState {
  return {
    ...state,
    deck: [],
    players: state.players.map((p) => {
      if (p.id === humanId) return p;
      if (revealShowdown && !p.isFolded) return p;
      return { ...p, holeCards: [] };
    }),
  };
}
