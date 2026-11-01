열거된 일반 설계 문서는 25개이고, ADR 8개와 ADR 색인 1개가 있습니다. 아래 제안은 이 34개 파일을 대상으로 한 **읽기 전용 편집안**입니다. `PLANNING_STATUS.md`가 archive로 이동하기 전 집계라면 “26개”라는 수와도 맞습니다. 결정값은 그대로 두고, 현행 계약과 결정 경로를 분리하는 기준으로 읽었습니다.

### 1. 기준 수정·추가 제안

1. **동의 — 검토·라운드 표식 제거.** `(R4B-23)`, `STEP 11`, 검증 호출 수는 구현자가 따라야 할 계약이 아닙니다. 다만 표식 뒤에 붙은 시험 사전조건과 실패 처리는 현행 설계로 남깁니다.

2. **동의 — 결정 과정은 `archive/DECISION_LOG.md`에 한 번만 요약.** `FINAL_ARCHITECTURE_DECISIONS` §2의 입장 변경표, `OPEN_ISSUES` §1·§1.1의 선택지와 양측 입장, 체크리스트의 완료된 승인 기록은 계획 본문에서 제거합니다. 이력 원문은 이미 archive의 제안·리뷰 파일에 있으므로 결정 로그에는 선택 결과와 이유만 짧게 적으면 됩니다.

3. **수정 — 메타 행을 일괄 삭제하지 말고 기능별로 판단.** `참조 출처`, `UNVERIFIED 항목 수`, `Codex 검증 경로`는 제거하되, `요구사항`, 적용 대상, 현재 설계에 필요한 참조 링크는 본문 첫 문장으로 옮길 수 있습니다. 모든 일반 문서의 상태는 `FINAL (2026-11-01)`로 통일하고 ADR은 `ACCEPTED`로 둡니다.

4. **수정 — `OPEN_ISSUES` §3은 문자열 집계가 아닌 검증 작업 목록으로 재작성.** §3.1의 “합계 115건”과 발췌표는 삭제합니다. §3에는 **활성 문서·미검증 사실·해소 Phase/Task·판정 결과를 반영할 단일 출처**를 열로 둡니다. archive 문서에서만 발견되는 항목도 구현에 필요하면 해당 활성 계약의 행으로 옮겨야 합니다. 이미 해소된 항목과 범위 밖 항목을 미검증 수에 섞지 않습니다.

5. **수정 — 체크리스트에서 완료 표시를 걷어내되 운영 규칙은 남김.** A·B·E의 완료 기록과 C1·C2·C4~C8의 승인 이력은 결정 로그로 갑니다. C5의 **P00 실호출 상한 없음**, C7의 **public 저장소·커밋마다 push·CI**는 현재 실행 조건이므로 P00 계획에도 한 줄씩 유지합니다. C3·C9, P01 이후 2차 승인 조건, 첫 push 전 점검, 체크리스트 D1~D6은 남깁니다.

6. **수정 — 단일 출처를 정할 때 문서 역할을 나눔.** `PRODUCT_REQUIREMENTS`는 *무엇을 제공하는지*, 설계 문서는 *어떻게 동작하는지*, `ACCEPTANCE_CRITERIA`는 *어떤 증거로 통과하는지*, `TEST_STRATEGY`와 `RECOVERY_TEST_PLAN`은 *시험 입력·기대 결과*를 소유합니다. 같은 수치나 ID가 추적 링크에 다시 나오는 것은 중복 설계가 아닙니다.

7. **수정 — `UNVERIFIED`를 본문에서 전부 지우지 않음.** `SECURITY_MODEL` §2.1의 셀처럼 미실측 여부가 현재 보장 수준을 결정하면 그 셀에 `UNVERIFIED`와 적용값을 유지합니다. `OPEN_ISSUES` §3에는 실측 담당과 반영 위치를 등록합니다. “P00 S7에서 확정”도 스킬 라우팅을 제한하는 조건이면 본문에 남습니다.

8. **동의 — 미래 산출물 경로를 archive 밖으로 이동.** 새 스파이크 보고서는 `docs/spikes/S1a.md` 등 `docs/spikes/S*.md`, 충돌 실험은 `docs/spikes/skill_conflict_experiments/`로 제안합니다. 기존 `docs/planning/archive/evidence/`는 계획 당시 증거로만 참조합니다. 실행 코드와 픽스처의 `spikes/` 경로는 별개입니다.

9. **추가 — 낡은 제목·링크·도식도 편집 대상.** ADR-0007 파일명과 제목의 “MVP 기본 API key”, `TECH_STACK_DECISIONS` §3의 미결 질문, `ARCHITECTURE_COMPARISON`의 Renderer 직접 WS 그림은 최종본으로 읽으면 현행 결정과 충돌합니다. 삭제 또는 현행 표현으로 바꾸고 들어오는 링크를 함께 갱신합니다.

