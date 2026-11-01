# CODEX_PLAN_REVIEW — OpenAI Codex 독립 계획 리뷰 (Round 4)

| 메타 | 값 |
|---|---|
| 상태 | FINAL(Round 4 보존본, 원문 수정 금지). 처리 결과는 `REVIEW_RESOLUTION.md` |
| 작성 | OpenAI Codex (codex-cli 0.166.0, model gpt-6-sol, reasoning effort high override), **새 세션 3개**(공동 설계 스레드 A와 분리) |
| 호출 | 2026-11-01 12:31:11Z 병렬 시작, `codex exec -s read-only -C D:\LLMgent-studio --json`, 모두 exit 0 |
| 원본 | `codex/R4_review_{1,2,3}/{prompt.md,response.md,events.jsonl,meta.json}` |
| 독립성 | 리뷰 프롬프트는 읽을 문서 경로와 검사 항목만 제공. Claude는 응답 수신 전 어떤 리뷰 결과도 작성하지 않았다 |
| 원문 보존 | 아래 §2~§4는 각 `response.md`와 바이트 단위 동일(스크립트로 연결, 수동 편집 없음) |

## 1. 심각도 집계 (Claude 산출 — 원문 표의 ID·심각도 열을 정규식으로 집계)

| 호출 | 세션 | thread | 영역 | 종료 | 건수 | Critical | High | Medium | Low | usage(in/cached/out/reasoning) |
|---|---|---|---|---|---|---|---|---|---|---|
| #7 R4_review_1 | B1 | `<thread-id>` | 제품·아키텍처·기술·UI/UX | 12:31~12:37Z | 19 | 0 | 6 | 11 | 2 | 1,821,960/1,719,296/13,229/4,237 |
| #8 R4_review_2 | B2 | `<thread-id>` | 에이전트 통합·상태·복구·협업·스킬 5종 | 12:31~12:40Z | 25 | 3 | 12 | 9 | 1 | 4,546,494/4,366,336/19,300/5,048 |
| #9 R4_review_3 | B3 | `<thread-id>` | 보안·실행 제한·테스트·Phase·마스터플랜 | 12:31~12:38Z | 22 | 2 | 11 | 9 | 0 | 1,337,779/1,271,040/16,440/5,264 |
| **합계** | | | | | **66** | **5** | **29** | **29** | **3** | |

판정 요약(원문 인용 기준): R4-1 "재작업", R4-2 "존재하지 않는 이름은 확인되지 않았다 … 발명된 필드"(`turn/completed.usage`), R4-3 "Critical 2건, High 11건, Medium 9건". Critical 5건은 모두 승인 경계·효과 원장·복구 순서·격리 게이트에 집중된다.

## 2. 원문 — R4_review_1 (제품·아키텍처·기술·UI/UX) · thread `<thread-id>`

### 요약

**판정: 재작업.** 핵심 기능의 REQ-ID는 대체로 존재하고 7개 화면과 “AI 보고 vs 실제 변경” 구분도 명세되어 있다. 그러나 MVP라고 약속한 기능 여러 개가 MVP 이후 Phase에 배치되어, 현재 문서만으로는 릴리스 완료 여부를 판정할 수 없다. 첫 실행 인증 흐름, Shell 종료 중 Git 검증, Renderer와 데몬의 접속 계약도 맞물리지 않는다. 기술 선택 자체는 대체로 근거가 있으나 Claude Agent SDK의 사용 조건과 네이티브 모듈 빌드 전제를 결정표에 반영해야 한다.

### 발견 사항

