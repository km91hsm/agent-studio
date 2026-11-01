# DEVELOPMENT_SKILL_ROUTING_POLICY — Task 유형 → 스킬 선택·검증 규칙

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 적용 대상 | (1) Agent Studio를 개발하는 Claude Code·Codex 세션 (2) Agent Studio 제품의 Skills Router 초기 정책(REQ-SK-04·11·12) |
| 관련 | `SKILL_CONFLICT_RESOLUTION.md` 잠정 주도 스킬, `SKILL_COMPATIBILITY_MATRIX.md` 분류, `SKILL_EXECUTION_EVIDENCE_SPEC.md` |

## 1. 기본 규칙

1. **에이전트 자율 선택 기본(U10)**: Claude·Codex가 Task 프롬프트를 분석해 스스로 스킬을 고른다(`selection_reason=AGENT_SELF`, `invocation_mode=implicit`). 앱은 노출 범위(3·4항 필터)와 §2의 **기대 주도 스킬**을 기준으로 선택 결과를 검증한다. 사용자 `/name`·Task 설정의 명시 호출은 항상 우선(`USER_EXPLICIT`)하며, 기대 스킬 미선택·오선택 시 REWORK에서 명시 호출로 교정한다(§4). 사용자가 명시한 허용 스킬은 기대표와 달라도 오선택으로 보지 않는다.
2. **Task·단계당 주도 스킬 1개 + 보조 스킬 ≤2개**. 보조는 원칙 스킬(ponytail, verification-before-completion) 또는 해당 단계의 규칙 스킬(UI 구현 단계의 vercel-react-*) 한정. Phase 표(USAGE_PLAN §1)에 여러 스킬이 나열되면 **단계별로 분해**해 읽는다 — 디자인 체계(ui-ux-pro-max) → UI 구현(frontend-design) → 테스트(TDD) → 검증은 서로 다른 단계이며 한 Task에 동시 적용되지 않는다.
3. **사용자 전용 스킬은 라우터가 선택하지 않는다.** 필요하면 사용자에게 "이 Task는 `/to-spec`이 적합합니다" 제안만 한다. 제품 Router의 자동 후보 필터는 단일 규칙 `registry.user_only == false AND classification ∈ {공통, 프로젝트, 조건부}`(= `{보류, 중복제외, 통합, 미확인}` 제외 — 매트릭스 §E enum과 동일)이며, P07 T2 테스트에 폐기(`resolving-merge-conflicts`)·묶음(`superpowers`)·사용자 전용(`to-spec`) 3건이 후보에서 빠지는 단언을 둔다. 표의 복수 스킬은 왼쪽→오른쪽이 단계 순서(계획→구현→테스트→검증)이며 한 단계에 lead는 하나다. Phase 표의 `handoff` 등 사용자 전용 스킬은 lead/support 집합이 아니라 **"사용자 호출 제안" 열**에만 적는다.
4. **보류 분류 스킬은 호출 금지.** 격리 시험 Task에서만 예외.
5. **에이전트별 호환**: Codex 세션에는 Claude 전용 요소(서브에이전트, hooks, Skill 도구) 없는 스킬만 노출. Codex용 설치본 = 주도 스킬 8종 폴더 전체(U5; 구현 착수 시 C4 승인 → P00 S7 전 설치). 설치 전 Task는 "스킬 없이 수행 + 사유 기록".
6. **증거 없으면 미완료**: 필수 스킬의 로드 증거(`SKILL_EXECUTION_EVIDENCE_SPEC` §3)가 없으면 Task는 `VERIFYING` 통과 불가.

## 2. 기대 주도 스킬 표 (Agent Studio 개발용 — 선택 검증 기준, REWORK 시 명시 호출용)

