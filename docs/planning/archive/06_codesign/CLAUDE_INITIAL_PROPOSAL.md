# CLAUDE_INITIAL_PROPOSAL — Claude Code 독립 아키텍처 제안 (Round 1)

| 메타 | 값 |
|---|---|
| 상태 | FINAL(Round 1 보존본, 이후 수정 금지) |
| 작성 | Claude Code (Fable 5.1), 2026-11-01 |
| 독립성 | Codex Round 1 응답을 보기 전에 작성·커밋함. 커밋 해시로 선후 관계 증명 |
| 근거 | `evidence/research/RESEARCH_AGENT_GATEWAY.md`(공식 문서 인용), `RESEARCH_DESKTOP_STACK.md`, `ENVIRONMENT_SURVEY.md`, `skill_analysis_part1/2.md` |
| 사용 스킬 | `codebase-design`(모듈·인터페이스·심·어댑터 어휘), `research`(조사 위임) |
| UNVERIFIED | 본문 표기 7건 |

## 1. 핵심 설계 판단

1. **에이전트 어댑터가 스택을 결정한다.** 공식 조사 결과, 프로그램이 승인 요청을 받아 응답할 수 있는 경로는 Claude는 Agent SDK `canUseTool`(또는 CLI `--permission-prompt-tool`), Codex는 **app-server JSON-RPC만**이다. 두 공식 SDK 모두 TypeScript가 1급이고(`@anthropic-ai/claude-agent-sdk` 0.3.316, `@openai/codex-sdk` 0.166.0, `codex app-server generate-ts`), Rust·Python 1급 SDK는 Codex 쪽에 없다. 따라서 오케스트레이터 언어는 **TypeScript(Node 24 LTS)** 단일로 간다.
2. **데스크톱은 Electron.** Monaco·xterm.js·Git Diff를 품는 IDE형 UI는 Chromium 일관성이 중요하고, 현 PC에 Rust/.NET이 없으며, Tauri를 택해도 SDK 때문에 Node 사이드카가 어차피 필요해 런타임이 둘이 된다. Electron은 런타임 하나(Node+Chromium)로 끝난다. 설치 크기 열세는 수용한다.
3. **구조는 C(Hybrid): Electron Shell + 독립 Orchestrator 데몬(Node)**. 둘 다 TypeScript. 데몬이 SQLite의 단일 writer, 상태 머신, 어댑터, 승인 브로커를 소유한다. Shell은 창·트레이·업데이트만. "앱 종료 후 작업 지속"은 데몬을 `detached`+`unref`로 분리 실행하고 다음 기동 시 재접속하는 방식으로 MVP를 만들고, OS 서비스 등록은 V2로 미룬다.
4. **상태는 이벤트 저널 + 투영(projection).** 단일 writer 데몬이 append-only `events` 테이블에 쓰고, `tasks`·`agent_runs` 등은 저널에서 재구성 가능한 투영으로 둔다. 복구는 "저널 재생 + 어댑터 세션 resume"의 2단 구조.
5. **승인은 실행 계층에서 강제.** 어댑터가 승인 요청 이벤트를 받으면 `ApprovalBroker`가 정책(자동 허용/항상 승인/위험도)을 평가하고, 사람이 필요하면 `WAITING_APPROVAL`로 전이한다. CLAUDE.md/AGENTS.md는 보조 지침일 뿐 강제 수단이 아니다.
6. **가장 큰 위험은 기술이 아니라 이용 약관이다.** Claude Agent SDK 문서는 "third party developers … claude.ai login … not allowed; use API key authentication"이라고 명시한다. Codex app-server를 ChatGPT 로그인으로 제3자 앱이 구동하는 것의 허용 여부도 UNVERIFIED. 이 문제는 아키텍처가 아닌 **사용자 결정 항목**으로 올린다(§9).

## 2. 기술 스택 제안

