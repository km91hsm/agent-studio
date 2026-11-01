# Agent Studio 계획 문서

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) — 계획 완료. 2026-11-02 Phase 00 구현 착수(`docs/spikes/`) |
| 현행 설계 | 이 디렉터리(`00_product` ~ `05_plan`, `01_architecture/adr`) |
| 경위·과정 기록 | `archive/`(초안·토론·리뷰 판정·Codex 응답 원문·증거·결정 로그) |
| 다음 단계 | P00 스파이크 진행 중(`05_plan/MASTER_IMPLEMENTATION_PLAN.md` Phase 00, 보고서 `docs/spikes/`). 과거 커밋 해시 언급은 로컬 이력 브랜치 `planning-history` 기준 |

## 결정 요약

1. **스택**: TypeScript / Node 24 LTS / Electron 45 Shell / React 19 / 독립 Node 데몬(SQLite WAL 저널 단일 writer). Rust·.NET·Go는 V1까지 금지.
2. **프로세스 경계**: Renderer는 main IPC 릴레이만(CSP `connect-src 'none'`), 데몬이 모든 상태의 단일 writer. 창·앱을 닫아도 데몬과 에이전트 턴은 계속된다.
3. **에이전트 구동**: Claude는 Agent SDK + 설치된 CLI(`canUseTool`·`PreToolUse`), Codex는 `codex app-server` JSON-RPC(`requestApproval`·`turn/steer`·`thread/fork`).
4. **인증**: 공급자별 1급 설정. 기본은 설치된 CLI 로그인 재사용(약관 책임 사용자), API key 전환 경로 상시 유지(ADR-0007, R21).
5. **권한 모드**: 기본은 안전 모드(Claude `default`, Codex `on-request`+`workspaceWrite`). 자동 모드는 모든 공급자·OS·격리 조합에서 프로젝트별 옵트인, 경고 배지 + 격리 미확인 조합은 활성 시 1회 확인(U8).
6. **Codex `CODEX_HOME`**: 사용자 것 공유가 기본, 프로젝트별 격리 옵션. 공유 시 유효 설정 스냅숏·변경 감지·앱 소유 스레드 필터 의무, `config.toml`은 미수정(U9).
7. **승인·보장**: 승인은 "요청이 발생하는 효과"에만 작동한다. 고위험 효과(원격 Git·DB·설치·배포·외부 서비스)의 정식 경로는 앱 전용 실행기이며, 보장 수준은 조합별 `ENFORCED / DETECTED / POLICY_ONLY` 표(SECURITY_MODEL §2.1)로 표시한다.
8. **스킬 증거**: 프롬프트에 이름이 있는 것은 증거가 아니다. `DISCOVERED → INJECTION_ACCEPTED → LOAD_OBSERVED → APPLIED_VERIFIED` 4등급. 필수 스킬은 기본적으로 `APPLIED_VERIFIED`가 있어야 `VERIFYING`을 통과하며, `tasks.kind ∈ {plan, research, prototype, review}`만 지정 산출물과 결합한 `LOAD_OBSERVED`로 통과한다(EVIDENCE_SPEC §5). 스킬은 에이전트가 프롬프트를 분석해 스스로 고르는 것이 기본이고 사용자 명시 호출이 우선한다(U10). Codex용 주도 스킬 8종은 구현 착수 시 승인 후 설치한다(U5).
9. **릴리스**: MVP-Core(Windows 내부, 단독 에이전트 검증판) → V1(3-OS·협업·Phase·Skills = 제품 MVP) → V2(고도화). 18 Phase, 각 18항목.
10. **착수 조건**: P00 스파이크 11건 보고서(S1a/b/c·S2~S9) 뒤 2차 승인으로 P01 진입. P00 실호출 상한 없음(C5), 개발 저장소는 public GitHub + 커밋마다 push + CI(C7, 첫 push 전 점검).

## 문서 지도 (읽는 순서)

