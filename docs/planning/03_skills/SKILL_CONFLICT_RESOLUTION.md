# SKILL_CONFLICT_RESOLUTION — 중복·충돌 스킬 주도 결정

| 메타 | 값 |
|---|---|
| 상태 | **v2 (2026-11-02, P00 S7 반영)** — §2 TDD·디버깅·코드 리뷰 3행 + §3 횡단 1건 **확정**(각 1회 실측, `docs/spikes/skill_conflict_experiments/01~04`), 나머지 5행(요구사항 심문·계획·구현·스킬 제작·UI 디자인)은 **잠정 유지 → P07 재검증**(§5). v1 = FINAL (2026-11-01) 잠정 주도 |
| 출처 | 지시서 §7.1(8개 중복 행), §6(Superpowers·Ponytail 우선 평가), 기준 문서 §4.6 |
| 근거(정독 기록) | `archive/evidence/skill_analysis_part1.md` "중복 쌍별 핵심 차이", `part2.md` ponytail 충돌 메모, `SKILL_COMPATIBILITY_MATRIX.md` |
| UNVERIFIED | §2 5행(요구사항 심문·계획·구현·스킬 제작·UI 디자인)의 실행 결과 기반 판정(P07). 확정 3행+1건도 **1회 실측**이라 통계적 결론은 아님 |

## 1. 결정 원칙

1. 기준 문서 §4.6 유지: **개발 절차 우선 = Superpowers**, **구현 복잡도 억제 = Ponytail**, **요구사항·명세·티켓 = mattpocock(명시 호출)**, **같은 단계에 주도 스킬 하나**.
2. 사용자 전용 스킬(`disable-model-invocation`)은 자동 라우팅 대상이 아니므로 "주도 스킬"이 될 수 없다(사용자가 직접 부를 때만).
3. 깨진 참조가 있는 스킬은 주도 불가(grill-me, grill-with-docs, wayfinder, cavecrew).
4. Agent Studio는 **두 에이전트가 교차 리뷰**하므로 "서브에이전트 리뷰어를 띄우는" 스킬(requesting-code-review, code-review의 병렬 서브에이전트)은 Claude 단독 세션에서만 의미가 있다.
5. Codex에서도 동작해야 하는 단계(TDD, 디버깅, 완료 검증)는 Claude 전용 요소가 없는 쪽을 우선한다.

## 2. 행별 결정 (3행 확정 · 5행 잠정)

| 기능 | 후보 A (superpowers) | 후보 B | 잠정 주도 | 나머지 처리 | 근거 | Phase 00 실험 |
|---|---|---|---|---|---|---|
| 요구사항 심문 | brainstorming | grill-me, grill-with-docs | **brainstorming** | grill-me·grill-with-docs **제외**(grilling 미설치) | B는 현재 동작 불가. A는 자동 트리거·승인 게이트 보유. 시각 서버는 비활성 | 같은 기능 요청을 brainstorming만으로 수행, 질문 수·설계 문서 품질 기록 |
| 계획 | writing-plans | wayfinder, to-spec, to-tickets | **writing-plans** | to-spec·to-tickets **조건부(사용자 호출, 트래커 사용 시)**, wayfinder **제외** | B는 전부 사용자 전용이고 트래커 중심. Agent Studio는 자체 Phase/Task 저장소가 트래커 역할 | writing-plans 산출물을 Phase Manager 스키마로 변환 가능성 검증 |
| 구현 | executing-plans, subagent-driven-development | implement-spec (+cavecrew, orchestration) | **executing-plans** | SDD **조건부(Claude 전용, 독립 Task 다수일 때)**, implement-spec **조건부(사용자 호출)**, cavecrew·orchestration **보류** | implement-spec은 사용자 전용·병렬 worktree 머지 → 위험. Agent Studio 오케스트레이터가 병렬·배분을 담당하므로 스킬 수준 병렬화 불필요 | 동일 계획을 executing-plans로 Claude·Codex 각각 실행, 원장(progress.md) 생성 확인 |
| TDD | test-driven-development | tdd | **test-driven-development** ✅ 확정(S7 실험 1) | tdd **비활성(Claude 라우팅 제외, Codex 미설치)** | A는 Claude 전용 요소 없음, Iron Law 강제형이 자동 실행에 적합. B는 seam 사용자 사전 확인(상호작용) 필요 | 같은 버그 수정을 두 스킬로 수행, 테스트 선행 여부·재작업 횟수 비교 |
| 디버깅 | systematic-debugging | diagnosing-bugs | **systematic-debugging** ✅ 확정(S7 실험 2) | diagnosing-bugs **조건부(성능 회귀·재현 어려운 버그, "diagnose" 명시 요청)** | A는 4단계 절차와 3회 실패 에스컬레이션이 EXECUTION_LIMITS와 맞물림. B의 피드백 루프 구축은 성능 이슈에 강점 | S7: 재현 가능한 버그 1건 비교(1회); 성능 회귀 비교는 P07 추가 실험 |
| 코드 리뷰 | requesting-code-review | code-review (+caveman-review, ponytail) | **code-review** ✅ 확정(S7 실험 3; Codex 단일 패스 변형 동작 확인, Claude도 교차 리뷰에서는 단일 패스 지시 권장) | requesting-code-review **비활성**(교차 에이전트 리뷰가 대체), caveman-review **조건부(출력 압축 실험)**, ponytail 리뷰 모드 **해당 없음**(리뷰 모드 미기재) | 교차 리뷰에서 리뷰어는 "요청"이 아니라 "수행"을 함. code-review의 Standards/Spec 두 축이 교차 리뷰 산출 형식에 맞음. 단 병렬 서브에이전트는 Codex에서 불가 → Codex는 단일 패스 변형 | Claude 구현 → Codex가 code-review 지시로 리뷰, 역방향도 수행. 서브에이전트 없이 동작하는지 확인 |
| 스킬 제작 | writing-skills | skill-creator | **writing-skills** | skill-creator **조건부(eval·벤치마크 필요 시, Claude 환경)** | A는 문서 TDD 방식·스크립트 가벼움. B는 `claude -p` 서브프로세스·로컬 서버·포트 kill | Agent Studio 전용 스킬(예: 증거 기록 스킬) 1개를 writing-skills로 제작 |
| UI 디자인 | — | frontend-design, impeccable, design-taste-frontend, ui-ux-pro-max (+web-design-guidelines) | **ui-ux-pro-max**(디자인 체계, 프로젝트 초기 1회) → **frontend-design**(구현) | impeccable **보류→격리 시험 후 후처리**, design-taste-frontend **조건부(공개 페이지·대시보드 다듬기)**, web-design-guidelines **보류(원격 지시) → 규칙 사본 고정 후 감사용** | 기준 문서 §4.6의 세 스킬 조합을 유지하되 순서는 ROUTING_POLICY §2(디자인 체계 → UI 구현)와 같고 impeccable은 후처리. impeccable은 바이너리 다운로드·hook 때문에 격리 선행 | Agent Studio Workspace 화면 1개를 frontend-design + ui-ux-pro-max로 설계, impeccable은 격리 환경에서 critique만 |

