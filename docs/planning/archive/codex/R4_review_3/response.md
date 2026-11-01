### 요약

보안 매트릭스는 지시서 §11.1의 11영역을 모두 다루며, worktree와 Claude native Windows의 격리 한계도 명시한다. 그러나 고위험 효과의 **앱 실행기 강제**는 셸 우회 가능성과 충돌하고, 이를 불가능하다고 단언하는 AC가 있다. 지시서 §20의 35개 시나리오는 모두 ID가 있지만 다수는 필수 테스트 필드가 빠져 있다. Phase DAG 자체는 순환이 없으나 상세 의존성, V1 기능 순서, Phase별 18항목 명세가 일치하지 않는다. **Critical 2건, High 11건, Medium 9건**을 아래에 제시한다.

### 발견 사항

| ID | 심각도 | 영역 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|---|
| R4C-01 | Critical | 보안 강제 | [SECURITY_MODEL.md §2](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:34>), [ACCEPTANCE_CRITERIA.md P10a](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:35>) | 원격 Git·DB·설치·배포를 “앱 실행기만” 통과시킨다는 AC가 보장 범위를 과장한다. | 보안 모델 §2는 셸 우회 가능 모드에서 해당 효과가 반드시 승인된다고 표시하지 말라고 인정한다. 반면 `AC-P10a-5`는 앱 실행기 *외 경로 실행 불가*를 단위 테스트로 단언한다. | 일반 모드의 AC는 우회 가능성 표시와 탐지 시험으로 바꾸고, 실행 전 강제가 필요한 효과는 엄격 모드의 실제 실행 경로로 제한한다. 셸·MCP·Hook 우회 시험을 릴리스 게이트에 넣는다. |
| R4C-02 | Critical | 격리 게이트 | [SECURITY_MODEL.md §3–4](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:48>), [PHASE_BREAKDOWN.md P00](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:54>), [ACCEPTANCE_CRITERIA.md P00](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:20>) | P00의 격리 시험 S4가 실패해도 다음 Phase 진입 조건에서 막지 않는다. | Windows Codex 차단은 실측 대상으로 남겨 두었는데 `AC-P00-7`은 시험 **결과 기록**만 요구하고 P01 진입 조건에는 S4가 없다. “신뢰하지 않는 저장소는 읽기 전용”이라는 정책도 Claude native Windows에서 어떻게 강제할지 지정하지 않는다. | S4에 경로·네트워크별 합격 기준을 부여한다. 실패 시 해당 공급자·모드의 쓰기 및 무인 실행을 비활성화하도록 P00 게이트에 연결한다. |
| R4C-03 | High | 권한 모델 | [SECURITY_MODEL.md §2–3](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:31>) | 11영역 모두 기본값·범위·신호·강제 경로가 있지만, 파일·명령·네트워크·MCP의 강제 경로가 모드별로 불충분하다. | 파일·명령·네트워크는 브로커와 공급자 샌드박스에 의존한다. 같은 문서는 Claude native Windows에 OS 샌드박스가 없다고 명시한다. 명령 문자열 분류는 “보조”라고 쓰였으나 우회 시 실제 집행자가 없다. | 매트릭스의 각 행에 **공급자·OS·실행 모드별 보장 수준**을 추가한다. 강제 불가능한 조합에서는 `DENY` 또는 사용자 참석·변경 검토로 범위를 좁힌다. |
| R4C-04 | High | 실행 시간 | [EXECUTION_LIMITS_POLICY.md §1·§4](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:14>) | “승인 대기는 작업 시간에서 제외” 규칙을 현재 시간 계산식으로 구현할 수 없다. | 작업 시간은 활성 **턴 시간의 합**이고, 턴 시간은 `turn.started→turn.completed`다. 승인 요청이 턴 안에서 15분 대기하면 그 시간이 합계에 들어간다. 재부팅 후 `TaskTransition`만으로 턴 안의 대기 구간도 복원되지 않는다. | 승인 요청·결정·만료 시각을 별도 영속 구간으로 기록하고, 단조 시간 기반 활성 구간 합산 규칙과 재기동 계산 예제를 명시한다. 경계·재부팅 테스트를 추가한다. |
| R4C-05 | High | 복구 | [SECURITY_MODEL.md §8](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:103>), [EXECUTION_LIMITS_POLICY.md §6](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:65>) | `BLOCKED(approval_expired)`에서 새 승인으로 수동 재개할 때 완료된 효과를 다시 실행하지 않는 절차가 없다. | “diff 재확인 후 새 승인”은 쓰기 상태 확인일 뿐, 공급자 턴의 재개 위치·이미 수행한 도구 호출·외부 서비스 효과를 특정하지 않는다. `effects` 대조는 앱에 기록된 효과에 한정된다. | 만료된 턴은 재사용하지 않고 효과별 상태 대조, 완료 단계 건너뛰기, 남은 단계 재계획을 필수 전이로 정의한다. 공급자 도구의 미기록 효과가 있으면 자동 재개를 막는 시험을 둔다. |
| R4C-06 | High | 보안 테스트 | [SECURITY_MODEL.md §2](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:34>), [TEST_STRATEGY.md SE-01](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:66>) | `TEST-SE-01`의 기대값이 정책과 모순된다. | 원격 `git push` 기본값은 `DENY`인데 시험은 에이전트의 `git push` 시도에 `ASK→승인 후 실행`을 기대한다. | 기본 정책의 직접 push 거부와 사용자가 명시한 원격 Git 작업의 앱 실행기 승인 시험을 분리한다. |
| R4C-07 | High | 테스트 완전성 | [USER_DIRECTIVE.md §20](<D:/LLM/agent-studio/docs/planning/evidence/USER_DIRECTIVE.md:638>), [TEST_STRATEGY.md §2](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:39>) | 35개 ID는 존재하지만 모든 시나리오에 환경·사전조건·입력·예상·실패처리·증거가 정의되지는 않았다. | 협업 6건은 환경·사전조건·입력·실패처리가 없고, 데스크톱 8건은 사전조건·입력·실패처리·증거가 없다. 상태·복구는 상세 문서로 일부 보완되나 `RC-06·07`은 직접 대응하는 완전한 명세가 없다. | 아래 커버리지 표의 빈 필드를 채우고, 각 ID를 하나의 실행 가능한 명세와 증거 경로에 연결한다. |
| R4C-08 | High | 실호출 검증 | [TEST_STRATEGY.md §1·§3](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:15>) | 녹화 픽스처 재생을 실제 에이전트 시험의 기본 대체재로 쓰는 범위가 너무 넓다. | 재생은 어댑터 파싱·상태 전이에 유용하지만 설치 버전의 승인 콜백, 무승인 쓰기, OS 격리, 실제 스킬 로드, 중단 후 자손 정리를 증명하지 못한다. 야간 실호출과 릴리스 게이트의 시나리오별 의무 연결도 없다. | 계약 테스트는 재생하되, P00·릴리스 게이트에서 양 공급자의 승인 왕복·실제 쓰기·중단/재개·스킬 로드, 설치물의 프로세스/격리 시험을 실호출로 필수화한다. |
| R4C-09 | High | MVP 범위 | [USER_DIRECTIVE.md §1](<D:/LLM/agent-studio/docs/planning/evidence/USER_DIRECTIVE.md:79>), [MASTER_IMPLEMENTATION_PLAN.md §3](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:43>) | MVP 게이트가 지시서의 핵심 사용자 경험 전체를 충족하지 않는다. | 핵심 흐름의 Phase 생성·Skills 선택·Claude/Codex 협업은 각각 P06·P07·P09로 V1에 있다. MVP는 두 단독 모드와 Diff·복구에 한정된다. | MVP를 **단독 에이전트 내부 검증판**으로 명확히 부르고, 핵심 사용자 경험 완성 게이트는 V1에 둔다. 제품 MVP 명칭을 유지하려면 세 기능의 최소 흐름을 앞당긴다. |
| R4C-10 | High | 스킬 증거·의존성 | [MASTER_IMPLEMENTATION_PLAN.md Global Constraints](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:27>), [PHASE_BREAKDOWN.md P07](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:83>) | 모든 Task의 `SkillLoadObserved`·Verifier 완료 게이트를 요구하지만 증거 파이프라인 구현은 MVP 이후 P07이다. | P01~P11a에는 같은 게이트가 적용되나 관찰·투영·Verifier의 선행 구현 Task가 없다. 수동 계획 로그가 제품 Task 게이트를 대체하는지도 정의하지 않는다. | P01/P02에 최소 증거 수집·검증기를 선행시키거나, P07 이전에는 검증 가능한 수동 증거 프로토콜과 종료 게이트를 별도로 명시한다. |
| R4C-11 | High | Phase 의존성 | [PHASE_BREAKDOWN.md P08a·P09·DAG](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:74>) | 상세 선행 조건과 DAG가 다르고, P09가 아직 도입되지 않은 V1 병렬 worktree 동작을 범위에 둔다. | P08a 상세는 선행을 P03으로 적지만 DAG는 P05 뒤에 둔다. P09의 Manual 비교 뷰는 “V1 worktree 병렬 허용 후”라고 쓰면서 P10b보다 앞선다. 그래프 자체는 비순환이지만 구현 순서 설명은 모순된다. | P08a 의존성을 통일하고 P09의 비교 뷰를 순차형으로 한정하거나 worktree 병렬 기반을 P09 전에 이동한다. |
| R4C-12 | High | P00 시험 설계 | [MASTER_IMPLEMENTATION_PLAN.md S1](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:63>), [SECURITY_MODEL.md §2](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:42>) | S1의 첫 실패 테스트가 `fileChange/requestApproval` 수신을 동시에 단언해, 정상적인 자동 쓰기 동작도 실패로 판정할 수 있다. | 같은 S1의 후속 시험은 `workspaceWrite`에서 승인 요청 **없이** 파일이 변경되는지 확인한다. | 승인 필요 경로와 자동 쓰기 경로를 별도 테스트로 나누고, 어느 이벤트가 없을 때 합격인지 먼저 정의한다. |
| R4C-13 | High | 백그라운드 수용 | [ARCHITECTURE_DEBATE.md §3](<D:/LLM/agent-studio/docs/planning/06_codesign/ARCHITECTURE_DEBATE.md:75>), [ACCEPTANCE_CRITERIA.md P11a](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:65>) | 합의한 백그라운드 수용 시험 5개가 독립 TEST-ID와 증거로 풀리지 않았다. | `AC-P11a-2`는 “5개 전부”라고만 하며, 트레이 종료 시 새 턴 차단·승인 거절·자손 정리의 입력과 단언이 `TEST_STRATEGY`에 없다. | 5개에 독립 ID를 주고 실제 Windows 설치물에서 프로세스 목록·run ID·seq·승인 상태를 남긴다. |
| R4C-14 | Medium | 제한값 근거 | [EXECUTION_LIMITS_POLICY.md §1·§5](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:12>) | 지시서 §12의 9행과 10개 검토 질문은 명목상 다뤘지만, 값의 근거와 규모별 조정 규칙이 부족하다. | 표에는 권장값·범위·예외·시험이 있으나 행별 근거가 없다. 프로젝트/일/작업 토큰·호출 한도의 기본 수치도 비어 있다. | 실측 전 임시값임을 표시하고, 규모별 변경 조건·측정 항목·상한 초과 시 표시 동작을 정의한다. 비용 미제공 환경의 토큰 한도에도 기본값을 준다. |
| R4C-15 | Medium | Review Focus | [MASTER_IMPLEMENTATION_PLAN.md Review Focus](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:31>), [PHASE_BREAKDOWN.md P02·P11a](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:62>) | Review Focus 5건 모두 소유 Phase/Task는 지목했으나 일부 시험이 해당 Task·AC에 내려오지 않았다. | 무승인 쓰기 배지, 만료 `requestId`, 프로토콜 불일치, 저장 해시 충돌, 인증 모드 불일치가 §Review Focus의 문장으로만 있고 P02·P08a·P11a 등의 Task 테스트 목록에는 ID가 없다. | 각 Focus에 TEST-ID·소유 Task·AC를 하나씩 붙인다. 특히 업데이트 중 데몬 버전 불일치는 설치물 시험으로 둔다. |
| R4C-16 | Medium | Phase 명세 | [USER_DIRECTIVE.md §17](<D:/LLM/agent-studio/docs/planning/evidence/USER_DIRECTIVE.md:604>), [PHASE_BREAKDOWN.md §2](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:42>) | 원래 00–12의 13개 범위는 추적되지만, 분할된 각 Phase에 18항목이 모두 기입되지는 않았다. | 특히 P08b와 묶음 P10b+P11b, P12+P08c+P11c는 선행 조건·모듈·복구·위험·완료 증거가 대부분 없다. 공통 규칙은 Phase 고유값을 제공하지 않는다. | 아래 체크표의 번호를 Phase별로 채우고, 묶음 Phase의 Task·AC·진입 조건을 분리한다. |
| R4C-17 | Medium | P00 규모 | [PHASE_BREAKDOWN.md P00](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:44>), [MASTER_IMPLEMENTATION_PLAN.md S1–S8](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:59>) | 2주 상한에 비해 S1·S2의 기능 목록과 S7의 충돌 실험 8쌍×2회가 크다. | S1만 승인·steer·interrupt·resume·fork·스킬·15분 대기·재연결을 포함한다. S7은 `packages/protocol`과 CI를 생성하므로 “제품 코드 없이 검증” 경계도 넘는다. | S1·S2는 승인/자동 허용·중단·재개 최소 경로, S4·S5·S6·S8은 출고 위험 검증에 집중한다. 고급 fork와 충돌 쌍 반복은 후속으로 옮기고 S7 제품 패키지는 스파이크 산출물과 분리한다. 늦은 승인 클릭·트레이 종료 시험은 추가한다. |
| R4C-18 | Medium | AC 증거 | [ACCEPTANCE_CRITERIA.md P00·V2](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:14>) | 모든 AC에 “AI가 완료라고 말함” 외의 증거 *종류*는 있지만, 일부 증거는 합격을 증명하지 않는다. | 보고서 존재 `AC-P00-1`, S4 결과 기록 `AC-P00-7`, 여러 V2 기능을 한 줄 로그로 묶은 `AC-V2-1`은 실패 기록이나 기능 일부만으로도 형식상 만족할 수 있다. | 조건별 pass/fail 단언, 증거 파일 경로, 설치 버전·OS·실행 시각을 요구한다. V2 복합 AC는 기능별로 나눈다. |
| R4C-19 | Medium | 위험 등록 | [OPEN_ISSUES_AND_RISKS.md §2](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:20>), [MASTER_IMPLEMENTATION_PLAN.md Review Focus](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:35>) | **Critical로 승격해 관리할 위험**이 등록되지 않았다. | 문서는 일반 모드의 고위험 효과 우회를 인정하면서도 불가능 단언 AC를 둔다. 실행 중 업데이트의 데몬·프로토콜·DB 스키마 불일치도 Review Focus에만 있고 위험표에는 없다. | “강제 불가능한 모드에서 보안 보장 표시”를 Critical 위험으로, 업데이트/데이터 마이그레이션 호환성은 별도 High 위험으로 등록하고 출고 차단 조건을 정한다. |
| R4C-20 | Medium | 미결정 사항 | [OPEN_ISSUES_AND_RISKS.md §1–2](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:12>), [ARCHITECTURE_DEBATE.md §4](<D:/LLM/agent-studio/docs/planning/06_codesign/ARCHITECTURE_DEBATE.md:91>) | U1–U7은 표에 있지만 실제 사용자 결정과 이미 합의된 결론이 섞였고 일부 영향이 비어 있다. | U2·U6·U7은 R2-3 합의가 반영된 항목인데 미결 목록에 남아 있다. R6 완화의 “앱 TTL(24h)”는 합의된 15분과 다르다. U3·U4·U5는 선택별 일정·기능 결과가 부족하다. | U1과 남은 승인 사항만 사용자 결정으로 남기고, U2·U6·U7은 결정 이력으로 이동한다. R6을 15분으로 고치고 각 선택지의 차단 Phase·대체 경로를 적는다. |
| R4C-21 | Medium | 보안 시험 대상 | [TEST_STRATEGY.md SE-06·07](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:71>), [SECURITY_MODEL.md §1](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:15>) | “권한 없는 외부 접근 차단” 시험이 데몬 RPC 무토큰 접속만 다룬다. | 프로젝트 외부 파일·네트워크·외부 서비스·MCP를 통한 접근은 이 시험으로 검증되지 않는다. 악성 지침 시험도 브로커 정책 불변만 기대해 실제 도구 호출 결과를 놓칠 수 있다. | RPC 인증 시험을 별도 ID로 유지하고, 외부 경로 읽기/쓰기·네트워크·MCP·악성 지침을 실에이전트와 설치물에서 각각 시험한다. |
| R4C-22 | Medium | 추적성·유지보수 | [TEST_STRATEGY.md RC](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:50>), [RECOVERY_TEST_PLAN.md §2](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:25>) | 동일 복구 요구를 `TEST-RC-01~07`과 `TEST-RC-S01~S18` 두 체계로 관리하면서 대응표가 없다. | `RC-06` Git dirty·충돌 중 상세 S11은 충돌만 다루고, `RC-07` DAG는 상세 복구표에 없다. Phase와 AC는 두 체계를 혼용한다. | 요구 시나리오 ID→상세 시험 ID→Phase→AC의 단일 추적표를 만들고, dirty Git 및 DAG 시험을 명시한다. |