| 폴더 | 문서 | 역할(한 줄) |
|---|---|---|
| `00_product` | `PRODUCT_REQUIREMENTS.md` | **무엇**을 만드는가 — REQ-* 전체, 릴리스 열, §13A CAP 요구, §15 보완 규칙 |
| | `UI_UX_SPECIFICATION.md` | 화면·상태·문구 명세 |
| `01_architecture` | `SYSTEM_ARCHITECTURE.md` | 프로세스 3개·모듈 인터페이스·디렉터리 구조 |
| | `TECH_STACK_DECISIONS.md` | 구조 대안 비교(§1)·기술 선택·대안 |
| | `FINAL_ARCHITECTURE_DECISIONS.md` | D1~D28 결정 목록과 정본 위치 |
| | `adr/ADR-0001~0008` | 결정별 배경·대안·재검토 조건 |
| `02_agents_state` | `AGENT_INTEGRATION_DESIGN.md` | 어댑터·공통 이벤트·권한 모드·CAP 경로(§7 정본) |
| | `DATABASE_SCHEMA.md` | 저널·투영·이벤트 목록(정본)·enum |
| | `SESSION_RECOVERY_DESIGN.md` | 세션 5동작·복구 판정표 |
| | `PHASE_MANAGEMENT_DESIGN.md` | Phase/Task/DAG·상태 머신 |
| | `COLLABORATION_PROTOCOL.md` | Claude↔Codex 역할·교차 리뷰·handoff |
| `03_skills` | `SKILL_COMPATIBILITY_MATRIX.md` | 설치 스킬 55행 호환·분류 |
| | `DEVELOPMENT_SKILL_USAGE_PLAN.md`, `DEVELOPMENT_SKILL_ROUTING_POLICY.md` | 개발 중 스킬 사용 계획·라우팅 규칙 |
| | `SKILL_CONFLICT_RESOLUTION.md` | 충돌 8행 주도 스킬 — P00 S7에서 3행 + 횡단 충돌 1건 실험, 나머지 5행은 P07까지 잠정 |
| | `SKILL_EXECUTION_EVIDENCE_SPEC.md` | 증거 레코드·4등급·시그니처 |
| `04_security_test` | `SECURITY_MODEL.md` | 14행 정책·분류 계약·보장 수준 표·격리·비밀·Electron·승인 운영 |
| | `EXECUTION_LIMITS_POLICY.md` | 제한값·오류 분류·시간 계산·비용 |
| | `TEST_STRATEGY.md`, `RECOVERY_TEST_PLAN.md` | TEST-* 시나리오(입력·기대·증거), 복구 S01~S22 |
| `05_plan` | `MASTER_IMPLEMENTATION_PLAN.md` | 전역 제약·릴리스 정의·P00 Task 단위 계획 |
| | `PHASE_BREAKDOWN.md` | 18 Phase × 18항목, 의존성 DAG |
| | `ACCEPTANCE_CRITERIA.md` | AC-* (어떤 증거로 합격인가) |
| | `OPEN_ISSUES_AND_RISKS.md` | R1~R23, 미검증 사실 V1~V35 → 해소 Task |
| | `IMPLEMENTATION_APPROVAL_CHECKLIST.md` | 남은 승인(C3·C9·2차)·첫 push 전 점검·개발 중 규칙 |

## 단일 출처 규칙

- PRODUCT = 무엇(REQ), 설계 문서 = 어떻게, ACCEPTANCE = 어떤 증거, TEST·RECOVERY_TEST = 시험 입력·기대. 같은 ID·수치가 추적 링크로 반복되는 것은 중복이 아니다.
- 정본: 승인 매트릭스·보장 수준 = SECURITY_MODEL §2; 이벤트 이름 = DATABASE_SCHEMA; CAP 경로 = AGENT_INTEGRATION §7; CSP 문자열 = SECURITY_MODEL §7; Gateway 서명 = `packages/protocol/gateway.ts`(구현 시).
- 구현 중 산출 경로: 스파이크 보고서 `docs/spikes/S*.md`, 충돌 실험 `docs/spikes/skill_conflict_experiments/`, 스킬 증거 `docs/agent-studio/`. `archive/evidence/`는 설계 근거 자료의 보관 경로다.
