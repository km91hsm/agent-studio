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