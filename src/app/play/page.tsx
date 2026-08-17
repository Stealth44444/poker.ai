'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PokerScene, Payout, SeatAction } from '@/components/scene/PokerScene';
import { HoleCardsHUD } from '@/components/scene/HoleCardsHUD';
import { TableHUD } from '@/components/hud/TableHUD';
import { BetControls } from '@/components/hud/BetControls';
import { WinnerBanner } from '@/components/hud/WinnerBanner';
import { LoadingScreen } from '@/components/hud/LoadingScreen';
import { ActionPending } from '@/components/hud/ActionPending';
import { ErrorBanner } from '@/components/hud/ErrorBanner';
import { useEventPlayback } from '@/hooks/useEventPlayback';
import { useStaggeredReveal } from '@/hooks/useStaggeredReveal';
import {
  playCardPlace,
  playCardShuffle,
  playChipCollide,
  playChipStack,
  playHandWin,
  playTournamentWin,
  playTurnChime,
  playVoiceGameOver,
  playVoiceReady,
  playVoiceWin,
} from '@/lib/audio/sfx';
import { actionLabel, deriveView } from '@/lib/playback/derivePlayback';
import { raiseBounds } from '@/lib/poker/betMath';
import { TournamentState } from '@/lib/poker/tournamentEngine';
import { HandEvent } from '@/lib/poker/turnOrchestrator';
import { ActionType, PlayerAction } from '@/lib/poker/types';

interface ActionResponse {
  state: TournamentState;
  events: HandEvent[];
  validActions: ActionType[];
  tournamentOver: boolean;
  tournamentWinnerId: string | null;
}

const HUMAN_ID = 'human';
const CHIP_ACTIONS: ReadonlySet<ActionType> = new Set(['call', 'bet', 'raise', 'all-in']);

async function callAction(action?: PlayerAction): Promise<ActionResponse> {
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !body.state) {
    throw new Error(body?.error || `테이블에 연결할 수 없습니다 (${res.status}).`);
  }
  return body as ActionResponse;
}

