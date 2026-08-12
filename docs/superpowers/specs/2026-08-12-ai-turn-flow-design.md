# AI 의사결정 + 턴 진행 API — 설계 문서

날짜: 2026-08-12

## 1. 개요

Phase 1(`docs/superpowers/specs/2026-08-12-ai-holdem-tournament-design.md`)에서
만든 포커 엔진 위에, OpenAI로 구동되는 AI 상대 9명, 턴 순서를 관리하는
오케스트레이터, 이를 노출하는 단일 API 엔드포인트, 그리고 검증용 디버그
화면을 추가한다. 3D 프론트엔드는 이 단계의 범위 밖이며, 디버그 화면이
그 자리를 임시로 대신한다.

**Phase 1 엔진의 빈틈:** `tournamentEngine.ts`는 핸드 딜링·스트리트 진행·
쇼다운 "부품"만 제공하고, **누가 다음에 액션해야 하는지, 베팅 라운드가
끝났는지를 판정하는 턴 오케스트레이션은 없다.** 이번 단계에서 새로 만든다.

## 2. AI 페르소나 & 의사결정 모듈

- `src/lib/poker/personas.ts`: AI 9명의 `{ id, name, style, description }`을
  하드코딩. `style`은 `aggressive | tight | loose | bluffer` 중 하나이며,
  9명에 걸쳐 다양하게 분포시킨다.
- `src/lib/ai/decideAction.ts`의 `decideAction(context, persona)`:
  - `context`에는 홀카드, 커뮤니티카드, 팟, 콜 금액, 전원 스택, 이번 핸드
    액션 히스토리, `validActions()`가 계산한 유효 액션 목록이 담긴다.
  - OpenAI Chat Completions API를 `response_format: { type: 'json_schema',
    strict: true, ... }`로 호출해 `{ action, amount?, tableTalk? }` 형태를
    강제한다. 모델은 `gpt-4o-mini`.
  - 반환된 `action`이 `validActions` 목록에 없으면(모델 오류 대비 이중
    방어) 폴백 처리로 넘어간다.
  - **폴백 규칙:** API 타임아웃(5초)/오류/스키마 불일치 시 — `check`가
    유효하면 check, 아니면 `fold`. `tableTalk`는 생략.
- `OPENAI_API_KEY`는 `process.env`에서 읽는다 (`.env.local`, 이미 설정됨).

## 3. 턴 오케스트레이션 (신규)

`src/lib/poker/turnOrchestrator.ts`:

- **좌석 순서:** 딜러 버튼 다음 좌석부터 시계 방향. 폴드/올인 플레이어는
  스킵.
- **블라인드 포스트:** `postBlinds(state)`가 딜러 버튼 다음 두 활성 좌석에
  스몰/빅 블라인드를 강제 베팅으로 적용하고, 프리플랍 `currentBet`/
  `minRaise`를 설정한다.
- **딜러 버튼 회전:** `startHand`가 매 핸드마다 딜러 버튼을 다음 활성
  좌석으로 옮긴다 (Phase 1의 `startHand`를 이 단계에서 확장).
- **라운드 완료 판정:** 폴드하지 않고 올인도 아닌 모든 플레이어가
  `actedThisRound`에 포함되고, 커밋한 베팅액이 `currentBet`과 같으면 해당
  베팅 라운드는 종료.
- **`playUntilHumanOrHandEnd(state, humanAction?)`:**
  1. `humanAction`이 있으면 `applyAction`으로 반영하고 이벤트 로그에 추가
  2. 반복: 다음 액션 플레이어가 AI면 `decideAction` → `applyAction` →
     이벤트 로그 추가
  3. 베팅 라운드가 끝나면: 폴드하지 않은 플레이어가 1명뿐이면 즉시
     쇼다운(카드 비교 없이 팟 획득) → 핸드 종료. 그렇지 않으면
     `advanceStreet` 호출, 새 라운드의 `actedThisRound` 초기화
  4. river 라운드까지 끝나면 `resolveShowdown` 호출, 결과를 이벤트 로그에
     추가, 핸드 종료
  5. 다음 액션 플레이어가 사람이거나 핸드가 종료되면 루프 종료
  6. 이벤트 로그 배열과 갱신된 `TournamentState`를 반환

각 `HandEvent`는 `{ type: 'action' | 'street' | 'showdown', playerId?: string,
action?: ActionType, amount?: number, tableTalk?: string, isFallback?: boolean,
street?: Street, potsAwarded?: HandResult['potsAwarded'] }` 형태로,
`type`에 따라 관련 필드만 채워진다.

## 4. API

- `POST /api/action` (Next.js Route Handler) 단일 엔드포인트.
- 요청 바디: `{ sessionId?: string, action?: PlayerAction }`
- 세션은 서버 모듈 레벨의 `Map<string, TournamentState>`에 보관 (Next.js
  개발 서버 단일 프로세스 가정, Phase 1과 동일한 MVP 범위의 인메모리 저장).
- 처리 흐름:
  - `sessionId`가 없거나 맵에 없으면 새 토너먼트 생성(사람 1명 + AI 9명),
    새 `sessionId` 발급 후 응답 쿠키로 내려줌
  - `action`이 없으면 `startHand` 호출 후 `playUntilHumanOrHandEnd` 실행
  - `action`이 있으면 `playUntilHumanOrHandEnd(state, action)` 실행
- 응답: `{ sessionId, state: TournamentState, events: HandEvent[],
  validActions: ActionType[] }` (`validActions`는 사람 차례일 때만 비어있지
  않음)
- 에러: 처리 중 예외 발생 시 HTTP 500 + `{ error: string }`.

## 5. 디버그 화면 (`/debug`)

- Next.js 페이지, 클라이언트 컴포넌트에서 `/api/action`을 fetch.
- 표시 내용: 전체 플레이어의 이름/스택/폴드여부/홀카드(전원 공개),
  커뮤니티카드, 팟, 현재 스트리트, 이벤트 로그 전체(딜레이 없이 즉시 목록).
- 사람 차례일 때: `validActions`에 해당하는 버튼 표시, `bet`/`raise`는
  금액 입력 필드 포함.
- "다음 핸드 시작" 버튼: `action` 없이 `/api/action` 호출.
- OpenAI 폴백이 발생한 이벤트는 로그에 "(fallback)" 표시.

## 6. 범위 밖 (다음 단계)

- 3D 1인칭 프론트엔드 (React Three Fiber, 아바타) — 디버그 화면을 대체할
  최종 단계
- 이벤트 딜레이 재생(1.2초 간격 연출) — 3D 단계에서 필요할 때 추가
- DB 영속화, 멀티테이블 — Phase 1 스펙에서 이미 제외 확정
