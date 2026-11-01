# Agent Gateway 조사: Claude Code / Codex 프로그램 구동 인터페이스 확인

## 1. 조사 개요

| 항목 | 내용 |
| --- | --- |
| 조사일 | 2026-11-01 |
| 목적 | Agent Studio(데스크톱 앱)가 Claude Code와 OpenAI Codex를 프로그램적으로 구동할 때, 12개 기능을 각 에이전트가 **공식적으로** 어떤 인터페이스로 지원하는지 1차 출처로 확인 |
| 조사 범위 | A. Claude Code CLI / Claude Agent SDK(TS·Python)  B. Codex CLI(`exec`) / `@openai/codex-sdk` / Codex app-server 프로토콜  C. §9.7 협업 도구 4종 실재 확인 |
| 출처 원칙 | 공식 문서(code.claude.com, learn.chatgpt.com), 공식 GitHub 저장소 소스, npm README, 로컬 `--help` 출력, 로컬 생성 JSON Schema만 사용. 블로그·요약글 불사용. 추측 금지 |

### 1.1 로컬 확인 버전 (2026-11-01, 읽기 전용 명령)

```
> claude --version
2.1.316 (Claude Code)
> codex --version
codex-cli 0.166.0
> node --version
v24.21.0
> npm view @anthropic-ai/claude-agent-sdk version
0.3.316
> npm view @openai/codex-sdk version
0.166.0
> npm view @openai/codex version
0.166.0
```

### 1.2 출처 URL 메모

