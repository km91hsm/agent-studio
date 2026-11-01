# PRODUCT_REQUIREMENTS — Agent Studio

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 출처 | 사용자 지시서(`USER_DIRECTIVE.md`, 로컬 비공개 보관 — 공개 저장소에 미포함) PART A·B(§6·§8)·D·E·F·I, 기준 문서 `CLAUDE_CODE_SKILLS_SETUP.md`(U3; 사본도 로컬 비공개 보관) |
| UNVERIFIED | §15 표기 3건(Claude Desktop ZIP 파일 수 상한, 세션 저장 형식 공식 보장, Desktop 전용 기능의 헤드리스 가용성) — 해소 Task는 OPEN_ISSUES_AND_RISKS §2 |

요구사항 ID 체계: `REQ-<영역>-<번호>`. 릴리스 열의 의미: **MVP-Core** = Windows 내부 검증판(단독 에이전트 모드·승인·복구·Diff; Phase 생성·Skills 라우팅·협업은 포함하지 않음), **V1** = 핵심 사용자 경험 완성(제품 MVP), **V2** = 고도화. 한 ID가 두 릴리스에 걸치면 `MVP-Core(최소 범위) / V1(확장 범위)`로 범위를 나눠 적는다. 검증은 `ACCEPTANCE_CRITERIA.md`·`TEST_STRATEGY.md`에서 ID로 연결한다.

## 1. 제품 정의 (GOAL)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-GOAL-01 | Windows 11, macOS, Linux에서 동작하는 독립 데스크톱 앱 | §1 | MVP-Core(Win) / V1(mac·Linux) |
| REQ-GOAL-02 | Claude Code와 Codex를 한 프로그램에서 사용하는 통합 AI 개발 환경 | §1 | MVP-Core |
| REQ-GOAL-03 | CLI 자동화 스크립트가 아닌, 일반 AI 코딩 프로그램 수준의 UX | §1 | MVP-Core |
| REQ-GOAL-04 | 프로젝트 선택 → 자연어 지시 → 작업 분석 → Skills 선택 → 에이전트 배분 → 설계·구현·테스트·리뷰·수정·검증 수행 | §1 | V1 (MVP-Core는 단일 에이전트 경로) |
| REQ-GOAL-05 | 작업 중 추가 지시, 일시정지, 취소 | §1 | MVP-Core |
| REQ-GOAL-06 | 앱 종료·재부팅 후 작업 정보와 세션 안전 복구 | §1 | MVP-Core |
| REQ-GOAL-07 | 핵심 UX 흐름: 실행 → 프로젝트 선택 → 세션 재개/새 대화 → 지시 → Phase 생성 → Skills 선택 → 협업 → 실시간 진행 → 변경·테스트 검증 → 사용자 승인 → 체크포인트 저장 | §1 | V1 |

## 2. 실행 모드 (MODE)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-MODE-01 | Claude Mode: 단독 사용·대화형 개발·코드 작성·수정·**디버깅 및 테스트**·기존 세션 재개·Claude 전용 Skills | §2.1 | MVP-Core |
| REQ-MODE-02 | Codex Mode: 단독 사용·대화형 개발·**코드 작성·수정·테스트 및 코드 리뷰**·기존 세션 재개·Codex 호환 Skills | §2.2 | MVP-Core |
| REQ-MODE-03 | Auto Collaboration: 작업 유형·난이도 분석·**요구사항 분석·설계 및 구현 계획**·자동 역할 분배·TDD·리뷰·수정·재검증·반복/시간 제한·완료 기준 검증 | §2.3 | V1 |
| REQ-MODE-04 | 기본 협업 흐름 "Claude 계획 → Codex 구현 → 테스트 → Claude 리뷰 → Codex 수정 → 독립 검증 → 완료"를 기본값으로 두되 작업별 역할 변경 가능 | §2.3 | V1 |
| REQ-MODE-05 | Manual Collaboration: 담당 선택, 결과 비교, 수동 handoff, 세션별 개별 지시, 임의 시점 전달 | §2.4 | V1 |
| REQ-MODE-06 | 모드 전환 시 작업 상태·변경사항 보존 | §2 | V1 |

