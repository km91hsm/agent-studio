# S1a — Codex app-server 기본 왕복 스파이크

| 메타 | 값 |
|---|---|
| 정본 | MASTER_IMPLEMENTATION_PLAN Phase 00 Task S1a, AC-P00-2(S1a 부분) |
| 실행 | 2026-11-02 02:44~02:45 KST, Windows 11 Pro 10.0.26300 |
| 공급자 | codex-cli 0.166.0 (`codex app-server`, stdio JSONL), 인증 = 사용자 CLI ChatGPT 로그인 재사용(U1), 사용자 `CODEX_HOME` 공유(U9), `config.toml` 무수정, 모델 `gpt-6-sol`(사용자 config 기본값) |
| 구현/리뷰 | implementer=claude, reviewer=codex(`docs/reviews/codex/S1a/`) |
| 스킬 증거 | `prototype`(Skill 도구 호출, Task 시작) → `test-driven-development`(RED→GREEN) — 수동 증거 프로토콜 |
| 코드 | `spikes/s1-codex-app-server/{client.ts,audit.ts,s1a.test.ts}`, 녹화 `spikes/fixtures/codex-0.166.0/s1a-{readOnly,workspaceWrite}.jsonl`(마스킹) |
| 테스트 | `AGENT_STUDIO_LIVE=1 npx vitest run spikes/s1-codex-app-server/s1a.test.ts` |

## 1. 판정표

| # | 성공 기준 | 결과 | 증거 |
|---|---|---|---|
| 1 | (a) `readOnly`+`on-request`에서 "README에 한 줄 추가" 지시 → **작업 트리 무단 변경 0**(blob 해시 동일, `git status` 빈 목록) | **pass** | results `readmeChanged=false, dirtyPaths=[]` |
| 2 | (a) 승인 요청 수신 여부·횟수(관찰값) | 관찰: `item/commandExecution/requestApproval` **1회**(쓰기 명령). 읽기 명령 2회는 요청 없이 실행 | 픽스처 `s1a-readOnly.jsonl` |
| 3 | (a) `decline` 응답 후 `turn/completed.turn.status ∈ {completed, interrupted}` | **pass** — `completed`, 최종 메시지 "쓰기 권한 요청이 거부되어 … 변경되지 않았습니다" | 동일 |
| 4 | (b) `workspaceWrite`+`on-request` 2×2 표 기록 | 기록됨(§2) | results |
| 5 | (b) 변경 발생 시 사후 diff 감사가 `unapproved_write` 포착 | **pass** — README.md `M` → `unapproved_write` | results `audit` |
| 6 | (c) `thread/tokenUsage/updated` ≥ 1 | **pass** — 턴당 4회 수신 | 픽스처 |
| 7 | 테스트 RED→GREEN 절차 | RED: `Failed to load url ./client.js`(미구현) → GREEN: 4 passed(52.4s) | §5 로그 |

**S1a 판정: pass.** S1b·S1c 진입 가능.

## 2. 쓰기 범위 관찰 (2×2)

| 조합 | 승인 요청 | 실제 변경 | 턴 상태 | 해석 |
|---|---|---|---|---|
| `readOnly` + `on-request` | 있음(`commandExecution`, PowerShell `AppendAllText`) → decline | **없음** | completed | 샌드박스가 쓰기를 막고 승인 요청으로 승격. 읽기 명령(`Get-Content`, `Format-Hex`)은 **승인 없이 실행**(V30 입력) |
| `workspaceWrite{writableRoots:[repo]}` + `on-request` | **없음** | **있음**(`fileChange` 아이템, apply_patch) | completed | 허용 루트 내 쓰기는 요청 없이 실행됨 → 앱은 사후 diff 감사로만 포착(SECURITY_MODEL §2.1 DETECTED 셀과 일치, AC-P00-2) |

## 3. 프로토콜 실측 (P02 어댑터 입력)

- **프레이밍**: 한 줄 = 한 메시지, `jsonrpc` 필드 없음. 요청 `{id, method, params}`, 응답 `{id, result}`, 서버 요청 `{id, method, params}`(id는 서버 네임스페이스, 0부터), 알림 `{method, params, emittedAtMs}`.
- **초기화**: `initialize{clientInfo}` → `{userAgent, codexHome, platformFamily, platformOs}` → `initialized` 알림. 직후 `remoteControl/status/changed`(호스트명·installationId 포함 → 마스킹 대상 추가), `account/updated`.
- **공유 `CODEX_HOME` 부수 효과**: `thread/start` 직후 `mcpServer/startupStatus/updated` 12~14회 — 사용자 Desktop 번들 플러그인·MCP 서버가 함께 기동됨(U9 스냅숏 의무의 실측 근거, S9(g) 입력).
- **승인 요청 3종 + 1종의 응답 구조**(generate-ts 산출물 `v2/*.ts` 대조):

