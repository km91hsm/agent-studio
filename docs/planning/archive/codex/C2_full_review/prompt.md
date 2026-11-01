# C2 — 정리본 전체 검토 (세션 D 이어서, 호출 2/6)

당신은 C1에서 Agent Studio 계획 문서의 **정리 기준**을 함께 확정한 공동 편집자입니다. 그 기준(합의 결과는 `docs/planning/archive/DECISION_LOG.md` §6.1·§6.2에 기록)을 적용한 **정리본이 완성되어 커밋 `402a5c0`에 있습니다**. 이번 작업은 정리본을 읽고 **잃은 것·깨진 것·남은 것·여전히 불필요한 것**을 지적하는 검토입니다. 문서를 다시 쓰지 말고, 지적만 하십시오. 샌드박스는 read-only입니다.

## 읽을 순서

1. `docs/planning/README.md` — 새 문서 지도·결정 요약 10줄·단일 출처 규칙.
2. `docs/planning/archive/DECISION_LOG.md` §1.1(2026-11-02 추가 결정 **U10·U5 재결정**)과 §6(정리 기준, archive로만 남긴 내용).
3. 활성 설계 문서 전부(아래 목록). 정리 전 원문은 `git show 1ff4372:docs/planning/<경로>`로 볼 수 있습니다(당시 경로: `01_architecture/ARCHITECTURE_COMPARISON.md`, `01_architecture/adr/ADR-0007-인증-모드를-공급자별-1급-설정으로,-MVP-기본-API-key.md`, `06_codesign/…`, `evidence/…`, `codex/…`, `PLANNING_STATUS.md`는 지금 `archive/` 아래).

활성 문서(27 + ADR 8 + adr/README):
- `00_product/`: PRODUCT_REQUIREMENTS, UI_UX_SPECIFICATION
- `01_architecture/`: SYSTEM_ARCHITECTURE, TECH_STACK_DECISIONS(§1에 구조 대안 비교 통합), FINAL_ARCHITECTURE_DECISIONS, `adr/README.md`, `adr/ADR-0001~0008`(0007은 `ADR-0007-인증-모드-CLI-로그인-재사용-기본.md`)
- `02_agents_state/`: AGENT_INTEGRATION_DESIGN, DATABASE_SCHEMA, SESSION_RECOVERY_DESIGN, PHASE_MANAGEMENT_DESIGN, COLLABORATION_PROTOCOL
- `03_skills/`: SKILL_COMPATIBILITY_MATRIX, DEVELOPMENT_SKILL_USAGE_PLAN, DEVELOPMENT_SKILL_ROUTING_POLICY, SKILL_CONFLICT_RESOLUTION, SKILL_EXECUTION_EVIDENCE_SPEC
- `04_security_test/`: SECURITY_MODEL, EXECUTION_LIMITS_POLICY, TEST_STRATEGY, RECOVERY_TEST_PLAN
- `05_plan/`: MASTER_IMPLEMENTATION_PLAN, PHASE_BREAKDOWN, ACCEPTANCE_CRITERIA, OPEN_ISSUES_AND_RISKS(제목 "위험·미검증 작업", §2 V1~V33), IMPLEMENTATION_APPROVAL_CHECKLIST

## 이번 정리에서 바뀐 설계 결정 1건 (검토 대상에 포함)

**U10(2026-11-02 사용자 결정)**: 스킬을 고르는 주체를 "앱 Router가 Task 유형→스킬 표로 고르고 프롬프트에 `/name`을 명시"에서 **에이전트(Claude·Codex) 자율 선택 기본**으로 변경. 앱은 노출 범위 필터(사용자 전용·보류·비호환 제외), §2 기대 주도 스킬과의 대조, 증거 4등급 검증, 기대 스킬 미선택·오선택 시 REWORK에서 명시 호출 교정만 담당. 사용자 `/name`은 항상 우선. 제품 Router와 Agent Studio 개발 세션(REQ-DEV-03) 둘 다 적용. 이에 따라 **U5 재결정**: Codex 자율 선택에 설치본이 필요하므로 주도 스킬 8종을 `~/.codex/skills`에 폴더 전체로 설치 — 단 PLAN ONLY 기간에는 설치하지 않고 구현 착수 시 CHECKLIST C4 승인 후 P00 S7 전 수행. 반영 위치: ROUTING_POLICY §1·§2·§3·§4, PRODUCT REQ-SK-04·DEV-02·DEV-03, EVIDENCE_SPEC §2·§3·§4, CONFLICT §3·§4, MATRIX, USAGE_PLAN §0·§3, MASTER 제약·S7, PHASE §1·P00·P07, AC-P00-6·P07-1, CHECKLIST C4·D2, OPEN_ISSUES R23·V12·V24, README 8번.