보안 모델의 격리 표현은 대체로 신중하다. 실제 문구는 worktree에 대해 **“충돌 격리만”, “보안 아님”**, Claude native에 대해 **“OS 격리 없음”**이라고 한다. 문제는 이 제한적 보장과 `AC-P10a-5`의 “외 경로로 해당 효과 실행 불가” 단언이 동시에 존재한다는 점이다. 지시서 §12의 9개 행은 모두 정책표에 있으며, 10개 검토 질문도 관련 절에서 각각 언급된다. 다만 승인 대기 시간 계산, 값의 근거, 완료 효과의 재실행 방지는 **답을 적은 것과 구현 가능하게 정의한 것 사이에 차이**가 있다.

### 지시서 §20 35개 시나리오 커버리지 표

아래의 ‘없음’은 요청된 여섯 필드가 문서 또는 명시된 상세 계획에 있다는 뜻이다. `RC`는 [RECOVERY_TEST_PLAN.md](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:8>)의 공통 환경·증거를 함께 확인했다. `—`로 적힌 실패 처리는 필드가 충족된 것으로 세지 않았다.

| 범주 | 지시서 항목 | TEST-ID | 누락 필드 |
|---|---|---|---|
| 에이전트 | Claude 단독 작업 성공 | TEST-AG-01 | 없음 |
| 에이전트 | Codex 단독 작업 성공 | TEST-AG-02 | 없음 |
| 에이전트 | 명령 중단 | TEST-AG-03 | 없음 |
| 에이전트 | 실행 중 추가 지시 | TEST-AG-04 | 없음 |
| 에이전트 | 세션 재개 | TEST-AG-05 | 없음 |
| 에이전트 | 인증 실패 | TEST-AG-06 | 실패 처리 |
| 에이전트 | 사용 한도 초과 | TEST-AG-07 | 실패 처리 |
| 협업 | 계획 → 구현 → 리뷰 | TEST-CO-01 | 환경·사전조건·입력·실패 처리 |
| 협업 | 리뷰 실패 후 수정 | TEST-CO-02 | 환경·사전조건·입력·실패 처리 |
| 협업 | 반복 한도 도달 | TEST-CO-03 | 환경·사전조건·입력·실패 처리 |
| 협업 | 에이전트 간 handoff | TEST-CO-04 | 환경·사전조건·입력·실패 처리 |
| 협업 | 작업 역할 변경 | TEST-CO-05 | 환경·사전조건·입력·실패 처리 |
| 협업 | 스킬 선택·실제 실행 | TEST-CO-06 | 환경·사전조건·입력·실패 처리 |
| 상태·복구 | 앱 종료 후 재개 | TEST-RC-01 → RC-S04 | 없음 |
| 상태·복구 | 비정상 종료 후 복구 | TEST-RC-02 → RC-S03/S05 | 없음. 두 상세 시험 중 어느 것을 합격 기준으로 삼는지 연결 필요 |
| 상태·복구 | 재부팅 후 복원 | TEST-RC-03 → RC-S05 | 실제 재부팅 환경·입력·증거. 현재 전부 kill 후 재기동 모의 |
| 상태·복구 | 중복 실행 방지 | TEST-RC-04 → RC-S15 | 없음. 단, 외부 효과 중복은 별도 검증 필요 |
| 상태·복구 | 불확실한 복구 차단 | TEST-RC-05 → RC-S05/S13 | 없음. 효과 종류별 상세 연결 필요 |
| 상태·복구 | Git 상태 검증 | TEST-RC-06 → RC-S11 일부 | dirty 상태의 사전조건·입력·예상·실패 처리·증거 |
| 상태·복구 | Phase 의존성 처리 | TEST-RC-07 | 사전조건·입력·실패 처리·증거. 상세 복구 시험 없음 |
| 보안 | 위험 명령 승인 | TEST-SE-01 | 환경·사전조건·실패 처리. 예상 결과가 기본 정책과 충돌 |
| 보안 | 승인 거부 | TEST-SE-02 | 환경·사전조건·실패 처리 |
| 보안 | 승인 범위 변경 | TEST-SE-03 | 환경·사전조건·실패 처리 |
| 보안 | 비밀정보 로그 노출 방지 | TEST-SE-04 | 환경·사전조건·실패 처리 |
| 보안 | 스킬 및 Hook 검증 | TEST-SE-05 | 환경·사전조건·실패 처리 |
| 보안 | 권한 없는 외부 접근 차단 | TEST-SE-06 | 환경·사전조건·실패 처리. 입력·예상은 RPC 인증에만 해당 |
| 보안 | 악성 프로젝트 지침 처리 | TEST-SE-07 | 환경·사전조건·실패 처리 |
| 데스크톱 | Windows 설치 및 실행 | TEST-DT-01 | 사전조건·입력·실패 처리·증거 |
| 데스크톱 | macOS 설치 및 실행 | TEST-DT-02 | 사전조건·입력·실패 처리·증거 |
| 데스크톱 | Linux 설치 및 실행 | TEST-DT-03 | 사전조건·입력·실패 처리·증거 |
| 데스크톱 | 코드 편집 | TEST-DT-04 | 구체 OS·사전조건·입력·실패 처리·증거 |
| 데스크톱 | 터미널 | TEST-DT-05 | 구체 OS·사전조건·입력·실패 처리·증거 |
| 데스크톱 | Git Diff | TEST-DT-06 | 구체 OS·사전조건·입력·실패 처리·증거 |
| 데스크톱 | 브라우저 미리보기 | TEST-DT-07 | 구체 OS·사전조건·입력·실패 처리·증거 |
| 데스크톱 | 업데이트 및 롤백 | TEST-DT-08 | 구체 OS·사전조건·입력·실패 처리·증거 |