10. **추가 — ADR의 기술적 재검토 조건은 이력이 아님.** 대안을 택했던 토론은 줄여도, 어떤 실측 결과가 나오면 변경 검토가 필요한지라는 조건은 유지합니다. 재검토 조건을 지우면 P00 결과의 처리 기준이 사라집니다.

### 2. 문서별 제안

아래 표의 “현재 문구”는 **자를 위치를 찾기 위한 짧은 인용**입니다. 한 행의 조치가 절 전체 삭제를 뜻하더라도, 그 안의 현행 계약은 표에 적은 단일 출처로 먼저 옮기는 전제입니다.

| 문서 | 절·행 | 조치 (삭제 / 축약 / 이동→DECISION_LOG / 단일 출처 지정→<문서> / 통합→<문서>) | 현재 문구(짧게) | 이유 |
|---|---|---|---|---|
| [PRODUCT_REQUIREMENTS](<D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md>) | 메타 5~9행, §11·§13A | **삭제·축약·단일 출처 지정→AGENT_INTEGRATION_DESIGN §7** | “Codex R4 수신”, “2차 사용자 요청”, CAP 행의 공급자별 도구 경로 | 검토 상태와 CAP 구현 경로를 걷어냅니다. `REQ-CAP-01~09` 각각의 사용자 기능, 릴리스, 조건부 범위는 남기고 경로·실측표는 §7로 보냅니다. |
| 같은 문서 | §15 226~244행 | **이동→DECISION_LOG; 미검증은 OPEN_ISSUES §3** | “당시 제안 ‘MVP-Core 기본 API key’”, “해소(R2-3)” | 해결 과정표를 제거합니다. ZIP 파일 수 상한과 헤드리스 기능 실측처럼 살아 있는 질문만 Phase가 있는 §3 행으로 옮깁니다. §16의 REQ→AC→TEST 추적성은 유지합니다. |
| [UI_UX_SPECIFICATION](<D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md>) | 메타, §1·§3.2a·§7 | **축약·단일 출처 지정→SECURITY_MODEL §2.1** | “U1 결정 2026-11-01”, “(R4A-18)”, 자동 모드 카피의 “§2.1” | 날짜·라운드만 제거합니다. 첫 실행 인증 조건, 화면별 릴리스 표, 상시 경고 문구는 UX 계약입니다. 마지막 인용의 `§2.1`은 이 파일 안이 아니라 `SECURITY_MODEL §2.1`로 명시합니다. |
| [SYSTEM_ARCHITECTURE](<D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md>) | 메타, §1·§4·§6 | **축약; 토폴로지 단일 출처 지정→본 문서 §1** | “설계 적용 `codebase-design` 스킬”, “RPC 경계 확정(R4A-05…)” | 작성 방법과 검토 번호를 뺍니다. Renderer→main IPC→daemon WS, 토큰 비노출, `GitReadService` 소유권은 여기의 정본으로 유지합니다. |
| [ARCHITECTURE_COMPARISON](<D:/LLM/agent-studio/docs/planning/01_architecture/ARCHITECTURE_COMPARISON.md>) | §1~§5 | **통합→TECH_STACK_DECISIONS §1; 원본 이동→archive** | “Claude 51/60, Codex 47/60”, “B의 정의가 양측에서 달랐음” | 12개 주관 점수와 양측 해석은 결정 과정입니다. A/B1/B2/C의 차이와 C의 필수조건 충족 이유를 짧은 표·문단으로 옮깁니다. §2의 C 그림은 Renderer가 WS에 직접 연결된 듯 보여 현행 토폴로지로 복사하지 않습니다. E1~E5의 시험 조건은 MASTER P00·TEST로만 남깁니다. |
| [TECH_STACK_DECISIONS](<D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md>) | §1·§2·§2.1·§3 | **축약·통합→본 문서** | “합의”, “Forge(철회)”, “API key 기본 vs…”, “백그라운드 지속 필수 여부” | §1의 `합의` 열을 없애고 채택 스택·버전·라이선스·재검토 조건을 유지합니다. §2의 15개 평가 기준은 짧게 보존합니다. §2.1의 실제 되돌릴 조건은 유지하되 대안 논쟁은 줄입니다. §3은 D5의 P00 S6 미실측만 남기고 완료된 질문은 제거합니다. |
| [FINAL_ARCHITECTURE_DECISIONS](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md>) | 메타, D1~D28, §2·§3 | **축약·이동→DECISION_LOG** | “불일치 → 사용자 결정”, “양측 비권고”, “모든 효과가 승인 경로 통과 주장 철회” | D1~D28 행은 보존합니다. `상태`·`근거 요약`의 토론 문구를 빼고 각 결정의 현행 한 문장과 정본 링크만 둡니다. §2 입장 변경표는 결정 로그로 옮깁니다. §3의 P00 의존 항목은 `OPEN_ISSUES` §3에 담당 Task로 등록합니다. |
| [ADR 색인](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/README.md>) | 5~12행 | **축약** | “ACCEPTED(R1 수렴…)” | 상태는 모두 `ACCEPTED`로만 표시합니다. ADR-0007의 제목·링크를 현행 인증 기본값에 맞춰 갱신합니다. |
| [ADR-0001](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0001-TypeScript-단일-언어.md>) | 메타, 맥락·대안 | **축약·이동→DECISION_LOG** | “R1 수렴, R2-1 쟁점 6”, “현 PC는 Node 24만 보유” | 토론 출처와 당시 환경 조사는 줄입니다. TypeScript/Node 24 결정, 단일 타입 체인의 효과, CPU·격리 재검토 문턱은 유지합니다. |
| [ADR-0002](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0002-Electron-데스크톱-프레임워크.md>) | 메타, 맥락·결과 | **축약** | “ACCEPTED(R1 수렴)”, “설치 크기·메모리(수치 UNVERIFIED)” | 라운드를 제거하고 Electron의 프로세스·UI 요구와 설치물 크기·메모리 측정 조건은 유지합니다. 보안 설정의 상세 정본은 `SECURITY_MODEL §7`로 참조합니다. |
| [ADR-0003](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0003-C-Hybrid.md>) | 메타·대안 | **축약·단일 출처 지정→SYSTEM_ARCHITECTURE §1** | “양측 독립 추천 51/60·47/60” | 점수는 결정 로그로 옮깁니다. 독립 데몬·단일 writer 채택 이유와 S5 실패 시 사용자에게 범위 축소를 보고하는 조건은 유지합니다. |
| [ADR-0004](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0004-React-19-+-외부-store.md>) | 메타·대안 | **축약** | “Zustand 즉시 확정(기각…)” | 라운드와 입장 변화는 제거합니다. `useSyncExternalStore`, seq 재접속, rAF, 1,000 delta/s·p95 100ms 재검토 조건은 구현 기준입니다. |
| [ADR-0005](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0005-SQLite.md>) | 메타·맥락 | **축약·단일 출처 지정→DATABASE_SCHEMA** | “R1 수렴, R2-1 쟁점 2” | 저널·투영·단일 writer·온라인 백업과 `node:sqlite` 전환 조건만 ADR에 둡니다. 테이블과 이벤트 목록은 DB 문서에 둡니다. |
| [ADR-0006](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0006-Agent-Gateway.md>) | 결정·결과 | **축약·단일 출처 지정→AGENT_INTEGRATION_DESIGN §1** | “respondApproval…→respond”, “모든 외부 효과가 브로커 통과” | 과거 서명을 삭제하고 현행 `respond(requestId, answer)`만 참조합니다. 결과 문장의 전면 브로커 통과 표현은 D11·SECURITY §2.1의 현행 보장 표현으로 교체합니다. |
| [ADR-0007](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0007-인증-모드를-공급자별-1급-설정으로,-MVP-기본-API-key.md>) | 파일명·제목·상태·결정·결과 | **축약·이동→DECISION_LOG** | “MVP 기본 API key”, “양측 권고 (a) 미채택”, “과거 분석” | 파일명과 제목을 `…CLI-로그인-재사용-기본.md`으로 바꾸고 링크를 갱신합니다. 본문에는 공급자별 인증 설정, CLI 로그인 기본, API key 전환 경로, 약관 변경 시 재검토 조건만 둡니다. |
| [ADR-0008](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0008-패키징-electron-builder-v26-+-electron-upda.md>) | 메타·대안·결과 | **축약** | “Codex가 Forge 철회”, “공식·준공식 경로” | 채택 경로·OS별 배포 포맷·서명·실행 중 업데이트 연기는 유지합니다. Forge로부터의 입장 변경만 결정 로그로 옮깁니다. |
| [AGENT_INTEGRATION_DESIGN](<D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md>) | §1·§2·§3 | **축약; 어댑터 정본 지정→본 문서** | “R2-2 쟁점 1 합의”, “이전 라운드 표기 이력은…” | Gateway 서명, 공통 이벤트 10종, 공급자별 권한 enum·인증 기본값·공유 `CODEX_HOME` 동작은 유지합니다. 라운드 설명과 이전 표기만 뺍니다. `UNVERIFIED`인 재구독·MCP 제거 여부는 조건과 S9 링크를 남깁니다. |
| 같은 문서 | §6·§7 | **축약·단일 출처 지정→본 문서 §7** | “2차 요청 2026-11-01”, “PHASE_BREAKDOWN·MASTER와 동일 분할” | §6은 S1a/b/c·S2·S9의 어댑터 고유 관찰 항목만 두고 전체 Step은 MASTER를 참조합니다. §7 CAP-01~09 행, `supported/conditional/unsupported`, 3단 제한은 기능 경로의 정본으로 보존합니다. |
| [DATABASE_SCHEMA](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md>) | §2.1·§2.2·§3~§5 | **축약; 이벤트·테이블 단일 출처 지정→본 문서** | “R8-02”, “R2-2 합의”, “R8-04” | 괄호 속 검토 번호만 제거합니다. 이벤트 전체 목록, `tasks.kind`, `effects.kind`, 생산 이벤트→투영 대응, `pending_inputs.text_enc`, 백업 암호화·키 부재 처리, 복구 3분기 판정은 줄이지 않습니다. |
| [SESSION_RECOVERY_DESIGN](<D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md>) | §1·§3·§4 | **축약·단일 출처 지정→본 문서 §3~§4** | “R4B-02: 재기동·재개보다 평가가 항상 먼저” | 검토 ID만 빼고 **실행 차단→효과 평가→판정→재개** 순서와 14개 시나리오, `absent/inaccessible/transient_error` 차이를 보존합니다. 시험별 입력은 `RECOVERY_TEST_PLAN`에 둡니다. |
| [PHASE_MANAGEMENT_DESIGN](<D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md>) | §2·§4 | **축약; 상태 전이 정본 지정→본 문서 §2** | “단일 출처 원칙(R4B-05)”, “누락 #1 해소” | 계획 단계에서는 §2 표가 코드 산출물 `task-transitions.json`의 초안임을 명시합니다. 구현 후 파일에서 다이어그램·UI 액션을 생성한다는 규칙은 유지합니다. 사용자 편집 우선·제안 Diff도 유지합니다. |
| [COLLABORATION_PROTOCOL](<D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md>) | §1·§3·§5·§6 | **축약; 역할·리뷰 단일 출처 지정→본 문서** | “(R4B-01)”, “기본 흐름(지시서)” | 검토·지시서 서술을 없애고 Auto/Manual, 산출물 형식, 리뷰 생략 조건, `capture_confidence=uncertain` 예외, REWORK 담당·상한을 보존합니다. §1의 다층 방어 상세는 SECURITY로 한 줄 참조합니다. |
| [SKILL_COMPATIBILITY_MATRIX](<D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md>) | 메타·§A~§G | **축약·이동→DECISION_LOG** | “R4B-25”, “impeccable(4f95649 → 77ac20b)” | 55행과 분류 enum·커밋·해시·공급망 판정은 유지합니다. §E의 계산 이력 문구와 §G의 U4 업데이트 제안은 결정 로그로 옮기고, 현행 “업데이트 보류”만 남깁니다. `Codex 호환`은 형식 검토이며 미설치라는 범위도 유지합니다. |
| [DEVELOPMENT_SKILL_USAGE_PLAN](<D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md>) | 메타·§0·§1 | **축약** | “14:02Z 외부 생성된 52개 폴더…”, “R4B-21” | 외부 생성·삭제·백업 사건은 결정 로그로 이동합니다. Phase별 주도·보조·담당 표는 유지하되 §0은 ROUTING·EVIDENCE의 반복 정의 대신 링크로 줄입니다. U5 보류 중 Codex 예외는 유지합니다. |
| 같은 문서 | §3·§4 | **축약·이동→DECISION_LOG** | “‘display_name’만 가진 파일 절차는 철회”, “계획 수립 단계에서의 실제 사용” | §3은 **U5 재결정 이후에만** 가능한 설치 절차로 표시하고 구 절차 논쟁을 뺍니다. §4 선례는 archived `PLANNING_SKILL_LOG`로 옮기고 본문에서는 한 줄 참조합니다. |
| [DEVELOPMENT_SKILL_ROUTING_POLICY](<D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md>) | §1·§2·§4 | **축약; 라우팅 단일 출처 지정→본 문서** | “(R4B-21 잔여)”, “(R6B-17)” | 단계당 주도 1·보조 ≤2, 사용자 전용 필터, U5 예외, 실패 처리는 유지합니다. §4의 개발 저장소 push 예외는 CHECKLIST D1·C7을 참조하도록 줄입니다. |
| [SKILL_CONFLICT_RESOLUTION](<D:/LLM/agent-studio/docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md>) | §2~§4 | **축약; 8행 단일 출처 지정→본 문서** | “R4C-17 축소, R7-09 산술 정정”, “v2에 확정” | 8행의 주도·나머지 처리·근거·검증 조건은 보존합니다. S7의 **3행+횡단 1건**, 나머지 **5행**이라는 실제 실험 범위를 유지하고 설명 중 계산 이력은 제거합니다. |
| [SKILL_EXECUTION_EVIDENCE_SPEC](<D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md>) | §2·§3·§5·§6 | **축약; 증거 등급 단일 출처 지정→본 문서** | “구 `LOADED_ONLY`=…”, “계획 단계 선례” | 13개 필드·현재 enum·고유 절차 시그니처·Task 완료 예외는 보존합니다. 폐기된 등급명과 §6 선례는 결정 로그/archived 증거로 옮깁니다. §3의 미실측 관찰 필드는 `OPEN_ISSUES` §3의 S7 행과 연결합니다. |
| [SECURITY_MODEL](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md>) | §2·§2.2·§2.1 | **축약; 승인·보장 수준 단일 출처 지정→본 문서** | “R2-3 합의 기본값”, “R7-11·R8-02”, “R4C-03” | 제목의 검토 번호와 과정 설명만 제거합니다. **14행 승인 매트릭스, 14행 분류 계약, 28셀 보장 표와 자동 모드 적용 표**는 모두 유지합니다. 조건부 `ENFORCED`의 집행자·관찰·시험과 `POLICY_ONLY` 하향 조건은 셀 안에 남깁니다. |
| 같은 문서 | §6·§8~§10 | **축약·단일 출처 지정→OPEN_ISSUES §2** | “Codex 권고 제한안…미채택”, “Codex가 본 최대 위험 3” | §8에는 U8 (c)의 안전 기본값·전 조합 옵트인·1회 확인·우회 한계만 현재형으로 둡니다. §9 위험 3건과 §10 위험 재등록은 R13~R20 및 TEST 게이트로 흡수하고 링크만 남깁니다. §7 CSP 문자열은 여기의 유일한 정본입니다. |
| [EXECUTION_LIMITS_POLICY](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md>) | §1·§1.1·§3~§6 | **축약; 한도 단일 출처 지정→본 문서** | “Codex 30분 제안 → 20분 양보”, “Claude 24h 보류 → 기각” | §1의 `지시서 초기값`·`변경 이력` 열은 제거합니다. 최종값, 조정 범위, 토큰 임시 기본값의 가설 성격, 세 시계와 재기동 계산, 오류별 재시도는 유지합니다. C5의 P00 실호출 **무상한**은 제품 한도와 별도라고 한 줄 명시합니다. |
| [TEST_STRATEGY](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md>) | §1·§2.1~§2.8 | **축약; TEST 정의 단일 출처 지정→본 문서** | “R4C-08”, “R2-3 합의 5개 → 독립 ID” | 라운드만 제거합니다. LIVE/INST와 녹화 재생의 역할 차이, `TEST-*` 전체 ID, 모드별 예상 결과, §2.8 `TEST-RF-01~05` 추적표는 보존합니다. §2.3 복구는 요약만 두고 상세는 RECOVERY_TEST_PLAN을 참조합니다. |
| [RECOVERY_TEST_PLAN](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md>) | §2·§3·마지막 “§2.6” | **축약; 복구 시험 단일 출처 지정→본 문서** | “(R4C-05)”, “## 2.6 단일 추적표” | 시험의 주입·예상·실패 조건은 유지합니다. 마지막 절을 실제 순서에 맞춰 `§5 단일 추적표`로 고치고 TEST_STRATEGY의 참조도 갱신합니다. 복구 알고리즘 설명은 SESSION_RECOVERY §3을 참조합니다. |
| [MASTER_IMPLEMENTATION_PLAN](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md>) | 서두·Global Constraints·Review Focus | **축약·단일 출처 지정→각 계약 문서** | “For agentic workers”, “writing-plans 스킬 형식”, “각 항목은 TEST…에 내려가 있다” | 스킬 작성 과정과 중복 정책 설명을 제거합니다. 필수 실행 제약은 링크가 있는 짧은 목록으로 둡니다. `TEST-RF-01~05`의 소유 Task·AC 연결 정본은 TEST_STRATEGY §2.8로 보냅니다. 2차 승인 조건은 CHECKLIST를 참조합니다. |
| 같은 문서 | P00 S1a~S9·종료 게이트·Self-Review | **축약; P00 Step 단일 출처 지정→본 문서** | “(R4C-17 분할…)”, “Self-Review 결과” | S1a~S9의 파일·인터페이스·실패 테스트·pass/fail·게이트는 유지합니다. `evidence/spikes/`를 `docs/spikes/`로 바꾸고 §Self-Review는 결정 로그로 옮깁니다. P00 11보고서, C5 무상한 보고, S4 경고 전환은 남깁니다. |
| [PHASE_BREAKDOWN](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md>) | §0·P00·§2.1 | **축약·단일 출처 지정→MASTER P00** | “원 Phase 00~12 범위 전부 유지”, “MASTER·AC와 동일 분할”, “18/18 결과는 PLANNING_STATUS…” | §0의 릴리스·순서 표와 **18 Phases × 18항목**은 보존합니다. P00의 18항목 형식은 유지하면서 Task 7번의 세부 Step은 MASTER를 가리키게 줄입니다. §2.1의 작성 검산 기록만 결정 로그로 이동합니다. DAG는 현행 의존성 정본으로 유지합니다. |
| [ACCEPTANCE_CRITERIA](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md>) | 메타·P00~V2·§2 | **축약; AC 단일 출처 지정→본 문서** | “R6C-04”, “PHASE_BREAKDOWN·MASTER와 동일 분할” | 검토 번호와 반복 설명만 뺍니다. AC ID, pass/fail 단언, 증거, **S9가 경로 결정 게이트이고 V1이 기능 실현 게이트라는 구분**, `unsupported` 시 N/A·범위 변경 보고 규칙은 보존합니다. `evidence/spikes/` 경로를 새 경로로 바꿉니다. |
| [OPEN_ISSUES_AND_RISKS](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md>) | §1·§1.1·§4 | **이동→DECISION_LOG; 제목 축약** | “실제 사용자 결정이 필요한 항목만 둔다”, “Claude: (b) / Codex: (b-제한)”, “해소된 항목” | U1~U9·C5·C7의 선택 과정과 해소표를 결정 로그로 옮깁니다. 파일 제목은 `위험·미검증 작업`으로 바꾸되 파일명은 참조 안정성을 위해 유지합니다. |
| 같은 문서 | §2 R1~R22, §3·§3.1 | **축약·삭제** | “과거 권고…이력”, “합계 115건(문구 반복 포함)” | R1~R22의 현재 심각도·완화·소유·출고 차단을 유지하고 과거 완화안만 자릅니다. §3은 해결 Phase/Task 열을 더해 재작성합니다. §3.1 자동 grep 표는 삭제합니다. R22의 경로는 새 archive 경로로 고칩니다. |
| [IMPLEMENTATION_APPROVAL_CHECKLIST](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md>) | A·B·C·D·E | **이동→DECISION_LOG; 축약** | “[x] A1…”, “결정 전 기본 동작”, “14:57Z 삭제 완료” | 완료된 승인과 이력은 옮깁니다. 현행 문서에는 C3·C9, P01 이후 **P00 보고서 11건 + 변경분 재검증 + 2차 승인**, 첫 push 전 공개 점검, D1~D6의 안전 규칙을 체크박스가 아닌 적용 규칙으로 둡니다. |

