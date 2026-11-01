# S1b — Codex 제어·세션 스파이크 (steer / interrupt / resume / fork / 재구독 / queue opt-in)

| 메타 | 값 |
|---|---|
| 정본 | MASTER_IMPLEMENTATION_PLAN Phase 00 Task S1b, AC-P00-2(S1b 부분) |
| 실행 | 2026-11-02 02:50~02:56 KST(1차), 03:10 KST(2차 — Codex 리뷰 반영·테스트 재구성 후), Windows 11 Pro 10.0.26300, codex-cli 0.166.0, 사용자 CLI 로그인 재사용(U1), `CODEX_HOME` 공유(U9) |
| 구현/리뷰 | implementer=claude, reviewer=codex(`docs/reviews/codex/S1b/`) |
| 스킬 증거 | `prototype`(S1 Task 시작 시 호출) → `test-driven-development` — 수동 증거 프로토콜 |
| 코드 | `spikes/s1-codex-app-server/s1b.test.ts`, `client.ts`(threadQueueAdd·killAndWait 추가) |
| 증거 | 녹화 `spikes/fixtures/codex-0.166.0/s1b-{steer-interrupt,resume-fork,restart-resume-idle,restart-resume-active,queue-optin}.jsonl`(마스킹·정화), 관찰값 `s1b-results.json` |
| 테스트 | `AGENT_STUDIO_LIVE=1 npx vitest run spikes/s1-codex-app-server/s1b.test.ts` |

## 1. 판정표

| # | 성공 기준 | 결과 | 증거 |
|---|---|---|---|
| 1 | `turn/steer` **RPC 수락** — `expectedTurnId` 일치 시 `{turnId}` 반환 | **pass** — 반환 turnId = 활성 턴 id. (추가 지시가 모델 출력에 반영됐는지는 **증명하지 않음**, §2) | results `steerAccepted` |
| 2 | `turn/steer` 불일치 시 거부(오류 코드) | **pass** — `-32600` "expected active turn id `…` but found `…`" | results `steerMismatch` |
| 3 | `turn/interrupt` → `turn/completed.turn.status === 'interrupted'` | **pass** — `interrupted`, `error:null`, 완료 시점 items `[]` | results `interrupt` |
| 4 | `thread/resume`(새 프로세스)로 이전 턴·아이템 재수신 | **pass** — 완료된 턴 1개(`completed`)의 `[userMessage, agentMessage]` 재수신, 턴 id 일치 | results `resume`, `s1b-resume-fork.jsonl` |
| 5 | `thread/fork{lastTurnId}` → 새 thread id, `forkedFromId` = 원본 | **pass** | results `fork`(id 자체는 마스킹, 비교 결과만 기록) |
| 6 | 유휴 스레드: stdio 재시작 후 `thread/resume` → 새 턴 알림 수신 | **pass** — 새 프로세스에서 `resume{excludeTurns:true}` → `turn/start` → `completed`, 모델이 이전 턴의 사용자 발화를 그대로 인용(맥락 복원) | results `idleRestartResume` |
| 7 | **활성 턴 중 단절**: 프로세스 kill → 새 프로세스 `resume` → 스레드 상태·중단된 턴 상태 관찰 → 새 턴 동작 | **pass**(관찰) — resume 성공, `thread.status = idle`, 끊긴 턴은 `interrupted`로 기록되고 items `[userMessage]`, 새 턴 `completed`. **끊긴 턴의 미수신 이벤트는 복구되지 않는다**(턴 자체가 중단됨) | results `activeKill`·`activeResume`·`activeResumeNewTurn` |
| 8 | `thread/queue/add` — `experimentalApi` 미설정 시 거부 | **pass** — `-32600`, 메시지 "requires experimentalApi capability" 단언 | results `queueAddWithoutOptIn` |
| 9 | (관찰) Windows `kill('SIGINT')` | 11ms 내 종료, `signal=SIGINT, killed=true, code=null` 단언 | results `sigint` |
| 10 | 테스트 RED→GREEN | RED(1차): resume 구조 오해·`killAndWait` 미구현 → GREEN 4 passed → 리뷰 반영 재구성(테스트별 독립 스레드) → GREEN **6 passed(22.4s)** | §4 |

