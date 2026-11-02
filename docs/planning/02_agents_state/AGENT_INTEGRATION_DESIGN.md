# AGENT_INTEGRATION_DESIGN — Claude Code · Codex 어댑터 설계

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 요구사항 | REQ-MODE-01·02, REQ-CE-08·10, REQ-WS-01·09, REQ-SEC-05, REQ-SM-01~05, REQ-OPS-02 |
| 관련 | ADR-0006, SECURITY_MODEL §2(승인 매트릭스·보장 수준), DATABASE_SCHEMA §2.1(이벤트 목록) |
| 공식 조사 | `archive/evidence/research/RESEARCH_AGENT_GATEWAY.md`, Codex 0.166.0 v2 스키마 `archive/evidence/codex_0.166.0_v2_schema_excerpt.json` |
| UNVERIFIED | 승인 장시간 보류, skill 입력 실제 주입, app-server 재구독, SDK `mcpServers` 완전 배제, Windows SIGINT, `thread/tokenUsage/updated` 증분·누적 의미, SDK 0.3.316 `forkSession(…,{upToMessageId})`, `thread/queue/add` experimental opt-in 거부 동작, 헤드리스 경로의 Desktop 번들 플러그인·synced 스킬 로드(§7) — 해소 Task는 OPEN_ISSUES_AND_RISKS §2 |

## 1. Gateway 인터페이스 (깊은 모듈)

```ts
interface AgentGateway {
  capabilities(agent: 'claude'|'codex'): Promise<Capabilities>;          // 버전·기능 감지
  startRun(spec: RunSpec): Promise<RunHandle>;                            // 새 세션 또는 resume/fork
  listSessions(agent, filter: {projectDir?, includeArchived?}): Promise<SessionInfo[]>;
  readSession(ref: SessionRef): Promise<SessionTranscript>;               // Replay용
}
interface RunHandle {
  readonly runId: string; readonly sessionRef: SessionRef;
  events(): AsyncIterable<GatewayEvent>;
  steer(text: string): Promise<SteerResult>;        // 'applied_to_turn' | 'queued_next_turn'
  // respond: 승인·질문·elicitation 공통 응답(단일 서명). answer는 요청 종류별 판별 합집합
  // respond(requestId, answer: {kind:'approval', decision:'accept'|'decline'|'cancel', permissions?} | {kind:'user_input', answers} | {kind:'elicitation', action:'accept'|'decline'|'cancel', content?})
  interrupt(): Promise<void>;
  respond(requestId: string, answer: ApprovalAnswer | UserInputAnswer | ElicitationAnswer): Promise<void>;
  close(): Promise<void>;
}
type RunSpec = { agent; projectDir; worktreeDir; mode: 'new'|'resume'|'fork'; sessionRef?; forkAt?;
                 prompt: PromptInput[]; policy: AgentPolicy; skills: SkillRef[]; mcp: McpAllowlist; authMode };
```

### 공통 이벤트 10종

| 이벤트 | 필수 필드 | Claude 원본 | Codex 원본 |
|---|---|---|---|
| `message_delta` | runId, seq, ts, agent, itemKey, text | `stream_event.text_delta` | `item/agentMessage/delta` |
| `item_started` | kind(`message|tool|file_change|mcp|web_search|plan|reasoning|compaction|review`), itemKey, summary | `assistant.tool_use` 블록 시작, `content_block_start` | `item/started` |
| `item_updated` | itemKey, progress | `tool_progress`, `input_json_delta` | `item/commandExecution/outputDelta`, `item/fileChange/patchUpdated`, `item/mcpToolCall/progress` |
| `item_finished` | itemKey, status, result 요약 | `user.tool_result`, `content_block_stop` | `item/completed` |
| `approval_requested` | requestId, category, request(원문), itemKey, **permissions·scope**(Codex `permissions` 요청은 부분 집합 승인 가능) | `canUseTool(toolName, input)` | `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval` |
| `user_input_requested` | requestId, questions[], itemKey — 응답은 **답변 텍스트**(accept/decline 아님) | `AskUserQuestion` 도구 호출(canUseTool 경유) | `item/tool/requestUserInput` |
| `mcp_elicitation_requested` | requestId, serverName, mode(form\|url), schema — 응답은 **양식 값 또는 URL 확인** | SDK MCP elicitation(UNVERIFIED) | `mcpServer/elicitation/request` |
| `usage_updated` | tokens{input, cached_input, cache_write, output, reasoning}, cost_estimate_usd?, turnKey | `message.usage`, `result.total_cost_usd/modelUsage` | **`thread/tokenUsage/updated`**(turn 상관). `turn/completed`에는 `usage` 필드가 없음(0.166.0 `TurnCompletedNotification{thread_id, turn}`) |
| `turn_finished` | status(`completed|failed|interrupted|denied`), turnKey | `result`(subtype) | `turn/completed{status}` |
| `fault` | class(`auth|quota|transport|upstream_http|overload|protocol|internal`), retryable, native | `system/api_retry`, `SDKRateLimitEvent`, `error_during_execution` | `error{codexErrorInfo}`: `HttpConnectionFailed`·`ResponseStreamDisconnected`→transport, 4xx/5xx→upstream_http(상태코드별), `-32001`→**overload**(WebSocket ingress 큐 포화; stdio 전송에서는 네트워크 단절 신호가 아님) |

