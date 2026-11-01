# SESSION_RECOVERY_DESIGN — 세션 5동작·복구 14시나리오

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 요구사항 | REQ-SM-01~13, REQ-REC-01~15, REQ-GOAL-06, REQ-CE-07·09 |
| 공식 조사 | `archive/evidence/research/RESEARCH_AGENT_GATEWAY.md` §2·§5·§6 |
| 원칙 | 세션≠작업 상태, Checkpoint Restore≠native resume |
| UNVERIFIED | app-server 재접속 후 재구독 절차, Codex 세션 파일 형식(둘 다 공식 API로 우회) |

## 1. 세션 5가지 동작 (REQ-SM-13)

| 동작 | 정의 | Claude 구현 | Codex 구현 | 앱이 저장하는 것 | UI 표시 |
|---|---|---|---|---|---|
| **Native Session Resume** | 에이전트 네이티브 세션을 그대로 이어감. 대화 기록 보존 | SDK `resume: <uuid>` (CLI `--resume`) | `thread/resume` → `turn/start` (`codex exec resume` 대체) | `session_ref`, 마지막 turn/메시지 식별자 | "재개" |
| **Context Handoff** | 새 세션(같은/다른 에이전트)에 구조화 요약을 입력으로 전달. 대화 기록 미보존 | 새 `query()` + handoff JSON | 새 `thread/start` + handoff JSON | handoff 문서(COLLABORATION_PROTOCOL §4) | "넘기기(요약)" |
| **Session Fork** | 원본 보존, 특정 지점부터 분기 | `resume` + `forkSession: true`(현재 끝) 또는 `forkSession(sessionId,{upToMessageId})`(과거 메시지까지 복사, 공식 레퍼런스; 0.3.316 동작 P00 확인 — 미지원 시 UI에 분기 지점 제한 표시) | `thread/fork {threadId, lastTurnId, excludeTurns:true}`(지정 턴까지 포함; 진행 중 턴 지정은 거절; `ephemeral:true`는 메모리 전용·목록 미추가 → 복구용 금지) | 부모·자식 `session_ref`, 분기 지점 | "분기" (Codex는 턴 선택 UI) |
| **Checkpoint Restore** | 세션을 복원할 수 없을 때 체크포인트의 사실 집합(git ref·파일·테스트·승인)에서 새 세션 시작 | Handoff와 동일 경로 + **복원 전 스냅숏 비교**(현재 tree·untracked·체크포인트 파일 해시) → 사용자가 "현재 변경 보존 / 체크포인트로 되돌림" 선택 → **별도 worktree**에서 handoff 시작 | 동일 | `checkpoints` 행 + 비교 결과 | "체크포인트에서 이어가기 — 대화 기록 미복원" 경고 |
| **Read-only Session Replay** | 대화·이벤트 재생, 실행 없음 | `getSessionMessages()` + 저널 | `thread/read`, `thread/items/list` + 저널 | 없음(캐시만) | "재생" (입력창 비활성) |

금지: Checkpoint Restore를 "재개"로 표시하는 것, `~/.claude/projects/*.jsonl`·`~/.codex/sessions` 파일 직접 파싱(공식 비권장·형식 미공개).

## 2. 세션 조회 (REQ-SM-01·02)

- 소스: Claude `listSessions({dir})`, `getSessionInfo()`; Codex `thread/list{cursor, sortKey, archived, sourceKinds}` — **`sourceKinds` 생략 시 기본 `cli`·`vscode`라 앱이 만든 `appServer` 세션이 빠짐 → 명시 필수**. archived는 별도 조회.
- 앱 `SessionIndex` 투영: 공식 API 결과를 주기·이벤트(`thread.started`/`SDKSystemMessage`) 기반으로 캐시하고, 프로젝트·Task 연결(`agent_run_sessions`)을 덧붙인다. 공식 API가 실패하면 캐시를 "마지막 동기화 시각"과 함께 표시.
- `-p`/SDK로 만든 Claude 세션은 Claude 자체 피커에 안 보이지만 ID로 재개 가능(공식) → 앱 인덱스가 유일한 목록 소스.

## 3. 복구 관리자 (Recovery Manager)

기동 또는 데몬 재접속 시:

