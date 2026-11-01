# Cleanup round C1 — agree the criteria and propose per-document cuts (new session, co-editor role)

You are Codex acting as co-editor, not reviewer-of-correctness. The planning set for **Agent Studio** (Claude Code × Codex desktop dev tool) is complete and all decisions are final. The user now wants **only the final version** of the design documents to remain in `D:\LLM\agent-studio\docs\planning\` — everything about *how we got here* (review IDs, round references, "before decision" defaults, position changes, Codex-vs-Claude disagreements, process status) moves to `docs\planning\archive\` (already moved: `archive/06_codesign`, `archive/codex`, `archive/evidence`, `archive/PLANNING_STATUS.md`) and is summarised once in `archive/DECISION_LOG.md`.

Your job in this call: (1) challenge/extend Claude's cleanup criteria below, (2) read the 26 design documents + ADRs and propose **concrete cuts, merges and single-source assignments per document**, (3) list what must NOT be cut. **Do not re-open any decision** (D1~D28, U1 (b) CLI login reuse, U5 deferred, U8 (c) auto mode opt-in everywhere with safe default, U9 (a) shared CODEX_HOME, C5 no cap, C7 public repo). Design content stays; only its expression gets shorter and lives in one place.

Rules: READ-ONLY. Korean output, identifiers in English. Quote the current text you propose to cut (short). Target 3,000–4,500 words. Be concrete: file + section/row + action.

## Documents (read all; sizes in KB for pacing)
- `00_product/PRODUCT_REQUIREMENTS.md` 24, `00_product/UI_UX_SPECIFICATION.md` 10
- `01_architecture/SYSTEM_ARCHITECTURE.md` 11, `ARCHITECTURE_COMPARISON.md` 6, `TECH_STACK_DECISIONS.md` 6, `FINAL_ARCHITECTURE_DECISIONS.md` 12, `adr/ADR-0001~0008.md` + `adr/README.md`
- `02_agents_state/AGENT_INTEGRATION_DESIGN.md` 19, `DATABASE_SCHEMA.md` 13, `SESSION_RECOVERY_DESIGN.md` 11, `PHASE_MANAGEMENT_DESIGN.md` 11, `COLLABORATION_PROTOCOL.md` 7
- `03_skills/SKILL_COMPATIBILITY_MATRIX.md` 20, `DEVELOPMENT_SKILL_USAGE_PLAN.md` 9, `DEVELOPMENT_SKILL_ROUTING_POLICY.md` 7, `SKILL_CONFLICT_RESOLUTION.md` 7, `SKILL_EXECUTION_EVIDENCE_SPEC.md` 7
- `04_security_test/SECURITY_MODEL.md` 28, `EXECUTION_LIMITS_POLICY.md` 10, `TEST_STRATEGY.md` 21, `RECOVERY_TEST_PLAN.md` 10
- `05_plan/MASTER_IMPLEMENTATION_PLAN.md` 24, `PHASE_BREAKDOWN.md` 37, `ACCEPTANCE_CRITERIA.md` 16, `OPEN_ISSUES_AND_RISKS.md` 23, `IMPLEMENTATION_APPROVAL_CHECKLIST.md` 8

## Claude's draft criteria (challenge these)
Remove from design documents:
1. Review/round references: `(R4B-23)`, `R6C-01 정정`, `R8에서 추가`, `B5 의견`, `2차 요청`, `(STEP 11)`, "Codex 검증 경로 …" in status rows.
2. Decision-process narration: "결정 전 기본", "Claude 제안 vs Codex 권고", "철회", "과거 권고(이력)", "당시 제안", "양측 비권고", the 입장 변경 table in FINAL §2, OPEN_ISSUES §1 (all decided items) and §1.1, FINAL meta rows about 미결/결정.
3. Meta rows `참조 출처`, `UNVERIFIED 항목 수`, `Codex 검증 경로` → keep only `상태 | FINAL (2026-11-01)`.
4. OPEN_ISSUES §3.1 auto-aggregated grep table → delete; keep §3 per-document UNVERIFIED table with resolving Phase.
5. CHECKLIST: checked items → DECISION_LOG; keep only still-open approvals (C3 build tools, C9 MCP tool server scope, 2nd-stage approval condition, pre-first-push check list) and safety rules D1~D6.
6. Cross-document duplication → one source + one-line pointer. Candidates: approval matrix & guarantee levels (SECURITY only); permission modes / CODEX_HOME / auth default (AGENT_INTEGRATION §3 as source, FINAL one line); P00 spike detail (MASTER detailed vs PHASE_BREAKDOWN P00 summary — or the reverse; you decide); event list (DATABASE_SCHEMA); CAP table (AGENT_INTEGRATION §7; PRODUCT keeps REQ rows only); ARCHITECTURE_COMPARISON → fold a short comparison table into TECH_STACK_DECISIONS and drop the file?
7. Process-only status notes ("Codex 미재검증", "P00 S7에서 확정 예정" as status) → collect in OPEN_ISSUES UNVERIFIED table; keep in body only what an implementer must know as a condition ("잠정 — P00 S7 실측 후 확정").
8. Future paths: design docs reference `evidence/spikes/S*.md` for spike reports. `evidence/` is now archived. Propose a new path (e.g. `docs/spikes/` or `docs/evidence/spikes/`).

Never cut: all IDs (REQ-*, AC-*, TEST-*, CAP-*, D1~D28, R1~R22, ADR), all numeric limits (120분/20분/15분, lease 90/20, retries 3/2), all enums (events, effects.kind, tasks.kind, guarantee levels), the 28-cell §2.1 table, the 14-row §2.2 contract, 18 Phases × 18 items, the 55-row skill matrix, the 8-row conflict table, user-decision outcomes stated as plain facts (no "결정됨" tag), risks R1~R22 with current mitigations only.

## Output format (strict)
### 1. 기준 수정·추가 제안
Numbered; for each: 동의/수정/반대 + 이유 (one or two sentences).
### 2. 문서별 제안
`| 문서 | 절·행 | 조치 (삭제 / 축약 / 이동→DECISION_LOG / 단일 출처 지정→<문서> / 통합→<문서>) | 현재 문구(짧게) | 이유 |` — cover every document; it is fine to say "변경 없음".
### 3. 단일 출처 표
`| 주제 | 단일 출처 문서·절 | 참조만 남기는 문서 |`
### 4. 통합·삭제 후보 파일
Which files to fold/drop (e.g. ARCHITECTURE_COMPARISON) and what one paragraph must survive where.
### 5. 삭제 금지 추가 항목
Anything beyond the "Never cut" list that would be lost.
### 6. 예상 효과
Estimated KB per document after cleanup (rough), and a 10-line "결정 요약" draft for the new `docs/planning/README.md`.