### 3. 단일 출처 표

| 주제 | 단일 출처 문서·절 | 참조만 남기는 문서 |
|---|---|---|
| REQ ID·사용자 기능·릴리스 범위 | `PRODUCT_REQUIREMENTS` §1~§13A | UI, MASTER, PHASE, FINAL, AC |
| 화면별 노출·카피 | `UI_UX_SPECIFICATION` §3·§7 | PRODUCT의 화면 요약, MASTER |
| 프로세스 토폴로지·Renderer IPC 경계·GitReadService | `SYSTEM_ARCHITECTURE` §1·§2·§4 | ADR-0003, FINAL D3·D27, TECH_STACK |
| 채택 기술·버전·라이선스·대안의 짧은 이유 | `TECH_STACK_DECISIONS` §1~§2.1 | FINAL D1~D9·D21, 개별 ADR |
| Gateway 서명·공통 이벤트·공급자 옵션·CAP 경로 | `AGENT_INTEGRATION_DESIGN` §1~§3·§7 | PRODUCT CAP, FINAL D9·D10·D19·D20·D26, MASTER |
| 이벤트 목록·투영·`tasks.kind`·`effects.kind` | `DATABASE_SCHEMA` §2~§3 | SECURITY §2.2의 이벤트 참조, PHASE, RECOVERY |
| Task 전이와 Phase 재계획 | `PHASE_MANAGEMENT_DESIGN` §2·§4; 구현 후 `task-transitions.json` | SESSION_RECOVERY, COLLABORATION, UI |
| 복구 판정·14 시나리오 | `SESSION_RECOVERY_DESIGN` §3·§4 | DATABASE §3, EXECUTION_LIMITS §6, TEST |
| 협업 역할·handoff·리뷰 생략 | `COLLABORATION_PROTOCOL` §3~§5 | PHASE, MASTER, SKILL_USAGE |
| 55행 스킬 분류·설치 상태 | `SKILL_COMPATIBILITY_MATRIX` §A~§F | SKILL_USAGE, ROUTING |
| 8행 주도 스킬 충돌 판정 | `SKILL_CONFLICT_RESOLUTION` §2~§4 | ROUTING, SKILL_USAGE |
| Task→스킬 라우팅 | `DEVELOPMENT_SKILL_ROUTING_POLICY` §1~§4 | SKILL_USAGE, PRODUCT |
| 스킬 증거 필드·등급·완료 규칙 | `SKILL_EXECUTION_EVIDENCE_SPEC` §2~§5 | DATABASE의 저장 열, MASTER, PHASE, AC |
| 승인 14행·분류 14행·보장 28셀·CSP | `SECURITY_MODEL` §2·§2.2·§2.1·§7 | AGENT_INTEGRATION, FINAL, UI, MASTER, TEST |
| 숫자 한도·시간 계산·재시도 | `EXECUTION_LIMITS_POLICY` §1~§6 | FINAL D14, MASTER, PHASE, COLLABORATION |
| TEST ID·시험 입력·기대 결과 | `TEST_STRATEGY` §1~§3; 복구 상세는 `RECOVERY_TEST_PLAN` §2·§5 | MASTER Review Focus, AC의 시험 링크 |
| AC ID·출고 pass/fail | `ACCEPTANCE_CRITERIA` §1~§2 | MASTER, PHASE, TEST의 게이트 요약 |
| P00 실행 Step·11개 보고서 | `MASTER_IMPLEMENTATION_PLAN` P00 | PHASE_BREAKDOWN P00, AGENT_INTEGRATION §6 |
| 18 Phase·18항목·의존성 DAG | `PHASE_BREAKDOWN` §0·§2·§3 | MASTER의 릴리스·Phase 요약 |
| R1~R22 현재 위험·미검증 담당 | `OPEN_ISSUES_AND_RISKS` §2·§3 | SECURITY §9~§10, FINAL §3 |
| 미해결 승인·개발 안전 규칙 | `IMPLEMENTATION_APPROVAL_CHECKLIST` | MASTER Global Constraints, PHASE P00 |
| 완료된 선택·검토 경로 | `archive/DECISION_LOG.md` | 활성 설계 문서에서는 현행 결과만 |