**S1b 판정: pass.**

## 2. 실측 메모 (P02 T2·P05·P10a 입력)

- **steer의 증명 범위**: 턴 시작 직후 steer → interrupt 했으므로 모델 호출 전 턴이 끝났다(tokenUsage 0회, items 0개). 이 스파이크는 "활성 턴 id 검사·RPC 수락"까지만 증명한다. 추가 지시의 **출력 반영**은 S1c 또는 P02 계약 테스트에서 긴 턴 + 출력 표식(`[steered]`)으로 별도 검증한다.
- **resume 응답 구조(0.166.0)**: `historyMode:"paginated"`이지만 기본 `thread/resume`는 `thread.turns[]`에 턴·아이템을 담고 `initialTurnsPage`는 `null`. `turnsBackwardsCursor`/`itemsBackwardsCursor`는 **JSON 문자열**(객체 아님). 단일 턴 관찰이므로 `thread.turns`가 항상 전체 이력이라고 단정하지 않는다 — 어댑터는 `thread.turns`와 `initialTurnsPage.data`를 **둘 다 읽는 호환 대비책**을 두고, 다중 턴·페이지 응답은 P05 T1에서 검증한다.
- **재구독 절차(V8, 두 범위)**: (a) 유휴 세션 — `initialize` → `thread/resume{excludeTurns:true}` → 이후 `turn/start`·알림 정상, 별도 subscribe 메서드 없음. (b) 활성 턴 중 단절 — 프로세스가 죽으면 그 턴은 `interrupted`로 남고 **이벤트 연속성은 없다**(누락 이벤트 재전송 없음). 앱은 저널에 "단절 시점 turn id"를 기록하고 복귀 시 턴 상태를 `thread/resume` 결과로 확정한 뒤 **새 턴으로 재개**해야 한다(SESSION_RECOVERY 판정표 입력, D14와 일치).
- **thread/status/changed**: 턴 시작·종료마다 `active{activeFlags}` ↔ `idle` — SessionIndex 상태 투영 입력.
- **Windows SIGINT(V14, Codex 측)**: `child.kill('SIGINT')`/`('SIGTERM')` 모두 10~20ms 내 종료(`TerminateProcess`). **우아한 취소 수단이 아니다** → 취소는 `turn/interrupt` 우선, 프로세스 kill은 최후 수단. 자손 프로세스 정리는 S5 범위.
- **공유 `CODEX_HOME` 부수 효과 — memories 기록**: 사용자 config의 `[features] memories = true` 때문에 Codex가 **`-s read-only` 리뷰 호출 중에도** `~/.codex/memories/{MEMORY.md, memory_summary.md, raw_memories.md}`를 갱신하고 `~/.codex/memories/.git`를 초기화했다(stderr `apply_patch … memories/MEMORY.md`, 파일 mtime 02:52~02:55 KST = S1b 리뷰 시간대). 샌드박스는 **도구 실행**에만 적용되고 memories 기록은 Codex 자체 기능이라 막히지 않는다. 영향: (1) 개발 세션의 "환경 불변" 규칙(CHECKLIST §3)을 Codex 기능이 깨뜨린다 → 이후 **Codex 리뷰 호출은 `-c features.memories=false`** 오버라이드(config.toml 무수정), (2) 제품에서 공유 `CODEX_HOME`(U9)은 프로젝트 대화가 사용자 memories로 흘러가는 경로 → U9 스냅숏 의무에 `features.memories` 상태 표시 + 프로젝트별 비활성 옵션 추가 제안(OPEN_ISSUES 신규 위험, P00 종료 게이트에 보고). 계획 단계 호출(R1)의 stderr에도 같은 로그가 있어 당시에도 발생했던 것으로 **추정**.

## 3. UNVERIFIED 해소