| 영역 | 선택 | 근거(공식 근거) | 대안과 기각 사유 | 위험 |
|---|---|---|---|---|
| 언어 — UI | TypeScript | React/Monaco/xterm 생태계. 단일 언어 | — | — |
| 언어 — 백엔드·오케스트레이터 | TypeScript (Node 24 LTS) | 두 공식 SDK 모두 TS. `codex app-server generate-ts`로 타입 생성 가능(RESEARCH_AGENT_GATEWAY §3.1). Node 24 LTS는 2028-04 EOL(nodejs/Release) | Python: Claude SDK는 있으나 Codex SDK 없음, app-server 클라이언트 자작 필요, 패키징(PyInstaller/Nuitka) 추가 비용. Rust: 두 SDK 모두 없음, 툴체인 미설치. Go/C#: SDK 없음 | Node 단일 스레드 → CPU 작업(diff, 검색)은 worker_threads/별도 프로세스 |
| 언어 — 프로세스 제어 | TypeScript (`child_process.spawn`, SDK 내부 spawn) | Claude SDK는 CLI 바이너리를 번들·spawn, Codex SDK/app-server도 `codex` 프로세스 spawn. 어댑터가 Node 안에 있어야 함 | — | Windows에서 SIGINT 전달 UNVERIFIED → SDK `interrupt()`/`turn/interrupt` 사용 |
| 언어 — 테스트 | TypeScript (Vitest) + Playwright(Electron) | 단일 언어 | — | E2E는 OS별 CI 필요 |
| 데스크톱 프레임워크 | **Electron 45.x** | Node 24 번들, Chromium 일관, 자식 프로세스 `spawn` stdin/stdout/kill 완전 지원, renderer sandbox·contextIsolation 기본, autoUpdater/electron-builder 공식·준공식 경로(RESEARCH_DESKTOP_STACK §2.1) | Tauri v2: Rust 필수(현 PC 없음), SDK용 Node 사이드카 필요 → 런타임 2개, WebKit(mac/Linux)·WebView2(Win) 차이로 Monaco/xterm 검증 비용. Avalonia/Qt: 웹 컴포넌트 재사용 불가, 샌드박스 모델 없음, PySide6 LGPL | 설치 크기(수치 UNVERIFIED), 메모리. 완화: 단일 창, 렌더러 1개 |
| 프런트엔드 | **React 19 + TypeScript**, 상태는 Zustand 또는 동급(미확정) | Monaco/xterm React 래퍼 성숙, 후보 스킬 vercel-react-best-practices·composition-patterns가 개발 과정에 직접 적용 가능 | Svelte: 가볍지만 스킬·래퍼 생태계 얇음. Vue: 가능하나 스킬 매핑 없음 | 대용량 로그 → 가상 스크롤 필수(Vue 공식 가이드 수준의 조치) |
| 코드 편집기 | **Monaco Editor 0.57** | VS Code 동일 엔진, 접근성 가이드 존재, MIT | CodeMirror 6: 더 작지만 다중 패키지 조립, LSP 통합은 자체 구현 | 번들 100MB(unpacked) → lazy load. `file://` web worker 불가 → 커스텀 프로토콜/로컬 서빙 |
| 터미널 | **xterm.js 6.0** + node-pty | 의존성 0, 스크린리더 모드, MIT | — | node-pty 네이티브 빌드(Electron 리빌드) |
| 백엔드 구조 | **C. Shell(Electron main) + Orchestrator 데몬(Node, 별 프로세스)**, localhost WebSocket JSON-RPC + 토큰 | Shell 크래시와 작업 분리, 데몬 detached 실행으로 창 닫아도 지속, 향후 OS 서비스로 승격 가능. `utilityProcess`는 앱 종료 후 생존 UNVERIFIED라 사용 안 함 | A(Python 사이드카): 언어 2개, Codex SDK 부재. B(Electron main에 전부): 간단하지만 UI 크래시=작업 중단, 백그라운드 지속 불가 | 데몬 발견·재접속(포트/락 파일), 토큰 보관, 좀비 프로세스 |
| 데이터 저장소 | **SQLite(WAL) — better-sqlite3 13.x, 데몬만 접근** | 로컬 단일 사용자, "one writer at a time" 원칙을 데몬 단일 writer로 충족(sqlite.org/wal). 동기 API로 트랜잭션 단순. prebuilt 바이너리 | `node:sqlite`: Node 24에서 RC(1.2) 등급 → V1에서 재평가. PostgreSQL: 로컬 앱에 과함. 파일 JSON: 트랜잭션·질의 약함 | Electron ABI 리빌드. 완화: electron-rebuild CI, 데몬을 시스템 Node가 아닌 Electron 내장 Node로 실행 |
| 자격증명 저장 | **`@napi-rs/keyring` 2.x**(keyring-rs 바인딩) | 활성 유지(2026-10), keytar 대체 호환. 저장 대상은 Agent Studio 자체 비밀(데몬 토큰, MCP 토큰)만. Claude/Codex 인증은 각 CLI가 소유 | keytar: archived(2022) | OS 백엔드별 범위 문구 UNVERIFIED → Phase 00 실측 |
| 패키징·업데이트 | **electron-builder**(NSIS/DMG/AppImage+deb) + electron-updater, 코드 서명(Win OV/EV 또는 Azure Artifact Signing, mac Developer ID+notarization) | 공식·준공식 경로 존재 | update.electronjs.org: 공개 GitHub 저장소 조건 | 3-OS 빌드는 멀티 호스트 CI 전제. 서명 비용(Apple $99/yr) |

