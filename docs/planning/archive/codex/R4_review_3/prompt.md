# Round 4-3 — Independent plan review: Security · Execution limits · Tests · Phases · Master plan

You are OpenAI Codex acting as an **independent reviewer**. Fresh session; adversarial but fair; do not assume the co-designing Codex thread was right.

Rules: READ-ONLY. Primary sources for factual claims; else `UNVERIFIED`. Korean output, identifiers in English. Target 1,800–3,000 words.

## Read, in this order
1. `D:\LLM\agent-studio\docs\planning\evidence\USER_DIRECTIVE.md` — PART D(§11–§12), G(§16–§17), I(§20), K(§22)
2. `D:\LLM\agent-studio\docs\planning\04_security_test\SECURITY_MODEL.md`
3. `D:\LLM\agent-studio\docs\planning\04_security_test\EXECUTION_LIMITS_POLICY.md`
4. `D:\LLM\agent-studio\docs\planning\04_security_test\TEST_STRATEGY.md`, `RECOVERY_TEST_PLAN.md`
5. `D:\LLM\agent-studio\docs\planning\05_plan\PHASE_BREAKDOWN.md`, `MASTER_IMPLEMENTATION_PLAN.md`, `ACCEPTANCE_CRITERIA.md`, `OPEN_ISSUES_AND_RISKS.md`
6. Context: `06_codesign\ARCHITECTURE_DEBATE.md` §3–§4 (what was agreed in Round 2-3 — check that the documents actually implement the agreements)

## Review areas (directive §18 Round 4)
보안 취약점 · 테스트 전략 · Phase 의존성 · 스킬 사용 증거(in phases) · 유지보수성 · 요구사항 누락(limits/tests).

## Checks to perform explicitly
- SECURITY_MODEL §2 matrix: are the 11 areas of directive §11.1 all present with default/scope/signal/enforcement? Any area whose enforcement path is only "string classification" without an app-owned executor despite being high-risk?
- Does the model anywhere overstate isolation (e.g., worktree as sandbox, Claude native Windows isolation, "all effects approved")? Quote.
- EXECUTION_LIMITS: all 9 directive §12 rows + the 10 review questions in §12 answered? Is "approval wait excluded from task time" implementable given the state machine? Is `BLOCKED(approval_expired)` resumable without re-running completed effects?
- TEST_STRATEGY: all 35 scenarios of directive §20 (7+6+7+7+8) have IDs with 환경·사전조건·입력·예상·실패처리·증거? List missing fields per scenario group. Is recorded-fixture replay a valid substitute for live agent tests, and where must live tests be mandatory?
- PHASE_BREAKDOWN: all 13 original phases traceable (00–12 incl. 08a/b/c, 10a/b, 11a/b/c)? Each phase has the 18 items of directive §17 (list phases missing items)? Dependency DAG acyclic and consistent with MVP/V1/V2 cut? Is Phase 00 (8 spikes) sized realistically; what would you cut or add?
- MASTER_IMPLEMENTATION_PLAN: Global Constraints match the agreed values (120/20/3/2/1-per-project/15min/90s-20s)? Review Focus items each have an owning task test? Phase 00 tasks are testable without writing product code?
- ACCEPTANCE_CRITERIA: every AC has an evidence type that is not "AI says done"? MVP gate complete vs directive core UX (§1 핵심 사용자 경험)?
- OPEN_ISSUES: are user decisions U1–U7 clearly framed with consequences? Any risk you consider Critical that is missing?

## Output format (strict)
### 요약 (5줄 이내)
### 발견 사항
`| ID | 심각도 | 영역 | 문서·위치 | 문제 | 근거 | 권고 |`, IDs `R4C-01`…, severity-ordered, 12–30 rows typical.
### 지시서 §20 35개 시나리오 커버리지 표 (범주 | 지시서 항목 | TEST-ID | 누락 필드)
### Phase 18항목 체크 (Phase | 누락 항목 번호)
### 긍정적 확인
### UNVERIFIED
