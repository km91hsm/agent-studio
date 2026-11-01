# Round 4-2 — Independent plan review: Agent integration · State & recovery · Collaboration · Skills (5 docs)

You are OpenAI Codex acting as an **independent reviewer**. Fresh session; you did not write these documents and must not assume the co-designing Codex thread was right. Adversarial but fair.

Rules: READ-ONLY. Primary sources for factual claims about Codex app-server / Claude Agent SDK; else `UNVERIFIED`. You may run read-only local commands (`codex app-server --help`, `codex exec --help`, `claude --help`). Korean output, identifiers in English. Target 1,800–3,000 words.

## Read, in this order
1. `D:\LLM\agent-studio\docs\planning\evidence\USER_DIRECTIVE.md` — PART B(§4–§8), PART E(§13–§14), PART H(§19)
2. `D:\LLM\agent-studio\docs\planning\02_agents_state\AGENT_INTEGRATION_DESIGN.md`
3. `D:\LLM\agent-studio\docs\planning\02_agents_state\DATABASE_SCHEMA.md`
4. `D:\LLM\agent-studio\docs\planning\02_agents_state\SESSION_RECOVERY_DESIGN.md`
5. `D:\LLM\agent-studio\docs\planning\02_agents_state\PHASE_MANAGEMENT_DESIGN.md`
6. `D:\LLM\agent-studio\docs\planning\02_agents_state\COLLABORATION_PROTOCOL.md`
7. `D:\LLM\agent-studio\docs\planning\03_skills\SKILL_COMPATIBILITY_MATRIX.md`, `SKILL_CONFLICT_RESOLUTION.md`, `DEVELOPMENT_SKILL_ROUTING_POLICY.md`, `DEVELOPMENT_SKILL_USAGE_PLAN.md`, `SKILL_EXECUTION_EVIDENCE_SPEC.md`
8. Evidence as needed: `evidence\research\RESEARCH_AGENT_GATEWAY.md`, `evidence\skill_analysis_part1.md`, `evidence\skill_analysis_part2.md`, `evidence\SKILL_INVENTORY.md`

## Review areas (directive §18 Round 4)
세션 및 상태 복구 · 작업 중복 실행 · Git 충돌 · 스킬 사용 증거 · 기술 호환성(어댑터) · 유지보수성.

## Checks to perform explicitly
- AGENT_INTEGRATION_DESIGN §3: every Codex app-server method/notification named exists in the 0.166.0 schema or official docs (`thread/*`, `turn/*`, `item/*`, `skills/list`, `account/*`). Flag any invented name. Same for Claude SDK names (`canUseTool`, `PreToolUse`, `listSessions`, `interrupt`, `forkSession`, `includePartialMessages`).
- The approval boundary claim: does any document still say or imply that *all* side effects pass through the ApprovalBroker? Quote it.
- DATABASE_SCHEMA: can every projection be rebuilt from `events` alone? Is there any state that lives only in a projection? Is the `effects` ledger sufficient for the 3-way blob assessment in SESSION_RECOVERY §3?
- State machine (PHASE_MANAGEMENT §2): unreachable states, missing transitions (e.g., WAITING_APPROVAL → CANCELLED by user, BLOCKED → CANCELLED, PAUSED flag interplay), timer semantics when approval wait is excluded.
- 14 recovery scenarios: for each, is the detection signal real (exists in the agent's event stream) and is the resulting state safe? Especially #3 (agent crash mid-write), #11 (git conflict detection without auto-merge), #13 (partial completion).
- Collaboration: does the "implementer ≠ reviewer" rule hold in every path incl. REWORK and Manual mode? Is "review skip by risk policy" bounded?
- Skills (directive §4–§8): 40 candidates + 15 superpowers sub-skills all present in the matrix with a classification and reason? The 2 retired ones recorded? Does the evidence spec avoid "name in prompt = used"? Is the routing policy consistent with the conflict decisions (same lead skill per stage)? Are user-only (`disable-model-invocation`) skills excluded from auto-routing everywhere?
- Codex-side skills: the plan says Codex has none installed and installation needs user approval. Is the "compat copy" plan (adding `agents/openai.yaml`) sound for Codex 0.166.0? Mark UNVERIFIED where you cannot confirm.

## Output format (strict)
### 요약 (5줄 이내)
### 발견 사항
`| ID | 심각도 | 영역 | 문서·위치 | 문제 | 근거 | 권고 |`, IDs `R4B-01`…, severity-ordered, 12–30 rows typical.
### 상태 머신·복구 체크 결과 (14 시나리오 각 1줄: OK / 문제)
### 스킬 매트릭스 완전성 (55행 존재 여부, 분류 누락 목록)
### 긍정적 확인
### UNVERIFIED