## 3. Project Manager (PM)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-PM-01 | 다중 프로젝트 등록·관리, 최근 목록 | §3.1 | MVP-Core(등록·최근 목록, P01·P03) / V1(관리 화면, P06) |
| REQ-PM-02 | 로컬 폴더·Git 저장소 연결 | §3.1 | MVP-Core(P01) |
| REQ-PM-03 | 기술 스택 자동 인식 | §3.1 | V1(P06) |
| REQ-PM-04 | 파일 탐색기·검색 | §3.1 | MVP-Core(탐색기 읽기, P03) / V1(검색, P08b) |
| REQ-PM-05 | 프로젝트별 설정, Skills/MCP 설정 | §3.1 | V1(P06·P07) |
| REQ-PM-06 | Git 브랜치·worktree 관리 | §3.1 | V1(P10b) |
| REQ-PM-07 | 프로젝트별 실행 이력 | §3.1 | MVP-Core(저널 기반 목록, P03) / V1(Activity 화면, P06) |
| REQ-PM-08 | 프로젝트별 승인·권한 정책 | §3.1, §11.1 | MVP-Core(정책 엔진·기본값, P10a) / V1(정책 UI, P06) |

## 4. Phase Manager (PH)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-PH-01 | 요구사항 분석 기반 Phase 자동 생성, 기능별 분리 | §3.2 | V1 |
| REQ-PH-02 | Phase 수동 생성·편집·삭제, 목표, Acceptance Criteria | §3.2 | V1 |
| REQ-PH-03 | Phase 의존성 DAG | §3.2 | V1 |
| REQ-PH-04 | Phase→Task 분해, 우선순위, 담당 에이전트 | §3.2 | V1 |
| REQ-PH-05 | 상태: 완료·진행·대기·실패 (+§13 상태 머신) | §3.2, §13 | MVP-Core(Task 상태 머신, P01) / V1(Phase 투영 UI, P06) |
| REQ-PH-06 | Phase별 체크포인트 | §3.2 | V1 |
| REQ-PH-07 | 요구사항 변경 이력, 변경 영향 분석, 재계획 | §3.2 | V2 |
| REQ-PH-08 | 완료 조건 검증(AI 보고가 아닌 실제 증거) | §3.2, §15 | V1 |

## 5. Session Manager (SM)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-SM-01 | Claude Code 세션 검색·조회 | §3.3 | MVP-Core |
| REQ-SM-02 | Codex 세션 검색·조회 | §3.3 | MVP-Core |
| REQ-SM-03 | 기존 세션 재개(Native Session Resume) | §3.3 | MVP-Core |
| REQ-SM-04 | 세션 분기(Session Fork) | §3.3 | V1 |
| REQ-SM-05 | 새 세션 생성 | §3.3 | MVP-Core |
| REQ-SM-06 | 세션별 대화·실행 이력 | §3.3 | MVP-Core |
| REQ-SM-07 | 프로젝트·Phase·Task와 세션 연결(N:M, Phase≠Session) | §3.3, §13 | MVP-Core |
| REQ-SM-08 | 세션 간 구조화된 handoff(Context Handoff) | §3.3 | V1 |
| REQ-SM-09 | 장기 컨텍스트 관리: 압축 또는 재구성 | §3.3 | V2 |
| REQ-SM-10 | 세션 재개 실패 시 대체 복원(Checkpoint Restore) | §3.3 | MVP-Core |
| REQ-SM-11 | 앱 종료·비정상 종료·재부팅 후 복원 | §3.3 | MVP-Core |
| REQ-SM-12 | 읽기 전용 세션 재생(Read-only Session Replay) | §3.3 | V1 |
| REQ-SM-13 | 다음 다섯 기능을 서로 다른 동작으로 구분해 설계·표시: Native Resume / Context Handoff / Session Fork / Checkpoint Restore / Read-only Replay | §3.3 | MVP-Core(설계) |

## 6. Agent Collaboration Engine (CE)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-CE-01 | 작업 자동 분류 | §3.4 | V1 |
| REQ-CE-02 | Claude/Codex 역할 분배 | §3.4 | V1 |
| REQ-CE-03 | 에이전트 간 결과·계획·산출물 전달 | §3.4 | V1 |
| REQ-CE-04 | 독립 코드 리뷰(구현자≠리뷰어) | §3.4, §19 | V1 |
| REQ-CE-05 | 수정 작업 자동 생성, 테스트 실패 자동 분석, 재작업 반복 | §3.4 | V1 |
| REQ-CE-06 | 반복 한도 검사 | §3.4, §12 | MVP-Core |
| REQ-CE-07 | 작업 중복 실행 방지(Idempotency) | §3.4, §13 | MVP-Core |
| REQ-CE-08 | 명령 실행·결과 추적 | §3.4 | MVP-Core |
| REQ-CE-09 | 자동 복구 | §3.4, §14 | V1 |
| REQ-CE-10 | 사용자 승인 대기 상태 | §3.4, §11.5 | MVP-Core |
| REQ-CE-11 | 영속 작업 큐 | §3.4 | MVP-Core |
| REQ-CE-12 | 작업 위험도 기반으로 양쪽 에이전트 호출 여부 결정(불필요한 이중 호출 방지) | §19 | V1 |