단일 언어 vs 다중 언어: **단일(TypeScript)**. 이유는 SDK 위치, 현 PC 툴체인, 테스트·패키징 단순화. 대가는 CPU 집약 작업 성능과 Electron 설치 크기.

## 3. 아키텍처 대안 A/B/C 평가

### 다이어그램

```mermaid
flowchart LR
  subgraph Shell["Electron Shell (main)"]
    W[BrowserWindow / Tray / autoUpdater]
  end
  subgraph R["Renderer (React)"]
    UI[Workspace · Planning · Sessions · Activity · Skills · Settings]
  end
  subgraph D["Orchestrator Daemon (Node, detached)"]
    RPC[Local WS JSON-RPC + token]
    SM[Scheduler / StateMachine / Lease]
    AB[ApprovalBroker]
    SK[SkillRegistry · Router · Evidence]
    SI[SessionIndex]
    EJ[(SQLite WAL: events, projections)]
    GW[AgentGateway]
    CA[ClaudeSdkAdapter]
    XA[CodexAppServerAdapter]
  end
  UI <-- IPC(contextBridge) --> W
  UI <-- WS --> RPC
  W -- spawn/attach --> RPC
  RPC --> SM --> GW
  GW --> CA --> CL[claude CLI (user install)]
  GW --> XA --> CX[codex app-server (stdio)]
  CA & XA --> AB
  SM --> EJ
  SK --> EJ
```

데이터 흐름: 사용자 지시 → Renderer → 데몬 RPC `task.submit` → 저널 `TaskSubmitted` → Scheduler가 Lease 획득 → Gateway `startRun(adapter, session)` → 어댑터 이벤트(텍스트 델타, 도구 호출, 승인 요청, usage) → 저널 append → 투영 갱신 → RPC 구독으로 Renderer 스트리밍. 승인 요청은 ApprovalBroker 평가 → 자동 응답 또는 `WAITING_APPROVAL` → 사용자 응답 → 어댑터 콜백 resolve.

### 점수표 (5점 만점, 높을수록 좋음)

| 기준 | A. Python Orchestrator | B. Native Desktop Backend(Electron main 통합) | C. Hybrid(Shell + Node 데몬) |
|---|---|---|---|
| 성능 | 3 | 4 | 4 |
| IPC | 3 (HTTP/WS 경계 + 언어 경계) | 5 (in-process) | 4 (WS 1홉) |
| 실시간 이벤트 | 3 | 5 | 4 |
| 다중 에이전트 제어 | 3 (Codex SDK 없음, app-server 클라이언트 자작) | 4 | 5 |
| SQLite 상태 관리 | 4 | 3 (UI 프로세스가 writer) | 5 (데몬 단일 writer) |
| 앱 종료 후 백그라운드 | 4 (별 프로세스) | 1 | 5 |
| OS별 서비스 관리 | 3 | 1 | 4 (V2에서 서비스 승격 용이) |
| 장애 복구 | 4 | 2 (UI 크래시=작업 중단) | 5 |
| 권한 격리 | 4 | 2 | 4 |
| 패키징 | 2 (Python 런타임 동봉) | 5 | 4 (Node 데몬은 Electron 내장 Node로 실행) |
| 구현 비용 | 2 (언어 2개) | 5 | 3 |
| 장기 유지보수 | 2 | 3 | 4 |
| **합계** | 37 | 40 | **51** |