| ID | 심각도(Critical/High/Medium/Low) | 영역 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|---|
| R4A-01 | High | 라이선스·배포 | [TECH_STACK_DECISIONS.md](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:22) §1–2, ADR-0007 | “MIT 계열” 요약이 핵심 의존성인 `@anthropic-ai/claude-agent-sdk`에는 적용되지 않는다. | [SDK 저장소의 LICENSE](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/LICENSE.md)는 사용에 Anthropic Commercial Terms가 적용된다고 명시한다. [Codex 저장소](https://github.com/openai/codex/blob/main/docs/license.md)는 Apache-2.0이다. | 배포 방식별 SDK 사용·재배포 조건을 별도 결정 게이트로 두고, 결정표의 라이선스 칸을 실제 조건으로 채워라. |
| R4A-02 | High | 릴리스 추적성 | [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:40) §3–8, [PHASE_BREAKDOWN.md](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:22) §0·2 | MVP로 적힌 `REQ-PM-01·02·04·07·08`, `REQ-PH-05`, `REQ-SK-01·02·06·11·12`의 주된 구현 Phase인 P06·P07이 MVP 게이트 P11a 뒤에 있다. | P11a에서 MVP를 태그한 뒤 P06·P07을 수행하는 순서다. P01/P03/P05가 일부 기초 기능을 제공하더라도 위 REQ 전체의 MVP 충족 범위는 정의되지 않았다. | 각 REQ를 MVP 최소 범위와 V1 확장 범위로 나누거나 Phase를 MVP 앞으로 옮겨라. MVP 수용 기준도 같은 범위를 써야 한다. |
| R4A-03 | High | 첫 실행 UX·인증 | [UI_UX_SPECIFICATION.md](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:13) §1, [TECH_STACK_DECISIONS.md](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:25) §1 | “CLI 감지 → 폴더 선택 → 설정 없이 Claude Mode 대화”와 “MVP 기본 API key”가 동시에 성립하지 않는다. | 이 PC의 Claude CLI 설치·로그인 감지는 앱용 API key의 존재를 보장하지 않는다. [Anthropic의 제품 개발자 인증 안내](https://code.claude.com/docs/en/legal-and-compliance)는 Agent SDK 기반 제품에 API key 사용을 안내한다. | 첫 실행에 공급자별 인증 확인과 API key 설정 경로를 넣고, 인증이 준비된 경우에만 즉시 대화 흐름을 제시하라. |
| R4A-04 | High | 프로세스 소유권 | [SYSTEM_ARCHITECTURE.md](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:44) §1·3·5 | 데몬은 Shell 없이 계속 실행하지만 Git 조회·Diff와 사용자 터미널은 Shell에 있다. 백그라운드 작업 완료 시 Verifier가 변경·테스트 증거를 어떻게 확정하는지 빠져 있다. | §3은 데몬의 Verifier가 산출물을 검증한다고 하고, §5는 창·Shell 종료 뒤 데몬 지속을 목표로 한다. | Git 스냅숏·Diff·변경 귀속에 필요한 읽기 기능을 데몬 소유 서비스로 옮기거나, Shell 부재 시 검증을 보류하는 상태 전이를 명시하라. |
| R4A-05 | High | RPC 계약 | [SYSTEM_ARCHITECTURE.md](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:35) §1·4 | Renderer가 데몬에 직접 WS로 접속하면서 인증 토큰은 Renderer에 노출하지 않는다고 한다. 접속 시 인증 주체와 토큰 전달 경로가 없다. | 다이어그램의 `REND ↔ RPC`와 경계 표의 “토큰·경로 미노출”을 함께 구현할 계약이 정의되지 않았다. | main을 통한 제한된 RPC 프록시 또는 Renderer용 단기·제한 토큰 중 하나를 선택하고 연결·재연결 절차를 그려라. |
| R4A-06 | High | 빌드 툴체인 | [TECH_STACK_DECISIONS.md](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:20) §1·2, [ENVIRONMENT_SURVEY.md](D:/LLM/agent-studio/docs/planning/evidence/ENVIRONMENT_SURVEY.md:9) §1 | “현 PC Node 24로 즉시 개발 가능”은 `node-pty`의 네이티브 빌드 전제를 빠뜨린다. 현재 PATH에서 `cl`·`msbuild`도 확인되지 않았다. | [node-pty의 빌드 안내](https://github.com/microsoft/node-pty/blob/main/README.md)는 Windows C++ 컴파일러와 SDK 구성 요소를 요구한다. PATH 부재만으로 설치 자체를 부정할 수는 없다. | P00에서 Windows 컴파일러·SDK 존재와 `node-pty` 설치물 로드를 확인하고, 미비 시 필요한 툴체인을 명시하라. |
| R4A-07 | Medium | 요구사항 정확도 | [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:29) §2 | 단독 모드의 기능을 한 행으로 압축하면서 Claude Mode의 테스트와 Codex Mode의 코드 작성·수정 및 테스트가 모드별 문장에서는 빠졌다. | `REQ-GOAL-04`가 구현·테스트를 통합 흐름으로 다루지만 각 단독 모드의 수행 범위를 보장하지는 않는다. | 아래 누락 목록의 세 문구를 `REQ-MODE-01·02`에 명시하고 모드별 수용 기준을 연결하라. |
| R4A-08 | Medium | REQ-ID 배정 | [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:152) §10·12·13, [PHASE_BREAKDOWN.md](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:42) §2 | `REQ-REC-01~14`를 한 행에 묶어 개별 시나리오의 릴리스 배정 추적이 어렵다. `REQ-UI-01·04·05·06·07·08`은 잠정 릴리스 열이 없고 Phase에도 해당 ID가 직접 배정되지 않았다. | `DEV-01~05`는 P07에 기재되어 있지만 실제로는 모든 개발 Phase에 적용할 과정 요구다. 화면의 구현이 Phase 서술에서 추론되는 것과 REQ-ID 배정은 다르다. | REC를 개별 ID로 펼치고, UI 6개에 MVP/V1/V2와 Phase를 명시하라. DEV는 공통 게이트와 P07의 제품 기능을 구분하라. |
| R4A-09 | Medium | 기능별 Phase | [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:103) §7, [PHASE_BREAKDOWN.md](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:68) P03·P08b | `REQ-WS-03` 파일 첨부는 V1로 배정됐으나 Phase Task에 구현 경로가 없다. | UI Workspace 표에는 표시되지만 P03 채팅 Task와 P08b 편집기 Task 어디에도 첨부·저장·전달이 없다. | 첨부의 입력 형식, 에이전트 전달 및 UI Task를 V1 Phase에 배정하라. |
| R4A-10 | Medium | 인터페이스 계약 | [SYSTEM_ARCHITECTURE.md](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:51) §2, [AGENT_INTEGRATION_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:12) §1 | 핵심 이름 `AgentGateway`, `RunHandle`, `ApprovalBroker`, `EventStore`는 대체로 일치한다. 그러나 Gateway 메서드 표면과 `EventStore/Journal` 명칭에는 드리프트가 있다. | 시스템 문서에는 `resumeRun`·`forkRun`이 있으나 통합 설계는 `startRun(spec.mode)`로 합친다. 반대로 `readSession`, `RunHandle.close()`는 통합 설계에만 있다. `EventStore/Journal`이 한 인터페이스인지도 불명확하다. | `packages/protocol`에 단일 정식 인터페이스를 고정하고 두 문서가 동일한 서명을 참조하게 하라. |
| R4A-11 | Medium | 검증 표시 | [UI_UX_SPECIFICATION.md](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:14) §1·3, [SYSTEM_ARCHITECTURE.md](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:47) §1 | “AI 보고 vs 검증된 사실”은 적절하지만, 파일별 `user/agent/external` 귀속을 확정 사실처럼 표시할 근거가 부족하다. | Shell의 사용자 터미널에서 일어난 모든 파일 변경을 `actor=user`로 기록한다는 설계에는 명령 외부의 수정과 동시 수정 판별 방법이 없다. | 검증 수준을 `관찰된 Diff`, `실행과 연결됨`, `작성자 불명`으로 구분하고, 귀속은 해시·시점·실행 범위로 입증된 때만 확정하라. |
| R4A-12 | Medium | 승인 UX | [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:105) §7, [UI_UX_SPECIFICATION.md](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:75) §4 | 핵심 흐름은 Diff 확인 뒤 변경을 수락·되돌리도록 하지만 파일별 선별과 되돌리기는 V1이다. MVP에서 “승인”이 실행 승인인지 결과 수락인지 불분명하다. | `REQ-WS-05`는 MVP에서 Diff 보기만 약속한다. P08a의 되돌리기 Task도 V1 이월 가능이라고 적혔다. | MVP의 결과 확인 버튼과 실제 되돌리기 가능 범위를 별도로 정의하고, 불가능한 액션은 흐름에서 제거하거나 앞당겨라. |
| R4A-13 | Medium | UI·유지보수 | [UI_UX_SPECIFICATION.md](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:47) §3.2 | V2 브라우저 미리보기를 `<webview>`로 정해 두었다. | [Electron 공식 문서](https://www.electronjs.org/docs/latest/api/webview-tag)는 `<webview>` 사용을 권장하지 않고 `WebContentsView` 등 대안을 제시한다. | V2 설계에서 `WebContentsView`와 외부 브라우저 연동을 비교한 뒤 미리보기 방식을 결정하라. |
| R4A-14 | Medium | Monaco 호환성 | [SYSTEM_ARCHITECTURE.md](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:94) §6, [PHASE_BREAKDOWN.md](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:74) P08a | `custom protocol·worker` 실험은 계획에 있으나 설치물에서 사용할 URL/CSP/worker 로딩 계약이 아직 없다. | [Monaco README](https://github.com/microsoft/monaco-editor/blob/main/README.md)는 `file://` 페이지의 worker 생성 제한을 명시한다. Electron도 [로컬 페이지에 custom protocol을 권장](https://www.electronjs.org/docs/latest/tutorial/security)한다. | P00 성공 기준에 패키징된 앱의 편집기 worker 생성, 언어 서비스, CSP를 포함하고 실패 시 CodeMirror 전환 기준을 정하라. |
| R4A-15 | Medium | 네이티브 ABI | [ARCHITECTURE_COMPARISON.md](D:/LLM/agent-studio/docs/planning/01_architecture/ARCHITECTURE_COMPARISON.md:81) E3, [TECH_STACK_DECISIONS.md](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:21) §1 | E3가 `electron-rebuild`를 `better-sqlite3` 검증의 고정 절차처럼 기술하지만 데몬 런타임은 아직 미결이다. | Electron은 [일반 네이티브 모듈의 ABI 차이](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)를 설명한다. 다만 [better-sqlite3 v13 릴리스](https://github.com/WiseLibs/better-sqlite3/releases)는 Node-API 전환에 따른 교차 런타임 호환을 *이론적* 가능성으로 설명한다. 동봉 Node라면 Electron용 재빌드는 목표 런타임과 다를 수 있다. | 동봉 Node와 `runAsNode`를 분리해 각각 실제 `.node` 로드·WAL 쓰기를 시험하라. 재빌드 필요성은 결과로 결정하라. |
| R4A-16 | Medium | OS 범위 | [SYSTEM_ARCHITECTURE.md](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:86) §5, [ARCHITECTURE_COMPARISON.md](D:/LLM/agent-studio/docs/planning/01_architecture/ARCHITECTURE_COMPARISON.md:75) §5 | Windows 데몬 실험은 구체적이지만 macOS·Linux에서 창 종료, 앱 종료, 재접속, 자식 정리의 동등한 게이트가 없다. | [Node 공식 문서](https://nodejs.org/api/child_process.html)는 OS별 `detached` 의미가 다름을 설명한다. Windows 실험 성공을 3 OS의 수명주기 보증으로 일반화할 수 없다. | V1 배포 전 두 OS에서 설치물 기준 동일한 생존·정리·복구 시나리오를 필수 게이트로 배정하라. |
| R4A-17 | Medium | 비교 방법 | [ARCHITECTURE_COMPARISON.md](D:/LLM/agent-studio/docs/planning/01_architecture/ARCHITECTURE_COMPARISON.md:12) §1·3 | B가 Claude에게는 Electron main 통합, Codex에게는 Tauri/Rust인데 같은 B 열에서 합계와 순위를 비교한다. “영향이 없다”는 결론은 점수만으로 증명되지 않는다. | 두 B는 패키징·툴체인·백그라운드 특성이 다른 대안이다. 성능·비용 점수도 실측값이 아니다. | B를 `B1/B2`로 분리하고 필수 조건과 실측 전제를 먼저 비교하라. C의 선택 근거는 점수 외의 요구사항 충족 여부로 명시하라. |
| R4A-18 | Low | 화면 범위 | [UI_UX_SPECIFICATION.md](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:26) §3 | 7개 화면은 모두 다뤘지만 화면별 MVP/V1/V2 표는 Workspace에만 있다. Home의 기술 스택 감지, Sessions의 fork, Skills 화면의 라우팅·업데이트, Settings의 백업 등이 한꺼번에 보인다. | 제품 요구사항에서는 각각 V1 또는 V2인 기능이 화면 설명에서 시점 표시 없이 나열된다. | 7개 화면 각각에 릴리스별 노출·읽기 전용·편집 가능 상태를 표로 넣어라. |
| R4A-19 | Low | 대안 기록 | [TECH_STACK_DECISIONS.md](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:19) §1 | 주요 스택에는 대안이 있으나 Monaco, `node-pty`, keyring의 기각 이유는 한 줄 수준이고 테스트 러너·배포 포맷·서명에는 대안과 기각 근거가 비어 있다. | 지시문 PART J·K는 주요 선택의 비교 근거와 ADR을 요구한다. 특히 네이티브 의존성은 패키징 위험에 직접 연결된다. | 결정의 영향이 큰 항목부터 대안, 기각 이유, 되돌릴 조건을 기록하라. |

**C안 사실 대조:** `utilityProcess`가 stdin pipe를 제공하지 않는다는 조사 내용은 [Electron 공식 API](https://www.electronjs.org/docs/latest/api/utility-process)와 맞는다. Windows `detached` 실행 가능성도 [Node 공식 문서](https://nodejs.org/api/child_process.html)와 맞는다. 따라서 이 두 사실을 이유로 C안을 부정할 근거는 없다. 다만 “가능하다”와 “패키징된 앱에서 턴·자식·재접속까지 안정적으로 지속된다”는 별개의 주장이다. 후자는 계획대로 P00 실측이 필요하다.

### 요구사항 누락 목록 (directive bullet → 있음/없음)

아래 판정은 **PART A §1–§3의 각 bullet이 적어도 하나의 REQ-ID에 대응하는지**를 기준으로 했다. “부분”은 통합 목표에는 나타나지만 해당 실행 모드의 약속으로 명시되지 않은 경우다.

| 지시문 범위 | bullet → REQ-ID 대응 판정 |
|---|---|
| §1 제품 목표 | Windows 11·macOS·Linux → `REQ-GOAL-01` **있음**; 통합 환경 → `02` **있음**; 일반 AI 코딩 프로그램 UX → `03` **있음**; 자연어 지시부터 검증까지 → `04` **있음**; 추가 지시·일시정지·취소 → `05` **있음**; 종료·재부팅 뒤 복구 → `06` **있음**; 핵심 사용자 흐름 → `07` **있음**. |
| §2.1 Claude Mode | 단독 사용·대화형 개발·코드 작성·수정·기존 세션 재개·Claude 전용 Skills → `REQ-MODE-01` **있음**; **“디버깅 및 테스트” → 부분**(`01`에 디버깅만 명시). |
| §2.2 Codex Mode | 단독 사용·대화형 개발·기존 세션 재개·Codex 호환 Skills → `REQ-MODE-02` **있음**; **“코드 작성·수정” → 부분**, **“테스트 및 코드 리뷰” → 부분**(`02`에 리뷰만 명시). |
| §2.3 Auto Collaboration | 작업 유형·난이도 분석, 역할 분배, 요구사항 분석, 설계·구현 계획, 테스트 주도 개발, 코드 리뷰, 수정·재검증, 반복·시간 제한, 완료 기준 검증 → `REQ-MODE-03·04`, `REQ-GOAL-04`, `REQ-PH-01`에 **있음**. 단, 요구사항 분석과 설계 계획은 `MODE-03`의 모드별 문장에는 없다. |
| §2.4 Manual Collaboration | 담당 선택·결과 비교·수동 handoff·세션별 지시·임의 시점 전달 → `REQ-MODE-05` **있음**; 모드 전환 중 상태·변경 보존 → `06` **있음**. |
| §3.1 Project Manager | 10개 bullet 모두 → `REQ-PM-01~08` **있음**. 여러 bullet을 한 ID에 합쳤다. |
| §3.2 Phase Manager | 14개 bullet 모두 → `REQ-PH-01~08` **있음**. MVP 표기와 P06 배정 불일치는 R4A-02 참조. |
| §3.3 Session Manager | 14개 bullet과 구분할 5개 동작 모두 → `REQ-SM-01~13` **있음**. |
| §3.4 Agent Collaboration Engine | 14개 bullet 모두 → `REQ-CE-01~11` **있음**. |
| §3.5 Chat 및 Developer Workspace | 19개 bullet 모두 → `REQ-WS-01~12` **있음**. “코드 변경 여부와 AI 완료 보고 구분”도 `REQ-WS-13`에 **있음**. |
| §3.6 Skills 및 MCP Manager | 14개 주 bullet과 배포 대상별 형식 차이 → `REQ-SK-01~10` **있음**. Codex 경로는 조사 결과로 보완했다. |
| §3.7 Operations | 13개 bullet 모두 → `REQ-OPS-01~07` **있음**. |

따라서 **PART A에서 완전히 REQ-ID가 없는 기능 bullet은 확인되지 않았다.** 위에 원문 그대로 적은 단독 모드의 세 bullet은 *모드별 명시가 빠진 부분 대응*이다. 반면 ID가 존재한다는 사실만으로 릴리스 배정이 끝난 것은 아니다. 제품 표의 115개 ID 행 중 `REQ-DEV-01~05`와 `REQ-UI-01~08`에는 잠정 릴리스 열이 없으며, Phase 문서에서 UI 6개 ID의 직접 배정도 확인되지 않았다. `REQ-REC-01~14`는 한 행의 범위 표기라 개별 배정 확인이 불가능하다.

### 긍정적 확인

- 지시문 §15의 **Home, Workspace, Project Planning, Sessions, Activity, Skills & MCP, Settings**가 모두 UI 명세에 있다.
- `REQ-WS-13`과 작업 카드 흐름은 **AI 보고와 변경·테스트 증거를 구분**한다.
- `AgentGateway`, `RunHandle`, `ApprovalBroker`, `EventStore`라는 주요 경계는 양 문서에서 인식 가능하며, 어댑터 차이를 Gateway 뒤에 두려는 방향은 일관된다.
- C안은 Windows 데몬 지속, 재접속, 네이티브 로드, Monaco worker를 P00 실험으로 남겨 **아직 검증되지 않은 동작을 실험 대상으로 식별**했다.
- `codex app-server`의 변경 가능성과 세션 재구독의 미확인 상태를 명시한 점은 적절하다.

### UNVERIFIED

- 패키징된 Electron에서 Windows 데몬이 Shell 종료 뒤 실제 Codex 턴을 유지하고, 재접속 때 이벤트를 빠짐없이 이어받는지.
- macOS·Linux에서 동일한 데몬·자식 프로세스 수명주기와 정리 동작이 성립하는지.
- 선택한 데몬 런타임별 `better-sqlite3`·`node-pty` 바이너리 로드가 3 OS 설치물에서 통과하는지.
- 설치물의 custom protocol·CSP 아래에서 Monaco worker가 정상 작동하는지.
- 현재 PC에 PATH 밖의 Visual C++ 빌드 구성 요소가 있는지. PATH 조회에서는 `cl`·`msbuild`가 보이지 않았다.
- 앱 종료 후 사용자 변경과 에이전트 변경을 파일별로 신뢰성 있게 귀속할 수 있는지. 현재 설계에는 그 증거 수집 계약이 없다.

## 3. 원문 — R4_review_2 (에이전트 통합·상태·복구·협업·스킬 5종) · thread `<thread-id>`

### 요약

읽기 전용으로 지정 문서와 근거 자료를 검토하고, Codex 0.166.0 공식 소스 및 Claude Agent SDK 공식 문서와 대조했다.  
지명된 Codex 메서드·알림과 Claude SDK API에서 **존재하지 않는 이름은 확인되지 않았다**. 다만 `turn/completed.usage`처럼 **존재하지 않는 필드**, 서로 다른 승인 요청을 하나로 취급한 응답 설계, experimental 메서드의 사전 조건 누락이 있다.  
가장 큰 위험은 에이전트가 파일을 쓰다 종료된 경우 상태 평가보다 재기동을 앞세우는 순서와, 불완전한 효과 원장으로 부분 완료를 건너뛰려는 복구 규칙이다.  
스킬 매트릭스에는 실질 스킬·폐기 후보 54행이 있고, 지시서의 55개 검토 단위 중 묶음 후보 `superpowers`의 독립 분류 행이 없다.

### 발견 사항

| ID | 심각도 | 영역 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|---|
| R4B-01 | Critical | 승인 경계 | [COLLABORATION_PROTOCOL.md](D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md:14), [SKILL_COMPATIBILITY_MATRIX.md](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:29) | 모든 부작용이 `ApprovalBroker`를 거친다는 인상을 여전히 준다. 모드 표의 승인 열은 네 모드 모두 “브로커 경유”이고, 스킬 표에는 “push/merge는 ApprovalBroker 통과”라고 적혀 있다. | 통합 설계 §3은 `workspaceWrite`의 허용 범위 쓰기가 승인 요청 없이 실행된다고 인정한다. [SECURITY_MODEL.md](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:8)도 브로커가 “모든 부작용의 관문”이 아니라고 명시한다. 이전 [CLAUDE_INITIAL_PROPOSAL.md](D:/LLM/agent-studio/docs/planning/06_codesign/CLAUDE_INITIAL_PROPOSAL.md:128)의 “모든 외부 효과는 어댑터의 승인 요청 경로를 통과”는 명백한 잔존 오류다. 공식 [Codex 승인 설명](https://learn.chatgpt.com/docs/app-server)은 설정에 따라 요청이 발생한다고 한다. | 각 표에 **승인 요청이 발생한 효과만** 브로커가 판정한다고 쓰고, 원격 Git·DB·설치·배포는 앱 전용 실행기 경계를 명시한다. 오래된 단정도 폐기 표시한다. |
| R4B-02 | Critical | 중복 실행·복구 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:54) | 시나리오 #3은 에이전트 비정상 종료 뒤 “lease 유지 중 1회 어댑터 재기동”을 **§3 판정보다 먼저** 둔다. 파일 쓰기 도중 종료되어 `EffectIntent` 기록 전이나 `EffectCommitted` 기록 전에 실제 변경이 남았다면 새 에이전트가 같은 지시를 다시 수행할 수 있다. | §3은 dirty worktree와 미확정 효과를 평가한 뒤에야 재개 여부를 정한다. #3은 그 순서를 역전한다. lease가 살아 있어도 재시작된 네이티브 세션의 도구 실행을 되감거나 격리한다는 보장은 없다. | 재기동은 **관찰 전용 접속**으로 제한한다. 먼저 프로세스 종료를 확정하고 실행 경로를 봉쇄한 다음, Git·파일·외부 효과를 대조해 새 run 승인 여부를 결정한다. |
| R4B-03 | Critical | 효과 원장 | [DATABASE_SCHEMA.md](D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:60), [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:64) | `effects`의 선언 열은 `kind,target,state,result_json` 중심인데, 파일 3분기 판정에 필요한 `base blob`, `target blob`, 패치 해시, 파일 모드 및 효과별 외부 확인자를 필수 필드로 규정하지 않았다. `EffectIntent` 최소 이벤트도 key·kind·target만 제시한다. | §3의 “현재 blob=목표 / =base / 둘 다 아님” 판정은 기록된 기준값 없이는 수행할 수 없다. 네트워크·패키지 설치·MCP 호출은 idempotency key를 **앱 DB에만** 두어도 상대 시스템에서 중복을 막을 수 없다. #13의 “완료된 효과 건너뜀”도 잘못된 완료 판정을 전제로 한다. | 효과 종류별 intent payload와 확인 절차를 스키마로 고정한다. 파일은 경로·base/target blob·모드·패치 해시를, 외부 효과는 제공자 idempotency key 또는 조회 가능한 결과 ID를 요구한다. 확인 불가 효과는 자동 건너뛰기와 자동 재시도를 모두 금지한다. |
| R4B-04 | High | 이벤트 소싱 | [DATABASE_SCHEMA.md](D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:13) | “모든 투영은 저널에서 재구성 가능”이라는 불변식이 현재 이벤트 목록으로 성립하지 않는다. 프로젝트 `policy_json`·`settings_json`, 요구사항 본문과 연결, `phase_deps`, 스킬 Registry 설정, MCP 활성 상태, `PAUSED` 플래그의 변경 이벤트·완전한 payload가 정의되지 않았다. | 표의 투영에는 해당 값이 있지만 §2.1 최소 이벤트에는 생성·갱신·삭제를 모두 재생할 계약이 없다. [PHASE_MANAGEMENT_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md:93)의 `requirement_changes`는 DB 표에도 없다. 180일 아카이브 이후 전체 재생 경로도 불명확하다. | 투영 열마다 생성·수정·삭제 이벤트와 버전별 payload를 매핑하고, 빈 DB에서 아카이브를 포함해 재생하는 검증을 정의한다. |
| R4B-05 | High | 상태 머신 | [PHASE_MANAGEMENT_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md:30) | 다이어그램의 `REWORK`에는 `IMPLEMENTING`·`FAILED` 이외의 출구가 없고, `VERIFYING`에는 `WAITING_APPROVAL`·`BLOCKED`가 없다. `BLOCKED→CANCELLED`, `REWORK→CANCELLED`, 사용자에 의한 `WAITING_APPROVAL→CANCELLED`도 빠져 있다. | 같은 문서 규칙표는 `*→WAITING_APPROVAL`, `*→BLOCKED`, `*→CANCELLED`라고 하여 다이어그램과 충돌한다. 복구 #11의 Git 충돌은 `WAITING_APPROVAL`을 요구하지만 다이어그램의 `git_conflict`는 `BLOCKED`로만 간다. | 상태별 허용 전이를 하나의 기계 판독 가능 표로 고정하고 다이어그램·복구표·UI를 그 표에서 생성한다. 취소와 승인 보류는 모든 비종결 상태에서 명시한다. |
| R4B-06 | High | 협업 독립성 | [COLLABORATION_PROTOCOL.md](D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md:33) | “구현자 ≠ 리뷰어”가 모든 경로에서 보장되지 않는다. 기본 프로토콜의 `REWORK` 담당은 `Codex`로 고정되어 있어 역할을 뒤집은 `Claude` 구현 경로와 충돌한다. Manual 모드에서는 양측이 같은 Task를 구현하고 사용자가 하나를 고른 뒤 별도 반대편 리뷰가 명시되지 않는다. | [PHASE_MANAGEMENT_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md:76)의 교차 리뷰 사전 조건에는 “Auto 모드”라는 한정도 있다. Manual 결과 선택 후 곧바로 검증할 여지가 있다. | `implementer_agent`, `reviewer_agent`를 Task 시도마다 기록하고, REWORK에는 해당 구현자를 다시 배정한다. Manual에서 선택한 산출물에도 반대편 리뷰 또는 명시적인 정책상 생략 판정을 요구한다. |
| R4B-07 | High | 리뷰 생략 | [COLLABORATION_PROTOCOL.md](D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md:74) | `review.skip_if {max_files, tests_pass, no_external_effects}`는 상한과 대상 제한이 없다. 두 파일짜리 인증·권한 변경도 생략될 수 있고, `max_files`를 임의로 높일 수 있다. | “변경 파일 ≤2” 예시는 안전한 경로 분류가 아니다. `effects` 누락 가능성이 있는 현재 설계에서 `no_external_effects`도 신뢰하기 어렵다. `ReviewSkipped`를 수용해 `VERIFYING`으로 가는 상태 전이도 없다. | 보안·DB 스키마·복구·실행기·승인 정책 변경은 생략 금지로 정하고, 낮은 위험의 명시된 경로·변경 종류에만 작고 고정된 상한을 둔다. `review_skipped` 전이를 감사 이벤트와 함께 추가한다. |
| R4B-08 | High | Codex 어댑터 | [AGENT_INTEGRATION_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:40) | `turn/completed.usage`를 두 군데에서 사용량 원본으로 지정했지만 0.166.0 v2의 `TurnCompletedNotification`에는 `thread_id`와 `turn`만 있다. 상태도 `turn.status` 안에 있다. | [0.166.0 공식 구조체](https://github.com/openai/codex/blob/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs)의 필드와 [공식 이벤트 설명](https://learn.chatgpt.com/docs/app-server)이 일치한다. `thread/tokenUsage/updated`는 별도 알림이다. | `thread/tokenUsage/updated`를 턴 ID로 상관시키고 누적·증분 의미를 검증한다. `turn/completed`에는 최종 상태만 의존한다. 이 항목은 **발명된 메서드가 아니라 발명된 필드**다. |
| R4B-09 | High | 승인 프로토콜 | [AGENT_INTEGRATION_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:39) | `item/tool/requestUserInput`, `mcpServer/elicitation/request`, `item/permissions/requestApproval`을 일반적인 `accept\|decline\|cancel` 승인 응답 경로로 묶었다. 세 요청은 질문 답변, MCP 양식·URL 확인, 권한 부분 집합 승인으로 응답 구조가 다르다. | 세 이름 모두 [0.166.0 공식 프로토콜](https://raw.githubusercontent.com/openai/codex/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/common.rs)에 존재한다. [공식 승인 문서](https://learn.chatgpt.com/docs/app-server)는 권한 요청의 `permissions`·`scope`와 MCP elicitation의 별도 shape를 구분한다. | `GatewayEvent`를 `approval_requested`, `user_input_requested`, `mcp_elicitation_requested`로 나누고, 각 응답 타입·만료·취소 의미를 별도로 매핑한다. |
| R4B-10 | High | 스킬 증거 | [SKILL_EXECUTION_EVIDENCE_SPEC.md](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:44) | Codex의 `(skills/list 존재)+(앱이 skill 입력 전송)`은 요청·발견 증거인데 `LOADED_ONLY`로 기록한다. 같은 run의 파일·테스트 결과만으로 `VERIFIED`로 승격하면 스킬 지시가 실제 작업에 기여했는지 분리할 수 없다. | 공식 [skill 입력 설명](https://learn.chatgpt.com/docs/app-server)은 전체 지시 주입 경로를 제공하지만, 전용 “사용됨” 알림을 약속하지 않는다. 문서의 “프롬프트에 이름만 있으면 증거 아님” 원칙은 좋으나 현재 승격 규칙은 그 취지를 충분히 지키지 못한다. | `DISCOVERED`, `INJECTION_ACCEPTED`, `LOAD_OBSERVED`, `APPLIED_VERIFIED`를 분리한다. `VERIFIED`에는 스킬의 고유 절차와 연결되는 관찰 가능한 단계·산출물 또는 명시적인 수동 검증 근거를 요구한다. |
| R4B-11 | High | 체크포인트 복구 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:17) | `Checkpoint Restore`에 “git checkout 확인”만 적혀 있다. 체크포인트 이후 사용자가 수정한 dirty 파일을 새 세션의 사실 집합에 합칠지, 분리 보존할지 정하지 않았다. | 같은 문서 §3은 dirty worktree를 승인 대상으로 본다. 체크포인트의 `git_ref`만 다시 checkout하면 미커밋 변경의 의미가 사라지거나 사용자 작업을 덮을 위험이 있다. | 복원 전에 현재 tree·untracked 파일·체크포인트 파일 해시를 스냅숏으로 비교하고, 별도 worktree에서 handoff를 시작한다. 사용자 변경 보존 선택을 독립 단계로 둔다. |
| R4B-12 | High | Codex 기능 호환 | [AGENT_INTEGRATION_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:68) | `turn/steer` 실패 시 `thread/queue/add`를 일반 대체 경로처럼 제시하지만, 0.166.0의 queue 메서드는 experimental이다. `initialize.capabilities.experimentalApi=true`와 거부 시 처리, 큐 항목 확인·중복 방지 규칙이 빠졌다. | [0.166.0 메서드 선언](https://raw.githubusercontent.com/openai/codex/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/common.rs)에 `#[experimental("thread/queue/add")]`가 붙어 있다. [공식 문서](https://learn.chatgpt.com/docs/app-server)는 opt-in이 없으면 experimental 메서드를 거부한다고 설명한다. | opt-in을 명시하고, 실패 시 앱 저널에 다음 턴 입력을 보존해 사용자에게 “대기 중”이라고 표시한다. 큐 응답 수신을 실제 적용 완료로 취급하지 않는다. |
| R4B-13 | High | Claude 세션 분기 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:16) | Claude 분기는 `resume + forkSession:true`로 “현재 끝에서 분기”만 가능하다고 쓰지만, 공식 SDK에는 과거 메시지까지 복사하는 `forkSession(sessionId,{upToMessageId})`도 있다. `RunSpec.forkAt`을 Claude에서 버릴 이유가 설명되지 않는다. | [Claude TypeScript SDK 공식 레퍼런스](https://code.claude.com/docs/en/agent-sdk/typescript)가 함수와 `upToMessageId`를 문서화한다. 다만 로컬 고정 버전 0.3.316에서 동일하게 동작하는지는 실측하지 못했다. | 버전 확인 뒤 `forkAt`을 Claude 메시지 UUID에 매핑한다. 지원하지 않는 고정 버전이면 UI에서 분기 지점 제한을 표시한다. |
| R4B-14 | High | 자동 재개 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:43) | “세션 있음·intended 없음·git 변화 없음 → 자동 재개”는 파일·Git 밖의 부작용과 기록 누락을 판별하지 못한다. 쉘 명령, 스킬 스크립트, 외부 MCP가 실행 중이었는지도 고려하지 않는다. | DB의 `EffectIntent`는 앱이 효과를 미리 포착했다는 전제가 필요하다. [Codex 통합 설계](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:66)는 허용 범위 내 쓰기가 승인 없이 실행될 수 있음을 인정한다. | 마지막 확정된 도구 아이템, 프로세스 종료, 외부 실행기 원장을 확인한다. 효과 포착을 증명하지 못하는 실행 경로는 clean Git만으로 자동 재개하지 않는다. |
| R4B-15 | High | Git 충돌 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:62) | #11의 “merge/rebase 충돌 감지, worktree 상태”는 검출 신호와 소유자가 없다. 일반 `git status` dirty만으로 충돌과 정상 미커밋 변경을 구분할 수 없다. | 상태 머신에는 Git 충돌을 `BLOCKED`로 보내는 전이만 있고, 복구표·스킬 라우팅은 `WAITING_APPROVAL`을 요구한다. 자동 merge를 금지한다는 규칙과, 충돌 상태를 만든 실행 경로도 연결되지 않았다. | Git 실행을 앱에서 기록하고 `git ls-files -u`, merge/rebase 진행 마커, 명령 종료코드·stderr를 함께 확인한다. 충돌 파일 목록을 제시하며 한 상태로 일관되게 전이한다. |
| R4B-16 | Medium | 일시정지 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:72) | `PAUSED`를 상태 머신 밖 플래그로 두었으나 `tasks` 투영·최소 이벤트·복구 전이에는 없다. 재기동 뒤 다음 턴 금지가 유지되는지 불분명하다. | Phase 상태 투영은 `PAUSED`를 고려하지 않는다. 현재 턴이 종료되기 전 취소·승인 요청·lease 만료가 겹칠 때 플래그 우선순위도 없다. | `PauseRequested/Paused/ResumeRequested`를 저널에 기록하고 Scheduler의 다음 턴 배정 조건에 반영한다. 재시작과 승인 대기 중 일시정지의 표시·타이머 규칙을 정한다. |
| R4B-17 | Medium | 제한 시간 | [PHASE_MANAGEMENT_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md:74), [AGENT_INTEGRATION_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:67) | “작업 시간 정지”와 15분 승인 요청 종료, 24시간 Task 보류를 함께 쓰지만 어떤 시계가 언제 재개되는지 정의하지 않았다. `WAITING_APPROVAL`에서 재개한 run이 원래 단계의 남은 시간·호출 상한을 승계하는지도 없다. | 승인 15분 초과 뒤 어댑터는 `decline+interrupt`를 보내지만 Task는 승인 대기 상태를 유지한다. 그 상태에서 네이티브 요청은 이미 사라졌으므로 기존 요청에 승인 응답을 보낼 수 없다. | wall-clock 대기, 활성 작업 누적 시간, 턴 시간, lease TTL을 각각 저장한다. 15분 이후에는 이전 요청을 만료 처리하고, 사용자 복귀 시 새 run·새 요청·남은 작업 시간으로 전이한다. |
| R4B-18 | Medium | 세션 유실 판정 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:63) | `getSessionInfo` 또는 `thread/read` 실패를 곧바로 세션 ID 복원 불가로 해석한다. 인증 만료, 일시적 I/O 오류, 서버 과부하와 실제 “없음”을 구분하지 않는다. | #7·#6도 동일 API 실패를 낼 수 있으며, 이때 Checkpoint Restore로 새 세션을 만들면 대화 분기와 중복 작업을 유발할 수 있다. | 404에 해당하는 영구 부재, 접근 불가, 일시 실패를 분류한다. 부재가 확인되기 전에는 `BLOCKED(session_unavailable)`로 유지하고 새 세션 시작을 보류한다. |
| R4B-19 | Medium | 오류 분류 | [SESSION_RECOVERY_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:57) | `-32001`을 네트워크 단절의 감지 신호로 묶었다. 공식 문서에서 이 코드는 WebSocket 요청 ingress가 찼을 때의 서버 과부하이며, 선택한 stdio 전송의 네트워크 단절 증거가 아니다. | [Codex app-server 공식 전송 설명](https://learn.chatgpt.com/docs/app-server)은 `-32001`을 WebSocket mode의 bounded queue 오류로 설명한다. `HttpConnectionFailed`도 4xx/5xx를 포괄하므로 무조건 네트워크 재시도 대상이 아니다. | 전송 오류, upstream HTTP 상태, 과부하, 인증, 한도를 나누고 각각 별도 재시도 정책을 둔다. |
| R4B-20 | Medium | 스킬 매트릭스 | [SKILL_COMPATIBILITY_MATRIX.md](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:13) | A 15행·B 17행·C 20행·D 2행으로 **54행**이다. 지시서의 40개 후보 중 묶음 `superpowers` 자체에 7종 중 하나의 분류와 이유를 부여한 행이 없다. | 나머지 후보 39개와 하위 스킬 15개는 모두 이름으로 대조된다. 폐기된 `resolving-merge-conflicts`, 통합된 `redesign-existing-projects`도 D에 사유와 함께 있다. 다만 D는 표의 통일된 분류 열을 쓰지 않는다. | `superpowers`를 “하위 15개로 펼쳐 평가한 묶음, 독립 설치 대상 아님”으로 55번째 행에 기록하고 D에도 7종 분류값을 명시한다. |
| R4B-21 | Medium | 스킬 라우팅 | [DEVELOPMENT_SKILL_ROUTING_POLICY.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:12), [DEVELOPMENT_SKILL_USAGE_PLAN.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:34) | “Task당 주도 1개 + 보조 ≤2개, 보조는 원칙 스킬만”과 Phase별 표가 충돌한다. P03은 `ui-ux-pro-max`, 두 React 스킬, TDD를 보조로 한꺼번에 열거한다. 브랜치 마무리 행은 주도 스킬 두 개를 기재한다. | 충돌 결정표는 `frontend-design`과 `ui-ux-pro-max`를 **서로 다른 단계**의 주도로 구분한다. Phase 표가 Task별 실행 순서를 생략하면서 두 스킬이 한 Task에 동시 적용될 수 있게 보인다. | Phase 표를 Task·단계별 행으로 풀고 각 행의 lead 하나, support 둘 이하를 고정한다. TDD·검증·디자인 체계는 별도 단계 또는 별도 Task로 표기한다. |
| R4B-22 | Medium | 사용자 전용 스킬 | [DEVELOPMENT_SKILL_USAGE_PLAN.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:35), [DEVELOPMENT_SKILL_ROUTING_POLICY.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:39) | 기본 라우터는 사용자 전용 스킬을 제외한다고 올바르게 쓰지만, P05·P09의 보조 스킬 칸에는 `handoff`가 들어간다. P05에는 사용자 호출 단서가 있으나 P09에는 없고, 기계적으로 Phase 표를 라우터 입력으로 쓰면 자동 선택될 수 있다. | [SKILL_INVENTORY.md](D:/LLM/agent-studio/docs/planning/evidence/SKILL_INVENTORY.md:32)는 `handoff`를 `disable-model-invocation`으로 기록한다. 다른 사용자 전용 8개는 대체로 제안·조건부로 처리되어 있다. | Phase 표에서도 `handoff`를 lead/support 집합 밖의 **사용자 호출 제안**으로 분리하고 제품 Router의 자동 후보 필터를 단일 규칙으로 구현한다. |
| R4B-23 | Medium | Codex 스킬 호환 | [DEVELOPMENT_SKILL_USAGE_PLAN.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:57) | “`agents/openai.yaml`이 없으면 `display_name`만 담은 최소 파일 추가”는 형식이 모호하고 필요성도 입증되지 않았다. `agents/openai.yaml`은 선택 사항이며, `SKILL.md`의 이름·설명이 기본 발견 조건이다. | [공식 Build skills 문서](https://learn.chatgpt.com/docs/build-skills)는 `openai.yaml`을 optional로 두고, 예시의 이름 필드는 `interface.display_name` 아래에 둔다. 0.166.0에서 `display_name`만 가진 파일의 실제 파서 수용 여부는 확인하지 못했다. | 우선 원본 `SKILL.md`만으로 `skills/list`를 시험한다. 메타데이터가 필요할 때만 해당 버전의 스키마로 `interface`·`policy`를 검증한 호환 사본을 만든다. |
| R4B-24 | Medium | 설치 상태·완료 판정 | [DEVELOPMENT_SKILL_USAGE_PLAN.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:8), [SKILL_EXECUTION_EVIDENCE_SPEC.md](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:59) | “Codex: 미설치”는 조사된 40개 후보의 설치 여부와 Codex 환경 전체의 스킬 존재 여부를 구분하지 않는다. 더구나 필수 스킬의 `LOADED_ONLY`를 테스트 해당 없음 사유만으로 완료 조건에 포함한다. | [SKILL_INVENTORY.md](D:/LLM/agent-studio/docs/planning/evidence/SKILL_INVENTORY.md:6)는 Claude 설치본만 조사했다. 공식 Codex 문서는 시스템·사용자·저장소 등 [여러 발견 위치](https://learn.chatgpt.com/docs/build-skills)를 설명한다. 이 실행 환경에서는 사용자 Codex 홈과 0.166.0 `skills/list`를 읽기 권한 내에서 확인할 수 없었다. | “검토 후보의 Codex 설치 미확인”으로 범위를 좁혀 쓰고, P00에서 실제 발견 목록을 기록한다. 필수 스킬 완료에는 `LOADED_ONLY`만으로 충분한 Task 유형과 그 검증 근거를 별도로 한정한다. |
| R4B-25 | Low | 문서 유지보수 | [SKILL_COMPATIBILITY_MATRIX.md](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:87) | 집계의 숫자와 열거 목록이 맞지 않는다. 예를 들어 공통은 “16”이라고 쓰지만 목록에는 18개가 적혀 있고, 프로젝트 “6” 목록에는 7개, 조건부 “14” 목록에는 18개가 적혀 있다. `resolving-merge-conflicts`도 D의 “제외”와 집계의 “보류”가 다르다. | 본문은 “중복 분류를 포함”한다고 설명하지만 행별 최종 분류 하나를 집계한 수치가 아니어서 55개 검증의 진행률로 사용할 수 없다. | 행의 정규화된 분류 열에서 집계를 자동 생성하고, 잠정·최종·실행 검증 상태는 별도 열로 센다. |

### 상태 머신·복구 체크 결과

1. **#1 Claude 정상 종료 — OK(조건부).** `result`의 성공 여부는 실제 신호다. 산출물과 테스트가 없으면 완료 전이가 아니라 해당 단계의 종료로만 처리해야 한다.
2. **#2 Codex 정상 종료 — OK(조건부).** `turn/completed`와 `turn.status=completed`는 실제 신호다. 턴 성공이 Task 성공을 뜻하지 않도록 Verifier를 통과시켜야 한다. [공식 이벤트 정의](https://learn.chatgpt.com/docs/app-server).
3. **#3 에이전트 비정상 종료 — 문제.** SDK 오류·프로세스 종료·연결 끊김은 관찰 가능하나, 파일 쓰기 중단 여부를 알려 주지 않는다. **재기동 전에** 파일·효과 평가가 필요하다.
4. **#4 앱 Shell 강제 종료 — 문제.** 데몬 생존은 설계한 프로세스 구조의 기대치이지 에이전트 이벤트 신호가 아니다. 창과 승인 채널이 끊겼을 때 대기 요청의 소유권·15분 처리도 검증해야 한다.
5. **#5 OS 재부팅 — 문제.** 데몬 재기동은 감지 가능하지만 90초 lease가 반드시 만료됐다는 보장은 없다. 기동 시 모든 미종결 run을 실행 차단하고 평가해야 한다.
6. **#6 네트워크 단절 — 문제.** Claude retry와 Codex 연결 오류는 유효 후보지만 `-32001`은 과부하 신호다. 오류별 retry 가능 여부를 분리해야 한다.
7. **#7 인증 만료 — OK(조건부).** 인증 오류를 분류해 재시도 없이 `BLOCKED(auth)`로 보내는 결과는 안전하다. `authentication_failed`를 독립 이벤트명으로 단정하지 말고 실제 result/error payload에서 추출해야 한다.
8. **#8 사용 한도 초과 — OK(조건부).** `SDKRateLimitEvent rejected`와 `UsageLimitExceeded`는 유효한 경로다. `account/rateLimits/read`는 ChatGPT 한도 조회이므로 API key 사용의 포괄 신호로 쓰면 안 된다. [공식 계정 API](https://learn.chatgpt.com/docs/app-server).
9. **#9 스킬 실행 실패 — 문제.** `SkillLoadObserved` 부재는 run 종료 후의 **앱 평가 결과**이지 에이전트가 내보내는 실패 이벤트가 아니다. `REWORK` 전에는 이전 run의 부작용을 평가해야 한다.
10. **#10 테스트 중단 — 문제.** 테스트 프로세스 종료·타임아웃은 앱의 테스트 실행기가 수집해야 할 신호다. 부분 로그가 없거나 테스트가 파일을 바꾼 경우 즉시 `REWORK`만으로는 안전 판정이 부족하다.
11. **#11 Git 충돌 — 문제.** Git 작업 상태는 에이전트 이벤트 스트림에 전용으로 존재하지 않는다. 충돌 인덱스와 merge/rebase 상태를 검사해야 하며, 현재 `WAITING_APPROVAL`·`BLOCKED` 전이가 서로 다르다.
12. **#12 세션 ID 복원 불가 — 문제.** 조회 API 실패는 영구 유실을 증명하지 않는다. 일시 장애를 구분하기 전 Checkpoint Restore를 제안하더라도 새 세션을 자동 실행해서는 안 된다.
13. **#13 부분 완료 — 문제.** `effects.intended`나 RunArtifacts 일부만으로 완료한 단계와 미완료 단계를 확정할 수 없다. 파일 blob 3분기 및 외부 효과 결과 대조가 선행되어야 한다.
14. **#14 승인 범위 이탈 — OK(조건부).** 앱이 저장한 승인 스냅숏과 새 요청의 비교는 가능한 신호다. 요청 경로·명령·대상·만료·승인 주체를 구조화해 비교하고, 달라졌다면 이전 승인을 재사용하지 않는 결과는 안전하다.

### 스킬 매트릭스 완전성

지시서의 **40개 후보 이름**과 `superpowers`의 **15개 하위 스킬 이름**을 표 행과 대조했다. A 15행, B 17행, C 20행, D 2행으로 **실제 후보 행은 54개**다. 빠진 검토 단위는 묶음 후보 `superpowers` **1개**다. 다른 39개 후보와 하위 15개의 이름은 모두 등장한다. `resolving-merge-conflicts`는 원저자 폐기, `redesign-existing-projects`는 `design-taste-frontend` 통합으로 기록되어 있고 각각 사유도 있다. 다만 두 행은 다른 52행과 같은 “분류(잠정)” 형식이 아니며, 집계에서는 폐기 후보의 분류가 뒤바뀐다. **분류 누락 목록: `superpowers`(묶음 단위); 표준 분류 열 누락: `resolving-merge-conflicts`, `redesign-existing-projects`.**

`disable-model-invocation` 사용자 전용 스킬은 라우팅 정책 §1·§3에서 자동 선택 제외로 명시되어 있다. 이는 지시서에 부합한다. P05·P09의 `handoff` 표기처럼 Phase 계획을 자동 라우터 입력으로 전환할 때는 사용자 호출 전용이라는 조건을 구조화해야 한다. 충돌 결정의 주도 스킬은 TDD=`test-driven-development`, 디버깅=`systematic-debugging`, 코드 리뷰=`code-review`, 구현=`executing-plans`로 라우팅 표와 대체로 일치한다. UI 디자인 체계와 UI 구현은 서로 다른 단계로 분리해 적으면 일관된다.

### 긍정적 확인

- **API 명칭 대조:** `thread/start|resume|fork|list|read|turns/list|items/list|queue/add|compact/start`, `turn/start|steer|interrupt`, 해당 `item/*` 승인·델타 알림, `skills/list|changed`, `account/rateLimits/read`는 0.166.0 [공식 프로토콜](https://raw.githubusercontent.com/openai/codex/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/common.rs) 또는 [공식 app-server 문서](https://learn.chatgpt.com/docs/app-server)에서 확인된다. `item/fileChange/patchUpdated`와 `item/mcpToolCall/progress`도 0.166.0 프로토콜에 있다. `thread/queue/add`는 **존재하지만 experimental**이다.
- Claude의 `canUseTool`, `PreToolUse`, `listSessions`, `interrupt`, `forkSession`, `includePartialMessages`는 [공식 TypeScript SDK 레퍼런스](https://code.claude.com/docs/en/agent-sdk/typescript), [권한](https://code.claude.com/docs/en/agent-sdk/permissions), [hooks](https://code.claude.com/docs/en/agent-sdk/hooks)에서 확인된다. `canUseTool`이 자동 허용된 모든 호출을 받지는 않는다는 점을 통합 설계가 `PreToolUse`로 보완하려 한 방향도 타당하다.
- 세션과 Task 상태를 분리하고, 앱 DB에 대화 원문 대신 네이티브 세션 참조를 두는 원칙은 일관된다. Codex `thread/list`에서 `sourceKinds`를 명시해야 앱이 만든 세션을 놓치지 않는다는 지적도 [공식 문서](https://learn.chatgpt.com/docs/app-server)에 부합한다.
- append-only 이벤트 저널, 단일 writer, fencing token, 불확실 효과의 자동 재실행 금지, 원저자 폐기 스킬을 동명 타 저장소로 바꾸지 않는 결정은 좋은 기반이다. 스킬 증거에서 “프롬프트에 이름 포함 = 사용”을 거부한 원칙도 명확하다.

### UNVERIFIED

- 이 읽기 전용 환경에서 `codex` 실행 파일을 찾지 못했고, 조사 문서가 지목한 임시 JSON Schema 경로도 접근 거부였다. 따라서 **로컬 0.166.0 바이너리와 생성 스키마를 재실행·재검증하지 못했다**. 위 Codex 프로토콜 판정은 `rust-v0.166.0` 공식 소스와 공식 문서에 근거한다.
- Claude SDK 0.3.316에서 직접 `forkSession(...,{upToMessageId})`, 사용자 설치 CLI 지정, 보류 승인 중 interrupt receipt, `mcpServers` 격리 및 스킬 `settingSources`의 실제 조합은 이번 검토에서 실행하지 않았다. API 이름의 존재와 제품에서 요구한 동작의 성공은 별개다.
- Codex의 별도 `CODEX_HOME`이 로그인·MCP·skills 발견을 의도대로 격리하는지, 복사한 스킬에 `agents/openai.yaml`을 추가했을 때 0.166.0이 로드하는지, 현재 사용자 환경에 검토 후보 스킬이 정말 하나도 없는지는 확인하지 못했다. 공식 문서상 `agents/openai.yaml`은 선택 사항이므로, **compat copy의 형식은 가능성이 있지만 계획에 적힌 “display_name만 추가” 절차의 건전성은 UNVERIFIED**다.
- app-server 재접속 후 이전 진행 중 턴의 알림을 어느 범위까지 다시 받을 수 있는지, 승인 15분 보류가 각 어댑터에서 동일하게 작동하는지, Windows에서 분리 데몬이 Shell 강제 종료 후 생존하는지는 Phase 00 실측이 필요하다. 이 항목들은 현재 문서처럼 성공 경로를 기본 전제로 삼기보다 검증 게이트로 남겨야 한다.

## 4. 원문 — R4_review_3 (보안·실행 제한·테스트·Phase·마스터플랜) · thread `<thread-id>`

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

## 5. Claude 처리 메모

- 원문은 수정하지 않았다. 각 지적의 ACCEPTED / PARTIALLY_ACCEPTED / REJECTED_WITH_RATIONALE / NEEDS_VERIFICATION 판정과 문서 반영 커밋은 `REVIEW_RESOLUTION.md`에 기록한다.
- R4-2가 "codex 실행 파일을 찾지 못했다"고 한 것은 read-only 샌드박스의 PATH 제약이다. 로컬 생성 스키마(`generate-json-schema`)는 Claude 측에서 이미 확인했으며, R4-2의 프로토콜 판정은 `rust-v0.166.0` 공식 소스 기준이라 유효하다.
- R4-2 R4B-24 "사용자 Codex 홈을 확인할 수 없었다": Claude 환경 조사(`ENVIRONMENT_SURVEY.md`)에서 `~/.codex/skills/.system/*` 5개만 존재함을 직접 확인했다. 문구는 "검토 후보 38개 미설치(확인됨)"로 정정한다.