1. `projection_cursor` ≤ `max(events.seq)` 확인, 차이 있으면 투영 재생.
2. 만료 lease 회수 → 해당 Task를 `BLOCKED(recovery_pending)`로 표시(자동 재실행 금지).
3. 각 미종결 AgentRun에 대해 **실행 차단 상태에서** `RecoveryAssessment`(재기동·재개보다 평가가 항상 먼저):
   - 이전 프로세스 종료 확정(PID·시작 시각 대조), 실행 경로 봉쇄(새 턴 금지)
   - 세션 상태 **분류**: `present` / `absent`(영구 부재 확정, 404 상당) / `inaccessible`(인증·권한) / `transient_error`(I/O·과부하) — Claude `getSessionInfo`, Codex `thread/read`의 오류 종류로 구분
   - `effects.state IN ('intended','unverifiable')` 존재?
   - 마지막 **확정** 도구 아이템(`item_finished`) 이후 미확정 아이템 존재?
   - 외부 실행기 원장(앱 전용 실행기 기록)에 미완료 항목?
   - worktree `git status` dirty? **충돌 마커**(`git ls-files -u`, `.git/MERGE_HEAD`·`rebase-merge/`·`rebase-apply/`)? HEAD가 Checkpoint와 같은가?
   - 변경 파일마다 blob 3분기 판정(=target / =base / 기타)
4. 판정표:

| 세션 | 미확정 효과·아이템 | git 변화 | 판정 |
|---|---|---|---|
| present + `capture_confidence=complete` | 없음(마지막 아이템 확정, 실행기 원장 비어 있음, `unverifiable` 없음) | 없음 | **자동 재개 허용**(Native Resume, 사용자 알림만) |
| present + `capture_confidence=uncertain`(run 중 셸·스킬 스크립트·외부 MCP·자동 허용 도구 사용이 관찰됨 — 기계 판정, 기본값은 `uncertain`이며 관찰 도구 집합이 파일 도구만일 때 `complete`) | 임의 | 임의 | **자동 재개 금지** → `WAITING_APPROVAL`(review) — 포착 불확실 사유 제시 |
| present | 없음 | 있음 | `WAITING_APPROVAL` — diff·blob 판정 제시 후 "재개 / 되돌리고 재개 / 중단" |
| present | 있음 | 임의 | `WAITING_APPROVAL` — 효과별 외부 상태 대조 결과 제시, `unverifiable`은 사용자 대조 필수 |
| transient_error / inaccessible | 임의 | 임의 | `BLOCKED(session_unavailable)` — 부재 확정 전 새 세션 시작 보류, 재조회 |
| absent | 임의 | 임의 | `BLOCKED(session_lost)` → Checkpoint Restore 제안(자동 실행 금지) |

## 4. 14개 시나리오