## 7. Chat & Developer Workspace (WS)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-WS-01 | 통합 AI 채팅, 에이전트별 실시간 스트리밍 | §3.5 | MVP-Core |
| REQ-WS-02 | 실행 이벤트 타임라인 | §3.5 | MVP-Core |
| REQ-WS-03 | 파일 첨부: 입력 형식(텍스트·이미지·PDF 경로), 에이전트 전달 방식(Claude `image`/`document` 블록 또는 경로, Codex `turn/start.input{type:'image'|'localImage'}`), 저장 위치(프로젝트 `.agent-studio/attachments/`, 저널에는 해시만) | §3.5 | V1(P08b T6, AC-P08b-3) |
| REQ-WS-04 | 코드 검색·탐색, 코드 편집기 | §3.5 | MVP-Core(뷰어·Diff) / V1(편집, 검색) |
| REQ-WS-05 | Git Diff, 변경사항 선별 승인·되돌리기 | §3.5 | MVP-Core(Diff 보기 + **턴 단위 전체 되돌리기**; MVP-Core의 "승인"은 결과 수락·전체 되돌리기만) / V1(파일 선별) |
| REQ-WS-06 | 내장 터미널 | §3.5 | V1 |
| REQ-WS-07 | 테스트·빌드 로그, 개발 서버 상태 | §3.5 | V1 |
| REQ-WS-08 | 브라우저 미리보기, 브라우저 자동화 | §3.5 | V2 |
| REQ-WS-09 | 작업 일시정지·취소·실행 중 추가 지시 | §3.5 | MVP-Core |
| REQ-WS-10 | 단축키·명령 팔레트 | §3.5 | V1 |
| REQ-WS-11 | 다중 창·분할 화면 | §3.5 | V2 |
| REQ-WS-12 | 접근성·키보드 탐색 | §3.5 | V1 |
| REQ-WS-13 | "코드 변경 여부"와 "AI 완료 보고"를 UI에서 구분 표시 | §15 | MVP-Core |

## 8. Skills & MCP Manager (SK)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-SK-01 | 설치된 Skills 검색, 공식 출처·버전·커밋·해시 표시 | §3.6 | V1(P07 T1 Registry 스캔·해시 + T6 화면) |
| REQ-SK-02 | Claude/Codex 호환성 표시 | §3.6 | V1(P07) |
| REQ-SK-03 | 활성화·비활성화, 프로젝트별 적용 | §3.6 | V1 |
| REQ-SK-04 | Skills 선택: 에이전트 자율 선택 기본(U10) + 앱의 노출 범위 필터·기대 주도 스킬 대조·증거 검증; 사용자 명시 호출(`/name`)은 항상 우선 | §3.6, §6 | V1 |
| REQ-SK-05 | 중복·충돌 감지 | §3.6, §7.1 | V1 |
| REQ-SK-06 | 스킬 실행 증거 수집(§8 13개 필드) | §3.6, §8 | MVP-Core(관찰 이벤트 `SkillSelected/InjectionAccepted/LoadObserved` 기록 + 수동 증거 프로토콜, P01) / V1(Verifier 게이트·투영, P07) |
| REQ-SK-07 | Hook·외부 의존성 확인, 위험 스킬 격리 | §3.6, §11.4 | V1 |
| REQ-SK-08 | MCP 서버 등록·상태·권한 관리 | §3.6 | V1 |
| REQ-SK-09 | 업데이트 검토·롤백 | §3.6 | V2 |
| REQ-SK-10 | 배포 대상별 형식 차이 처리: Claude Code `~/.claude/skills/<name>/`, Codex `$CODEX_HOME/skills/<name>/`(확인됨), Claude Desktop ZIP 업로드·description 200자 제한(파일 수 상한 UNVERIFIED) | §3.6, 환경 조사 | V1(Codex 측은 주도 스킬 8종 설치 — U5, 구현 착수 시 C4 승인) |
| REQ-SK-11 | 사용자 전용 호출 스킬(`disable-model-invocation: true`) 식별 및 자동 라우팅 제외 | 환경 조사(9개 확인) | MVP-Core(Registry 플래그) / V1(Router 적용) |
| REQ-SK-12 | "프롬프트에 스킬 이름 포함"을 실행 성공으로 간주하지 않음 | §8 | MVP-Core |