**추천: C.** 가장 큰 위험: 데몬 생명주기 관리(Windows에서 detached Node 프로세스의 콘솔·종료·재접속, 좀비 방지). Phase 00 스파이크로 검증한다. B는 MVP 속도가 빠르지만 "재부팅·강제 종료 후 복구"(REQ-GOAL-06)와 "백그라운드 지속"을 구조적으로 못 만족한다. A는 Codex app-server 클라이언트를 Python으로 다시 써야 하고 Claude Python SDK가 TS보다 후행한다.

## 4. Agent Gateway 설계

**Module `AgentGateway`** — 인터페이스(작게): `startRun(spec) → RunHandle`, `RunHandle.events(): AsyncIterable<GatewayEvent>`, `RunHandle.steer(text)`, `RunHandle.interrupt()`, `RunHandle.respondApproval(id, decision)`, `listSessions(agent, filter)`, `resumeRun(sessionRef, spec)`, `forkRun(sessionRef, spec)`. 모든 어댑터 차이는 구현 안에 숨긴다. 심(seam)은 "에이전트 종류"에 있고 어댑터가 둘(Claude, Codex)이므로 실재하는 심이다. `GatewayEvent`는 공통 스키마(`text_delta`, `item_started/completed`, `tool_call`, `approval_requested`, `usage`, `error`, `turn_completed`)로 정규화한다.

| 기능 | Claude 어댑터(`ClaudeSdkAdapter`, TS Agent SDK, `pathToClaudeCodeExecutable`=사용자 설치 CLI) | Codex 어댑터(`CodexAppServerAdapter`, `codex app-server` stdio JSON-RPC) | 비고 |
|---|---|---|---|
| 대화 시작 | `query({prompt: AsyncIterable, options})` streaming input 모드 | `initialize` → `thread/start` → `turn/start` | Codex `exec`/SDK는 승인 콜백 부재로 **채택 안 함** |
| 스트리밍 | `includePartialMessages` → `text_delta` | `item/agentMessage/delta`, `item/commandExecution/outputDelta` | 공통 `text_delta`로 정규화 |
| 세션 조회 | `listSessions()`, `getSessionInfo()`, `getSessionMessages()` (공식; jsonl 직접 파싱 금지) | `thread/list`(cursor), `thread/read` | 두 결과를 `SessionIndex` 투영에 캐시 |
| 세션 재개 | `resume: id` | `thread/resume` | |
| 세션 분기 | `resume` + `forkSession: true` | `thread/fork {lastTurnId, ephemeral}` | Codex가 분기점 지정 가능 → UI에 노출 |
| 실행 중 추가 지시 | streaming input으로 큐잉(현재 턴 끼워넣기 의미론은 미문서화) | `turn/steer {expectedTurnId}`(진행 중 턴에 추가) + `thread/queue/*` | UX 문구를 "다음 턴에 전달 / 현재 턴에 추가"로 구분 |
| 도구 호출 관찰 | `assistant.tool_use`/`user.tool_result`, `PreToolUse`/`PostToolUse` hooks, `tool_progress` | `item/started|completed`(command_execution, file_change, mcp_tool_call…), `item/fileChange/patchUpdated` | 파일 변경 아이템은 Diff 뷰로 연결 |
| 승인 요청 | `canUseTool` 콜백(무기한 대기 가능) + `PreToolUse` `permissionDecision`. 기본 모드 Manual(v2.1.302+) | 서버→클라이언트 `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval` → `accept|acceptForSession|decline|cancel` | `ApprovalBroker`가 공통 `ApprovalRequest`로 정규화 |
| 실행 취소 | `interrupt()`(streaming 모드), `abortController`, `close()` | `turn/interrupt` → status `interrupted` | Windows SIGINT 미사용 |
| 사용량 | `result.total_cost_usd`(클라이언트 추정), `usage`, `modelUsage`, `maxBudgetUsd` | `turn/completed.usage` 토큰 5종, `thread/tokenUsage/updated`, `account/rateLimits/read`. USD 없음 | Codex 단가표는 앱이 보유(선택 기능). UI에 "추정치" 표기 |
| 오류 복구 | `system/api_retry`, `SDKRateLimitEvent`, `error_during_execution`, `reinitialize()` | `-32001` 지수 백오프, `codexErrorInfo`(UsageLimitExceeded 등), 재접속 후 `thread/resume`(재구독 절차 UNVERIFIED) | 인증 오류는 재시도 0회 |
| 버전 호환 | `system/init.capabilities` 기능 감지, SDK 0.3.N↔CLI 2.1.N parity | app-server 전체 experimental, v1/v2 스키마 → CI에서 `generate-json-schema` 고정·diff | `AgentGateway.capabilities()`로 UI 기능 토글 |

