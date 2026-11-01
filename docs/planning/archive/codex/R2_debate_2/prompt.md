# Round 2-2 — Agent Gateway · Session Manager · Orchestrator · Skills/MCP · Editor/Terminal

Same Codex thread, same rules (READ-ONLY, primary sources, `UNVERIFIED`, Korean). Target 1,500–2,500 words. Do not repeat Round 1 content; go deeper on the design decisions below.

## Read
- `D:\LLM\agent-studio\docs\planning\06_codesign\CLAUDE_INITIAL_PROPOSAL.md` §4–§5 (Gateway interface, state machine, 14 recovery scenarios)
- `D:\LLM\agent-studio\docs\planning\evidence\research\RESEARCH_AGENT_GATEWAY.md` §2 matrix and §5 findings
- `D:\LLM\agent-studio\docs\planning\03_skills\SKILL_EXECUTION_EVIDENCE_SPEC.md`, `SKILL_COMPATIBILITY_MATRIX.md`, `SKILL_CONFLICT_RESOLUTION.md`

## Verified facts you may rely on (from the locally generated app-server JSON schema, Codex 0.166.0)
- Methods exist: `skills/list` (params `cwds`, `forceReload`), `skills/changed`, `skills/config/write`, `skills/extraRoots/set`, `thread/fork`, `turn/steer`, `turn/interrupt`, `thread/queue/*`, `account/rateLimits/read`, `account/usage/read`.
- `turn/start` input item `type` variants include: `text`, `image`, `localImage`, `skill`, `mention`, `audio`, `localAudio`.
- `--json` exec events: `thread.started`, `turn.started/completed/failed`, `item.started/updated/completed`, `error`.

## Issues — for EACH: 당신의 입장 / Claude 안에 대한 동의·반박 / 근거 / 위험 / 합의 여부

1. **Gateway 공통 이벤트 스키마**: Claude proposes normalizing both agents into `text_delta | item_started | item_completed | tool_call | approval_requested | usage | error | turn_completed`. Propose the minimal common event set and the fields that must stay agent-specific (e.g., Codex `turnId`/`itemId`, Claude `parent_tool_use_id`, `permission_denials`). Which Codex `item` types map to which common events?
2. **승인 브로커의 정합성**: Claude's `canUseTool` is skipped for auto-approved tools; Codex sends `requestApproval` only per sandbox/approval policy. Define the exact per-agent configuration Agent Studio must set so that *every* side-effecting action reaches the broker (Codex: `approvalPolicy`, `sandboxPolicy`, `--approve-for-me` must be off; Claude: permission mode, allow/deny rules, `--permission-prompts host`). Mark anything you cannot confirm UNVERIFIED.
3. **승인 보류 시간**: Can a Codex `requestApproval` stay unanswered for hours (user absent) without the turn timing out or the thread being unloaded (docs say unsubscribed threads unload after 30 min)? What should the orchestrator do to keep the approval alive or safely park it?
4. **Session Manager 5가지 동작 구분**: Native Resume / Context Handoff / Session Fork / Checkpoint Restore / Read-only Replay. For Codex map each to concrete app-server calls (`thread/resume`, `thread/fork {lastTurnId, ephemeral}`, `thread/read`, `thread/items/list`…), say what persists in `~/.codex/sessions` vs memory, and what Agent Studio must store itself.
5. **세션 목록·검색**: `thread/list` filters (cwd, archived, sortKey) vs Agent Studio's own index. Should Agent Studio rely on `thread/list` live, cache it, or maintain its own `SessionIndex` projection keyed by thread id? Same for Claude `listSessions()`.
6. **Orchestrator 동시성**: single-writer SQLite daemon with Lease/Fencing/Idempotency. Challenge Claude's TTL 60s/heartbeat 15s; propose how idempotency keys apply to Codex file changes (`item/fileChange` patches) and git commits so a crashed-and-resumed run does not double-apply.
7. **Skills — Codex 측 증거**: With `skills/list` and a `skill` input item verified to exist: (a) what does `skills/list` return per skill (fields you are confident about), (b) does sending a `skill` input item guarantee the SKILL.md body is injected, (c) is there any notification confirming use — if none, agree that evidence = `skills/list` presence + `skill` input item sent + observed tool activity consistent with the skill, graded as `LOADED_ONLY` until artifacts prove `VERIFIED`. (d) Does Codex read `~/.codex/skills`, `.agents/skills`, or both in 0.166.0 (UNVERIFIED allowed)?
8. **MCP 관리**: how should Agent Studio register/toggle MCP servers per project for each agent (Claude `--mcp-config` / settings; Codex `mcp_servers` in config.toml or app-server config write) without editing the user's global config files?
9. **편집기·터미널 권한 경계**: Monaco edits and xterm.js input are *user* actions, not agent actions. Should they bypass the ApprovalBroker? How to prevent the agent from using the user's terminal session, and how to attribute file changes (user vs agent) in the journal and Diff view?
10. **Fallback 경로 평가**: Claude proposes (i) Codex `exec --json` with `approval_policy=never` as a "no-approval restricted mode", (ii) Claude CLI `-p --input-format stream-json --permission-prompt-tool mcp__agentstudio__approve` as SDK fallback. Rate both: realistic / risky / reject, with reasons.

## Output format
`### 쟁점 N — <제목>` ×10, then `### 합의 요약 표` (쟁점 | 합의 상태 | 최종 권장 | 남은 검증), then `### UNVERIFIED`.
