# Round 6-3 — Re-review after fixes: Security · Execution limits · Tests · Phase plan · Master plan (your R4C-01~22)

You are the same independent reviewer who produced R4C-01~22 in this thread. Claude has applied fixes and recorded a verdict for each finding. Verify **whether each finding is actually resolved in the documents as they now exist on disk**. Re-read the files; do not rely on memory.

Rules: READ-ONLY. Korean output, identifiers in English. Primary sources for factual claims; else `UNVERIFIED`. Do not soften a verdict because the resolution log says ACCEPTED — if the text still has the defect, say NOT_RESOLVED and quote the current line. Target 1,500–2,600 words.

## Read, in this order
1. `D:\LLM\agent-studio\docs\planning\06_codesign\REVIEW_RESOLUTION.md` — §3 (your 22 rows), §4, §5
2. `D:\LLM\agent-studio\docs\planning\04_security_test\SECURITY_MODEL.md` — §2 (areas incl. 브라우저·컴퓨터 사용·외부 문서 서비스), **§2.1 보장 수준 표**, §3 격리 게이트, §8 자동 모드, **§10 Critical 위험**
3. `D:\LLM\agent-studio\docs\planning\04_security_test\EXECUTION_LIMITS_POLICY.md` — §1 근거 열, §1.1, §3 오류 분류, §4 시간 계산, §6
4. `D:\LLM\agent-studio\docs\planning\04_security_test\TEST_STRATEGY.md` — §1 의무 실호출 표, all 35 scenario rows (6 fields), SE-01a/01b·06a/06b·08·09, TEST-BG-01~10, TEST-LIM-01~04, TEST-RF-01~05
5. `D:\LLM\agent-studio\docs\planning\04_security_test\RECOVERY_TEST_PLAN.md` — S19~S21, §2.6 추적표
6. `D:\LLM\agent-studio\docs\planning\05_plan\ACCEPTANCE_CRITERIA.md` — AC-P00-1~9 (7a/7b), AC-P10a-5·6, AC-P02-6, AC-V1-5·6, AC-V2-1~4, MVP-Core row
7. `D:\LLM\agent-studio\docs\planning\05_plan\PHASE_BREAKDOWN.md` — §0 (18 rows), §1 공통 규칙, P00 (S1a/b/c, S7 축소, **S9**), P01 T3·T9, P08a 선행, P09 범위, P08b/P10b/P11b/P12/P08c/P11c separated, §2.1, §3 DAG
8. `D:\LLM\agent-studio\docs\planning\05_plan\MASTER_IMPLEMENTATION_PLAN.md` — Global Constraints (permission modes, evidence, CODEX_HOME, release naming), Review Focus (TEST-RF), 릴리스 정의, 범위 축소 규칙, Tasks S1a/S1b/S1c/S2/S7/**S9**, P00 종료 게이트
9. `D:\LLM\agent-studio\docs\planning\05_plan\OPEN_ISSUES_AND_RISKS.md` — §1 (U1·U3·U4·U5·**U8·U9**), §1.1, §2 R6·R7·R13·**R18·R19·R20**, §3, §4
10. `D:\LLM\agent-studio\docs\planning\05_plan\IMPLEMENTATION_APPROVAL_CHECKLIST.md` — A2·A3·A5, B (U8·U9), C8·C9, D5·D6
11. Cross-check: `01_architecture\FINAL_ARCHITECTURE_DECISIONS.md` D11·D26·D27·D28; `00_product\PRODUCT_REQUIREMENTS.md` §13A (REQ-CAP)

## Checks to perform explicitly
- For **each** R4C-01..22: verdict `RESOLVED` / `PARTIALLY_RESOLVED` / `NOT_RESOLVED` / `RESOLVED_BUT_NEW_ISSUE`, quoting the current text.
- R4C-01/03: read SECURITY_MODEL §2.1 as an implementer. For each (provider × OS × mode) cell, is the ENFORCED/DETECTED/POLICY_ONLY label justified by a named mechanism? Does AC-P10a-5 now claim only what §2.1 supports?
- R4C-02: is the S4 gate truly blocking (what exactly is disabled on failure, where is that enforced in P01, which AC checks it)?
- R4C-04: run the §4 time-calculation example by hand; does `active_ms` exclude in-turn approval wait and survive restart per TEST-LIM-01/02?
- R4C-06/21: SE-01a vs SE-01b — are the expected outcomes now consistent with the default policy matrix? Do SE-08/09 cover 프로젝트 외부 파일·미등록 호스트·외부 서비스 전송 with real signals?
- R4C-07/08: pick 5 of the 35 scenarios at random and verify all 6 fields are substantive (not "동일"/"—"); check that the 의무 실호출 table covers 승인 콜백·무승인 쓰기·OS 격리·스킬 로드·중단.
- R4C-09/13: is MVP-Core's definition honest about excluding the directive's core UX, and does every BG-01~05 have its own evidence requirement in AC-P11a?
- R4C-11: compare every "선행" in PHASE_BREAKDOWN §2 against §3 DAG line by line; list any remaining mismatch. Is P09's sequential Manual compare actually implementable without worktrees (snapshot/revert semantics)?
- R4C-12/17: S1a Step 1 — does the assertion now separate "no silent write under readOnly" from "record workspaceWrite behavior"? Is the S1a→S1b→S1c ordering plus S7 reduction credible within the 2-week cap? Is S9 realistic in scope?
- R4C-16: for each of the six separated phases, are all 18 items present (count them), and are "해당 없음" entries justified?
- R4C-19/20: are R19/R20 managed as Critical with owners and gates, and is §1 now only true user decisions?
- **Second-request changes (REVIEW_RESOLUTION §4)**, evaluate as a new reviewer:
  - U8 opt-in auto mode: does the security model keep any ENFORCED guarantee in auto mode for Claude native Windows? If not, is the UI/approval text honest, and should auto mode be allowed only on isolated combos (Codex sandbox / WSL2)? Give a concrete recommendation for the user decision.
  - U9 `CODEX_HOME` shared: security consequences (user config `notify` hooks, `mcp_servers` from the user's config running under app runs, plugin binaries) — which of SECURITY_MODEL §2 areas cover these?
  - REQ-CAP-07/08 (computer use via app MCP tool server): is the approval area and guarantee level defined? Is an OS-input-control tool server compatible with the "앱 전용 실행기" principle?
  - S9 as a P00 spike: does it have pass/fail semantics (AC-P00-9) or only "record"? Is "record only" acceptable for a gate?
- New inconsistencies introduced by the edits: TEST IDs referenced in PHASE_BREAKDOWN/ACCEPTANCE that do not exist in TEST_STRATEGY/RECOVERY_TEST_PLAN; AC IDs referenced in PHASE_BREAKDOWN that do not exist in ACCEPTANCE_CRITERIA; release names ("MVP" vs "MVP-Core") used inconsistently; spike IDs (S1 vs S1a/b/c) surviving unchanged somewhere.

## Output format (strict)
### 요약 (5줄 이내) — 포함: 해결 N / 부분 N / 미해결 N / 신규 N, 잔존 Critical·High 유무
### 원 지적 재검토
`| 원 ID | 판정 | 현재 문서·위치 | 근거 인용 | 잔여 조치 |` — R4C-01..22 all rows, in order.
### 2차 요청 변경 평가 (U8·U9·CAP-07/08·S9)
`| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |` IDs `R6C-01`…; include "문제 없음" rows for accepted items.
### 신규 발견 (수정으로 생긴 불일치)
Same table, IDs continue `R6C-nn`.
### 사용자 결정 대기로 표시할 항목
### UNVERIFIED