## 3. 횡단 충돌

| 충돌 | 결정 |
|---|---|
| `using-superpowers` 노출 vs mattpocock 자동 트리거 | 에이전트 자율 선택이 기본(U10)이므로 Router는 `using-superpowers`의 노출 가능 여부만 판정하고, 에이전트가 고른 결과를 경쟁 스킬과 대조한다. Phase 00 S7에서 "Fix this bug"·"Plan this feature" 류 프롬프트로 어느 스킬이 선택되는지 양 에이전트 각 **1회** 기록 → §4의 0번 확정 규칙에 반영. **S7 결과(4회 표본, 실험 4)**: mattpocock 스킬 자동 선택 0/16 → 실제 충돌 없음. Claude는 fix 프롬프트에서 스킬을 고르지 않음(0/4, 구현 먼저·테스트 뒤), plan은 writing-plans(4/4); Codex는 8/8에서 관련 SKILL.md를 읽고(성공·출력 확인) 절차를 따름. **확정 규칙**: Claude Task는 주도 스킬 명시 주입이 기본, Codex Task는 자율 선택 허용 + SKILL.md 읽기 미관찰 시 REWORK 명시 주입 |
| ponytail vs test-driven-development("Trivial changes need none") | **TDD 우선**. ponytail은 full 레벨로 두되 "테스트 생략" 조항은 Agent Studio 라우팅 정책에서 무효화 명시 |
| ponytail vs caveman(세션 상주, 같은 "normal mode"로 해제) | 동시 활성 금지. 기본 ponytail, caveman은 실험 Task에서만 |
| ponytail ultra vs impeccable/design-taste-frontend("Finish the job") | UI Task에서는 ponytail lite로 강도 낮춤 |
| ponytail "Never add a dependency" vs find-skills/agent-browser 전역 설치 | 설치는 의존성 설치 영역(ALWAYS_ASK, 앱 설치 실행기 정식 경로). 충돌 없음 |
| git-guardrails-claude-code vs Agent Studio ApprovalBroker | Agent Studio 내부 실행에서는 hook 미설치(이중 차단 방지). Claude 단독 개발 세션에서만 선택 설치 |

## 4. 확정 절차