픽스처 재생은 프로토콜·상태 머신의 회귀 시험으로 타당하다. **실제 공급자와 OS가 통제 경계인 경우**에는 대체가 아니다. 최소한 P00 및 해당 릴리스에서 승인 accept/decline·만료, 무승인 쓰기 탐지, sandbox 경로·네트워크, 실제 스킬 로드, 프로세스 중단·재접속·자손 정리는 실호출 또는 실제 설치물 시험으로 고정해야 한다.

### Phase 18항목 체크

번호는 [지시서 §17](<D:/LLM/agent-studio/docs/planning/evidence/USER_DIRECTIVE.md:606>)의 순서다. 아래는 **Phase별 구체값 또는 해당 내용을 담은 명확한 참조가 없는 항목**이다. [PHASE_BREAKDOWN.md §1](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:32>)의 공통 담당·증거·진입 원칙만으로 Phase 고유 계획이 채워졌다고 세지 않았다. `P10b+P11b`, `P12+P08c+P11c`는 원래 Phase 범위를 추적할 수 있지만 각각의 독립 완료 단위가 정의되지 않았다.

| Phase | 누락 항목 번호 |
|---|---|
| P00 | 없음 |
| P01 | 없음. 11은 `SYSTEM_ARCHITECTURE §6` 참조 |
| P10a | 5, 10, 11, 17 |
| P02 | 5, 10, 11, 17 |
| P04 | 5, 6, 10, 11, 13, 17 |
| P03 | 5, 6, 11, 14, 17 |
| P05 | 5, 6, 10, 11, 13, 15, 17 |
| P08a | 5, 6, 10, 11, 14, 15, 17 |
| P11a | 5, 6, 10, 11, 13, 14, 17 |
| P06 | 5, 6, 10, 11, 13, 14, 15, 17, 18 |
| P07 | 5, 6, 10, 11, 13, 14, 15, 17, 18 |
| P09 | 5, 6, 10, 11, 13, 14, 15, 17, 18 |
| P08b | 3, 4, 5, 6, 8, 10, 11, 14, 15, 16, 17, 18 |
| P10b | 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 17, 18 — P11b와 묶임 |
| P11b | 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 17, 18 — P10b와 묶임 |
| P12 | 3–8, 10–15, 17–18 — V2 묶음 |
| P08c | 3–8, 10–15, 17–18 — V2 묶음 |
| P11c | 3–8, 10–15, 17–18 — V2 묶음 |