모든 이벤트에 `native: {schemaVersion, payloadRef}`로 원본 보존(저널 별도 테이블 또는 payload 내). Codex `threadId/turnId/itemId`, Claude `parent_tool_use_id/permission_denials`는 `native`에만.

## 2. ClaudeSdkAdapter

| 항목 | 설계 |
|---|---|
| 라이브러리 | `@anthropic-ai/claude-agent-sdk`(TS) 0.3.N, `pathToClaudeCodeExecutable` = 사용자 설치 CLI(감지·검증). SDK↔CLI parity 확인(`claude_code_version`, `system/init.capabilities`) |
| 모드 | streaming input(`query({prompt: AsyncIterable})`) — `interrupt()`·큐잉·`canUseTool` 모두 이 모드에서만 완전 |
| 권한 설정 | **기본값** `permissionMode: "default"`, 부작용 도구 자동 allow 규칙 없음, `canUseTool` 콜백 → ApprovalBroker, **`PreToolUse` hook으로 모든 호출 관찰·차단 검사**(자동 허용 도구도 통과), `--permission-prompts host` 상당. **프로젝트별 사용자 선택**으로 CLI가 제공하는 전 모드(`plan`, `default`, `acceptEdits`, `auto`, `bypassPermissions`) 노출 — `plan`은 PLANNING 상태 기본, `auto/acceptEdits/bypass`는 프로젝트별 옵트인(U8: 모든 공급자·OS·격리 조합에서 켤 수 있고 기본은 승인 모드; 격리 미확인 조합은 활성 시 1회 확인) + 경고 배지 + 앱 전용 실행기·사후 diff 감사 유지 |
| 세션 | `resume`, `forkSession`(옵션: 현재 끝 분기), `forkSession(sessionId,{upToMessageId})`(공식 레퍼런스에 존재 → `RunSpec.forkAt`을 메시지 UUID에 매핑; 0.3.316 동작은 P00 확인, 미지원 시 UI에 분기 지점 제한 표시), `listSessions/getSessionInfo/getSessionMessages`(공식). jsonl 직접 파싱 금지 |
| 추가 지시 | streaming input 큐 → `SteerResult='queued_next_turn'` |
| 중단 | `interrupt()`(receipt capability 확인), 강제는 `close()`/`abortController` |
| MCP | `mcpServers` 옵션 + 프로젝트 allowlist. 기존 사용자 MCP 완전 배제 조합 UNVERIFIED → Phase 00 |
| 인증 모드 | **설치된 Claude CLI 로그인 재사용(기본, U1; 약관 책임은 사용자, ADR-0007)** / `ANTHROPIC_API_KEY`(선택, 전환 경로 R21) |
| fallback | `claude -p --input-format stream-json --output-format stream-json --permission-mode default --permission-prompts host --strict-mcp-config --mcp-config <app> --permission-prompt-tool mcp__agentstudio__approve` — "축소 어댑터"로 표시 |

## 3. CodexAppServerAdapter

