# C4 — 정리본 독립 최종 검증 (새 세션, 호출 4/6)

당신은 이 작업을 처음 보는 독립 검증자입니다. `D:\LLM\agent-studio\docs\planning`에는 Agent Studio(Claude Code × Codex 통합 데스크톱 AI 개발 프로그램) 구현 마스터플랜의 **최종 정리본**이 있습니다. 정리 전 원본은 커밋 `1ff4372`(`git show 1ff4372:docs/planning/<경로>`), 정리본은 커밋 `402a5c0` + 작업 트리 수정분입니다. 정리 목적: 리뷰 이력·토론 과정을 `archive/`로 빼고, 설계 결정은 하나도 잃지 않으면서 구현 담당자가 읽을 설계 문서만 남기기. 샌드박스는 read-only입니다. 문서를 다시 쓰지 말고 지적만 하십시오.

## 읽을 순서
1. `docs/planning/README.md`(문서 지도·결정 요약·단일 출처 규칙) → `docs/planning/archive/DECISION_LOG.md` §1(사용자 결정 U1~U10)·§6(정리 기준).
2. 활성 문서 전부: `00_product/`(2) `01_architecture/`(3 + `adr/` 8 + README) `02_agents_state/`(5) `03_skills/`(5) `04_security_test/`(4) `05_plan/`(5).
3. `docs/planning/archive/codex/C4_independent_verify/inventory_before.json` — 정리 전 활성 문서에서 기계 추출한 ID·수치·enum 목록. 키는 정리 전 파일 경로입니다 — `01_architecture/ARCHITECTURE_COMPARISON.md`는 `TECH_STACK_DECISIONS.md` §1에 통합되고 원문은 `archive/06_codesign/`로 이동, `ADR-0007-인증-모드를-공급자별-1급-설정으로,-MVP-기본-API-key.md`는 `ADR-0007-인증-모드-CLI-로그인-재사용-기본.md`로 개명되었으므로 해당 항목은 그 위치에서 찾으십시오.

## 검증 항목 (전부 수행, 근거 없는 추측 금지, 확인 못 한 것은 UNVERIFIED)
A. **결정 인벤토리 대조**: inventory_before.json의 모든 항목이 정리본 활성 문서(archive 제외) 어딘가에 있는지. 없는 것은 "손실"로 보고하고, `git show 1ff4372:…`에서 어떤 문맥이었는지 인용. 기계 대조로 잡히지 않는 **의미 손실**도 찾으십시오: 조건부 보장의 사전조건, 수치의 단위·방향(상한/하한), "차단"과 "경고"의 구분, 기본값(안전 모드 기본·CLI 로그인 재사용 기본·CODEX_HOME 공유 기본·에이전트 자율 스킬 선택 기본).
B. **교차 참조 유효성**: 절 번호(§n·§n.m), 문서명, ADR 파일명, AC/TEST/REQ/CAP/R/V/D/U ID, 경로(`archive/…`, `docs/spikes/…`는 구현 시 생성 경로)가 가리키는 대상이 실제로 존재하고 같은 내용인지. 표본이 아니라 **전수** 확인.
C. **이력 잔존 0 확인**: 리뷰 ID(`R4B-23` 류), 라운드 표식, "결정 전 기본", "철회", "당시", "과거 권고", "Codex 권고/Claude 제안", "미재검증", 양측 입장 병기, 계획 수립 과정 전용 문장. 허용: 메타 `상태 | FINAL (2026-11-01)`, ADR `배경 기록` 행의 archive 경로, OPEN_ISSUES "결정 경위는 DECISION_LOG" 한 줄, 결정 식별자 `(U1)`~`(U10)`·`(C5)`·`(C7)` 태그.
D. **단일 출처**: 같은 결정을 두 문서가 다른 말로 설명해 한쪽만 고치면 어긋나는 곳. 추적용 ID·수치 반복은 중복 아님.
E. **구현 담당자 관점**: 이 문서만 받은 엔지니어가 P00 첫 Task(public GitHub 저장소 생성·첫 push 전 점검)부터 P01까지 진행할 때 막히는 곳 — 정의되지 않은 용어, 결정이 미뤄진 채 "확정"으로 쓰인 곳, 두 문서가 다른 숫자를 주는 곳.

## 출력 형식 (한국어, Markdown)
1. 요약: 항목 A~E 건수·심각도(Critical/High/Medium/Low), 전체 판정 한 줄("수용 가능 / 수정 후 수용 / 재작업 필요").
2. 판정표(A~E 각각) `| # | 문서 | 위치(절·표 행, 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 문장) |`.
3. 인벤토리 대조 결과: 손실 0이면 "손실 없음", 있으면 항목 전부.
4. C5(재검증)에서 다시 볼 파일 목록.

심각도: Critical = 결정·수치·보장 조건 손실 또는 뜻 반전; High = 참조가 깨져 잘못 찾아감; Medium = 이력·중복 잔존; Low = 표기.