### 4. 통합·삭제 후보 파일

**`ARCHITECTURE_COMPARISON.md`를 활성 계획에서 빼는 데 찬성합니다.** 원본은 archive로 이동하고, `TECH_STACK_DECISIONS` §1에 다음 내용의 짧은 비교 표와 문단을 남깁니다. “A는 Python 사이드카로 언어와 IPC 경로가 늘어난다. B1은 오케스트레이터가 Electron main 수명에 묶이고, B2는 Rust 툴체인과 별도 공급자 프로토콜 구현이 필요하다. C는 Electron Shell과 독립 Node 데몬으로 앱 종료 뒤 지속 실행, 장애 분리, SQLite 단일 writer를 충족한다. 실제 연결은 Renderer→main IPC→daemon WS이며 데몬 생존·재접속은 P00 S5와 설치물 시험에서 검증한다.” 이 문단은 점수 51/60·47/60을 근거로 쓰지 않습니다.

**다른 ADR이나 계약 문서는 통합 삭제하지 않습니다.** 짧아져도 ADR은 선택의 조건과 재검토 문턱을 담고, `RECOVERY_TEST_PLAN`은 주입·실패 판정의 상세를 담습니다. `FINAL_ARCHITECTURE_DECISIONS`도 D1~D28 색인으로 유지하되 긴 정책 재서술을 정본 링크로 바꿉니다.

