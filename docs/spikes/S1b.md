# S1b — Codex 제어·세션 스파이크 (steer / interrupt / resume / fork / 재구독 / queue opt-in)

| 메타 | 값 |
|---|---|
| 정본 | MASTER_IMPLEMENTATION_PLAN Phase 00 Task S1b, AC-P00-2(S1b 부분) |
| 실행 | 2026-11-02 02:50~02:56 KST, Windows 11 Pro 10.0.26300, codex-cli 0.166.0, 사용자 CLI 로그인 재사용(U1), `CODEX_HOME` 공유(U9) |
| 구현/리뷰 | implementer=claude, reviewer=codex(`docs/reviews/codex/S1b/`) |
| 스킬 증거 | `prototype`(S1 Task 시작 시 호출) → `test-driven-development` — 수동 증거 프로토콜 |
| 코드 | `spikes/s1-codex-app-server/s1b.test.ts`, `client.ts`(threadQueueAdd·killAndWait 추가), 녹화 `spikes/fixtures/codex-0.166.0/s1b-{steer-interrupt,resume-fork-queue,restart-resume}.jsonl` |
| 테스트 | `AGENT_STUDIO_LIVE=1 npx vitest run spikes/s1-codex-app-server/s1b.test.ts` |

## 1. 판정표

| # | 성공 기준 | 결과 | 증거 |
|---|---|---|---|
| 1 | `turn/steer` — `expectedTurnId` 일치 시 수락 | **pass** — 응답 `{turnId}`가 활성 턴 id와 동일 | results `steerAccepted` |
| 2 | `turn/steer` — 불일치 시 거부(오류 코드 기록) | **pass** — `-32600` "expected active turn id `…` but found `…`" | results `steerMismatch` |
| 3 | `turn/interrupt` → `turn/completed.turn.status === 'interrupted'` | **pass** — `interrupted`, `error:null` | results `interrupt` |
| 4 | `thread/resume`로 이전 아이템 재수신 | **pass** — 새 프로세스에서 resume → `thread.turns[0].items` = `[userMessage]`(중단된 턴, 상태 `interrupted`) | results `resumeItemTypes`·`resumeShape` |
| 5 | `thread/fork{lastTurnId}` → 새 thread id | **pass** — 새 id ≠ 원본, `forkedFromId` = 원본 | results `fork` |
| 6 | stdio 재시작 후 `thread/resume` 재구독 | **pass** — 세 번째 프로세스에서 `resume{excludeTurns:true}` → `turn/start` → `turn/completed(completed)`, 모델이 이전 턴 요청을 정확히 요약(맥락 복원) | results `restartResume`, 픽스처 `s1b-restart-resume.jsonl` |
| 7 | `thread/queue/add`가 `experimentalApi` 미설정 시 거부(오류 코드 기록) | **pass** — `-32600` "thread/queue/add requires experimentalApi capability" | results `queueAddWithoutOptIn` |
| 8 | 테스트 RED→GREEN | RED: `AssertionError: expected [] to include 'userMessage'`(resume 응답 구조 오해) + `TypeError: client.killAndWait is not a function` → 구조 실측(probe) 후 수정 → GREEN 4 passed(7.4s) | §4 |

**S1b 판정: pass.** V8·V14·V17 해소(§3).

## 2. 실측 메모 (P02 T2·P05 입력)