| 항목 | 설계 |
|---|---|
| 전송 | `codex app-server`(stdio JSONL JSON-RPC) 프로세스를 데몬이 소유. `initialize`→`initialized`. 스키마는 `generate-json-schema` 산출물을 `packages/protocol`에 고정(CI diff) |
| 턴 | `thread/start|resume|fork` → `turn/start{input, approvalPolicy:"on-request", sandboxPolicy, cwd}`(app-server v2·config.toml·CLI 모두 `on-request`; `sandboxPolicy.type`만 camelCase `readOnly`/`workspaceWrite`/`dangerFullAccess` — 설치본 0.166.0 `generate-json-schema` v2 스키마 기준). **`--approve-for-me`·우회 금지, `acceptForSession` 기본 UI 제외** |
| 샌드박스·승인 모드 | **기본** 일반 모드: `workspaceWrite{writableRoots:[worktree]}` + `approvalPolicy:"on-request"` + **사후 diff 감사**(허용 범위 내 쓰기는 요청 없이 실행됨을 UI에 명시). 엄격 모드: `readOnly` → 패치 산출 → **앱 소유 적용기**가 승인·검증 후 적용. 플랜 모드: `readOnly`+`on-request`. **자동 모드(옵트인, U8)**: `approvalPolicy:"never"` + `workspaceWrite` — `dangerFullAccess`는 금지 유지, 샌드박스(파일·네트워크)는 approvalPolicy와 독립이라 유지됨, 고위험 효과는 사후 감사(DETECTED)로만 포착됨을 UI에 명시. **v2 `AskForApproval` 허용 값은 `"untrusted" | "on-request" | "never" | {granular:{mcp_elicitations, rules, sandbox_approval, request_permissions?, skill_approval?}}`**(설치본 0.166.0 생성 스키마) |
| 승인 | 서버→클라이언트 요청 수신 → ApprovalBroker → 요청 종류별 응답(`requestApproval`: `accept|decline|cancel`(+permissions 부분 집합); `requestUserInput`: 답변; `elicitation`: 양식/URL 확인). 보류 15분 초과 시 `decline` + `turn/interrupt`, 네이티브 요청은 소멸 → Task `BLOCKED(approval_expired)`; 사용자 복귀 시 **새 run·새 요청**으로 재개(D14) |
| 추가 지시 | `turn/steer{expectedTurnId}` → `'applied_to_turn'`; 실패 시 **앱 입력 보존**(`pending_inputs.text_enc` 암호화 원문 + 저널 `PendingInputQueued{hash}`) → 다음 `turn/start`에 복호해 **원문 그대로** 전달 → `'queued_next_turn'`(변형 없음; 저널에는 해시만). `thread/queue/add`는 **experimental**(`initialize.capabilities.experimentalApi=true` 필요, 거부 가능) → opt-in 성공 시에만 보조 경로, 큐 응답 수신을 적용 완료로 취급하지 않음 |
| 중단 | `turn/interrupt` → `interrupted` |
| 세션 | `thread/list{sourceKinds:['appServer','cli','vscode'], archived}`, `thread/read`, `thread/turns/list`, `thread/items/list`; fork는 `excludeTurns:true`. **공유 `CODEX_HOME`(U9) 시 `thread/list`는 사용자 Desktop·CLI 스레드도 반환** → 앱은 자신이 만든 thread id를 `sessions.app_owned=1`로 등록하고 기본 목록은 앱 소유만, "내 Codex 세션 가져오기"는 명시 동작 |
| 스킬 | `skills/list{cwds, forceReload}`로 노출 확인. 자율 선택(implicit)은 고유 절차 단계 관찰로 `SkillSelected`·`SkillLoadObserved` 기록; 명시·교정(explicit) 시에만 `turn/start.input`에 `{type:"text","$name …"}`+`{type:"skill",name,path}` 전송; `skills/changed` 구독 |
| 사용량 | `thread/tokenUsage/updated`(턴 ID로 상관; 누적/증분 의미는 P00 실측), `turn/completed`는 최종 `turn.status`만 사용, `account/rateLimits/read`는 **ChatGPT 로그인 한도 조회**(API key 모드 포괄 신호 아님) |
| MCP·플러그인 | 전역 `config.toml` **미수정**. **사용자 `CODEX_HOME` 공유가 기본**(U9; Desktop 번들 플러그인·시스템 스킬 imagegen·로그인·MCP 상속, §7). 앱 전용 분리 프로필은 프로젝트별 격리 옵션. 어느 쪽이든 **공유 시 의무 절차**: 기동 시 유효 설정 스냅숏(`mcp_servers`, `notify`, hooks, 플러그인 경로)을 열거해 UI에 표시·저널 기록, 변경 감지 시 다음 run 전 재확인, 사용자 설정 MCP는 프로젝트 allowlist에 명시된 것만 호출 허용(브로커 판정, 집행은 보장 수준 표 기준). 프로젝트별 MCP 추가는 `-c mcp_servers.*` 런타임 override — 기존 항목 제거 여부는 **UNVERIFIED(S9)** |
| 인증 모드 | **로컬 CLI 로그인 재사용(기본, U1; 약관 책임은 사용자)** / API key(선택, 전환 경로 R21) / SIWC(조건 확인 후) |
| fallback | `codex exec --json -s read-only -c approval_policy="never"` — **읽기 전용 조사·요약 한정**, 승인·steer·interrupt 없음을 UI에 표시 |
| 재연결 | 연결 끊김 → 재시작 → `thread/resume`(`excludeTurns:true`로 메타만) → 구독 복구. 재구독 절차 UNVERIFIED → Phase 00 |