`ADR-0007`은 별도 통합 후보가 아니라 **이름 수정 후보**입니다. 낡은 파일명이 검색 결과와 ADR 색인에서 API key 기본값을 현재 설계처럼 보이게 합니다. 이름을 바꾸는 편집에서는 색인과 모든 링크를 함께 갱신해야 합니다.

### 5. 삭제 금지 추가 항목

- **조건부 보장의 사전조건.** `SECURITY_MODEL §2.1`에서 `ENFORCED`를 주장하려면 필요한 S1c·S4 실측, MCP·Hook 제외, 모드별 집행자·감사 이벤트·시험을 셀과 AC에 남겨야 합니다. 자동 모드는 모든 조합에서 옵트인 가능하지만, 격리 불합격 시 **경고·1회 확인**으로 처리한다는 U8 (c)도 함께 남깁니다.

- **불확실할 때의 처리.** `capture_confidence` 기본 `uncertain`, 미기록 효과 발견 시 자동 재개 금지, `unverifiable` 효과의 자동 건너뛰기·재시도 금지, 만료된 승인 requestId를 재사용하지 않고 새 run·새 요청을 만드는 순서는 복구 계약입니다.

- **실측 전 기능 표시의 상한.** CAP의 `supported/conditional/unsupported`와 `discovered/started/executed/artifact`는 서로 다른 축입니다. S9는 경로 결정이고 V1 AC는 기능 실현이라는 구분, 모든 경로가 `unsupported`일 때 N/A와 사용자 범위 변경 보고도 남깁니다.