| # | 시나리오 | 감지 | 처리 | 상태 | REQ |
|---|---|---|---|---|---|
| 1 | Claude 정상 종료 | `result` 메시지(`success`) | 세션 ID·usage 저장, 산출물 기록 → 다음 전이 | 정상 | REC-01 |
| 2 | Codex 정상 종료 | `turn/completed status=completed` | 동일 | 정상 | REC-02 |
| 3 | 에이전트 비정상 종료 | SDK `error_during_execution`/프로세스 exit≠0, app-server 연결 끊김 | **(1) 프로세스 종료 확정·실행 경로 봉쇄 → (2) §3 평가(파일 blob·효과 원장·git 대조) → (3) 판정표에 따라 재개 승인**. 어댑터 재기동은 **관찰 전용 접속**(세션 조회·replay)만 허용, 평가 전 새 턴 금지 | 판정표 | REC-03 |
| 4 | 앱(Shell) 강제 종료 | 데몬 측 RPC 연결 종료 감지(데몬 생존은 P00 S5 실측 전제, 이벤트 신호 아님) | 데몬 계속 실행. 대기 중 승인 요청은 데몬이 소유(15분 타이머 지속, 만료 시 §4 규칙). Shell 재기동 시 재접속·`seq` 기반 재구독·인박스 재표시 | 영향 없음(실측 조건) | REC-04 |
| 5 | OS 재부팅 | 데몬 재기동(부트 ID·PID 변경) | **lease 만료 여부와 무관하게 모든 미종결 run 실행 차단** → §3 전체 수행 | 판정표 | REC-05 |
| 6 | 네트워크 단절 | Claude `system/api_retry`, Codex `codexErrorInfo=HttpConnectionFailed(연결 실패)/ResponseStreamDisconnected`. **`-32001`은 WebSocket ingress 과부하 신호로 분류(네트워크 단절 아님)**; `HttpConnectionFailed`의 4xx/5xx는 상태코드별 분기(4xx 재시도 금지) | transport 오류만 어댑터 재시도(상한 2회·지수 백오프) → 실패 시 `BLOCKED(network)`; overload는 대기 후 1회; upstream 5xx는 1회; 4xx·auth·quota는 0회 | BLOCKED | REC-06 |
| 7 | 인증 만료 | Claude `result`/`error` payload의 인증 오류 분류(독립 이벤트명 단정 금지), Codex 인증 오류 | 즉시 `BLOCKED(auth)`, 재시도 0, 사용자 안내(`codex login`/`claude` 로그인은 사용자가 수행) | BLOCKED | REC-07 |
| 8 | 사용 한도 초과 | Claude `SDKRateLimitEvent rejected`, Codex `UsageLimitExceeded`; `account/rateLimits/read`는 ChatGPT 로그인 모드 사전 경고 전용 | `BLOCKED(quota)`, 재시도 금지, 재개 시각 표시(가능 시) | BLOCKED | REC-08 |
| 9 | 스킬 실행 실패 | run 종료 후 **앱 평가**: 증거 등급 `LOAD_OBSERVED` 미달 또는 스크립트 오류(이벤트 스트림의 실패 신호가 아님) | 이전 run 부작용을 §3으로 평가한 뒤 필수 스킬이면 `REWORK`(명시 호출 강화 1회) → 재실패 `BLOCKED(skill)` | REWORK/BLOCKED | REC-09 |
| 10 | 테스트 중단 | **앱 테스트 실행기**가 수집: 프로세스 비정상 종료·타임아웃·종료코드 | 부분 로그 저장; 테스트가 파일을 변경했으면(blob 대조) `WAITING_APPROVAL`, 아니면 `REWORK` 입력으로 전달 | REWORK/WAITING_APPROVAL | REC-10 |
| 11 | Git 충돌 | 앱이 기록한 Git 실행(`GitCommandRun{argv,exit_code,stderr_digest}`) + `git ls-files -u` + `.git/MERGE_HEAD`·`rebase-merge/`·`rebase-apply/` 마커. 에이전트 이벤트 스트림에는 전용 신호 없음 | 자동 merge 금지 → **`WAITING_APPROVAL`(git_conflict)**(충돌 파일 목록·유발 실행 경로 제시). 상태 머신 전이도 동일(PHASE_MANAGEMENT §2) | WAITING_APPROVAL | REC-11 |
| 12 | 세션 ID 복원 불가 | 조회 오류를 `absent`/`inaccessible`/`transient_error`로 분류 | `absent` 확정 시에만 Checkpoint Restore **제안**(자동 실행 금지, 대화 미복원 명시); 그 외 `BLOCKED(session_unavailable)` 유지·재조회 | BLOCKED | REC-12 |
| 13 | 부분 완료 | `effects` 상태 + 파일 blob 3분기 + 외부 효과 `external_ref` 대조 | **대조로 완료가 확정된 효과만** 건너뜀; `unverifiable`·판정 "기타" 파일은 사용자 대조; 남은 단계만 재계획 | WAITING_APPROVAL | REC-13 |
| 14 | 승인 범위 이탈 재시작 | 승인 스냅숏 vs 현재 요청 diff | 이전 승인 무효화, 재승인 요청 | WAITING_APPROVAL | REC-14 |
| — | 공통 | — | 자동 재실행이 위험하면 WAITING_APPROVAL/BLOCKED, 단순 재실행 금지 | — | REC-15 |

## 5. 중단 의미론 (REQ-WS-09)

| 동작 | Claude | Codex | 결과 상태 |
|---|---|---|---|
| 일시정지 | 현재 턴 완료까지 대기, 새 턴 금지 | 동일 | `tasks.paused` + 저널 `PauseRequested/Paused/ResumeRequested`. Scheduler는 `paused=1`이면 다음 턴 배정 금지(재기동 후에도 유지). 우선순위: 취소 > 승인 만료 > 일시정지 > lease 갱신. 승인 대기 중 일시정지는 "승인 후에도 재개 안 함"으로 표시 |
| 취소(턴) | SDK `interrupt()` (streaming 모드) | `turn/interrupt` → `interrupted` | 세션 보존, 변경사항 보존 |
| 강제 중단 | `close()`/`abortController` | 프로세스 kill | 세션 ID 저장 후 §3 판정 |
| 추가 지시 | streaming input 큐(다음 턴) | `turn/steer`(현재 턴) → 실패 시 앱 저널 `PendingInputQueued`(다음 턴); `thread/queue/add`는 experimental opt-in 시 보조 | UI 문구 구분("현재 턴 반영" / "다음 턴 대기") |

## 6. 장기 컨텍스트 (REQ-SM-09, V2)

Claude: 세션 자체 압축은 CLI 내부. Codex: `thread/compact/start` 메서드 존재(스키마 확인) → V2에서 "압축" 액션으로 노출. 앱 측은 handoff 요약 생성이 대안.
