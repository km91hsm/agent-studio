# Round 1 — Independent Architecture Proposal for "Agent Studio"

You are OpenAI Codex acting as an **independent co-architect**. Another agent (Claude Code) is writing its own proposal in parallel. You have NOT been shown Claude's proposal and must not try to guess it. Produce your own best technical judgment.

## Ground rules
- READ-ONLY task. Do not create or modify any file. Your entire answer is the final message.
- Primary sources only. When you assert a CLI flag, SDK API, framework capability, or version, say how you know (official docs URL you are confident exists, or `--help` output you ran). If you cannot verify, write `UNVERIFIED` next to the claim. Do not invent commands.
- You may run read-only commands to inspect the local machine: `codex --version`, `codex exec --help`, `codex app-server --help`, `claude --help`, `node --version`, `python --version`, `Get-Command cargo`, etc. Do not run anything that writes.
- Answer in **Korean** (technical identifiers, commands, file names stay in English). Markdown. Target 1,800–3,000 words. Tables welcome.

## Read these files first
1. `D:\LLM\agent-studio\docs\planning\evidence\USER_DIRECTIVE.md` — the product owner's directive. Focus on PART A (product), PART C (tech stack & architecture alternatives A/B/C), PART D (security & limits), PART E (state & recovery), PART F (UI), PART G (phases).
2. `D:\LLM\agent-studio\docs\planning\00_product\PRODUCT_REQUIREMENTS.md` — normalized requirement IDs (REQ-*). Reference them.
3. `D:\LLM\agent-studio\docs\planning\evidence\ENVIRONMENT_SURVEY.md` — the actual machine: Windows 11, Node 24, Python 3.14, no Rust/Go/.NET toolchain, Claude Code 2.1.316, Codex CLI 0.166.0 (ChatGPT login), SDK versions.

## Deliverable — use exactly these headings

### 1. 핵심 설계 판단 (5~8줄)
Your overall stance in a few sentences.

### 2. 기술 스택 제안
A table with rows: 개발 언어(UI / 백엔드·오케스트레이터 / 프로세스 제어 / 테스트), 데스크톱 프레임워크, 프런트엔드 프레임워크, 코드 편집기 컴포넌트, 터미널 컴포넌트, 백엔드 구조, 데이터 저장소, 자격증명 저장, 패키징·자동 업데이트. Columns: 선택 / 근거(공식 근거 포함) / 대안과 기각 사유 / 위험.
Explicitly weigh: single-language vs multi-language; the fact that this PC lacks Rust/Go/.NET today (cost of installing a toolchain is allowed but must be stated).

### 3. 아키텍처 대안 A/B/C 평가와 추천
Evaluate A (Python orchestrator-centric), B (native desktop backend-centric), C (desktop + independent orchestrator hybrid). Add D if you have a better one. For each: process diagram as a Mermaid or ASCII block, data flow, and a scored table on the 12 criteria in PART C §10 (성능, IPC, 실시간 이벤트, 다중 에이전트 제어, SQLite 상태 관리, 앱 종료 후 백그라운드 실행, OS별 서비스 관리, 장애 복구, 권한 격리, 패키징, 구현 비용, 장기 유지보수성). State your recommendation and the single biggest risk of it.

### 4. Agent Gateway 설계
How the app should drive Claude Code and Codex. For each of the 12 capabilities in PART C §9.6 (대화 시작, 스트리밍, 세션 조회, 세션 재개, 세션 분기, 실행 중 추가 지시, 도구 호출 관찰, 승인 요청 수신·응답, 실행 취소, 사용량 조회, 오류 복구, 버전 호환성) say which interface you would use for Codex (`codex exec --json`, `codex app-server` JSON-RPC, `@openai/codex-sdk`, …) and for Claude (`claude -p --output-format stream-json`, Agent SDK, …), and mark `UNVERIFIED` where you are not sure the capability exists. Be specific about Codex since you know it best: approval flow, interrupt, resume/fork, usage reporting, event schema.

### 5. 상태·복구 설계 요지
Entity model (Workspace→Project→Phase→Task→AgentRun→Session), state machine, which of Lease / Fencing Token / Idempotency Key / Heartbeat / Event Journal / Checkpoint / Recovery Manager you would adopt and why, and how you would handle the 14 recovery scenarios in PART E §14 (group them if you like).

### 6. 보안·승인·실행 제한 의견
Threat model in 5 bullets. How to enforce approvals in the execution layer rather than via CLAUDE.md/AGENTS.md. Your opinion on each of the 9 initial limit values in PART D §12 (keep / change to X / depends), with reasons. How to get token usage from Codex and Claude, and what to do when cost in currency is unavailable (ChatGPT-subscription login).

### 7. Skills 통합 관점 (Codex 측)
Codex skills live in `$CODEX_HOME/skills/<name>/SKILL.md` (frontmatter name/description, optional `agents/openai.yaml`). The 38 candidate skills are currently installed only for Claude (`~/.claude/skills`). From your knowledge of Codex: what does Codex require of a skill folder to load it, how does implicit vs explicit invocation work (`allow_implicit_invocation`), what would break when copying Claude-oriented skills (hooks, subagents, Skill tool references), and how should Agent Studio verify that a skill was actually loaded and used in a Codex run (evidence, not prompt text)? Mark UNVERIFIED where unsure.

### 8. Phase 순서 제안
Take the 13 phases in PART G §16 and propose your order/merges/splits with one-line reasons. Which items belong in Phase 00 as risk-reducing spikes? Define MVP / V1 / V2 in 3 lines each.

### 9. UNVERIFIED 목록과 Claude에게 묻고 싶은 질문
List every claim you marked UNVERIFIED, and 3–6 questions you would pose to the other architect.