## 검토 항목 (전부 수행)

A. **결정 손실**: 정리 전(`1ff4372`)에 있던 설계 결정·수치·enum·ID가 정리 후 활성 문서 어디에도 없으면 지적. 대상: D1~D28, U1~U10, REQ/AC/TEST/CAP/R ID, Phase 18개×18항목, 제한값(120/20/3/2/15분/90s/20s/토큰 3M·30M·300M), 이벤트 이름 목록(DATABASE_SCHEMA), effects.kind·tasks.kind·증거 4등급·`selection_reason`·`invocation_mode` enum, 보장 수준 표 28셀, 14행 분류 계약, 스킬 매트릭스 55행, 충돌 8행, 복구 S01~S22, C1에서 당신이 "삭제 금지"로 지정한 항목(DECISION_LOG §6.1 마지막 문단). **archive에만 남은 것이 활성 문서에서 필요한 경우**도 손실로 간주.
B. **끊어진 참조**: 절 번호(예: "§2.6"→"§5" 같은 번호 이동), 문서명, 파일 경로(`archive/…`, `docs/spikes/…`), ADR 파일명, AC/TEST ID가 가리키는 대상이 존재하지 않거나 다른 내용을 가리키는 경우.
C. **잔존 이력·과정 서술**: 리뷰 ID(`R4B-23` 류), 라운드 표식(`R8`, `B5`, `STEP 11`), "결정 전 기본", "철회", "당시", "과거 권고", "Codex 권고/Claude 제안", "미재검증", "2차 요청", 양측 입장 병기, "결정됨" 표기, 계획 수립 과정 전용 문장. 단, 메타 행의 `상태 | FINAL (2026-11-01)`, ADR `배경 기록` 행의 archive 경로, OPEN_ISSUES의 "결정 경위는 DECISION_LOG" 한 줄은 허용.
D. **단일 출처 위반·불필요한 중복**: 같은 결정을 두 문서가 서로 다른 말로 설명하거나, 한쪽만 고치면 어긋날 서술. 추적 링크로 ID·수치가 반복되는 것은 중복이 아님(C1 합의). 추가로 **지금도 삭제·축약 가능한 절**이 있으면 제안(문서·절·이유·예상 절감).
E. **U10 일관성**: "명시 호출" 전제가 남아 자율 선택 기본과 모순되는 문장, Codex 설치본 "없음/보류" 전제가 남은 문장, EVIDENCE_SPEC·ROUTING·CONFLICT·MATRIX·MASTER S7·AC·CHECKLIST 사이의 불일치, 그리고 **U10 자체의 설계 결함**(예: 자율 선택 시 `SkillSelected` 기록 시점, 기대 스킬 대조가 REWORK를 과도하게 유발할 위험, Codex 자율 선택이 실제로 `skills/list` 노출만으로 동작하는지에 대한 UNVERIFIED 누락).
F. **새로 생긴 모순·오류**: 정리 과정에서 문장을 줄이며 뜻이 바뀐 곳(예: 조건부 보장의 사전조건 탈락, "차단"과 "경고"의 혼동, S1a/S1b/S1c 분할 표기 불일치, 보고서 11건 수 불일치).

## 출력 형식 (한국어, Markdown)

1. **요약**: 항목 A~F별 건수와 심각도 분포(Critical/High/Medium/Low). 전체 판정 한 줄: "정리본 수용 가능 / 수정 후 수용 / 재작업 필요".
2. **판정표**(A~F 각각 하나의 표): `| # | 문서 | 위치(절·표 행, 원문 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 수 있는 문장) |`. 근거 없는 추측은 쓰지 말고, 확인하지 못한 것은 `UNVERIFIED`로 표기.
3. **추가 삭제 제안**(D): `| 문서 | 절 | 이유 | 예상 절감 |`.
4. **삭제 금지 재확인**: C1에서 지정한 삭제 금지 항목이 모두 살아 있는지 항목별 ✅/❌.
5. **C3(재확인 호출)에서 당신이 다시 볼 파일 목록** — 수정이 필요한 파일만.

심각도 기준: Critical = 결정·수치·보장 조건이 사라졌거나 뜻이 반대로 바뀜; High = 참조가 깨져 구현 담당자가 잘못 찾아감; Medium = 이력·중복 잔존; Low = 문체·표기.