## 4. ApprovalBroker 연동

```
어댑터 approval_requested → Broker.evaluate(category, request, projectPolicy, approvalsInEffect)
  AUTO  → 즉시 accept, 저널 ApprovalDecided{by:policy}
  DENY  → decline, Task 계속(대체 경로) 또는 CANCELLED
  ASK   → ApprovalRequested + Task WAITING_APPROVAL(실행 시간 정지)
          ├ 사용자 결정(≤15분) → 어댑터 응답
          └ 15분 초과 → 어댑터 decline + interrupt, 세션 보존, Task 즉시 BLOCKED(approval_expired)
            사용자 복귀 → effects·blob·external_ref 대조 → 완료 단계 건너뛰기 → 새 run이 새 승인 요청으로 재개
```

범주 매핑: Codex `commandExecution`(명령), `fileChange`(파일), `permissions`(네트워크·FS 권한), MCP elicitation(외부 서비스); Claude `toolName`(`Bash`, `Edit/Write`, `WebFetch`, `mcp__*`)과 입력 경로·명령 패턴으로 14행 분류(원 11영역 + 브라우저·컴퓨터 사용·외부 문서 전송, SECURITY_MODEL §2).

## 5. 기능 매트릭스 (상속 기능은 §7)

| 기능 | Claude(SDK) | Codex(app-server) | fallback 시 |
|---|---|---|---|
| 시작·스트리밍 | ✅ 토큰 델타 | ✅ 델타 | Claude CLI ✅ / Codex exec: item 단위만 |
| 세션 조회 | ✅ `listSessions` | ✅ `thread/list` | — |
| 재개·분기 | ✅ / ✅ | ✅ / ✅(턴 선택) | Codex exec resume/fork ✅ |
| 추가 지시 | 큐(다음 턴) | steer(현재 턴)+큐 | Claude CLI 큐 / Codex exec ❌ |
| 도구 관찰 | ✅ | ✅ | ✅ / ✅ |
| 승인 | ✅ canUseTool+hook | ✅ requestApproval | Claude CLI MCP tool / Codex exec ❌ |
| 취소 | ✅ interrupt | ✅ turn/interrupt | SIGINT UNVERIFIED(Win) / 프로세스 kill |
| 사용량 | 토큰+USD 추정 | 토큰 5종 | 동일 |
| 오류 복구 | api_retry·resume | -32001 백오프·resume | resume |
| 버전 | parity+capabilities | experimental, 스키마 고정 | — |

## 6. Phase 00 어댑터 스파이크

1. Codex — PHASE_BREAKDOWN·MASTER와 동일 분할: **S1a** 기본 왕복(initialize→start→`readOnly`+`on-request`→`turn/completed`; 필수 단언은 무단 변경 0, `requestApproval` 수신·accept/decline은 관찰값이며 요청이 없어도 pass; 요청 3종 응답 구조, `thread/tokenUsage/updated` 상관) / **S1b** 제어·세션(steer·interrupt·resume·fork·재연결 재구독·`thread/queue/add` opt-in 거부) / **S1c** 쓰기 범위·보류(`workspaceWrite`에서 승인 요청 **없이** 변경되는 효과 2×2 표 + 사후 diff 감사 포착, 15분 보류). S1a 통과가 S1b·S1c의 선행(둘은 병렬 가능).
2. Claude: SDK+사용자 CLI로 canUseTool·PreToolUse hook·streaming input·interrupt·listSessions; `forkSession(…,{upToMessageId})`; `mcpServers` 격리 확인; 인증 모드별 동작; 권한 모드 전 선택지 전달.
3. 양측 이벤트 녹화 → 계약 테스트 픽스처(재생은 어댑터 파싱·상태 전이 회귀용. 승인 왕복·실제 쓰기·격리·스킬 로드는 실호출 필수).
4. **S9 기능 상속 탐침**(§7): SDK에서 `~/.claude/skills/synced/*` 스킬 노출 여부, `--chrome` 상당 SDK 옵션, app-server `skills/list`·플러그인 노출, API key 모드 `image_gen` 가용성, computer-use 플러그인의 Desktop 앱 없는 기동 조건.

