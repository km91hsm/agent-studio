# Round 6-2 — Re-review after fixes: Agent integration · State & recovery · Collaboration · Skills (your R4B-01~25)

You are the same independent reviewer who produced R4B-01~25 in this thread. Claude has applied fixes and recorded a verdict for each finding. Verify **whether each finding is actually resolved in the documents as they now exist on disk**. Re-read the files; do not rely on memory.

Rules: READ-ONLY. Korean output, identifiers in English. Primary sources (openai/codex `rust-v0.166.0` app-server protocol, Claude Agent SDK docs) for factual claims; else `UNVERIFIED`. You may run read-only local commands (`codex app-server --help`, `codex exec --help`, `claude --help`). Do not soften a verdict because the resolution log says ACCEPTED — if the text still has the defect, say NOT_RESOLVED and quote the current line. Target 1,500–2,600 words.

## Read, in this order
1. `D:\LLM\agent-studio\docs\planning\06_codesign\REVIEW_RESOLUTION.md` — §2 (your 25 rows), §4, §5
2. `D:\LLM\agent-studio\docs\planning\02_agents_state\AGENT_INTEGRATION_DESIGN.md` — §1 Gateway signature, 공통 이벤트 10종, §3 method table (usage row, steer-failure row, approval/userInput/elicitation rows), §6 S1a/b/c·S9, **new §7 (CAP table, 최대 통과 + 3단 보충)**
3. `D:\LLM\agent-studio\docs\planning\02_agents_state\DATABASE_SCHEMA.md` — event type list, 재생 불변식, `effects` columns, `tasks` columns (paused, implementer/reviewer, active_ms/wait_ms)
4. `D:\LLM\agent-studio\docs\planning\02_agents_state\SESSION_RECOVERY_DESIGN.md` — 5동작 table (Fork row, Checkpoint Restore row), §3 판정표 (6 rows), scenarios #3·#6·#7·#11·#12·#13, 일시정지 row
5. `D:\LLM\agent-studio\docs\planning\02_agents_state\PHASE_MANAGEMENT_DESIGN.md` — §2 diagram + 전이 규칙표 (single source `packages/protocol/task-transitions.json`), 시계 definitions
6. `D:\LLM\agent-studio\docs\planning\02_agents_state\COLLABORATION_PROTOCOL.md` — §1 mode table approval column, §3, §5, §6, 리뷰 생략 정책
7. `D:\LLM\agent-studio\docs\planning\03_skills\SKILL_EXECUTION_EVIDENCE_SPEC.md` — field 13 grades, 판정표, 완료 조건
8. `D:\LLM\agent-studio\docs\planning\03_skills\SKILL_COMPATIBILITY_MATRIX.md` — row 29 (finishing-a-development-branch), §D (3 rows), §E totals
9. `D:\LLM\agent-studio\docs\planning\03_skills\DEVELOPMENT_SKILL_ROUTING_POLICY.md` §2 rules 2·3 and table; `DEVELOPMENT_SKILL_USAGE_PLAN.md` 설치 범위 row, P03/P05/P09 rows, §3 설치 방식; `SKILL_CONFLICT_RESOLUTION.md` §4.0
10. `D:\LLM\agent-studio\docs\planning\06_codesign\CLAUDE_INITIAL_PROPOSAL.md` line ~128 (retired-claim annotation)
11. Cross-check: `04_security_test\SECURITY_MODEL.md` §2·§2.1·§8·§10 (boundary wording must agree with COLLABORATION_PROTOCOL); `05_plan\MASTER_IMPLEMENTATION_PLAN.md` Global Constraints (permission modes) and Tasks S1a/S1b/S1c/S9

## Checks to perform explicitly
- For **each** R4B-01..25: verdict `RESOLVED` / `PARTIALLY_RESOLVED` / `NOT_RESOLVED` / `RESOLVED_BUT_NEW_ISSUE`, with a quote of the current text as evidence.
- R4B-01: grep-level check — does **any** of the 10 documents above still contain a sentence implying all side effects pass through the ApprovalBroker? Quote each occurrence.
- R4B-02/03/14: walk scenario #3 (agent crash mid-write) through the new order "실행 차단 → 효과 평가 → 판정" using the `effects` columns now declared. Is every branch of the 3-way blob assessment computable from declared columns? Is there still a path that auto-resumes without inspecting non-file side effects?
- R4B-05: is the transition table complete for the transitions you listed, and is "single source of truth" actually enforceable (one file, generated diagram) or just stated?
- R4B-08/09/12/19: verify the renamed Codex API usage against rust-v0.166.0 (`thread/tokenUsage/updated`, the three request kinds, `thread/queue/add` experimental gating, `-32001` meaning). Flag any remaining invented name.
- R4B-10/24: with the 4-grade scale, is the promotion rule to `APPLIED_VERIFIED` concrete enough to implement (what is a "스킬 고유 절차 시그니처", who authors it, where stored)? Is the list of Task types allowed to complete at `LOAD_OBSERVED` closed?
- R4B-13 (NEEDS_VERIFICATION): can you confirm from the installed `@anthropic-ai/claude-agent-sdk` 0.3.316 typings or official docs whether `forkSession(sessionId, {upToMessageId})` exists? If you cannot, say so and state what evidence P00 S2 must capture.
- R4B-20/25: recount §E from the rows yourself. Does it sum to 55 with one classification per row?
- **Second-request changes (REVIEW_RESOLUTION §4)**, evaluate as a new reviewer:
  - AGENT_INTEGRATION §7 CAP table: for each of CAP-01..09, is the claimed 1단 path something the headless runtime actually provides (cite), or must it be UNVERIFIED → S9? Does any row overclaim?
  - U8 (auto permission mode opt-in): trace what happens in Codex adapter with `approvalPolicy:'never'` + `workspaceWrite`, and in Claude with `acceptEdits`/`bypassPermissions`: which guarantees in SECURITY_MODEL §2.1 drop to POLICY_ONLY, and does the design still route 원격 Git·DB·설치·배포·외부 서비스 through the 앱 전용 실행기 in that mode (how, mechanically, if the agent can run shell)? Is the residual risk stated honestly (OPEN_ISSUES R20)?
  - U9 (`CODEX_HOME` shared): consequences for session listing (`thread/list` sees user's own Desktop threads?), skills/plugins exposure, `notify` hooks in the user's config.toml firing during app-driven runs. Which of these does the plan address, which not?
  - Is "3단 LLM 위임" (agent writes a Python/Pillow/openpyxl script) consistent with the approval matrix (dependency install = approval) and the evidence spec (what counts as evidence for a document the agent generated)?
- New inconsistencies introduced by edits: event names used in SESSION_RECOVERY/PHASE_MANAGEMENT that are not in DATABASE_SCHEMA's list; grade names (`LOADED_ONLY`/`VERIFIED`) surviving anywhere; `forkRun/resumeRun` surviving after the Gateway signature change; scenario numbering drift.

## Output format (strict)
### 요약 (5줄 이내) — 포함: 해결 N / 부분 N / 미해결 N / 신규 N, 잔존 Critical·High 유무
### 원 지적 재검토
`| 원 ID | 판정 | 현재 문서·위치 | 근거 인용 | 잔여 조치 |` — R4B-01..25 all rows, in order.
### 2차 요청 변경 평가 (CAP 표·U8·U9·3단 위임)
`| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |` IDs `R6B-01`…; include "문제 없음" rows for accepted items.
### 신규 발견 (수정으로 생긴 불일치)
Same table, IDs continue `R6B-nn`.
### 사용자 결정 대기로 표시할 항목
### UNVERIFIED