- `https://platform.claude.com/docs/en/agent-sdk/*` 는 전부 `https://code.claude.com/docs/en/agent-sdk/*` 로 **307 리다이렉트**됨(2026-11-01 확인). 아래 인용은 리다이렉트 후 페이지 기준.
- `https://developers.openai.com/codex/*` 는 전부 `https://learn.chatgpt.com/docs/*` 로 **308 리다이렉트**됨. 예: `/codex/app-server` → `/docs/app-server`, `/codex/sdk` → `/docs/codex-sdk`, `/codex/noninteractive` → `/docs/non-interactive-mode`, `/codex/cli/reference` → `/docs/developer-commands?surface=cli`, `/codex/config-reference` → `/docs/config-file/config-reference`.
- Codex app-server JSON Schema는 `codex app-server generate-json-schema --out <DIR> --experimental` 로 임시 폴더 `C:\Users\<user>\AppData\Local\Temp\claude\D--LLM\2d4ffb56-43e2-47e4-a372-04678d48ab6e\scratchpad\codex-schema\` 에만 생성(루트 46개 파일 + `v1/`, `v2/`(420개 파일)). 프로젝트 폴더에는 복사하지 않음.
- 개인 세션 파일(`~/.claude/projects/**`, `~/.codex/sessions/**`)은 열지 않았음.

---

## 2. 기능 매트릭스 (12 × 5)

셀 값: `SUPPORTED(인터페이스)` / `PARTIAL` / `UNSUPPORTED` / `UNVERIFIED`. 각 셀의 근거는 §3에 있음.

| # | 기능 | Claude Code CLI (`claude -p`) | Claude Agent SDK (TS 0.3.x / Py 0.2.x) | Codex CLI (`codex exec`) | Codex SDK (`@openai/codex-sdk`) | Codex app-server (JSON-RPC) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 대화 시작 | SUPPORTED(`claude -p "<prompt>" --output-format json\|stream-json`, `--session-id <uuid>`) | SUPPORTED(`query({prompt, options})`; Py `ClaudeSDKClient.query()`) | SUPPORTED(`codex exec [PROMPT] --json`) | SUPPORTED(`new Codex().startThread().run()/runStreamed()`) | SUPPORTED(`initialize` → `thread/start` → `turn/start`) |
| 2 | 메시지 스트리밍 | SUPPORTED(`--output-format stream-json --verbose --include-partial-messages` → `stream_event`/`text_delta`) | SUPPORTED(`includePartialMessages` / `include_partial_messages` → `stream_event`/`StreamEvent`) | PARTIAL(`--json` JSONL은 `item.started/updated/completed` 단위; 토큰 델타 이벤트 없음) | PARTIAL(`runStreamed()` = 동일 JSONL 이벤트; 토큰 델타 없음) | SUPPORTED(`item/agentMessage/delta`, `item/reasoning/textDelta`, `item/commandExecution/outputDelta`) |
| 3 | 세션 조회/목록 | PARTIAL(`claude agents --json` = 실행 중 세션만; 과거 세션 목록용 비대화식 명령 없음) | SUPPORTED(`listSessions()`, `getSessionInfo()`, `getSessionMessages()` / Py `list_sessions()`, `get_session_info()`, `get_session_messages()`) | PARTIAL(`codex exec resume --last/--all` 선택만; 목록 출력 명령 없음) | UNSUPPORTED(목록 API 없음; `threadId` 보관은 호출자 책임) | SUPPORTED(`thread/list`, `thread/read`, `thread/turns/list`, `thread/items/list`, `thread/loaded/list`) |
| 4 | 세션 재개 | SUPPORTED(`--resume <id\|name\|transcript-path>`, `--continue`) | SUPPORTED(`resume`, `continue`/`continue_conversation`, `resumeSessionAt`) | SUPPORTED(`codex exec resume [SESSION_ID\|--last] [PROMPT] --json`) | SUPPORTED(`codex.resumeThread(threadId)`) | SUPPORTED(`thread/resume`) |
| 5 | 세션 분기(fork) | SUPPORTED(`--resume <id> --fork-session`) | SUPPORTED(`resume` + `forkSession: true` / `fork_session=True`) | SUPPORTED(`codex exec fork <SESSION_ID> [PROMPT]`) | UNSUPPORTED(fork API 없음) | SUPPORTED(`thread/fork` {threadId, lastTurnId, excludeTurns, ephemeral}) |
| 6 | 실행 중 추가 지시(steer/queue) | SUPPORTED(`--input-format stream-json` 로 stdin에 user 메시지 추가 → 큐잉 후 순차 처리) | SUPPORTED(streaming input: `query({prompt: AsyncIterable})`, `streamInput()`; Py `ClaudeSDKClient.query()` 반복) | UNSUPPORTED(exec는 프롬프트 1회 입력 후 종료) | UNSUPPORTED(`run()` 직렬 호출만) | SUPPORTED(`turn/steer` {threadId, expectedTurnId, input}; `thread/queue/add\|list\|update\|delete\|reorder\|start`) |
| 7 | 도구 호출 이벤트 관찰 | SUPPORTED(stream-json `assistant.tool_use` / `user.tool_result` 블록, `tool_progress`, `--include-hook-events`) | SUPPORTED(`PreToolUse`/`PostToolUse`/`PostToolUseFailure` hooks, `SDKToolProgressMessage`, `SDKToolUseSummaryMessage`) | SUPPORTED(`item.*` 이벤트의 item type `command_execution`, `file_change`, `mcp_tool_call`, `web_search`, `collab_tool_call`) | SUPPORTED(동일 이벤트, `runStreamed()`) | SUPPORTED(`item/started`, `item/completed`, `item/commandExecution/outputDelta`, `item/fileChange/patchUpdated`, `item/mcpToolCall/progress`) |
| 8 | 승인 요청 수신·응답 | SUPPORTED(`--permission-prompt-tool mcp__<server>__<tool>`; `--permission-prompts host\|none`; `PermissionRequest` hook) | SUPPORTED(`canUseTool`/`can_use_tool` → `{behavior:'allow'\|'deny', updatedInput, updatedPermissions}`; `PreToolUse` hook `permissionDecision`) | UNSUPPORTED(승인 수신 채널 없음; 정책 사전결정만: `-a never\|on-request`, `--sandbox`, `--approve-for-me`) | UNSUPPORTED(`approvalPolicy` 옵션만, 콜백 없음) | SUPPORTED(서버→클라이언트 요청 `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, `item/tool/requestUserInput`, `mcpServer/elicitation/request`; decision `accept\|acceptForSession\|decline\|cancel`) |
| 9 | 실행 취소/중단 | PARTIAL(SIGINT → 턴 종료, SIGTERM → exit 143·턴 미완료; stream-json 제어 메시지는 SDK 경로로만 문서화) | SUPPORTED(`interrupt()`(streaming 모드), `abortController`, `close()`; capability `interrupt_receipt_v1`, `interrupt_cancel_queued_v1`) | PARTIAL(프로세스 종료 외 문서화된 경로 없음) | SUPPORTED(`TurnOptions.signal: AbortSignal` → `spawn({signal})`; 소스 근거) | SUPPORTED(`turn/interrupt` {threadId, turnId} → `turn/completed` status `interrupted`) |
| 10 | 사용량·토큰·비용 조회 | SUPPORTED(`result.total_cost_usd`, `usage`, `modelUsage`, `duration_ms`, `num_turns`; `--max-budget-usd`) | SUPPORTED(`SDKResultMessage.total_cost_usd/usage/modelUsage`, per-step `message.usage`, `maxBudgetUsd`) | PARTIAL(`turn.completed.usage` 토큰 5종; USD 비용 없음) | PARTIAL(동일 `usage`; USD 비용 없음) | PARTIAL(`thread/tokenUsage/updated`, `account/rateLimits/read`, `account/usage/read`; USD 비용 없음) |
| 11 | 오류 복구(재연결·재시도) | SUPPORTED(`system/api_retry` 이벤트, `--fallback-model`, `--resume`, `CLAUDE_CODE_RESUME_INTERRUPTED_TURN=1`, 종료 코드) | SUPPORTED(`SDKAPIRetryMessage`, `SDKRateLimitEvent`, `error_during_execution` result, `reinitialize()`, `AbortError`) | PARTIAL(config `request_max_retries`=4, `stream_max_retries`=5, `stream_idle_timeout_ms`=300000; `turn.failed`/`error` 이벤트; 재개는 `exec resume`) | PARTIAL(비정상 종료 시 `Codex Exec exited with …` throw; `resumeThread()`로 재개) | PARTIAL(`-32001 Server overloaded; retry later` + 지수 백오프 권고; `codexErrorInfo` 분류; 재연결 후 `thread/resume`; 명시적 재연결 절차는 UNVERIFIED) |
| 12 | CLI/SDK 버전 호환성 정책 | PARTIAL(기능별 "Requires Claude Code vX.Y.Z or later" 표기; `system/init.capabilities` 기반 기능 감지 권고; 공식 지원기간/SemVer 정책 문서는 UNVERIFIED) | PARTIAL(릴리스마다 "Updated to parity with Claude Code v2.1.N" — 0.3.N ↔ 2.1.N; `package.json.claudeCodeVersion`; `pathToClaudeCodeExecutable`) | PARTIAL(Feature maturity 라벨 Experimental/Beta/Stable/Deprecated; `--strict-config`; `--json`은 `--experimental-json` 별칭) | PARTIAL(SDK가 `@openai/codex` 플랫폼 패키지의 번들 바이너리를 호출; 버전 동일(0.166.0); 호환 정책 명문화 없음) | PARTIAL(app-server 전체 "experimental", "may change without notice"; v1/v2 스키마 분리; `experimentalApi` capability; 누락 필드 허용 권고) |

---

## 3. 기능별 상세 (근거 인용)

인용문은 2026-11-01 기준 페이지/소스/명령 출력에서 가져온 원문이다.

### 3.1 대화 시작

**Claude Code CLI**
- `claude --help` (2.1.316):
  ```
  -p, --print                           Print response and exit (useful for pipes). ...
  --output-format <format>              Output format (only works with --print):
                                        "text" (default), "json" (single
                                        result), or "stream-json" (realtime
                                        streaming) (choices: "text", "json",
                                        "stream-json")
  --session-id <uuid>                   Use a specific session ID for the
                                        conversation (must be a valid UUID)
  ```
- headless 문서: "To run Claude Code in non-interactive mode, pass `-p` with your prompt and the CLI options you need" — https://code.claude.com/docs/en/headless
- 동 문서: "Claude Code rejects `--bg`, and rejects `--cloud` with a task description, with an error naming the conflict" (`-p`와 `--bg` 동시 사용 불가).

**Claude Agent SDK**
- overview: "The Agent SDK gives you the same tools, agent loop, and context management that power Claude Code, programmable in Python and TypeScript." / "A library that runs the Claude Code binary" — https://code.claude.com/docs/en/agent-sdk/overview
- sessions: "Python: `ClaudeSDKClient` handles session IDs internally. Each call to `client.query()` automatically continues the same session." / "The TypeScript SDK doesn't have a session-holding client object like Python's `ClaudeSDKClient`. Instead, pass `continue: true` on each subsequent `query()` call" — https://code.claude.com/docs/en/agent-sdk/sessions
- sessions: "The experimental V2 session API, which provided `createSession()` with a `send` / `stream` pattern, was removed in TypeScript Agent SDK 0.3.142."

**Codex CLI (exec)**
- `codex exec --help` (0.166.0): `Usage: codex exec [OPTIONS] [PROMPT]` / `[PROMPT] Initial instructions for the agent. If not provided as an argument (or if `-` is used), instructions are read from stdin.` / `--json  Print events to stdout as JSONL`
- non-interactive 문서: "By default, `codex exec` runs in a read-only sandbox." — https://learn.chatgpt.com/docs/non-interactive-mode

**Codex SDK**
- npm README(`npm view @openai/codex-sdk readme`): "The TypeScript SDK wraps the `codex` CLI from `@openai/codex`. It spawns the CLI and exchanges JSONL events over stdin/stdout." / "Requires Node.js 18+." / `const codex = new Codex(); const thread = codex.startThread(); const turn = await thread.run("...");`
- 소스 `sdk/typescript/src/exec.ts`: 기본 인자 `"exec", "--experimental-json"`; 프롬프트는 자식 stdin에 쓰고 닫음 — https://raw.githubusercontent.com/openai/codex/main/sdk/typescript/src/exec.ts

**Codex app-server**
- app-server 문서: "Send one `initialize` request per connection, then the `initialized` notification." / "Requests before the handshake get a `Not initialized` error." / `thread/start`: "create a new thread; emits `thread/started`." / Threads: `thread/start`, `thread/resume`, `thread/fork`, `thread/read`, `thread/list`, … Turns: `turn/start`, `turn/steer`, `turn/interrupt` — https://learn.chatgpt.com/docs/app-server
- 전송: "`stdio://` is the default and uses newline-delimited JSON (JSONL)." / "`ws://IP:PORT` is WebSocket, described as 'experimental and unsupported'"
- `codex app-server --help`: `--listen <URL>  Transport endpoint URL. Supported values: stdio:// (default), unix://, unix://PATH, ws://IP:PORT, off`
- 로컬 생성 스키마에서 추출한 메서드명(정규식 `"(thread|turn|item|…)/…"` 매칭, 189개 중 관련 항목):
  `thread/start`, `thread/resume`, `thread/fork`, `thread/read`, `thread/list`, `thread/loaded/list`, `thread/turns/list`, `thread/items/list`, `thread/items/read`, `thread/archive`, `thread/unarchive`, `thread/delete`, `thread/unsubscribe`, `thread/compact/start`, `thread/revert`, `thread/queue/add`, `thread/queue/list`, `thread/queue/update`, `thread/queue/delete`, `thread/queue/reorder`, `thread/queue/start`, `thread/tokenUsage/updated`, `thread/status/changed`, `thread/started`, `thread/closed`, `turn/start`, `turn/steer`, `turn/interrupt`, `turn/started`, `turn/completed`, `turn/diff/updated`, `turn/plan/updated`, `item/started`, `item/completed`, `item/agentMessage/delta`, `item/reasoning/textDelta`, `item/reasoning/summaryTextDelta`, `item/commandExecution/outputDelta`, `item/commandExecution/requestApproval`, `item/commandExecution/terminalInteraction`, `item/fileChange/outputDelta`, `item/fileChange/patchUpdated`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, `item/tool/call`, `item/tool/requestUserInput`, `item/mcpToolCall/progress`, `item/plan/delta`, `item/autoApprovalReview/started`, `item/autoApprovalReview/completed`, `serverRequest/resolved`, `mcpServer/elicitation/request`, `account/rateLimits/read`, `account/rateLimits/updated`, `account/usage/read`, `model/list`, `review/start`, `command/exec`, `process/spawn`.

### 3.2 메시지 스트리밍

**Claude Code CLI**
- headless: "Use `--output-format stream-json` with `--verbose` and `--include-partial-messages` to receive tokens as they're generated. Each line is a JSON object representing an event" / "The last line of the stream is a `result` message with the final response text, cost, and session metadata."
- 예시 필터: `jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'`
- `claude --help`: `--include-partial-messages  Include partial message chunks as they arrive (only works with --print and --output-format=stream-json)`

**Claude Agent SDK**
- streaming-output: "To enable streaming, set `include_partial_messages` (Python) or `includePartialMessages` (TypeScript) to `true` in your options. This causes the SDK to yield `StreamEvent` messages containing raw API events as they arrive" — https://code.claude.com/docs/en/agent-sdk/streaming-output
- 메시지 순서 예: `StreamEvent (message_start)` → `content_block_start` → `content_block_delta` … → `AssistantMessage` → … → `ResultMessage`
- 제한: "Stream events are emitted for the main session only; token-level deltas from subagents aren't forwarded."
- 끊긴 스트림: "If a stream is cut off mid-message, you still receive that message's `message_stop` before the turn ends." (v2.1.290+, TS SDK 0.3.290+, Py 0.2.164+)

**Codex CLI (exec)**
- 소스 `codex-rs/exec/src/exec_events.rs`: ThreadEvent 변형 = `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.started`, `item.updated`, `item.completed`, `error` (텍스트 델타 이벤트 변형 없음) — https://raw.githubusercontent.com/openai/codex/main/codex-rs/exec/src/exec_events.rs
- non-interactive 문서: "Stdout becomes a JSONL stream. The page lists these event types: `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.*`, and `error`."

**Codex SDK**
- README: "`run()` buffers events until the turn finishes. To react to intermediate progress—tool calls, streaming responses, and file change notifications—use `runStreamed()` instead, which returns an async generator of structured events."
- 소스 `sdk/typescript/src/events.ts`: 타입 판별자 `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.started`, `item.updated`, `item.completed`, `error`.

**Codex app-server**
- 문서: "`item/agentMessage/delta` appends streamed text for the agent message." / "`item/started` emits the full item when work begins, and `item/completed` sends the final item."
- 스키마 v2 파일: `AgentMessageDeltaNotification.json`, `ReasoningTextDeltaNotification.json`, `CommandExecutionOutputDeltaNotification.json`, `FileChangeOutputDeltaNotification.json`.

### 3.3 세션 조회/목록

**Claude Code CLI**
- `claude agents --help`: `--json  Print active sessions (interactive and background) as a JSON array and exit (for scripting; does not require a TTY)` / `--all  With --json: also include completed background sessions`
- `claude --help`: `-r, --resume [value]  Resume a conversation by session ID or name, or open interactive picker with optional search term` (피커는 대화식).
- sessions 문서: "Claude Code leaves sessions created with `claude -p` or the Agent SDK out of the session picker and out of `claude --continue`. You can still resume one by passing its session ID to `claude --resume <session-id>`." — https://code.claude.com/docs/en/sessions
- 저장 위치: "By default, Claude Code stores transcripts as JSONL at `~/.claude/projects/<project>/<session-id>.jsonl`, where `<project>` is your working directory path with non-alphanumeric characters replaced by `-`." / **"The entry format is internal to Claude Code and changes between versions, so scripts that parse these files directly can break on any release. To build on session data, use `/export` or the script interfaces instead."**

**Claude Agent SDK**
- typescript 레퍼런스: "`listSessions(options?)`: Discovers and lists past sessions with light metadata. Filter by project directory or list sessions across all projects." (옵션 `dir`, `limit`, `includeWorktrees`) / "`getSessionMessages(sessionId, options?)`: Reads user and assistant messages from a past session transcript." / "`getSessionInfo(sessionId, options?)`: Reads metadata for a single session by ID without scanning the full project directory." — https://code.claude.com/docs/en/agent-sdk/typescript
- python 레퍼런스: `def list_sessions(directory: str | None = None, limit: int | None = None, offset: int = 0, include_worktrees: bool = True) -> list[SDKSessionInfo]` / `def get_session_messages(session_id: str, directory: str | None = None, limit: int | None = None, offset: int = 0) -> list[SessionMessage]` — https://code.claude.com/docs/en/agent-sdk/python
- sessions 문서: "Both SDKs also expose functions for looking up and mutating individual sessions: `get_session_info()`, `rename_session()`, and `tag_session()` in Python, and `getSessionInfo()`, `renameSession()`, and `tagSession()` in TypeScript."

**Codex CLI (exec)**
- `codex exec resume --help`: `[SESSION_ID]  Conversation/session id (UUID) or thread name. ... If omitted, use --last to pick the most recent recorded session` / `--all  Show all sessions (disables cwd filtering)`
- `codex resume --help`(대화식): `Resume a previous interactive session (picker by default; use --last to continue the most recent)`
- `codex agents --help`: `Browse all agent sessions on the shared local app-server daemon` (TUI).

**Codex SDK**
- README: "Threads are persisted in `~/.codex/sessions`. If you lose the in-memory `Thread` object, reconstruct it with `resumeThread()` and keep going." (목록 API 없음; 파일 형식은 UNVERIFIED)
- 소스 `thread.ts`: "Returns the ID of the thread. Populated after the first turn starts." (`thread.started` 이벤트의 `thread_id`로 설정)

**Codex app-server**
- 문서 `thread/list`: "`cursor`: opaque string from a prior response; omit for the first page." / "`sortKey`: `created_at` (default), `updated_at`, or `recency_at`." / "`archived`: when `true`, list archived threads only." / "When `nextCursor` is `null`, you have reached the final page."
- "`thread/loaded/list` list[s] the thread ids currently loaded in memory."

### 3.4 세션 재개

**Claude Code CLI**
- headless: "Use `--continue` to continue the most recent conversation, or `--resume` with a session ID to continue a specific conversation." / `session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id'); claude -p "Continue that review" --resume "$session_id"`
- "In place of the session ID, you can pass `--resume` the absolute path to a session's `.jsonl` transcript file"
- sessions: "Claude Code looks for the ID in this order: 1. The current project directory and its git worktrees 2. Every other project on this machine" (v2.1.223+)

**Claude Agent SDK**
- typescript Options: `resume` "Session ID to resume" / `continue` "Continue the most recent conversation" / `resumeSessionAt` "Resume session at a specific message UUID"
- python: `resume: str | None` / `continue_conversation: bool`
- cost-tracking: "Claude Code saves the session's totals to its transcript when the process exits normally and restores them when a later call resumes or forks the session." (v2.1.277+)

**Codex CLI (exec)**
- `codex exec resume --help`: `Usage: codex exec resume [OPTIONS] [SESSION_ID] [PROMPT]` / `--last  Resume the most recent recorded session (newest) without specifying an id` / `--json  Print events to stdout as JSONL`
- non-interactive 문서: "`codex exec resume --last "<prompt>"` continues the most recent session." / "`codex exec resume <SESSION_ID>` targets a specific session."

**Codex SDK**
- README: `const thread = codex.resumeThread(savedThreadId); await thread.run("Implement the fix");`
- 소스 `exec.ts`: "If `threadId` is set, the code pushes `"resume"` followed by the thread ID."

**Codex app-server**
- 문서 `thread/resume`: "reopen an existing thread by id so later `turn/start` calls append to it." / "Pass `excludeTurns: true` to return thread metadata and live session state" / "full-history responses from `thread/resume` and `thread/fork` are deprecated."

### 3.5 세션 분기(fork)

**Claude Code CLI**
- `claude --help`: `--fork-session  When resuming, create a new session ID instead of reusing the original (use with --resume or --continue)`
- cli-reference 예시: `claude --resume abc123 --fork-session` — https://code.claude.com/docs/en/cli-reference
- sessions: "Sessions created with `/branch` or `--fork-session` get their own session IDs and appear as separate rows."

**Claude Agent SDK**
- sessions: "**Fork** is different: it creates a new session that starts with a copy of the original's history. The original stays unchanged." / TS `options: { resume: sessionId, forkSession: true }` / Py `ClaudeAgentOptions(resume=session_id, fork_session=True)`
- "Forking branches the conversation history, not the filesystem."

**Codex CLI (exec)**
- `codex exec fork --help`: `Fork a previous session by id into a new session` / `Usage: codex exec fork [OPTIONS] <SESSION_ID> [PROMPT]` / `<SESSION_ID>  Conversation/session id (UUID) or thread name to fork`
- developer-commands: "With no prompt, it creates the fork without starting a turn." — https://learn.chatgpt.com/docs/developer-commands?surface=cli

**Codex SDK**
- README 및 소스(`thread.ts`, `exec.ts`)에 fork 관련 API 없음. fallback: `codex exec fork` 직접 호출 또는 app-server `thread/fork`.

**Codex app-server**
- 문서: "`thread/fork`: fork a thread into a new thread id by copying stored history." / "Params include `threadId`, `lastTurnId`, `excludeTurns`, and `ephemeral`."
- 스키마 v2: `ThreadForkParams.json`, `ThreadForkResponse.json`.

### 3.6 실행 중 추가 지시(steer/queue)

**Claude Code CLI**
- `claude --help`: `--input-format <format>  Input format (only works with --print): "text" (default), or "stream-json" (realtime streaming input)` / `--replay-user-messages  Re-emit user messages from stdin back on stdout for acknowledgment (only works with --input-format=stream-json and --output-format=stream-json)`
- cli-reference `--max-turns`: "With `--input-format stream-json`, a message still queued when the limit ends a turn stays queued and starts a new turn with its own limit" (큐 존재 확인).
- 비고: 현재 턴 중간에 끼워넣는 "steer" 의미론은 CLI 문서에 없음. 큐잉 후 다음 턴으로 처리됨.

**Claude Agent SDK**
- streaming-vs-single-mode: "Queued messages: send multiple messages that process sequentially, with ability to interrupt" / "Single message input mode does **not** support: ... Dynamic message queueing, Real-time interruption, Natural multi-turn conversations" — https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode
- typescript Query: `streamInput(stream)` "Stream input messages to the query for multi-turn conversations"
- user-input: "Redirect entirely: use streaming input to send Claude a completely new instruction. This bypasses the current tool request" — https://code.claude.com/docs/en/agent-sdk/user-input

**Codex CLI (exec)**
- `codex exec --help`: 프롬프트는 인자 또는 stdin 1회. 추가 입력 옵션 없음.
- fallback: `codex queue --help`: `Queue a message for an existing session` / `Usage: codex queue [OPTIONS] --thread <THREAD> --message <TEXT>` / `--resume  After queueing, try to resume the thread on the local daemon or selected --remote server` (대상은 daemon/app-server 세션이며 exec 프로세스가 아님).

**Codex SDK**
- README/소스: `thread.run()` / `runStreamed()` 외 입력 API 없음.

**Codex app-server**
- 문서 `turn/steer`: "append user input to the active in-flight turn for a thread." / "Requires `expectedTurnId`, which must match the active turn id." / "Fails if no turn is active. Returns the accepted `turnId`." / "Doesn't emit `turn/started` and doesn't accept `model`, `cwd`, `sandboxPolicy`, or `outputSchema` overrides."
- 스키마 `v2/TurnSteerParams.json` 필수 필드: `"required": ["expectedTurnId", "input", "threadId"]`; `expectedTurnId` 설명: "Required active turn id precondition. The request fails when it does not match the currently active turn."
- 큐: 스키마 메서드 `thread/queue/add`, `thread/queue/list`, `thread/queue/update`, `thread/queue/delete`, `thread/queue/reorder`, `thread/queue/start`, 알림 `thread/queue/changed`.

### 3.7 도구 호출 이벤트 관찰

**Claude Code CLI**
- headless: "Messages from subagents ... appear in the stream as `assistant` and `user` messages. Their `parent_tool_use_id` field says which run each one belongs to." / "By default: the run's `tool_use` and `tool_result` blocks."
- `claude --help`: `--include-hook-events  Include all hook lifecycle events in the output stream (only works with --output-format=stream-json)`
- typescript `SDKToolProgressMessage`: "While a tool call runs in the main conversation, Claude Code emits a `tool_progress` message every 30 seconds with `heartbeat: true`."

**Claude Agent SDK**
- hooks: 표에서 `PreToolUse` "Tool call request (can block or modify)", `PostToolUse` "Tool execution result", `PostToolUseFailure` "Tool execution failure", `SubagentStart`/`SubagentStop` 등 — https://code.claude.com/docs/en/agent-sdk/hooks
- streaming-output: "Tool calls also stream incrementally. ... `content_block_start`: tool begins; `content_block_delta` with `input_json_delta`: input chunks arrive; `content_block_stop`: tool call complete"

**Codex CLI (exec)**
- 소스 `exec_events.rs` ThreadItemDetails: `agent_message`, `reasoning`, `command_execution`, `file_change`, `mcp_tool_call`, `collab_tool_call`, `web_search`, `todo_list`, `error`
- non-interactive 문서: "Item types: agent messages, reasoning, command executions, file changes, MCP tool calls, web searches, and plan updates."

**Codex SDK**
- README: `case "item.completed": console.log("item", event.item);` — 동일 이벤트 스트림.

**Codex app-server**
- 스키마 메서드: `item/started`, `item/completed`, `item/commandExecution/outputDelta`, `item/commandExecution/terminalInteraction`, `item/fileChange/outputDelta`, `item/fileChange/patchUpdated`, `item/mcpToolCall/progress`, `item/tool/call`, `item/plan/delta`.

### 3.8 승인 요청 수신·응답(permission)

**Claude Code CLI**
- cli-reference `--permission-prompt-tool`: "Specify an MCP tool to handle permission prompts in non-interactive mode. Pass the full name, such as `mcp__<server>__<tool>`, of a tool on an MCP server that the run loads. Claude Code waits for that tool's MCP server to connect before running the first turn ... The prompt tool can't approve an MCP tool marked as requiring user interaction: Claude Code converts an `allow` result for one to a deny." 예: `claude -p --mcp-config ./mcp.json --permission-prompt-tool mcp__permissions__approve "query"`
- `claude --help`: `--permission-prompts <target>  Who answers permission prompts with --print: "host" (the SDK host or --permission-prompt-tool) or "none" (nobody: anything that would prompt is denied automatically ...)` / `--permission-mode <mode>  (choices: "acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan")`
- headless: "In a Manual mode `claude -p` run, a call that needs approval is denied unless something approves it, such as a `PermissionRequest` hook or a `--permission-prompt-tool`. With Claude Code v2.1.302 or later, `claude -p` runs start in Manual mode when nothing sets a permission mode."
- headless: "With `--output-format stream-json`, denials appear as `permission_denied` system messages, and the final result message lists them in `permission_denials`."

**Claude Agent SDK**
- user-input: "Both trigger your `canUseTool` callback, which pauses execution until you return a response." / "The callback can stay pending indefinitely." / 응답: Allow `{ behavior: "allow", updatedInput }` / Deny `{ behavior: "deny", message }` / Py `PermissionResultAllow(updated_input=...)`, `PermissionResultDeny(message=...)` / "Approve and remember: ... Echo one back in `updatedPermissions` to apply it."
- permissions 평가 순서: "1. Hooks → 2. Deny rules → 3. Ask rules → 4. Permission mode → 5. Allow rules → 6. canUseTool callback" / "**Auto-approved tools never reach `canUseTool`.**" — https://code.claude.com/docs/en/agent-sdk/permissions
- hooks: "For `PreToolUse` hooks, this is where you set `permissionDecision` (`"allow"`, `"deny"`, `"ask"`, or `"defer"`), `permissionDecisionReason`, and `updatedInput`. If you return `"defer"`, the turn ends with a result message whose `stop_reason` is `"tool_deferred"`, so you can resume the call later."
- user-input Python 예시 주석: "Required workaround: dummy hook keeps the stream open for can_use_tool" (Python에서 `query()`+`can_use_tool` 사용 시 `PreToolUse` 더미 훅 필요).

**Codex CLI (exec)**
- `codex exec --help`: `-a, --ask-for-approval <APPROVAL_POLICY>` 는 exec 서브커맨드 도움말에 없고 루트 `codex --help`에만 있음(`on-request`, `never`). exec에 있는 것: `--approve-for-me  Route approval requests through automatic review using the workspace-write sandbox` / `--dangerously-bypass-approvals-and-sandbox  Skip all confirmation prompts and execute commands without sandboxing.`
- config-reference: `approval_policy` 허용값 "`on-request | never | { granular = {...} }`" / "`untrusted` is unsupported, and `on-failure` is deprecated" / "use `on-request` for interactive runs or `never` for non-interactive runs" — https://learn.chatgpt.com/docs/config-file/config-reference
- non-interactive 문서: "`--full-auto` is no longer supported. Use `--approve-for-me` to route approval requests through automatic review with the workspace-write sandbox."
- 결론: exec에는 승인 요청을 외부 프로그램이 수신·응답하는 채널이 없음. `on-request` 설정 시 exec 동작은 UNVERIFIED.

**Codex SDK**
- 소스 `threadOptions.ts`: `approvalPolicy: ApprovalMode` = `never | on-request | on-failure | untrusted` (옵션 값만; 콜백 없음). 소스 `exec.ts`: `--config approval_policy="<value>"` 로 전달.
- codex-sdk 문서: "Use the Codex app server to build custom clients that handle authentication, conversation history, approvals, and streamed agent events." — https://learn.chatgpt.com/docs/codex-sdk

**Codex app-server**
- 문서: "`item/commandExecution/requestApproval` includes `itemId`, `threadId`, and `turnId`. Decisions are `accept`, `acceptForSession`, `decline`, `cancel`, or `acceptWithExecpolicyAmendment`." / "`item/fileChange/requestApproval` includes `itemId`, `threadId`, `turnId`, and optional `reason` and `grantRoot`. Decisions are `accept`, `acceptForSession`, `decline`, `cancel`." / "The server sends `serverRequest/resolved` to confirm the request was answered or cleared, then sends `item/completed` with the final status."
- "`item/permissions/requestApproval`, described as asking the client to grant a subset of network or filesystem permissions."
- 스레드 상태: "`active` with `activeFlags` (example flag: `waitingOnApproval`)"
- 스키마 루트 파일: `CommandExecutionRequestApprovalParams.json`, `FileChangeRequestApprovalParams.json`, `PermissionsRequestApprovalParams.json`, `ToolRequestUserInputParams.json`, `McpServerElicitationRequestParams.json`, `ServerRequest.json`.

### 3.9 실행 취소/중단

**Claude Code CLI**
- headless "Stop a run with SIGTERM": "If you stop a `claude -p` run with SIGTERM ... Claude Code exits with code 143. Claude Code leaves the turn that was in progress unfinished and records no result for it. To end the turn instead, send SIGINT, or call the Agent SDK's `interrupt()`, before you stop the process." / "When you resume the session, Claude Code leaves the interrupted turn as it is ... To have Claude Code continue the interrupted turn on resume instead, set `CLAUDE_CODE_RESUME_INTERRUPTED_TURN=1`."
- Windows에서 SIGINT 전달 가능 여부는 문서에 없음(UNVERIFIED).

**Claude Agent SDK**
- typescript Query: "`interrupt()`: Interrupts the query. Only available in streaming input mode. When the CLI advertises the `interrupt_receipt_v1` capability ..., resolves with an `SDKControlInterruptResponse` ... Resolves `undefined` on CLIs before v2.1.205" / "`close()`: Close the query and terminate the underlying process."
- Options: `abortController` "Controller for cancelling operations"
- python: "`interrupt()` sends a stop signal but does not clear the message buffer. Messages already produced by the interrupted task, including its `ResultMessage`, remain in the stream."
- capabilities: "`interrupt_cancel_queued_v1`: `interrupt` honors `cancel_queued: true`. (Requires Claude Code v2.1.219+.)"
- `AbortError`: "`AbortError` is the only error class in the SDK's typed API."

**Codex CLI (exec)**
- `codex exec --help` 및 non-interactive 문서에 중단 플래그/신호 설명 없음. 프로세스 종료 외 경로 UNVERIFIED.

**Codex SDK**
- 소스 `exec.ts`: "The signal is passed to Node's `spawn` options as `signal: args.signal`, so aborting it terminates the child process." / `finally`에서 `child.kill()` 호출. 소스 `thread.ts`: `turnOptions.signal` 을 `exec.run`에 전달.

**Codex app-server**
- 문서 `turn/interrupt`: Params `{ "threadId": "thr_123", "turnId": "turn_456" }` / "request cancellation of an in-flight turn" / "On success, the turn finishes with `status: "interrupted"`."
- 스키마 `v2/TurnInterruptParams.json`: `"required": ["threadId", "turnId"]`.

### 3.10 사용량·토큰·비용 조회

**Claude Code CLI**
- headless: "With `--output-format json`, the response payload includes `total_cost_usd` and a per-model cost breakdown ... When you continue an earlier conversation with `--continue` or `--resume`, the run reports the conversation's whole total, earlier runs' spend included. Both figures are client-side estimates and can differ from your actual bill."
- `claude --help`: `--max-budget-usd <amount>  Maximum dollar amount to spend on API calls (only works with --print)`

**Claude Agent SDK**
- cost-tracking: "**The `total_cost_usd` and `costUSD` fields are client-side estimates, not authoritative billing data.** The SDK computes them locally from a price table bundled at build time" / "Do not bill end users or trigger financial decisions from these fields." — https://code.claude.com/docs/en/agent-sdk/cost-tracking
- 필드 범위: "`usage`: Excluded (subagent). Counts only the top-level agent loop" / "`total_cost_usd`: Included. Counts subagent requests" / "`modelUsage` / `model_usage`: Included ... broken down by model"
- "Per-step `output_tokens` is a placeholder, so read output tokens from the result message"
- `SDKResultMessage` 공통 필드: `duration_ms`, `duration_api_ms`, `is_error`, `num_turns`, `stop_reason`, `total_cost_usd`, `usage`, `modelUsage`, `permission_denials`; subtype `success` / `error_max_turns` / `error_during_execution` / `error_max_budget_usd` / `error_max_structured_output_retries`
- 캐시 토큰: `cache_creation_input_tokens`, `cache_read_input_tokens`

**Codex CLI (exec)**
- non-interactive 문서: "`turn.completed` includes a `usage` object with `input_tokens`, `cached_input_tokens`, `output_tokens`, and `reasoning_output_tokens`."
- 소스 `exec_events.rs` Usage: `input_tokens`, `cached_input_tokens`, `cache_write_input_tokens` (`#[serde(default)]`), `output_tokens`, `reasoning_output_tokens`. USD 필드 없음.

**Codex SDK**
- README: `case "turn.completed": console.log("usage", event.usage);` / 소스 `events.ts` Usage 필드 동일 5종. USD 없음.

**Codex app-server**
- 문서: "`thread/tokenUsage/updated` provides usage updates for the active thread." / 스키마: `account/rateLimits/read`, `account/rateLimits/updated`, `account/usage/read`(`GetAccountTokenUsageResponse.json`). USD 비용 메서드 없음.

### 3.11 오류 복구(재연결·재시도)

**Claude Code CLI**
- headless "Handle API retries": "When an API request fails with a retryable error, Claude Code emits a `system/api_retry` event before retrying." 필드: `attempt`, `max_retries`, `retry_delay_ms`, `error_status`, `no_response`, `error`(`authentication_failed`, `rate_limit`, `overloaded`, `server_error`, `max_output_tokens`, … ).
- "Claude Code exits with code 0 on success and a non-zero code when the run fails ... When a failure happens inside the run, such as missing authentication, Claude Code prints the failure as the result on stdout."
- `claude --help`: `--fallback-model <model>  Enable automatic fallback to specified model(s) when the default model is overloaded or not available.`
- headless: "If your consumer reads the stream slowly, Claude Code waits for the queued output to drain before exiting ... capped at 30 seconds."

**Claude Agent SDK**
- typescript: `SDKAPIRetryMessage`, `SDKRateLimitEvent` (`status: "allowed" | "allowed_warning" | "rejected"`), `SDKSessionStateChangedMessage` (`idle | running | requires_action`, 환경변수 `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1`)
- `SDKBackgroundTasksChangedMessage`: "When you send a repeated `initialize` control request to a running session, such as with `reinitialize()` after a transport gap, Claude Code follows the response with a snapshot of the current live set"
- cost-tracking: "When the Claude Code process crashes, it emits a final `error_during_execution` result and exits"
- sessions: "Recover from a limit. The first run ended with `error_max_turns` or `error_max_budget_usd`; resume with a higher limit."
- `SpawnOptions.signal`: "The SDK first closes the process's stdin and waits about two seconds so the CLI can shut down cleanly, then aborts this signal."

**Codex CLI (exec)**
- config-reference(`model_providers.<id>`): "`request_max_retries`: Retry count for HTTP requests to the provider (default: 4)." / "`stream_max_retries`: Retry count for SSE streaming interruptions (default: 5)." / "`stream_idle_timeout_ms`: Idle timeout for SSE streams in milliseconds (default: 300000)."
- `exec_events.rs`: `turn.failed`, `error` 이벤트.
- 프로세스 단위 재개: `codex exec resume <SESSION_ID>`.

**Codex SDK**
- 소스 `exec.ts`: "On a non-zero exit code or a termination signal, the code throws: `Codex Exec exited with ${detail}: ${stderrBuffer}`" / spawn 실패는 `child.once("error")`로 포착.
- 재개: `resumeThread(threadId)`.

**Codex app-server**
- 문서: "When request ingress is full, the server returns error `-32001` with message 'Server overloaded; retry later.' Clients should retry with exponentially increasing delay and jitter."
- "If a turn fails, the server emits an `error` event, then ends the turn with `status: "failed"`." / `codexErrorInfo` 값: `ContextWindowExceeded`, `UsageLimitExceeded`, `HttpConnectionFailed`, `ResponseStreamDisconnected`, `ResponseTooManyFailedAttempts`
- "`thread/unsubscribe` ... the server keeps the thread loaded until it has no subscribers and no thread activity for 30 minutes." / "`thread/start` automatically subscribes you to turn/item events for that thread."
- 클라이언트 재연결 시 재구독 절차는 명시되지 않음(UNVERIFIED). `thread/resume` 또는 `thread/loaded/list`로 복구 가능성만 추론 가능.

### 3.12 CLI/SDK 버전 호환성 정책

**Claude Code CLI**
- headless: "The event also carries an optional `capabilities` array of strings naming the protocol behaviors this Claude Code version implements, such as `interrupt_receipt_v1` or `interrupt_cancel_queued_v1`. Check it to feature-detect instead of comparing version strings, and ignore values you don't recognize."
- `SDKSystemMessage.claude_code_version: string` 필드 존재.
- 문서 전반에 "Requires Claude Code vX.Y.Z or later" 식 기능별 최소 버전 표기(예: `--permission-prompts` v2.1.259+, Manual 기본 v2.1.302+, `--bare` 제한 v2.1.286+). 공식 지원기간/SemVer 정책 문서는 찾지 못함(UNVERIFIED).
- `claude --help`: `update|upgrade  Check for updates and install if available` / `install [options] [target]  ... (stable, latest, or specific version)`

**Claude Agent SDK**
- CHANGELOG(TS): "0.3.316 — Updated to parity with Claude Code v2.1.316" / "0.3.315 — Updated to parity with Claude Code v2.1.315" / "0.2.6 — Added `claudeCodeVersion` field to `package.json` for programmatically determining compatible CLI version" — https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md
- typescript Options: `pathToClaudeCodeExecutable` "Path to Claude Code executable. Only needed if optional dependencies were skipped during install or your platform isn't in the supported set"
- 기능별 SDK/CLI 최소 버전 병기 예: "`cloud_credential_error` requires TypeScript Agent SDK v0.3.267+, which bundles Claude Code v2.1.267" / "`McpServerToolPolicy` requires Agent SDK v0.3.301+ and Claude Code v2.1.301+. Older executables ignore it."
- overview: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Use the API key authentication methods" (배포 시 인증 제약).

**Codex CLI (exec)**
- feature-maturity: "Experimental: Unstable and OpenAI may remove or change it. Use at your own risk." / "Stable: Fully supported, documented, and ready for broad use; behavior and configuration remain consistent over time. Safe for production use; removals typically go through a deprecation process." — https://learn.chatgpt.com/docs/feature-maturity
- developer-commands: "`--json` / `--experimental-json`: Print newline-delimited JSON events instead of formatted text." / "`--strict-config` errors when config contains fields 'this Codex version does not recognize.'"
- `codex --help`: `update  Update Codex to the latest version`

**Codex SDK**
- 소스 `exec.ts`: "`findCodexPath()` maps `process.platform` and `process.arch` to a target triple, then locates the matching `@openai/codex` platform package." / 실패 시 "Unable to locate Codex CLI binaries. Ensure @openai/codex is installed with optional dependencies."
- npm 버전: `@openai/codex-sdk` 0.166.0, `@openai/codex` 0.166.0 (동일 버전 트랙). 호환성 정책 명문화 없음.

**Codex app-server**
- `codex app-server --help`: `[experimental] Run the app server or related tooling`
- developer-commands: app-server는 "may change without notice."
- 문서: "Using an experimental method without opting in returns '`<descriptor>` requires experimentalApi capability'" / "Older servers may omit fields such as `readState`, ..., so clients should handle missing fields." / "`thread/rollback` has been removed. Use `thread/revert` instead."
- 생성 스키마는 `v1/`, `v2/` 디렉터리로 분리되어 있고, 알림 opt-out 설명이 "the current `thread/*`, `turn/*`, `item/*`, and related v2 notifications"를 가리킴.

---

## 4. §9.7 협업 도구 실재 확인

검색: `gh search repos` (이름 일치 `--match name` 및 설명 검색) + WebSearch. 날짜는 `gh api repos/<r>/commits?per_page=1` 의 committer date.

| 이름 | 가장 관련성 높은 저장소 | 최근 커밋 | 라이선스 | 한 줄 기능 | Claude 지원 | Codex 지원 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ccmux | `epilande/ccmux` (TypeScript, 238★) https://github.com/epilande/ccmux | 2026-10-24 | MIT | "Run all your AI coding agents (Claude Code, Codex, Cursor, ...) in tmux: jump to the one that needs you, spawn them into worktrees, and hand work between them" | 예(README 66회 언급) | 예(README 30회 언급) | 동명이인 다수: `skzv/ccmux`(Go, FSL-1.1-MIT, 2026-10-26, Claude+Codex TUI), `Shin-sibainu/ccmux`(Rust, MIT, 2026-05-07, Claude 전용), `TheHumbleTransistor/ccmux`(Python, MIT, 2026-09-22, Claude 전용, PyPI), `mmazur/ccmux`(OpenShift 클러스터 멀티플렉서 — 무관) |
| dispatch | `bassimeledath/dispatch` (414★) https://github.com/bassimeledath/dispatch | 2026-04-06 | 라이선스 파일 없음(`licenseInfo: null`) | "A Claude Code skill that 10x's your effective context window by dispatching tasks to background AI workers." | 예(Claude Code 스킬) | README에 "codex" 10회 언급 — 워커 지원 여부 상세 UNVERIFIED | 인접 프로젝트: `bestony/herdr-dispatch`(MIT, 2026-10-02, Claude 오케스트레이터 + codex/grok/opencode 워커), `buildoak/agent-mux`(MIT, 2026-07-10, Codex/Claude/Gemini 디스패치 레이어), `santiagomora2/dispatch`(무관) |
| relay | `AgentWorkforce/relay` (Rust/TS, 1087★) https://github.com/AgentWorkforce/relay | 2026-10-31 | Apache-2.0 | "Infrastructure for coding agents" — "Claude/Codex/etc can talk directly through shared channels, threads, DMs, files, search, and real-time events." | 예 | 예 | 동명이인: `Wei-Shaw/claude-relay-service`(API 중계 서비스, 오케스트레이션 아님 — 무관), `paralus/relay`(k8s — 무관) |
| dual-agent-orchestration | `duyv0826/dual-agent-orchestration` (1★) https://github.com/duyv0826/dual-agent-orchestration | 2026-08-04 | MIT | "双Agent编排协作约定 - WorkBuddy skill" (듀얼 에이전트 협업 5개 규칙을 담은 WorkBuddy 스킬 문서) | 아니오(README 언급 0) | 아니오(README 언급 0) | 이름은 일치하나 Claude/Codex 오케스트레이션 **도구가 아님**. 유사 성격 저장소: `keng1304/claude-codex-bridge`(MIT, 2026-05-19, "Dual-agent orchestration: Claude (main brain) + OpenAI Codex (worker hand)"), `wenqingyu/magic-cc-codex-worker`(2026-10-11, Claude Code 안에서 병렬 Codex 워커 MCP 플러그인) |

---

## 5. Agent Studio 설계에 영향이 큰 발견

1. **승인(permission) 요청을 프로그램이 받는 유일한 경로가 에이전트마다 다르다.** Claude는 SDK `canUseTool`(또는 CLI `--permission-prompt-tool` MCP 도구, `PermissionRequest` 훅). Codex는 **app-server의 서버→클라이언트 요청(`item/commandExecution/requestApproval` 등)만** 가능하고, `codex exec`/`@openai/codex-sdk`에는 승인 콜백이 없다(정책 사전결정만). Codex SDK 문서도 승인 처리는 app-server를 쓰라고 명시한다. → Codex 어댑터는 `codex app-server`(stdio JSON-RPC) 기반이어야 한다.
2. **Claude `-p` 기본 권한 모드가 v2.1.302부터 Manual**이라서, 승인 호스트(`canUseTool`/`--permission-prompt-tool`)가 없으면 승인 필요 호출이 조용히 거부된다. 거부는 `permission_denied` 시스템 메시지와 `result.permission_denials`로 관찰 가능. `--permission-prompts none`(v2.1.259+)으로 무인 실행을 명시할 수 있다.
3. **fork는 Codex SDK를 제외하고 모두 지원.** Claude `--fork-session`/`forkSession`, Codex `exec fork`/`thread/fork`. Codex app-server `thread/fork`는 `lastTurnId`(분기 지점)·`ephemeral` 옵션을 제공해 더 세밀하다.
4. **비용 데이터는 Claude만 USD를 준다(단, 클라이언트 추정치).** Codex는 토큰 5종(`input/cached_input/cache_write_input/output/reasoning_output`)만 제공 → Agent Studio가 Codex 모델 단가표를 자체 보유해야 하며, Claude 쪽도 "Do not bill end users ... from these fields" 경고를 UI에 반영해야 한다.
5. **스트리밍 입도 차이.** Claude는 CLI/SDK 모두 토큰 델타(`text_delta`, `input_json_delta`) 제공. Codex는 `exec --json`/SDK가 item 단위(`item.started/updated/completed`)이고, 텍스트 델타(`item/agentMessage/delta`)는 app-server에서만 나온다. 타이핑 효과 UI를 양쪽에 동일하게 제공하려면 Codex는 app-server 필수.
6. **세션 목록 공식 API.** Claude: SDK `listSessions()/getSessionInfo()/getSessionMessages()`가 공식(CLI에는 과거 세션 목록 비대화식 명령 없음; `claude agents --json`은 실행 중 세션만). Codex: app-server `thread/list`(cursor 페이지네이션, `sortKey`, `archived`). Claude 공식 문서가 **`~/.claude/projects/*.jsonl` 직접 파싱을 명시적으로 비권장**("internal ... changes between versions")하므로 파일 파싱은 설계에서 제외해야 한다.
7. **실행 중 추가 지시.** Claude: streaming input(`--input-format stream-json` / SDK AsyncIterable)으로 큐잉; 현재 턴에 끼워넣는 steer 의미론은 문서화되지 않음. Codex app-server: `turn/steer`가 **진행 중 턴에 입력을 추가**하며 `expectedTurnId` 선행조건으로 경쟁 상태를 방지하고, 별도 `thread/queue/*`로 다음 턴 큐를 관리한다. 두 모델이 다르므로 Agent Studio의 "추가 지시" UX는 어댑터별 의미 차이를 드러내야 한다.
8. **중단 의미론.** Claude SDK `interrupt()`는 streaming input 모드에서만 동작하고 단발 `query()`는 `abortController`로만 종료(프로세스 종료). CLI는 SIGINT(턴 종료) vs SIGTERM(exit 143, 턴 미완료) 구분이 문서화되어 있으나 Windows 전달 방법은 미기재. Codex app-server `turn/interrupt`는 턴 상태 `interrupted`로 정상 종결되어 가장 깔끔하다.
9. **버전 결합.** Claude Agent SDK는 CLI와 패치 버전이 1:1 대응(0.3.N ↔ 2.1.N, "parity")하고 SDK가 CLI 바이너리를 번들한다. `system/init.capabilities`로 기능을 감지하라는 공식 권고가 있다. Codex SDK는 `@openai/codex` 플랫폼 패키지의 번들 바이너리를 `exec --experimental-json`으로 실행하므로 SDK 기능 상한 = exec 기능. app-server는 전체가 "experimental / may change without notice"이며 스키마가 v1/v2로 나뉘어 있으므로 Agent Studio는 `codex app-server generate-json-schema`를 CI에서 돌려 타입을 고정·검증하는 전략이 필요하다.
10. **오류 복구 신호.** Claude는 `system/api_retry`(attempt/max_retries/retry_delay_ms/error 카테고리)와 `SDKRateLimitEvent`를 스트림으로 준다. Codex app-server는 `-32001` 과부하 시 지수 백오프 재시도를 요구하고, `codexErrorInfo`로 `ResponseStreamDisconnected` 등 분류를 준다. 두 쪽 모두 "프로세스 재시작 후 세션 ID로 재개"가 기본 복구 경로다.

---

## 6. UNVERIFIED 목록

| 항목 | 상태 | 비고 / fallback |
| --- | --- | --- |
| `~/.claude/projects/<slug>/*.jsonl` 내부 레코드 형식 | UNVERIFIED (공식: "internal to Claude Code and changes between versions") | SDK `getSessionMessages()` 또는 `claude -p --resume <id> --output-format json` 사용 |
| `~/.codex/sessions` 파일 형식 | UNVERIFIED (README는 위치만 언급) | app-server `thread/list`·`thread/read` 사용 |
| `codex exec`에서 `approval_policy = "on-request"` 설정 시 실제 동작 | UNVERIFIED | 공식 권고대로 비대화식은 `never`; 승인 필요 시 app-server |
| Codex app-server 클라이언트 재연결 후 기존 스레드 재구독의 공식 절차 | UNVERIFIED (언서브스크라이브·30분 유지만 문서화) | `thread/resume` 또는 `thread/loaded/list` 후 재구독 시도, 실측 필요 |
| Claude CLI stream-json의 `control_request`(interrupt 등)를 CLI 사용자용으로 문서화했는지 | UNVERIFIED (headless 문서는 SIGINT 또는 SDK `interrupt()`만 안내) | SDK 사용 |
| Windows에서 `claude -p` 프로세스에 SIGINT를 보내 턴만 종료하는 방법 | UNVERIFIED | SDK `interrupt()`/`abortController` |
| Claude Code 공식 버전 지원기간·SemVer·호환성 정책 문서 | UNVERIFIED (기능별 "Requires vX" 표기만 존재) | `system/init.capabilities` + `claude_code_version` 기반 기능 감지 |
| Codex CLI/SDK/app-server의 공식 버전 호환·지원기간 정책 | UNVERIFIED (Feature maturity 라벨만 존재) | `--strict-config`, 스키마 생성 후 CI 검증 |
| Codex SDK `codexPathOverride` 옵션 존재 여부 | UNVERIFIED (소스에는 `executablePath` 생성자 인자만 확인) | 소스 `exec.ts` 기준 `executablePath` 사용 |
| `bassimeledath/dispatch`의 Codex 워커 지원 상세 | UNVERIFIED (README에 codex 10회 언급만 확인) | README 정독 필요 |
| Codex `--json` 이벤트 중 `item.updated`가 어떤 item type에서 발생하는지 | UNVERIFIED (타입 존재는 소스로 확인, 발생 조건은 미확인) | 실측 |
| Claude Code `claude agents --json` 출력 스키마 | UNVERIFIED (`--help` 설명만 확인) | 실측 |