## 9. Operations (OPS)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-OPS-01 | 실시간 작업 모니터링, 진행률, Phase별 상황, 에이전트 상태 | §3.7 | MVP-Core |
| REQ-OPS-02 | 세션 사용량, 토큰·비용 추정(제공 안 되는 환경 대안 포함) | §3.7, §12 | V1 |
| REQ-OPS-03 | 작업별 시간 제한 | §3.7, §12 | MVP-Core |
| REQ-OPS-04 | 실패·승인 대기 알림 | §3.7 | MVP-Core |
| REQ-OPS-05 | 실행 로그, 감사 로그(비밀 마스킹) | §3.7, §11.3 | MVP-Core |
| REQ-OPS-06 | 백업·복구 | §3.7 | V1 |
| REQ-OPS-07 | 앱 업데이트, OS별 설치·제거 | §3.7 | V1 |

## 10. 상태 관리·복구 (STATE / REC)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-STATE-01 | 계층 Workspace → Project → Phase → Task → Agent Run → Session; 세션 재사용·분기 고려한 관계 | §13 | MVP-Core |
| REQ-STATE-02 | 상태 머신 QUEUED→PLANNING→IMPLEMENTING→REVIEWING→VERIFYING→COMPLETED + REWORK/WAITING_APPROVAL/BLOCKED/FAILED/CANCELLED, 전이별 사전조건·이벤트·제한시간·실패처리·감사 | §13 | MVP-Core |
| REQ-STATE-03 | 단일 제어 주체가 상태 변경; 에이전트가 상태 DB 직접 조작 금지 | §13 | MVP-Core |
| REQ-STATE-04 | Lease, Fencing Token, Idempotency Key, Worker Heartbeat, Event Journal, Checkpoint, Recovery Manager 검토·채택 | §13 | MVP-Core |
| REQ-REC-01 | Claude 정상 종료 | §14 | MVP-Core(P02) |
| REQ-REC-02 | Codex 정상 종료 | §14 | MVP-Core(P02) |
| REQ-REC-03 | 에이전트 비정상 종료 — 평가 선행, 재기동은 관찰 전용 | §14 | MVP-Core(P04·P05) |
| REQ-REC-04 | 앱(Shell) 강제 종료 — 데몬 지속 | §14 | MVP-Core(P04·P11a) |
| REQ-REC-05 | OS 재부팅 | §14 | MVP-Core(P05) |
| REQ-REC-06 | 네트워크 단절(오류 분류) | §14 | MVP-Core(P02) |
| REQ-REC-07 | 인증 만료 | §14 | MVP-Core(P02) |
| REQ-REC-08 | 사용 한도 초과 | §14 | MVP-Core(P02) |
| REQ-REC-09 | 스킬 실행 실패 | §14 | V1(P07) |
| REQ-REC-10 | 테스트 중단 | §14 | V1(P09) |
| REQ-REC-11 | Git 충돌 | §14 | MVP-Core(감지·WAITING_APPROVAL, P05) |
| REQ-REC-12 | 세션 ID 복원 불가(분류) | §14 | MVP-Core(P05) |
| REQ-REC-13 | 부분 완료(효과 대조) | §14 | MVP-Core(P04) |
| REQ-REC-14 | 승인 범위 이탈 재시작 | §14 | MVP-Core(P10a) |
| REQ-REC-15 | 자동 재실행이 위험하면 WAITING_APPROVAL 또는 BLOCKED로 전환; 미완료 작업 단순 재실행 금지 | §14 | MVP-Core |

## 11. 보안·승인·실행 제한 (SEC / LIM)