- **설치·공개 실행의 경계.** U5 보류 중 Codex 스킬 미설치 예외, C5의 P00 무상한 보고, C7의 public repo·매 커밋 push, 첫 push 전 R22 점검은 결정 이력을 걷어낸 뒤에도 실제 작업에 적용됩니다. `CHECKLIST` D1~D6은 `FINAL`의 D1~D6과 다른 개발 안전 규칙이므로 둘 다 보존합니다.

- **출고 가능성을 판정하는 작은 수치.** 리뷰 생략의 변경 파일 ≤2, 승인 대기와 일시정지의 시계 분리, 1,000 delta/s·p95 100ms, Monaco p95 200ms, 토큰 임시 기본값 3M/30M/300M, 저널 보존 180일도 “120분/20분/15분” 목록 밖의 현행 수치입니다.

- **보안·데이터 경계.** 사용자 CLI 자격증명을 앱이 읽거나 복사하지 않는다는 규칙, `pending_inputs.text_enc`의 백업·키 부재 복원 처리, 백업 항상 암호화, Renderer 토큰·포트 비노출, CSP 유일 문자열, 공유 `CODEX_HOME`의 설정 스냅숏·변경 감지·앱 소유 세션 필터는 요약 과정에서 빠지기 쉽습니다.

- **추적성 자체.** `REQ → Phase → AC → TEST`, `R 위험 → 소유 Task → 출고 차단`, `UNVERIFIED → 실측 Task → 반영 정본`의 연결은 표 내용을 줄여도 유지해야 합니다. `TEST-RF-01~05`, 복구 TEST-RC의 추적표, P00 보고서 11건의 개별 pass/fail도 여기에 속합니다.