fallback: Codex app-server가 불안정하면 `codex exec --json`(승인 없음, `approval_policy=never`, read-only/workspace-write 샌드박스 고정)로 "승인 불필요 작업"만 수행하는 **제한 모드**를 둔다. Claude는 SDK 실패 시 `claude -p --output-format stream-json --input-format stream-json --permission-prompt-tool mcp__agentstudio__approve`로 동일 기능을 CLI 직접 구동으로 대체할 수 있다(앱이 MCP 서버 1개 제공).

## 5. 상태·복구 설계 요지

- **엔티티**: `workspaces → projects → phases → tasks → agent_runs → run_sessions(N:M: run이 세션을 재사용·분기)`. `sessions`는 어댑터 네이티브 ID(`claude:<uuid>`, `codex:<thread_id>`)와 메타만 저장. 대화 본문은 저장하지 않고 공식 API로 읽는다(Claude `getSessionMessages`, Codex `thread/read`); 앱 자체 이벤트 저널이 "실행 이력"의 원본.
- **상태 머신**: Task 단위. `QUEUED→PLANNING→IMPLEMENTING→REVIEWING→VERIFYING→COMPLETED`, 예외 `REWORK, WAITING_APPROVAL, BLOCKED, FAILED, CANCELLED`. 전이는 데몬의 `transition(taskId, event, fencingToken)` 하나로만 발생.
- **채택 장치**: Lease(worker가 task를 잡을 때 TTL 60s, heartbeat 15s로 연장), Fencing Token(lease마다 단조 증가; 늦게 돌아온 worker의 쓰기 거부), Idempotency Key(외부 효과 — 커밋, 푸시, 파일 쓰기 배치 — 마다 키 발급, 저널에 `EffectCommitted` 기록), Event Journal(append-only, `seq` 단조), Checkpoint(Phase/Task 완료 시 git ref + 저널 seq + 세션 ID 스냅숏), Recovery Manager(기동 시 저널 재생 → 만료 lease 회수 → 각 run의 마지막 `EffectCommitted` 이후 상태 판정). Worker Heartbeat는 lease 연장과 동일 메커니즘.
- **14 시나리오 처리**(그룹): (1·2 정상 종료) 세션 ID 저장 후 `COMPLETED`/`QUEUED` 유지. (3·4·5 비정상·강제 종료·재부팅) 재기동 시 lease 만료 → run을 `BLOCKED(recovery)`로 두고 마지막 `EffectCommitted`와 git 상태(`git status`, HEAD) 대조 → 변경 없으면 자동 resume 허용, 변경 있으면 `WAITING_APPROVAL`. (6 네트워크) 어댑터 재시도 후 `BLOCKED(network)`, 자동 재접속. (7 인증 만료) 즉시 `BLOCKED(auth)`, 재시도 0. (8 한도 초과) `BLOCKED(quota)`, 재시도 금지, 사용자 알림. (9 스킬 실패) 증거 누락이면 `VERIFYING` 통과 불가 → `REWORK`. (10 테스트 중단) 부분 로그 저장 후 `REWORK`. (11 Git 충돌) 자동 해결 금지, `WAITING_APPROVAL`. (12 세션 ID 복원 불가) Checkpoint Restore: 저널에서 handoff 문서 생성 → 새 세션. (13 부분 완료) Idempotency Key로 완료된 효과 건너뛰기, 미완료 효과만 재실행 제안. (14 승인 범위 이탈) 승인 스냅숏(파일 경로·명령 패턴) 대비 diff → 벗어나면 `WAITING_APPROVAL`.

## 6. 보안·승인·실행 제한 의견