| 서버 요청 | params 핵심 | 응답 |
|---|---|---|
| `item/commandExecution/requestApproval` | `kind, threadId, turnId, itemId, command, cwd, reason, availableDecisions` | `{decision: "accept"\|"acceptForSession"\|"decline"\|"cancel"\|{acceptWithExecpolicyAmendment}\|{applyNetworkPolicyAmendment}}` — **실측 1회**(decline 수락, `serverRequest/resolved` 수신) |
| `item/fileChange/requestApproval` | `threadId, turnId, itemId, reason, grantRoot?` | `{decision: "accept"\|"acceptForSession"\|"decline"\|"cancel"}` — 이번 실행에서 미발생(readOnly에서는 모델이 셸 명령으로 쓰기를 시도함) |
| `item/tool/requestUserInput` | `questions[], isBlocking, autoResolutionMs` | `{answers: {[id]: answer}}` — 미발생 |
| `mcpServer/elicitation/request` | `serverName, mode: form\|openai/form\|openai/userVerification…` | `{action, content, _meta}` — 미발생 |
| `item/permissions/requestApproval` | `permissions: RequestPermissionProfile, cwd, reason` | `{permissions: Granted…, scope}` — 미발생 |

- **`thread/tokenUsage/updated` 의미(V15 해소)**: 모델 호출마다 1회. `last` = 직전 모델 호출 1회분(증분), `total` = 스레드 누적. 턴 종료 시점 `total`이 턴 누계(readOnly 90,208 / workspaceWrite 90,368 tokens). `turn/completed`에는 usage 없음(확인).
- **Turn id·thread id는 모두 UUIDv7** → 마스킹 패턴이 둘을 같은 `<thread-id>` 토큰으로 치환함(픽스처 읽을 때 유의).
- **`turn/diff/updated`**: workspaceWrite에서 4회 수신 — 턴 중 누적 diff를 서버가 제공(P08a 변경 귀속 입력).

## 4. 사용량 (C5)

| 케이스 | 실호출 | input | cached | output | reasoning | 소요 |
|---|---|---|---|---|---|---|
| (a) readOnly | 1 turn (모델 호출 4) | 89,771 | 75,264 | 437 | 61 | 20.1s |
| (b) workspaceWrite | 1 turn (모델 호출 4) | 90,033 | 80,000 | 335 | 0 | 30.7s |

## 5. 실행 로그

RED (구현 전):
```
FAIL spikes/s1-codex-app-server/s1a.test.ts
Error: Failed to load url ./client.js (resolved id: ./client.js) in spikes/s1-codex-app-server/s1a.test.ts
 Test Files  1 failed (1)   Tests  no tests
```
GREEN (실호출):
```
 ✓ spikes/s1-codex-app-server/s1a.test.ts (4 tests) 52211ms
   ✓ (a) readOnly + on-request: 작업 트리 무단 변경 0, decline 후 turn.status ∈ {completed, interrupted} 20777ms
   ✓ (b) workspaceWrite + on-request: 2×2 기록, 변경 발생 시 사후 diff 감사가 unapproved_write 포착 31422ms
   ✓ (c) thread/tokenUsage/updated 수신 ≥ 1
   ✓ S1a audit (unit) 승인 목록에 없는 변경 경로를 unapproved_write로 판정한다
 Test Files  1 passed (1)   Tests  4 passed (4)   Duration  52.42s
```

## 6. UNVERIFIED 해소

| # | 항목 | 결과 |
|---|---|---|
| V15 | `thread/tokenUsage/updated` 증분·누적 의미 | **해소**: `last`=증분(모델 호출 1회), `total`=스레드 누적 → EXECUTION_LIMITS §5 수집 행 갱신 입력(P00 종료 게이트 설계 수정 커밋에 반영) |
| V28 | 설치 버전의 승인·sandbox 동작이 스키마와 일치 | **부분 해소**: `AskForApproval "on-request"`, `SandboxPolicy {type:"readOnly"\|"workspaceWrite"}`, `decision:"decline"` 모두 수락. 외부 경로·네트워크는 S4 |
| V30 | `readOnly`에서 명령 실행이 승인 요청으로만 가능한지 | **입력 확보**: 읽기 명령은 요청 없이 실행, 쓰기 명령만 요청 → S1c에서 명령 5종으로 확정 |

## 7. Codex 리뷰

(리뷰 수신 후 기입)