| # | 항목 | 결과 |
|---|---|---|
| V8 | app-server 재접속 후 재구독 절차 | **해소(범위 한정)**: 유휴 세션 = resume 후 정상 구독; 활성 턴 중 단절 = 턴 `interrupted`, 이벤트 연속성 없음, 새 턴으로 재개(§2) |
| V14 | Windows SIGINT 동작(취소 fallback) | **해소(Codex 측, 종료 관찰)**: 즉시 종료, 우아한 취소 아님. "취소 fallback 검증"(실행 중 턴 취소·자손 정리)은 별도 — S5·P02 T4. Claude 측은 S2 |
| V17 | `thread/queue/add` experimental opt-in 거부 동작 | **해소**: `-32600 "thread/queue/add requires experimentalApi capability"` |

## 4. 실행 로그

RED(1차):
```
 × resume(같은 프로세스): … AssertionError: expected [] to include 'userMessage'
 × 관찰(V14): … TypeError: client.killAndWait is not a function
      Tests  2 failed | 2 passed (4)
```
GREEN(2차, 리뷰 반영 후 재구성):
```
 ✓ spikes/s1-codex-app-server/s1b.test.ts (6 tests) 22184ms
     ✓ steer RPC: expectedTurnId 일치 시 수락, 불일치 시 -32600; interrupt → interrupted 2653ms
     ✓ resume(새 프로세스): 이전 턴·아이템 재수신; fork{lastTurnId}: 새 thread id + forkedFromId 4695ms
     ✓ 유휴 스레드: stdio 재시작 후 resume → 새 턴의 알림을 수신한다(V8 범위: 유휴 세션 재접속) 8023ms
     ✓ 실행 중 연결 종료 → 재접속: resume 가능, 중단된 턴 상태를 관찰하고 새 턴이 동작한다(V8 범위: 활성 턴 중 단절) 5232ms
     ✓ thread/queue/add: experimentalApi 미설정 시 -32600 'requires experimentalApi capability' 1290ms
     ✓ 관찰(V14): Windows proc.kill('SIGINT') → 즉시 종료(signal=SIGINT, killed=true)
      Tests  6 passed (6)   Duration  22.41s
```

## 5. 사용량 (C5)

| 실행 | 완료 턴 | 비고 |
|---|---|---|
| 1차(4 테스트) | 1 (23,347 tokens, cached 20,736) + probe 1(약 23k) | 중단 턴 1 |
| 2차(6 테스트) | 5 (유휴 스레드 준비 2 + 재접속 턴 2 + 짧은 답변 1; 각 약 20~25k, 대부분 cached) | 중단 턴 2(모델 호출 전 종료) |

## 6. Codex 리뷰 (`docs/reviews/codex/S1b/response.md`)

판정: **수정 후 수용**(7건: High 2, Medium 4, Low 1). 반영:

| # | 심각도 | 지적 | 조치 |
|---|---|---|---|
| 1 | High | V8 "해소"가 유휴 스레드 재접속만 증명 | **수정** — 범위를 두 갈래로 한정하고, **활성 턴 중 단절 테스트 추가**(kill → resume → 상태 관찰 → 새 턴) |
| 2 | High | 픽스처에 Cloudflare 챌린지 HTML 잔존 | **수정** — S1a 리뷰 #1과 함께 `sanitizeEvents` 적용, 2차 실행 픽스처 전부 정화 |
| 3 | Medium | steer 판정명을 "RPC 수락"으로 좁힐 것 | **수정** — §1 행 1 |
| 4 | Medium | cursor는 객체가 아니라 JSON 문자열; `thread.turns` 일반화 금지 | **수정** — §2, `cursorTypes` 관찰값 기록 |
| 5 | Medium | SIGINT 단언 약함·증거 미보존 | **수정** — signal/killed/code 단언, 관찰값을 `s1b-results.json`으로 커밋 |
| 6 | Medium | 테스트 간 상태 공유·요청 후 알림 대기 | **수정** — 테스트마다 자체 스레드 생성, `item/started` 대기를 `turn/start` 전에 등록 |
| 7 | Low | queue 오류 코드 미단언, fork id 마스킹으로 대조 불가 | **부분 수정** — 코드·메시지 단언 추가. ID 가명화는 S1a #7과 함께 보류(minor) |