### 6. 예상 효과

다음은 편집 목표치입니다. 실제 압축률은 18항목 Phase와 큰 계약 표를 보존해야 하므로 문서마다 다릅니다. KB는 반올림한 텍스트 파일 크기이며 **약속된 삭제량이 아닌 편집 예산**입니다.

| 문서군 | 문서별 예상 KB |
|---|---|
| `00_product` | PRODUCT_REQUIREMENTS **24→19**, UI_UX_SPECIFICATION **10→9** |
| `01_architecture` | SYSTEM_ARCHITECTURE **11→10**, ARCHITECTURE_COMPARISON **6→활성 0**(archive 보존), TECH_STACK_DECISIONS **6→5**, FINAL_ARCHITECTURE_DECISIONS **12→7** |
| ADR | ADR-0001~0008 **각 약 2→1~1.5**, `adr/README` **약 1→0.7** |
| `02_agents_state` | AGENT_INTEGRATION_DESIGN **19→16**, DATABASE_SCHEMA **13→12**, SESSION_RECOVERY_DESIGN **11→10**, PHASE_MANAGEMENT_DESIGN **11→10**, COLLABORATION_PROTOCOL **7→6** |
| `03_skills` | SKILL_COMPATIBILITY_MATRIX **20→18**, DEVELOPMENT_SKILL_USAGE_PLAN **9→7**, DEVELOPMENT_SKILL_ROUTING_POLICY **7→6**, SKILL_CONFLICT_RESOLUTION **7→6**, SKILL_EXECUTION_EVIDENCE_SPEC **7→6** |
| `04_security_test` | SECURITY_MODEL **28→24**, EXECUTION_LIMITS_POLICY **10→8**, TEST_STRATEGY **21→19**, RECOVERY_TEST_PLAN **10→9** |
| `05_plan` | MASTER_IMPLEMENTATION_PLAN **24→20**, PHASE_BREAKDOWN **37→29**, ACCEPTANCE_CRITERIA **16→15**, OPEN_ISSUES_AND_RISKS **23→13**, IMPLEMENTATION_APPROVAL_CHECKLIST **8→3** |