의존성 화살표만 보면 `P00→…→MVP→V1→V2`는 비순환이다. 다만 **그래프의 비순환성은 실행 가능성의 충분조건이 아니다**. P09와 V1 worktree 병렬의 선후 관계, P08a의 상세 선행 조건과 DAG 차이는 R4C-11처럼 수정해야 한다.

### 긍정적 확인

- [보안 매트릭스](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:24>)에는 지시서 §11.1의 **11개 영역이 모두** 있으며, 각 행에 기본값·승인 범위·양 공급자 분류 신호·강제 경로가 있다. worktree를 보안 샌드박스로 부르지 않고, Claude native Windows의 한계와 자동 허용 쓰기도 명시했다.
- [실행 제한표](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:10>)는 지시서 §12의 9행을 빠짐없이 다루며, 합의된 `120/20/3/2/프로젝트당 1/15분/90s·20s`를 [Master Global Constraints](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:25>)에도 동일하게 반영했다. 인증·한도·불확실 효과의 재시도를 0으로 분리한 점은 유효하다.
- 지시서 §20의 **7+6+7+7+8 = 35개** 시나리오가 모두 `TEST-*` ID를 가진다. [복구 상세 계획](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:25>)은 주요 장애의 사전조건·주입·예상·실패 판정·증거까지 구체화했다.
- 원래 00–12의 **13개 Phase 범위는 모두 추적**된다. 보안 핵심을 Gateway 앞에, 읽기 Diff와 Windows 설치물 시험을 MVP 앞에 놓은 재배열은 [R2-3 합의](<D:/LLM/agent-studio/docs/planning/06_codesign/ARCHITECTURE_DEBATE.md:77>)와 일치한다.
- [Master의 Review Focus](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:31>) 5건에는 각각 소유 Phase/Task가 지목되어 있다. P00 스파이크 S1–S8도 관찰값·보고서·픽스처를 산출하도록 설계되어 있어, S7의 제품 패키지 생성 경계만 정리하면 제품 구현 전 검증으로 실행할 수 있다.

### UNVERIFIED

- 이번 검토는 **계획 문서의 내부 일치성에 대한 읽기 전용 검토**다. 공급자 최신 버전에서 `requestApproval`, `canUseTool`, `PreToolUse`, `turn/steer`, `thread/fork`, 스킬 로드 관찰이 계획대로 동작하는지는 실행하지 않았다.
- Windows Codex `sandbox="elevated"`의 실제 외부 경로·네트워크 차단, Claude native/WSL2의 도구별 격리, 15분 대기 후 승인 요청 수명은 P00 실측 전까지 `UNVERIFIED`다.
- `detached` 데몬의 설치물 생존, 트레이 종료 후 자손 정리, 실제 재부팅 복원, 네이티브 모듈 로드, 서명·업데이트·롤백은 계획과 시험 항목만 확인했다. 문서의 테스트 통과 주장으로 해석하지 않았다.
- 사용자 인증 모드 U1과 구독 인증의 제품 사용 조건은 이 문서 검토로 확정할 수 없다. [쟁점표](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:12>)에 남은 결정 및 P00의 근거 확인이 필요하다.