위협 모델(5): ① 프로젝트 내 악성 지침(CLAUDE.md/AGENTS.md/README 인젝션)이 에이전트에게 외부 전송·파괴 명령 유도 ② 스킬·MCP 공급망(스크립트, hook, 원격 지시 fetch — web-design-guidelines는 매번 원격 md를 그대로 따름) ③ 에이전트가 프로젝트 외부 파일 변경 ④ 로그·저널에 토큰·비밀 유출 ⑤ 데몬 로컬 포트에 다른 로컬 프로세스 접근.

실행 계층 강제: ~~모든 외부 효과는 어댑터의 승인 요청 경로를 통과~~ **[R2-2·R4B-01에서 폐기된 R1 주장 — 승인 요청은 정책이 요구할 때만 발생하므로 다층 방어(SECURITY_MODEL §2·§3)로 대체. 원문은 기록 보존]** (Claude `canUseTool`, Codex app-server requestApproval)하고 `ApprovalBroker`가 정책 평가. 추가로 어댑터 샌드박스 옵션을 앱이 설정(Codex `sandboxPolicy` workspace-write + 쓰기 루트 = 프로젝트 worktree; Claude `--add-dir`·permission mode). 데몬 RPC는 localhost + 1회성 토큰(keyring 저장). 로그는 저널 저장 전 비밀 마스킹 필터 통과.

| 제한 항목 | 의견 | 이유 |
|---|---|---|
| 작업 최대 120분 | 유지, **승인 대기 시간 제외** | 승인 대기는 사람의 시간 |
| 에이전트 호출 20분 | 유지, 턴 단위로 계산 | app-server 턴 단위와 일치 |
| 리뷰·수정 3회 | 유지 | — |
| 인프라 재시도 2회 | 유지, 단 **인증·한도 오류는 0회** | 재시도가 의미 없음 |
| 프로젝트별 동시 수정 1개 | **worktree당 1개**로 재정의 | 다른 worktree는 충돌 없음 |
| 자동 Push/Merge/Deploy 금지 | 유지(정책 기본값, 사용자 명시 허용 가능) | — |
| 인증 실패 중단 | 유지 | — |
| 한도 초과 중단 | 유지 + `account/rateLimits/read`로 사전 경고 | Codex는 레이트리밋 조회 가능 |
| 불확실 복구 자동 재실행 금지 | 유지 | §5 Recovery Manager |

비용: Claude는 `total_cost_usd`(추정, "Do not bill end users" 경고 표기), Codex는 토큰 5종만 → 1차 한도는 **토큰·호출 수·시간**으로 두고 금액은 선택적 단가표(사용자 입력) 기반 추정.

## 7. Skills 통합 관점

- 형식: Claude `~/.claude/skills/<name>/SKILL.md`, Codex `$CODEX_HOME/skills/<name>/SKILL.md` + `agents/openai.yaml`(`allow_implicit_invocation`). mattpocock 17개는 이미 `agents/openai.yaml`을 포함해 두 형식을 겸한다(skill_analysis_part1). 9개는 `disable-model-invocation`/`allow_implicit_invocation: false`로 **사용자 전용** → 라우터가 자동 선택하면 안 된다.
- Codex로 복사 시 깨질 것: hooks 설치형(git-guardrails-claude-code, impeccable hooks), Claude 서브에이전트 전제(cavecrew, subagent-driven-development의 Task 도구 가정), Skill 도구 참조(grill-me 등의 "Skill 도구로 grilling 호출"), 미설치 참조(grilling, domain-modeling, setup-matt-pocock-skills, orca-cli).
- 실행 증거: 프롬프트 텍스트 아님. Claude는 stream-json의 `Skill` 도구 호출 `tool_use` 블록(스킬명·경로), Codex는 app-server `item/*`에서 스킬 파일 읽기(`command_execution`/`file_change`에 SKILL.md 경로) 또는 스킬 로드 이벤트(존재 여부 UNVERIFIED)를 증거로 저널에 기록. 산출물(파일·테스트)과 연결되지 않으면 `VERIFYING` 실패.
- 라우팅 원칙: Task 유형 → 주도 스킬 1개 명시 호출(`/name`), 자동 트리거 비의존. superpowers `using-superpowers` 라우터와 mattpocock 자동 트리거 경쟁은 Phase 00에서 재현.