| Task 유형 | 주도 스킬 | 보조 | 담당 기본 | Codex 세션에서 | 비고 |
|---|---|---|---|---|---|
| 요구사항 분석·브레인스토밍 | brainstorming | — | Claude | 미라우팅(상호작용형) | 시각 서버 비활성 |
| 기술 조사 | research | — | Claude(백그라운드 에이전트) | 동일 지시를 프롬프트로 | 1차 출처·인용 필수 |
| 아키텍처·모듈 설계 | codebase-design | ponytail | Claude | 가능(지시만) | DESIGN-IT-TWICE는 선택 |
| 구현 계획 | writing-plans | — | Claude | 가능 | 산출물을 Phase/Task로 등록 |
| 프로토타입 | prototype | ponytail(lite) | 둘 중 하나 | 가능 | 일회용 브랜치 |
| 기능 구현(계획 기반) | executing-plans | ponytail, verification-before-completion | Codex(기본 협업 흐름) 또는 Claude | 가능(스크립트는 bash 전제 → Windows 검증) | SDD는 Claude 전용 선택 |
| TDD | test-driven-development | — | 구현 담당 | 가능 | ponytail "테스트 생략" 무효 |
| 디버깅 | systematic-debugging | — | 구현 담당 | 가능 | 성능 회귀는 diagnosing-bugs |
| 코드 리뷰(교차) | code-review | receiving-code-review(구현자 측) | 구현자의 **반대편** 에이전트 | 단일 패스 변형 | Standards·Spec 두 축 보고 |
| 완료 전 검증 | verification-before-completion | — | 구현 담당 | 가능 | 모든 Task 필수 |
| 브랜치 격리(Task 시작 단계) | using-git-worktrees | — | 구현 담당 | 가능 | 의존성 설치는 승인 |
| 브랜치 마무리(Task 종료 단계) | finishing-a-development-branch | verification-before-completion | 구현 담당 | 가능 | push/merge는 승인(앱 실행기) |
| 디자인 체계(프로젝트 초기 1회, 별도 Task) | ui-ux-pro-max | — | Claude | python3 필요 | `--persist`는 승인 |
| UI 구현(디자인 체계 확정 후) | frontend-design | vercel-react-best-practices, vercel-composition-patterns | Claude | 가능 | React 채택 시. TDD는 같은 Task의 **다음 단계**(주도 교체) |
| UI 다듬기·리디자인 | design-taste-frontend(조건부) | — | Claude | Node 22+·Chrome 필요 | 공개 페이지·대시보드 한정 |
| 웹 접근성 감사 | web-design-guidelines(규칙 사본 고정 후) | — | 둘 중 하나 | 가능 | 원격 fetch 금지 |
| Git 보호 | (ApprovalBroker) | git-guardrails-claude-code(Claude 단독 세션만) | — | 해당 없음 | 이중 차단 방지 |
| Pre-commit | setup-pre-commit | — | Claude | 가능 | 의존성 설치 승인 |
| 세션·작업 전달 | (라우팅 없음 — 앱 handoff 스키마) | — | 오케스트레이터 | 가능 | **사용자 호출 제안**: `/handoff`로 요약 생성 가능 |
| 스킬 제작 | writing-skills | — | Claude | 부분 | Agent Studio 전용 스킬 |
| 브라우저 테스트 | agent-browser(조건부, CLI 설치 승인 후) | — | 둘 중 하나 | 가능 | V2 |
| Merge conflict | (스킬 없음) | verification-before-completion | 구현 담당 | — | 폐기 스킬 대체 없음. 충돌 시 `WAITING_APPROVAL` |
| 컨텍스트 절약 실험 | caveman / caveman-review | — | — | 가능 | 실험 Task만 |
| 해당 없음(Agent Studio) | supabase, supabase-postgres-best-practices, design-mobile-apps, vercel-react-native-skills, orchestration, cavecrew | | | | 제품 Router에는 프로젝트별 조건으로 남김 |

## 3. 제품 Skills Router 초기 정책 (REQ-SK-04)

- 역할: 선택 주체는 에이전트(U10). Router는 (1) 노출 범위 결정(설치·호환·사용자 전용·보류 필터, 프로젝트 기술 스택) (2) Task 유형별 기대 주도 스킬 산출 (3) 에이전트 선택 결과(`SkillSelected`)와 기대값 대조 (4) 사용자 명시 호출 전달.
- 출력: 기대 주도 스킬 1개 + 보조 ≤2개, 관찰된 선택과의 일치 여부, `selection_reason`(기본 `AGENT_SELF`, 명시 호출 `USER_EXPLICIT`, 교정 주입 `ROUTED_BY_POLICY`). 사용자 전용·보류 스킬은 "제안" 채널로만.
- 충돌 감지(REQ-SK-05): 에이전트가 같은 단계에 주도 스킬 둘을 호출했거나 기대값과 다른 스킬을 골랐으면 `SKILL_CONFLICT_RESOLUTION` 결정표로 사후 판정, 미결이면 사용자 선택 요구.
- 명시 호출 주입(사용자 명시·REWORK 교정 시): Claude는 Skill 도구 호출을 유도하는 명시 문장(또는 `/name`), Codex는 `$name` 명시 + (검증 후) app-server 스킬 입력 항목. 어느 쪽도 "이름 포함 = 실행"으로 기록하지 않는다.

## 4. 실패 대응

| 상황 | 대응 |
|---|---|
| 스킬 미설치·경로 불일치 | Claude 측: Task를 `BLOCKED(skill_missing)`, 사용자에게 설치 제안(승인 필요). **Codex 측(U5 설치 전)**: `skill_unavailable(codex,U5)` 사유 기록 + Claude 교차 리뷰 + 테스트 증거로 완료 게이트 통과(BLOCKED 아님) |
| 기대 주도 스킬 미선택·오선택 또는 로드 증거 없음 | `REWORK` + 프롬프트 재구성(기대 스킬 명시 호출, `ROUTED_BY_POLICY`) 1회, 재실패 시 `BLOCKED` |
| 사용자 명시 호출(`USER_EXPLICIT`)이 기대표와 다름 | 허용 스킬이면 REWORK 없음(기대표 불일치만으로 교정하지 않음, 대조 결과만 `SkillSelectionReviewed`로 기록). 금지·보류·비호환 스킬이면 사유 표시 + 실행 거부 |
| 스킬이 금지 동작 요구(전역 설치, push 등) | **제품 프로젝트의 원격 Git**: 승인 요청이 발생하면 ApprovalBroker가 DENY; 셸 우회 가능 모드에서는 사후 감사로 탐지(보장 수준 SECURITY §2.1) — 스킬은 계속 사용. **Agent Studio 개발 저장소**: 커밋마다 public 저장소 push 허용(C7; CHECKLIST D1, 첫 push 전 R22 점검) — 이 행의 DENY 대상이 아님 |
| 두 스킬 동시 트리거 | `conflict_note` 기록, 주도 스킬 외 지시는 무시하도록 재프롬프트 |