| ID | 요구사항 | 출처 | 릴리스 |
|---|---|---|---|
| REQ-SEC-01 | 권한 항목 11종(§11.1) 프로젝트별 정책화 | §11.1 | MVP-Core |
| REQ-SEC-02 | 격리: worktree, 작업별 실행 디렉터리, 샌드박스, 프로세스 권한 분리, 경로 제한, 프로젝트 외부 변경 방지, 프롬프트 인젝션 대응. worktree는 보안 샌드박스가 아님을 명시 | §11.2 | MVP-Core(경로 제한) / V1(샌드박스) |
| REQ-SEC-03 | OS 자격증명 저장소, 토큰 마스킹, 저장 데이터 암호화 필요성 평가, 백업 보호, 인증 만료 처리 | §11.3 | MVP-Core |
| REQ-SEC-04 | Skills/MCP 공급망: 공식 저장소 검증, 커밋 고정, 해시 검증, 설치 스크립트·Hook 검토, 자동 업데이트 제한, 격리·롤백 | §11.4 | V1 |
| REQ-SEC-05 | 승인 정책은 프롬프트 지침(CLAUDE.md/AGENTS.md)이 아닌 실행 제어 계층에서 강제 | §11.5 | MVP-Core |
| REQ-SEC-06 | 승인 유형: 자동 허용 / 항상 승인 / 위험도 기반, 유효기간·범위·거부 처리·부재 시 대기·승인 후 범위 변경 검사 | §11.5 | MVP-Core |
| REQ-LIM-01 | 초기 후보값 9종(§12 표) 검토 후 권장값·근거·예외·조정 범위·검증 테스트 정의 | §12 | MVP-Core |
| REQ-LIM-02 | 재시도(인프라 오류)와 리뷰 반복을 구분 집계 | §12 | MVP-Core |
| REQ-LIM-03 | 인증·네트워크·도구 오류 구분, 승인 대기 시간은 실행 시간에서 제외 | §12 | MVP-Core |
| REQ-LIM-04 | 외부 변경이 이미 일어난 작업의 재시도 가능성 판정, 무한 루프·중복 차단 | §12 | MVP-Core |

## 12. 개발 과정 요구 (DEV) — Agent Studio 자체 개발에 적용

| ID | 요구사항 | 출처 | 적용 |
|---|---|---|---|
| REQ-DEV-01 | 모든 Phase 계획에 §8의 10개 스킬 항목 포함 | §8 | 공통 게이트(모든 Phase) |
| REQ-DEV-02 | Task 시작 시 에이전트가 스킬 선택 → 앱 관찰·기대 스킬 대조 → 로드·실행 증거 확인 → 미검증 시 완료 보류. **Codex 스킬 설치(U5, C4) 전 Task 예외**: 주도 스킬 사용 불가 → `skill_unavailable(codex,U5)` 사유 기록 + Claude 교차 리뷰 + 테스트 증거로 게이트 통과 | §6, §8 | 공통 게이트(P07 이전은 수동 증거 프로토콜) |
| REQ-DEV-03 | 개발 세션도 에이전트 자율 선택 기본(U10) + 증거 기록; 기대 주도 스킬 미선택·오선택 시 명시 호출로 교정(REWORK 1회) | §7.1 | 공통 게이트 |
| REQ-DEV-04 | Claude 구현 → Codex 리뷰, Codex 구현 → Claude 리뷰 기본 | §19 | 공통 게이트 |
| REQ-DEV-05 | 실행 로그에 §8의 13개 필드 연결 | §8 | 공통 게이트(제품 기능으로는 P07 T3·T4) |

## 13. UI 화면 (UI)