export default function PlayPage() {
  const [state, setState] = useState<TournamentState | null>(null);
  const [events, setEvents] = useState<HandEvent[]>([]);
  const [validActions, setValidActions] = useState<ActionType[]>([]);
  const [tournamentOver, setTournamentOver] = useState(false);
  const [tournamentWinnerId, setTournamentWinnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const lastAttempt = useRef<PlayerAction | undefined>(undefined);
  const { isDone, visibleCount, displayState, upcomingActorId, latestEvent } = useEventPlayback(events);

  const applyResponse = useCallback((res: ActionResponse) => {
    setState(res.state);
    setEvents(res.events);
    setValidActions(res.validActions);
    setTournamentOver(res.tournamentOver);
    setTournamentWinnerId(res.tournamentWinnerId);
  }, []);

  const runAction = useCallback(
    (action?: PlayerAction) => {
      lastAttempt.current = action;
      setSubmitting(true);
      setActionError(null);
      callAction(action)
        .then(applyResponse)
        .catch((err) => setActionError(err instanceof Error ? err.message : '문제가 발생했습니다.'))
        .finally(() => setSubmitting(false));
    },
    [applyResponse]
  );

  const retry = useCallback(() => runAction(lastAttempt.current), [runAction]);

  useEffect(() => {
    // React Strict Mode double-invokes mount effects in dev, firing this
    // twice and spinning up two independent games with two session cookies;
    // without this guard, whichever response lands second silently replaces
    // the other's state mid-flight. Ignore the response from an invocation
    // whose own cleanup already ran.
    let cancelled = false;
    setSubmitting(true);
    callAction()
      .then((res) => {
        if (!cancelled) applyResponse(res);
      })
      .catch((err) => {
        if (!cancelled) setActionError(err instanceof Error ? err.message : '문제가 발생했습니다.');
      })
      .finally(() => {
        if (!cancelled) setSubmitting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyResponse]);

  const act = useCallback(
    (type: ActionType, amount?: number) => {
      runAction({ playerId: HUMAN_ID, type, amount });
    },
    [runAction]
  );

  const showdownEvent = latestEvent?.type === 'showdown' ? latestEvent : null;
  const revealCount = state
    ? state.players.filter((p) => !p.isFolded && p.id !== HUMAN_ID && p.holeCards.length > 0).length
    : 0;
  const revealedCount = useStaggeredReveal(showdownEvent !== null, revealCount);
  const handEnded = events.length > 0 && events[events.length - 1].type === 'showdown';
  const isHumanTurn = isDone && !handEnded && validActions.length > 0;
  const showWinnerBanner = Boolean(showdownEvent?.potsAwarded) && revealedCount >= revealCount;
  const humanWonHand = (showdownEvent?.potsAwarded?.flatMap((award) => award.winnerIds) ?? []).includes(HUMAN_ID);
  const humanWonTournament = tournamentOver && tournamentWinnerId === HUMAN_ID;

  useEffect(() => {
    if (isHumanTurn) playTurnChime();
  }, [isHumanTurn]);

  useEffect(() => {
    if (!showWinnerBanner) return;
    playChipCollide();
    if (tournamentOver) {
      // Only the actual winner gets the triumphant fanfare — busting out
      // shouldn't sound identical to winning the whole table.
      if (humanWonTournament) {
        playTournamentWin();
        playVoiceWin();
      } else {
        playVoiceGameOver();
      }
    } else {
      playHandWin();
      if (humanWonHand) playVoiceWin();
    }
  }, [showWinnerBanner, tournamentOver, humanWonTournament, humanWonHand]);

  useEffect(() => {
    if (!state) return;
    playCardShuffle();
    // "Ready" once per tournament (hand #1), not before every single hand —
    // it's a spoken line, repeating it every hand would get old fast.
    if (state.handNumber === 1) playVoiceReady();
    // Only the hand number identifies "a new hand started" — re-running
    // this for every state update (e.g. mid-hand stack changes) would
    // replay the shuffle sound on every action instead of once per hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.handNumber]);

  useEffect(() => {
    if (latestEvent?.type === 'street') {
      playCardPlace();
    } else if (latestEvent?.type === 'action' && latestEvent.action && CHIP_ACTIONS.has(latestEvent.action)) {
      playChipStack();
    }
  }, [latestEvent]);

  if (!state) {
    return actionError ? <ErrorBanner message={actionError} onRetry={retry} /> : <LoadingScreen />;
  }

  const view = deriveView(state, displayState);
  const human = view.players.find((p) => p.id === HUMAN_ID);
  const turnPlayerId = !isDone ? upcomingActorId : isHumanTurn ? HUMAN_ID : null;
  const winnerIds = showdownEvent?.potsAwarded?.flatMap((award) => award.winnerIds) ?? [];
  const payouts: Payout[] =
    showdownEvent?.potsAwarded?.flatMap((award) =>
      award.winnerIds.map((playerId) => ({ playerId, amount: award.amountPerWinner }))
    ) ?? [];

  const seatAction: SeatAction | null =
    latestEvent?.type === 'action' && latestEvent.playerId && latestEvent.action
      ? {
          playerId: latestEvent.playerId,
          badge: { text: actionLabel(latestEvent), actionType: latestEvent.action, key: visibleCount },
        }
      : null;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <PokerScene
        view={view}
        dealerSeat={state.dealerSeat}
        turnPlayerId={turnPlayerId}
        seatAction={seatAction}
        revealedCount={revealedCount}
        winnerIds={winnerIds}
        payouts={payouts}
      />
      <TableHUD
        pot={view.pot}
        street={displayState?.street ?? state.street}
        handNumber={state.handNumber}
        smallBlind={state.smallBlind}
        bigBlind={state.bigBlind}
        handsPerBlindLevel={state.handsPerBlindLevel}
        communityCards={view.communityCards}
      />
      {human && <HoleCardsHUD cards={human.holeCards} />}
      {isHumanTurn && human && !submitting && (
        <BetControls
          validActions={validActions}
          toCall={Math.min(state.currentBet - (state.bets[HUMAN_ID] ?? 0), human.stack)}
          pot={view.pot}
          bounds={raiseBounds({
            currentBet: state.currentBet,
            minRaise: state.minRaise,
            humanBet: state.bets[HUMAN_ID] ?? 0,
            humanStack: human.stack,
          })}
          sliderStep={state.smallBlind}
          onAction={act}
        />
      )}
      {submitting && <ActionPending />}
      {actionError && <ErrorBanner message={actionError} onRetry={retry} />}
      {showWinnerBanner && showdownEvent?.potsAwarded && (
        <WinnerBanner
          potsAwarded={showdownEvent.potsAwarded}
          players={state.players}
          tournamentWinnerName={tournamentOver ? (state.players.find((p) => p.id === tournamentWinnerId)?.name ?? null) : null}
          disabled={submitting}
          onNextHand={() => runAction()}
        />
      )}
    </div>
  );
}