## 8. Phase 순서 제안

| 순서 | Phase(원번호) | 변경 | 이유 |
|---|---|---|---|
| 1 | 00 환경·기술 검증 | 스파이크 6개 고정 | §9 위험 제거 |
| 2 | 01 골격·Desktop Shell | **+데몬 골격·RPC 포함** | C 구조의 뼈대 |
| 3 | 02 Agent Gateway | Claude SDK·Codex app-server 어댑터 | 모든 기능의 선행 |
| 4 | 04 Orchestrator·영속 큐 | **03보다 앞으로** | 채팅 UI가 저널 이벤트를 구독해야 함 |
| 5 | 03 실시간 Chat Workspace | 승인 UI 포함 | MVP 핵심 UX |
| 6 | 05 Session Manager·Recovery | | MVP 완료 조건 |
| 7 | 06 Project/Phase Manager | | V1 |
| 8 | 07 Skills Registry·Router·Evidence·MCP | | V1 |
| 9 | 09 Multi-Agent Collaboration | **08보다 앞으로** | 제품 핵심 가치 |
| 10 | 08 IDE·Git·Terminal·Preview | 편집기·터미널은 V1, 미리보기 V2 | |
| 11 | 10 Security·Reliability·CI·비용 | 횡단 과제지만 하드닝 Phase 유지 | |
| 12 | 11 패키징·업데이트·릴리스 | mac/Linux 포함 | |
| 13 | 12 장기 기억·동적 역할·고도화 | | V2 |

Phase 00 스파이크: ① Codex app-server stdio로 start→approval→interrupt→resume 왕복 ② Claude Agent SDK + 사용자 CLI(`pathToClaudeCodeExecutable`)로 `canUseTool`·streaming input·`interrupt()` 확인, 그리고 **인증·약관 확인** ③ Electron + better-sqlite3 + node-pty 리빌드·패키징 ④ Windows에서 detached Node 데몬 → 창 닫기 → 재기동 재접속 ⑤ 스킬 트리거 경쟁 재현(using-superpowers vs mattpocock) ⑥ `codex app-server generate-json-schema` CI 고정.

MVP(Windows): Shell+데몬, Claude Mode·Codex Mode 단일 에이전트 채팅, 승인 UI, 이벤트 저널, 강제 종료·재부팅 후 복구, 프로젝트 목록, Diff 뷰어, 스킬 증거 로그(수동 선택).
V1: Auto/Manual Collaboration, Phase Manager, Skills 라우터·충돌 감지, Monaco·xterm, mac/Linux 빌드, 자동 업데이트, 비용 토큰 한도.
V2: 브라우저 미리보기·자동화, 다중 창, 컨텍스트 압축, OS 서비스 데몬, 금액 추정, 장기 기억.

## 9. UNVERIFIED 목록과 Codex에게 묻는 질문

UNVERIFIED: (1) Claude Agent SDK를 사용자 로컬 Claude Code 구독 인증으로 구동하는 것의 약관 허용 범위(문서는 "third party … claude.ai login" 금지) (2) Codex app-server를 제3자 데스크톱 앱이 ChatGPT 로그인으로 쓰는 것의 허용 여부 (3) app-server 재접속 후 재구독 절차 (4) Codex 스킬 로드 이벤트의 존재 (5) `@napi-rs/keyring` OS 백엔드 범위 (6) Electron 설치 크기·메모리 수치 (7) Windows detached Node 데몬의 콘솔·종료 동작.

Codex에게: ① app-server를 제3자 앱이 장기 구동할 때의 안정성·버전 정책은? exec 기반으로 승인 없는 작업만 하는 제한 모드가 현실적 대안인가? ② 승인 요청(`requestApproval`)을 수 분~수 시간 보류해도 턴이 유지되는가? ③ `thread/fork`의 `lastTurnId`·`ephemeral` 의미와 세션 저장 영향은? ④ Codex가 스킬을 실제 로드했음을 app-server 이벤트로 확인할 수 있는가? ⑤ 단일 TypeScript·Electron·Hybrid C에 반대하는 근거가 있는가? ⑥ 토큰만 제공되는 환경에서 비용 한도를 어떻게 설계하겠는가?
