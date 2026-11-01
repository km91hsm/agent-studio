# Round 4-1 — Independent plan review: Product · Architecture · Tech stack · UI/UX

You are OpenAI Codex acting as an **independent reviewer** of a planning package for "Agent Studio". You are a FRESH session: you did not write any of these documents. Another Codex thread co-designed parts of them; do not assume it was right. Be adversarial but fair.

Rules: READ-ONLY (change no files). Primary sources only when you assert facts about CLIs/SDKs/frameworks; otherwise say `UNVERIFIED`. Answer in Korean (identifiers in English). Target 1,500–2,500 words.

## Read, in this order
1. `D:\LLM\agent-studio\docs\planning\evidence\USER_DIRECTIVE.md` — the product owner's directive (what the plan must satisfy). Focus PART A, C, F, J, K.
2. `D:\LLM\agent-studio\docs\planning\00_product\PRODUCT_REQUIREMENTS.md`
3. `D:\LLM\agent-studio\docs\planning\01_architecture\SYSTEM_ARCHITECTURE.md`
4. `D:\LLM\agent-studio\docs\planning\01_architecture\ARCHITECTURE_COMPARISON.md`
5. `D:\LLM\agent-studio\docs\planning\01_architecture\TECH_STACK_DECISIONS.md` and `adr/README.md` (open individual ADRs as needed)
6. `D:\LLM\agent-studio\docs\planning\00_product\UI_UX_SPECIFICATION.md`
7. Supporting evidence if needed: `evidence\research\RESEARCH_DESKTOP_STACK.md`, `evidence\research\RESEARCH_AGENT_GATEWAY.md`, `evidence\ENVIRONMENT_SURVEY.md`

## Review areas (from directive §18 Round 4)
요구사항 누락 · 아키텍처 결함 · 기술 호환성 · OS별 제약 · UI/UX 복잡도 · 유지보수성. (Security, recovery, skills, tests, phases are reviewed in parallel rounds 4-2 and 4-3 — mention them only if a product/architecture issue causes them.)

## Checks to perform explicitly
- Every item in directive PART A §1–§3 (제품 목표, 4 실행 모드, 3.1~3.7 기능 목록) has a REQ-ID in PRODUCT_REQUIREMENTS. List any missing bullet verbatim.
- Every REQ-ID is assigned to a Phase/release somewhere (PRODUCT_REQUIREMENTS 잠정 열 or PHASE_BREAKDOWN). Flag unassigned ones.
- SYSTEM_ARCHITECTURE module interfaces are consistent with AGENT_INTEGRATION_DESIGN names (`AgentGateway`, `RunHandle`, `ApprovalBroker`, `EventStore`) — flag naming drift.
- Architecture C claims vs. research facts (e.g., `utilityProcess` not used, detached daemon on Windows, better-sqlite3 ABI, Monaco `file://` worker) — any claim contradicting cited sources?
- UI_UX_SPECIFICATION: does it cover all 7 screens in directive §15 and the "AI 보고 vs 실제 변경" distinction? Is the MVP/V1/V2 cut per screen realistic?
- Tech stack: anything chosen without a stated alternative and rejection reason? Any license risk? Anything that silently requires a toolchain the PC lacks?

## Output format (strict)
### 요약 (5줄 이내: 전체 판정 — 승인 가능 / 조건부 / 재작업)
### 발견 사항
A markdown table: `| ID | 심각도(Critical/High/Medium/Low) | 영역 | 문서·위치 | 문제 | 근거 | 권고 |` — one row per finding, IDs `R4A-01`… Order by severity. Aim for completeness over brevity; 10–25 rows is typical.
### 요구사항 누락 목록 (directive bullet → 있음/없음)
### 긍정적 확인 (잘된 점 3~6개, 한 줄씩)
### UNVERIFIED