활성 계획에서 대략 **55~65KB**가 줄고, 비교표 원본과 결정 과정은 archive에 남습니다. 가장 큰 절감은 `OPEN_ISSUES`의 결정·자동 집계 제거, `FINAL`의 입장 변경표 제거, `PHASE_BREAKDOWN` P00 세부 Step의 MASTER 참조 전환에서 나옵니다.

새 `docs/planning/README.md`에 넣을 **10줄 결정 요약 초안**은 다음과 같습니다.

1. Agent Studio는 TypeScript·Node 24·Electron Shell·React Renderer·독립 Node 데몬으로 구성한다.
2. Renderer는 main IPC를 통해서만 데몬과 통신하며, 데몬이 SQLite WAL 저널의 단일 writer다.
3. Claude는 Agent SDK와 설치된 CLI, Codex는 app-server JSON-RPC를 사용한다.
4. 공급자별 인증 기본값은 설치된 CLI 로그인 재사용이며 API key 전환 경로를 제공한다.
5. 안전 권한 모드가 기본이고, 자동 모드는 모든 공급자·OS·격리 조합에서 프로젝트별 명시 옵트인으로 제공한다.
6. 사용자 `CODEX_HOME` 공유가 기본이며 유효 설정 스냅숏·변경 감지·앱 소유 세션 필터를 적용한다.
7. 승인은 요청이 발생한 효과에 적용되고, 조합별 사전 차단·사후 탐지·정책 수준은 `SECURITY_MODEL`의 보장 표를 따른다.
8. 제품 범위는 Windows 내부 검증판 MVP-Core, 핵심 경험을 완성하는 V1, 고도화 V2 순서다.
9. P00은 11개 보고서로 미실측 경로를 판정하며, P01 이후에는 P00 보고·변경분 재검증·2차 승인이 필요하다.
10. 현행 설계는 이 디렉터리의 계약 문서에, 결정 경로와 당시 증거는 `archive/DECISION_LOG.md` 및 archive 원본에 둔다.