| ID | 화면 | 핵심 요소 | 출처 | 릴리스·Phase |
|---|---|---|---|---|
| REQ-UI-01 | Home | 최근 프로젝트, 새 프로젝트, 세션 이어하기, 실행 중·승인 대기, 알림, **인증 확인·API key 설정 경로** | §15 | MVP-Core(P03) / V1(스택 감지 카드, P06) |
| REQ-UI-02 | Workspace | 채팅, 탐색기, 편집기, 터미널, Diff, 테스트, 미리보기 | §15 | MVP-Core(채팅·탐색기·Diff·읽기 편집기, P03·P08a) / V1(편집·터미널·테스트, P08b) / V2(미리보기) |
| REQ-UI-03 | Project Planning | 요구사항, Phase, Task 보드, DAG, 진행률, 수용 기준, 검증 상태 | §15 | V1(P06) |
| REQ-UI-04 | Sessions | Claude/Codex 세션, 검색, 재개·분기, 타임라인, handoff 기록 | §15 | MVP-Core(목록·재개·Replay·Checkpoint Restore, P05) / V1(분기 UI·handoff 기록, P05·P09) |
| REQ-UI-05 | Activity | 실행 로그, 도구 호출, 스킬 증거, 변경, 테스트, 비용 | §15 | MVP-Core(타임라인 내 로그, P03) / V1(전용 화면, P07) |
| REQ-UI-06 | Skills & MCP | 설치 상태, 호환성, 활성화, 라우팅, 해시, 권한, MCP 상태 | §15 | V1(P07) |
| REQ-UI-07 | Settings | 모델·에이전트, 모드, 보안·승인, 제한, 보존, 백업, 업데이트 | §15 | MVP-Core(인증 모드·권한 모드·제한, P03) / V1(정책 매트릭스·백업·업데이트, P06·P10b) |
| REQ-UI-08 | 반복 설정 없이 자연스럽게 사용 가능한 기본값 | §15 | MVP-Core |

## 13A. 상속·보충 기능 (CAP)

원칙 **최대 통과 + 3단 보충**(정본: AGENT_INTEGRATION_DESIGN §7): (1) 런타임이 헤드리스에서 제공하는 도구·스킬·플러그인·MCP는 그대로 노출 (2) 없는 기능은 Agent Studio MCP 도구 서버가 제공 (3) 그래도 없으면 LLM이 스크립트로 수행(설치는 승인, OS 입력 제어는 3단 금지). 이것은 **설계 원칙이며 능력 보증이 아니다**: 각 행은 P00 S9에서 `supported / conditional / unsupported`로 판정되고, 아래 "1단" 표기는 S9 전까지 `conditional(UNVERIFIED)`다(예외: 내장 파일 도구는 공식 문서·실사용으로 `supported`). 미지원·조건부 항목은 UI 노출 전 V1 구현·보안 AC를 별도로 통과해야 한다. 공급자별 구현 경로와 S9 판정 항목은 AGENT_INTEGRATION_DESIGN §7 표가 단일 출처다.

| ID | 요구사항 | 경로 | 릴리스 |
|---|---|---|---|
| REQ-CAP-01 | 플랜 모드(읽기 전용 계획) 선택 | 1단 | MVP-Core(P02) |
| REQ-CAP-02 | 자동 권한 모드를 프로젝트별 옵트인으로 선택 — 기본은 안전(승인) 모드; **모든 공급자·OS·격리 조합**에서 옵트인 가능(U8), 격리 미확인 조합은 경고 배지 + 활성 시 1회 확인; 상시 배지 문구는 UI_UX_SPECIFICATION §7, 보장 수준은 SECURITY_MODEL §2.1 | 1단 | MVP-Core(P02) |
| REQ-CAP-03 | 파일 생성·편집, PDF·이미지 읽기(내장 도구 `supported`; Codex Desktop 번들 플러그인은 conditional) | 1단 | MVP-Core(내장) / V1(플러그인, S9) |
| REQ-CAP-04 | 문서 생성(docx/xlsx/pptx/pdf) | 1단→3단 | V1(S9 후) |
| REQ-CAP-05 | 이미지 생성·편집(Claude는 생성 기능 없음 → Codex 라우팅 또는 2단 API) | 1단(Codex)/2단 | V1(S9 후) |
| REQ-CAP-06 | 브라우저 자동화 | 1단→2단 | V1(P10b T9; 미리보기 P08c는 별도 REQ-WS-08) |
| REQ-CAP-07 | 컴퓨터 사용(화면 캡처·마우스·키보드) | 2단 **전용**(3단 스크립트 금지, 캡처·입력 분리 승인) | V1 조건부(TEST-SE-10) |
| REQ-CAP-08 | Agent Studio MCP 도구 서버(컴퓨터 사용·이미지 생성 API·브라우저 연계)를 양 에이전트에 제공(`mcpServers` / `-c mcp_servers.*`) | 2단 | V1(S9 결과로 범위 확정) |
| REQ-CAP-09 | Codex `CODEX_HOME` 공유 — **사용자 것 공유가 기본**(U9), 격리는 프로젝트별 옵션. 공유 시 Desktop 플러그인·스킬·로그인·MCP·`notify` 상속, 유효 설정 스냅숏·앱 소유 스레드 필터 의무; 전역 `config.toml` 미수정 | 1단 | MVP-Core |