0. **실험 범위**: P00 S7에서는 **4실험 각 1회** = §2 8행 중 **3행**(TDD: test-driven-development vs tdd / 디버깅: systematic-debugging vs diagnosing-bugs / 코드 리뷰: code-review 단일 패스) + §3 **횡단 충돌 1건**(`using-superpowers` 노출 vs mattpocock 트리거). §2 나머지 **5행**(요구사항 심문·계획·구현·스킬 제작·UI 디자인)은 SKILL.md 비교 근거로 잠정 결정을 유지하고, 실제 충돌(같은 Task에서 두 스킬이 동시에 트리거)이 관찰될 때만 P07에서 추가 실험한다.
1. Phase 00 Task S7에서 위 4실험을 수행하고 결과를 `docs/spikes/skill_conflict_experiments/`에 기록(증거 인용 필수 — Claude는 Skill 도구 호출 블록, Codex는 `skills/list`·선택 관찰·고유 절차 이벤트).
2. 각 행의 주도 스킬을 확정하고, 비활성 스킬은 `~/.claude/skills`에서 **삭제하지 않고** 라우팅 정책에서 제외만 한다(사용자 승인 없이 설치본 변경 금지).
3. Codex용 설치본은 주도 스킬 8종(U5, 구현 착수 시 C4 승인) — 설치 전 Task는 스킬 없이 수행·사유 기록.

## 5. P00 S7 실험 결과 (v2, 2026-11-02)

| 실험 | 비교 | 결과 | 결정 | 기록 |
|---|---|---|---|---|
| 1 TDD | test-driven-development vs tdd (Claude 명시 호출, 같은 버그) + Codex `{type:"skill"}` 주입 | 행위 동등(테스트 선행·RED→GREEN·재작업 0, 4회 모두); Codex는 주입만으로 같은 절차 | **test-driven-development 확정**(원칙 5 + C4 명단; 범위 = 이 시나리오에서 절차 재현) | `docs/spikes/skill_conflict_experiments/01_tdd.md` |
| 2 디버깅 | systematic-debugging vs diagnosing-bugs (median 버그) | 둘 다 재현 < 구현 편집, 같은 수정(4회); diagnosing-bugs가 시간 +28~53%·비용 +5~23% | **systematic-debugging 확정**(범위 = 재현 가능한 단순 버그), diagnosing-bugs 조건부(성능 회귀·"diagnose" 명시) | `02_debugging.md` |
| 3 코드 리뷰 | code-review: Codex 단일 패스 / Claude 서브에이전트 2개 (서로 다른 구현 대상) | 절차 시그니처(기준점 git + 스펙/표준 출처 읽기)·두 축 출력·무변경 모두 충족(4회); Codex Spec 오탐 1건(Task 범위 미전달, 4/4); Claude 비용 3.4배 | **code-review 확정 — 범위 = 이 시나리오에서 절차·형식 재현**(Codex 단일 패스 동작). 리뷰 품질 비교는 아님(Codex 리뷰 #12) | `03_code_review.md` |
| 4 횡단 | using-superpowers 노출 vs mattpocock 트리거 (자동 선택 2종 × 2 에이전트 × 4회) | mattpocock 자동 선택 0/16; Claude fix 0/4·plan 4/4, Codex 8/8 | 이 프롬프트 2종에서는 충돌 없음 → "노출은 선택을 보장하지 않음"으로 재정의, §3 1행 확정 규칙 | `04_auto_selection.md` |

**잠정 유지 5행과 P07 재검증 조건**: 요구사항 심문(brainstorming — Codex 미라우팅이라 비교 대상 없음, P07에서 질문 수·설계 문서 품질 기록) / 계획(writing-plans — S7 실험 4에서 양 에이전트가 자율 선택했으므로 주도는 사실상 뒷받침되나 "Phase Manager 스키마 변환 가능성"은 미실측) / 구현(executing-plans — Codex에서 스크립트 bash 전제 미검증) / 스킬 제작(writing-skills — 전용 스킬 1개 제작 실험 미수행) / UI 디자인(ui-ux-pro-max→frontend-design — Workspace 화면 1개 설계 실험 미수행, impeccable 격리 시험 미수행). 각 행은 같은 Task에서 두 스킬이 동시에 트리거되는 실제 충돌이 관찰될 때 P07에서 1회 실험한다(§4 0번). **확정 3행+1건의 P07 재검증 조건**(Codex 리뷰 #12): 코드 리뷰는 같은 구현을 두 에이전트가 ReviewPacket(Task 범위 포함)으로 리뷰해 Spec 오탐이 사라지는지, TDD는 seam·통합 테스트가 필요한 Task, 디버깅은 성능 회귀 1건.

**S7가 드러낸 시그니처 제약**: 시그니처는 **절차** 신호이고 경쟁 스킬(tdd, diagnosing-bugs)의 실행도 주도 스킬 시그니처에 일치한다 — 등급은 **정체** 신호(Claude Skill 블록 / Codex 주입 수락·SKILL.md 읽기)와 결합해서만 올린다(Codex 리뷰 #1). Codex에 `{type:"skill"}`을 주입하면 SKILL.md 읽기 명령이 사라지므로(실험 1·3) 주입 Task는 주입 수락 + 시그니처로, 자율 선택 Task는 SKILL.md 읽기 commandExecution(성공·출력) + 시그니처로 판정한다.