- **steer·interrupt 타이밍**: `item/started`(userMessage) 직후 steer·interrupt를 보냈더니 모델 호출이 끝나기 전에 턴이 `interrupted`로 종료되어 **tokenUsage 알림 0회**였다. steer 수락은 "활성 턴 id 일치 검사 통과"까지만 증명하며, 추가 지시가 모델 출력에 반영됐는지는 S1c 또는 P02 계약 테스트에서 더 긴 턴으로 확인해야 한다(관찰 한계 명시).
- **resume 응답 구조(0.166.0)**: `historyMode:"paginated"`이지만 기본 `thread/resume`는 `thread.turns[]`(턴·아이템 전체)를 채우고 `initialTurnsPage`는 `null`, `turnsBackwardsCursor`/`itemsBackwardsCursor`는 커서 객체. `excludeTurns:true`면 메타만. generate-ts 타입(`TurnsPage{data}`)과 달리 실제 페이로드는 `thread.turns`에 있으므로 어댑터는 둘 다 읽어야 한다.
- **재구독 절차(V8)**: 새 프로세스 → `initialize` → `thread/resume{threadId, excludeTurns:true}` → 이후 `turn/start`·알림 정상. 별도 "subscribe" 메서드 없음 — resume 자체가 구독이다. 재시작 전 프로세스가 `stdin` 종료로 정상 종료됐는지 여부와 무관하게 `thread.status`는 `idle`로 돌아왔다(1회 관찰).
- **thread/status/changed**: 턴 시작·종료마다 수신(`active{activeFlags}` ↔ `idle`) — SessionIndex 상태 투영 입력.
- **Windows SIGINT(V14)**: `child.kill('SIGINT')` → 13ms 내 종료, `exit(code=null, signal='SIGINT', killed=true)`. Node가 Windows에서 모든 시그널을 `TerminateProcess`로 처리하므로 **우아한 취소 수단이 아니다** → 취소 fallback은 `turn/interrupt` 우선, 프로세스 kill은 최후 수단(AGENT_INTEGRATION §5 취소 행 갱신 입력).
- **fork**: `thread/fork{threadId, lastTurnId}` 응답은 `ThreadStartResponse`와 같은 모양(`thread.forkedFromId` 설정). 포크된 스레드로 턴을 돌리는 것은 P05.

## 3. UNVERIFIED 해소

| # | 항목 | 결과 |
|---|---|---|
| V8 | app-server 재접속 후 재구독 절차 | **해소**: `initialize` → `thread/resume{excludeTurns:true}` → 알림 재개(§2) |
| V14 | Windows SIGINT 동작(취소 fallback) | **해소**(Codex 측): 즉시 종료(TerminateProcess), 우아한 취소 아님. Claude 측은 S2 |
| V17 | `thread/queue/add` experimental opt-in 거부 동작 | **해소**: `-32600 "thread/queue/add requires experimentalApi capability"` |

## 4. 실행 로그

RED(1차):
```
 × resume(같은 프로세스): … AssertionError: expected [] to include 'userMessage'
 × 관찰(V14): … TypeError: client.killAndWait is not a function
      Tests  2 failed | 2 passed (4)
```
GREEN:
```
 ✓ spikes/s1-codex-app-server/s1b.test.ts (4 tests) 7183ms
     ✓ steer: expectedTurnId 일치 시 수락, 불일치 시 거부; interrupt → interrupted 2267ms
     ✓ resume(같은 프로세스): 이전 아이템 재수신; fork{lastTurnId}: 새 thread id; queue/add: opt-in 없이 거부 1200ms
     ✓ stdio 재시작 후 resume 재구독: 새 턴의 알림을 수신한다 3521ms
     ✓ 관찰(V14): Windows proc.kill('SIGINT') 결과를 기록한다
      Tests  4 passed (4)   Duration  7.41s
```
(테스트 2의 이름 "같은 프로세스"는 부정확하다 — 실제로는 새 프로세스에서 resume했다. 코드 이름은 리뷰 후 정정 예정.)

## 5. 사용량 (C5)

| 케이스 | 턴 | 모델 호출 | total tokens | 비고 |
|---|---|---|---|---|
| steer-interrupt | 1(interrupted) | 0 완료 | — | 모델 응답 전 중단 |
| resume-fork-queue | 0 | 0 | — | 메타 호출만 |
| restart-resume | 1(completed) | 1 | 23,347 (cached 20,736) | |
| probe(구조 확인, 1회성) | 1 | 1 | 약 23k | `.tmp/resume-probe.ts`, 커밋 안 함 |

## 6. Codex 리뷰

(리뷰 수신 후 기입)