## 14. 테스트 요구 (TEST)

§20의 5개 범주(에이전트 7, 협업 6, 상태·복구 7, 보안 7, 데스크톱 8 = 35개 시나리오)를 `TEST_STRATEGY.md`·`RECOVERY_TEST_PLAN.md`에서 `TEST-<범주>-<번호>`로 정의하고 각 시나리오에 환경·사전조건·입력·예상·실패 처리·증거를 둔다. 추가: 백그라운드 수용 TEST-BG-01~10, 제한 TEST-LIM-01~04, Review Focus TEST-RF-01~05.

## 15. 지시서 대비 보완 규칙

지시서에 없거나 서로 충돌하는 요구를 다음 규칙으로 보완한다. 미검증 항목은 OPEN_ISSUES_AND_RISKS §2에서 해소 Task를 추적한다.

| # | 지시서 쟁점 | 적용 규칙 |
|---|---|---|
| 1 | Phase 자동 생성(REQ-PH-01)과 사용자 수동 편집(REQ-PH-02)의 충돌 | 사용자 편집 우선, 자동 재계획은 제안 상태로만(PHASE_MANAGEMENT §4) |
| 2 | 앱 승인과 CLI 자체 권한 시스템의 이중 승인 | 앱이 CLI 권한 요청을 수신·대리(Claude `canUseTool`, Codex `requestApproval`); 미지원 경로는 축소 fallback으로 표시(AGENT_INTEGRATION §2·§3) |
| 3 | 세션 검색·조회가 CLI 로컬 저장 형식에 의존 | 공식 API만 사용(`listSessions`, `thread/list`), 파일 직접 파싱 금지; 앱 SessionIndex가 유일한 목록 소스(SESSION_RECOVERY §2). 형식 공식 보장 여부는 UNVERIFIED |
| 4 | ChatGPT 로그인 Codex는 금액 비용이 제공되지 않을 수 있음 | 토큰 수·호출 수·시간 기반 한도를 1차, 금액 추정은 선택(EXECUTION_LIMITS) |
| 5 | 사용자 전용 스킬 9개를 자동 라우팅이 고르면 실행 불가 | REQ-SK-11: 자동 선택 제외, 사용자에게 제안만 |
| 6 | 일부 설치 스킬이 미설치 스킬을 호출 | SKILL_COMPATIBILITY_MATRIX "깨진 참조" 열, 조건부 사용 |
| 7 | 백그라운드 실행 중 사용자 부재 시 승인 무한 대기 | 승인 대기 중 활성 시간 정지, **15분** 후 `BLOCKED(approval_expired)`, 복귀 시 새 run·새 요청(D14) |
| 8 | Claude Desktop ZIP 업로드 파일 수 상한 | UNVERIFIED — 공식 문서 확인 실패 시 제한 없이 유지 |
| 9 | 동시 수정 1개 제한의 단위 | MVP-Core 프로젝트당 1개, V1 worktree당 1개 |
| 10 | 첫 실행 "설정 없이 대화"와 인증 설정의 충돌 | 기본 = CLI 로그인 재사용(U1)이라 첫 실행은 공급자별 로그인 상태 확인만; API key는 전환 시에만 설정 경로; 인증 준비된 공급자만 즉시 대화(UI_UX §1) |
| 11 | "Claude Code·Codex 기능 전부 사용" 기대와 자동 권한 모드 안전성의 충돌 | REQ-CAP-02: 안전 기본값 + 모든 조합 옵트인(U8), 보장 수준 표시 |
| 12 | Desktop 앱 전용 기능(computer-use·문서 플러그인·synced 스킬)의 헤드리스 가용성 | UNVERIFIED — P00 S9 실측, 2단 보충(REQ-CAP-08) |
| 13 | §9.7 협업 도구 4종의 실재 여부 | 확인됨 — ccmux·dispatch·relay 실재, dual-agent-orchestration은 무관 프로젝트(확인 근거: `archive/evidence/research/RESEARCH_AGENT_GATEWAY.md`) |

## 16. 추적성

- 요구사항 ID → `PHASE_BREAKDOWN.md`(Phase별 요구사항 ID), `ACCEPTANCE_CRITERIA.md`(AC-ID), `TEST_STRATEGY.md`(TEST-ID).
- 변경은 이 문서의 표를 수정하고 커밋 로그로 추적한다.