## 7. 상속·보충 기능 (REQ-CAP-01~09)

원칙 — **최대 통과 + 3단 보충**: (1) 에이전트 런타임이 헤드리스에서 제공하는 도구·스킬·플러그인·MCP는 재구현 없이 그대로 노출 (2) 헤드리스에 없는 기능은 **Agent Studio MCP 도구 서버**가 양쪽 에이전트에 제공(REQ-CAP-08, V1) (3) 그래도 없는 작업은 LLM이 Bash/Python 스크립트로 수행. 통과 조건 = 인증 모드(CLI 로그인 재사용 기본, U1), `CODEX_HOME` 공유(기본, U9), SDK `settingSources`.

**판정 규칙**: 원칙은 "불가로 닫기 전에 2·3단을 시도한다"는 뜻이며 능력 보증이 아니다. 각 CAP 행은 S9에서 `supported / conditional / unsupported` 중 하나로 **판정**됐다(2026-11-02, `docs/spikes/S9.md` §1 — 18행, 픽스처 `spikes/fixtures/s9-capabilities-results.json`); 아래 표의 "상태" 열이 그 판정이고, `conditional`의 조건은 같은 행에 적는다. 내장 파일 도구(Claude Read/Edit/Write, Codex 파일·명령 도구)는 공식 문서와 S9 (f) 실측으로 `supported`다. 목록 발견(`skills/list`·플러그인 등록)은 실행 증거가 아니며, S9는 `발견 → 기동 → 실제 작업 → 산출물` 4단계 중 어디까지 도달했는지 기록한다. **3단 제한**: 라이브러리 설치는 의존성 설치 영역(ALWAYS_ASK, 앱 설치 실행기)으로만; 마우스·키보드 등 OS 입력 제어는 3단 스크립트로 수행 **금지**(앱 MCP 도구 서버 전용 capability); 3단으로 생성한 문서·이미지의 증거는 형식 검증(파서 재열기)·렌더 검사·해시로 기록(EVIDENCE_SPEC 산출물 증거 행). **MCP 기동 판정**: MCP의 `started`는 목록 등장이 아니라 핸드셰이크 완료·도구 노출 >0·오류 없음으로 판정한다(S9 리뷰 #3). **발견 목록의 불안정성**: `mcpServerStatus/list`·`skills/list`·Claude `system/init.mcp_servers`는 initialize 직후 불완전하거나 실행마다 달라질 수 있다 — 유효 설정 스냅숏(P02 T2)은 집합이 안정될 때까지 폴링하고 실행 간 차이를 저널에 남긴다(V36).

| REQ | 기능 | Claude 경로 | Codex 경로 | 1단/2단/3단 | 릴리스 | 상태 |
|---|---|---|---|---|---|---|
| CAP-01 | 플랜 모드 | `permissionMode:'plan'`(SDK 옵션 실측 ✓ S2; **앱의 ExitPlanMode 거부가 전제** — 승인 시 모델이 쓰기) | `sandboxPolicy.readOnly`+`on-request`(S1a·S1c 실측 ✓: 읽기 명령 승인 없이 실행, 쓰기는 승인 요청) | 1단 | MVP-Core | **supported / supported**(S9) |
| CAP-02 | 자동 권한 모드 | `acceptEdits`/`bypassPermissions` 등 SDK 전달 실측 ✓(S2); native 격리는 §2.1 POLICY_ONLY → 경고 배지 + 활성 시 1회 확인 | `approvalPolicy:'never'`(+ 샌드박스 유지) — ENFORCED 영역(작업 공간·TEMP 밖 쓰기, 외부 호스트)과 DETECTED 영역(TEMP 상위, loopback)은 §2.1 | 1단(옵트인, U8: 모든 조합) | MVP-Core | **conditional(Claude, 배지) / supported(Codex)**(S9·S4) |
| CAP-03 | 파일 생성·편집, 문서 읽기(PDF·이미지) | 내장 Read/Edit/Write **supported**; PDF `pages`·이미지 읽기는 **미실측(V1)** | 내장 파일·명령 도구 **supported**; `pdf@openai-primary-runtime` 플러그인은 노출만 확인(실행 V1) | 1단(일반 파일 확정) | MVP-Core(내장) / V1(플러그인) | **conditional / conditional**(S9 — 일반 파일 supported, PDF·이미지는 V1) |
| CAP-04 | 문서 생성(docx/xlsx/pptx/pdf) | synced 스킬 `{pdf,docx,xlsx,pptx,docs}` 노출 ✓(`settingSources` 기본; `[]`면 미노출) — 실행 미실측 → 3단 python-docx/openpyxl/reportlab(설치 승인) | `documents@openai-primary-runtime`로 **DOCX 산출물 재현 ✓**(S9 4차 977B, zip+`word/document.xml` 검증; 조건: 플러그인 + ChatGPT 로그인 + 공유 홈, 단일 DOCX만) | 1단(조건) → 3단 | V1 | **conditional / conditional(산출물 ✓)**(S9) |
| CAP-05 | 이미지 생성·편집 | **unsupported(1단)** — 생성 도구 없음(실측) → Codex 라우팅 또는 2단 API; 편집은 3단 Pillow | ChatGPT 로그인 모드 **PNG 산출물 ✓**(S9 4차 2,877B, v2 아이템 `imageGeneration` — 어댑터 매핑 V38); API key 모드 **미실측** | 1단(Codex) / 2단(Claude) | V1 | **unsupported / conditional**(S9) |
| CAP-06 | 브라우저 자동화 | `extraArgs {chrome:null}` → `mcp__claude-in-chrome__*` 22개 노출·`claude-in-chrome` connected ✓(확장 전제; **탭 조작 미실측**) | `browser@openai-bundled`·`chrome@openai-bundled` 설치·활성 ✓(헤드리스 호출 미실측) | 1단(조건) → 2단(agent-browser, 확장 없는 환경 보충) | V1(P10b T9 비교) | **conditional / conditional**(S9) |
| CAP-07 | 컴퓨터 사용 | 헤드리스 1단 도구 **없음(실측)** → 2단 | `cua_repl` 노출은 **Desktop 앱 실행 중** 관찰 — 앱 미실행 1단 가용성 **미판정**(V39 재실측 후 확정) | 2단 **전용**(3단 스크립트 금지) — **제품 정책이며 실측 결론 아님** | V1 조건부 | **conditional / conditional(미판정)**(S9); 캡처·입력 분리 승인 |
| CAP-08 | Agent Studio MCP 도구 서버 | `mcpServers` 주입 ✓(S2) | `-c mcp_servers.<name>={command,args}` 추가 ✓ + 실제 stdio 서버 핸드셰이크·도구 노출 ✓(S9 `s9_probe` tools=1); **V31: 추가만 가능, 공유 홈 서버 제거 불가** → 격리 집행자는 분리 `CODEX_HOME` | 2단 | V1(P10b T9) | 범위 입력 = S9.md §5(C9); 도구 서버의 OS별 실행·거부 시험은 TEST-SE-10 |
| CAP-09 | Codex `CODEX_HOME` 공유(U9) | (대응물 `settingSources`: `[]`면 스킬 89→19·플러그인 5→3·MCP 13→0) | 공유 시 상속 **실측**: system·user·플러그인 스킬, 플러그인 25, MCP 7(config 1 + 앱/원격 6), config layers, `notify`(array), 로그인(턴 실행으로 간접); 분리 홈 = system 스킬 5·`notify` null·PATH alias 거부(TEMP 아래). **미실측**: 세션 목록 비교·분리 홈 로그인 턴(V37). 의무 절차는 §3 MCP 행 | 1단 | MVP-Core | **conditional(Codex) — 공유 기본**(S9) |

보안: CAP-06·07·08과 외부 문서 서비스 전송(google-workspace)은 SECURITY_MODEL §2 승인 매트릭스에 영역 추가(기본 ASK, 자동 모드에서도 앱 실행기 경유).

갱신 이력: 2026-11-02 S9 판정 반영(P00 2차 승인 #11, `docs/spikes/S9.md` §3 제안 diff 적용). CAP-07 Codex 1단과 CAP-05 API key 모드는 재실측(V39·S9(d)) 후 다시 갱신한다.
