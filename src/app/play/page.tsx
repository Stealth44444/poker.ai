'use client';

import { useCallback, useEffect, useState } from 'react';
import { PokerScene, Payout, SeatAction } from '@/components/scene/PokerScene';
import { HoleCardsHUD } from '@/components/scene/HoleCardsHUD';
import { TableHUD } from '@/components/hud/TableHUD';
import { BetControls } from '@/components/hud/BetControls';
import { WinnerBanner } from '@/components/hud/WinnerBanner';
import { LoadingScreen } from '@/components/hud/LoadingScreen';
import { useEventPlayback } from '@/hooks/useEventPlayback';
import { useStaggeredReveal } from '@/hooks/useStaggeredReveal';
import { playCardPlace, playCardShuffle, playChipCollide, playChipStack, playHandWin, playTournamentWin, playTurnChime } from '@/lib/audio/sfx';
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
  return res.json();
}

export default function PlayPage() {
  const [state, setState] = useState<TournamentState | null>(null);
  const [events, setEvents] = useState<HandEvent[]>([]);
  const [validActions, setValidActions] = useState<ActionType[]>([]);
  const [tournamentOver, setTournamentOver] = useState(false);
  const [tournamentWinnerId, setTournamentWinnerId] = useState<string | null>(null);
  const { isDone, visibleCount, displayState, upcomingActorId, latestEvent } = useEventPlayback(events);

  const applyResponse = useCallback((res: ActionResponse) => {
    setState(res.state);
    setEvents(res.events);
    setValidActions(res.validActions);
    setTournamentOver(res.tournamentOver);
    setTournamentWinnerId(res.tournamentWinnerId);
  }, []);

  useEffect(() => {
    // React Strict Mode double-invokes mount effects in dev, firing this
    // twice and spinning up two independent games with two session cookies;
    // without this guard, whichever response lands second silently replaces
    // the other's state mid-flight. Ignore the response from an invocation
    // whose own cleanup already ran.
    let cancelled = false;
    callAction().then((res) => {
      if (!cancelled) applyResponse(res);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResponse]);

  const act = useCallback(
    (type: ActionType, amount?: number) => {
      callAction({ playerId: HUMAN_ID, type, amount }).then(applyResponse);
    },
    [applyResponse]
  );

  const showdownEvent = latestEvent?.type === 'showdown' ? latestEvent : null;
  const revealCount = state
    ? state.players.filter((p) => !p.isFolded && p.id !== HUMAN_ID && p.holeCards.length > 0).length
    : 0;
  const revealedCount = useStaggeredReveal(showdownEvent !== null, revealCount);
  const handEnded = events.length > 0 && events[events.length - 1].type === 'showdown';
  const isHumanTurn = isDone && !handEnded && validActions.length > 0;
  const showWinnerBanner = Boolean(showdownEvent?.potsAwarded) && revealedCount >= revealCount;

  useEffect(() => {
    if (isHumanTurn) playTurnChime();
  }, [isHumanTurn]);

  useEffect(() => {
    if (!showWinnerBanner) return;
    playChipCollide();
    if (tournamentOver) playTournamentWin();
    else playHandWin();
  }, [showWinnerBanner, tournamentOver]);

  useEffect(() => {
    if (state) playCardShuffle();
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

  if (!state) return <LoadingScreen />;

  const view = deriveView(state, displayState);
  const human = view.players.find((p) => p.id === HUMAN_ID);
  const turnPlayerId = !isDone ? upcomingActorId : isHumanTurn ? HUMAN_ID : null;
  const winnerIds = showdownEvent?.potsAwarded?.flatMap((award) => award.winnerIds) ?? [];
  const payouts: Payout[] =
    showdownEvent?.potsAwarded?.flatMap((award) =>
      award.winnerIds.map((playerId) => ({ playerId, amount: award.amountPerWinner }))
    ) ?? [];

  const seatAction: SeatAction | null =
    latestEvent?.type === 'action' && latestEvent.playerId
      ? {
          playerId: latestEvent.playerId,
          badge: { text: actionLabel(latestEvent), key: visibleCount },
          talk: latestEvent.tableTalk ? { text: latestEvent.tableTalk, key: visibleCount } : null,
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
        communityCards={view.communityCards}
      />
      {human && <HoleCardsHUD cards={human.holeCards} />}
      {isHumanTurn && human && (
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
      {showWinnerBanner && showdownEvent?.potsAwarded && (
        <WinnerBanner
          potsAwarded={showdownEvent.potsAwarded}
          players={state.players}
          tournamentWinnerName={tournamentOver ? (state.players.find((p) => p.id === tournamentWinnerId)?.name ?? null) : null}
          onNextHand={() => callAction().then(applyResponse)}
        />
      )}
    </div>
  );
}
