### 요약

- §9 재검증 55건: **VERIFIED 44 / INSUFFICIENT 11 / NOT_APPLIED 0**. 현재 디스크 문구를 기준으로 판정했다.
- 신규 불일치 **10건**. 감사 이벤트 계약과 보안 보장 표 때문에 잔존 **Critical·High 있음**.
- 18개 Phase 모두 번호 **1~18은 존재**하지만, P01에는 `17. 증거`가 중복된다. `AC-P01-1~7` ID는 각각 한 번만 정의돼 있다.
- U1·U5·U8·U9 결정이 내려져도 현재 문서로는 **제품 구현 착수 게이트를 통과시키기 어렵다**. P00의 검증 작업 범위는 별도로 진행 가능하다.

아래 위치 약칭은 현재 파일이다: [SEC](/D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md), [PB](/D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md), [AC](/D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md), [MASTER](/D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md), [DB](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md), [AI](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md), [PM](/D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md), [RT](/D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md), [LIM](/D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md), [TEST](/D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md), [CR](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md), [MATRIX](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md), [FD](/D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md), [OI](/D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md), [CK](/D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md), [PR](/D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md). `VERIFIED`는 **요청된 문서 수정의 반영**을 뜻하며, 계획된 기능의 실행 성공을 뜻하지 않는다.

### §9 55건 재검증

| ID | 판정 (VERIFIED / INSUFFICIENT / NOT_APPLIED) | 현재 문서·위치 | 근거 인용 | 잔여 조치 |
|---|---|---|---|---|
| R4A-02 | VERIFIED | LIM:8 | `P00·MVP-Core(P04 운영 데이터)` | 없음 |
| R4A-05 | VERIFIED | PB:66; FD:59·65 | `main IPC 릴레이 채널`, `Renderer 토큰 없음`; 구 입장 `재폐기` | 없음 |
| R4A-14 | VERIFIED | SEC:140; PB:84 | 단일 CSP에 `base-uri 'none'; form-action 'none'; frame-src 'none'`; PB는 `§7 단일 정의 문자열` 참조 | 설치물 동작은 P00 S6에서 검증 |
| R4B-01 | VERIFIED | MATRIX:52·110 | `역할 대체(집행 보장은 SECURITY_MODEL §2.1)`, `hook과 동등하다고 주장하지 않음` | 없음 |
| R4B-03 | VERIFIED | DB:59 | `기본값 uncertain`, 파일 도구만 관찰된 run의 `complete` 승격 조건 | 없음 |
| R4B-04 | VERIFIED | AC:32; DB:44 | `projections.md`와 `열 단위 비교`를 AC-P01-7에 명시 | 구현 시 대응표 생성·재생 시험 |
| R4B-10 | VERIFIED | MASTER:113; AC:19 | `주도 스킬 8종 시그니처 초안`과 Codex 검토를 S7·AC에 명시 | 없음 |
| R4B-13 | VERIFIED | MASTER:90 | `forkSession… typings`의 `tsc` 검사와 `실호출 1회` | P00 실측 전 기능은 UNVERIFIED |
| R4B-14 | VERIFIED | RT:56–57; LIM:81 | 자동 재개는 `capture_confidence=complete`; 기본 `uncertain`은 보류 | 없음 |
| R4B-23 | **INSUFFICIENT** | MASTER:113; PB:93; CK:24 | 앞의 두 문서는 `스킬 폴더 전체` 복사, 사용자 선택지에는 여전히 `SKILL.md만` 복사 | U5 선택지와 설치 범위를 통일 |
| R4B-24 | VERIFIED | MASTER:27; DB:57 | `tasks.kind ∈ {plan, research, prototype, review}` 예외가 enum에 포함 | 없음 |
| R4C-01 | **INSUFFICIENT** | SEC:79·86; AC:39; TEST:79 | SEC는 `S1c·S4 실측` 후 조건부 ENFORCED, AC-P10a-5와 SE-01a 사전조건은 **S1c만** 명시 | 두 수용 시험에 S4 결과를 사전조건으로 연결 |
| R4C-02 | VERIFIED | AC:27·31; PB:66 | 투영 재생은 AC-P01-2, 격리 게이트 집행은 AC-P01-6과 T11로 분리 | 없음 |
| R4C-03 | **INSUFFICIENT** | SEC:72·76–82 | 표는 `각 셀`에 집행자·관찰·시험을 요구하지만 `동일`, `POLICY_ONLY`, `DETECTED(부분)`만 적힌 셀이 다수 | §2.1 전 셀을 아래 신규 발견 기준으로 보완 |
| R4C-05 | VERIFIED | RT:50; SEC:151 | `①…보류 ② 사용자 판정 ③…새 run·새 승인 요청` | 없음 |
| R4C-06 | VERIFIED | SEC:34; TEST:81 | `DENY→ALWAYS_ASK(once)→DENY 복귀` | 없음 |
| R4C-09 | VERIFIED | MASTER:11·29; LIM:8 | Windows 단계 `MVP-Core`, 핵심 UX `V1(제품 MVP)` | 과거 변경 이력의 plain `MVP`는 아래 참조 |
| R4C-10 | VERIFIED | PB:66; AC:40 | 입력 수락은 `SkillInjectionAccepted만`, 절차 관찰 때만 `SkillLoadObserved` | 없음 |
| R4C-11 | VERIFIED | PM:90; PB:96·102·141 | `compare_blocked` 추가; P10b 선행에서 `T5b 제외`, 역방향은 `P10b T1→P09 T5b` | V1 게이트 누락은 R8-07 |
| R4C-12 | VERIFIED | PB:51·54; MASTER:67; AI:113 | S1a `필수 단언은 무단 변경 0`; 승인 요청 유무는 관찰값 | 없음 |
| R4C-16 | **INSUFFICIENT** | PB:66·116–131 | 모든 Phase에 1~18은 있으나 P01은 `17. 증거`가 **두 번**; 표는 `18/18`만 표시 | 중복 제거 후 항목 수·유일성 재집계 |
| R4C-18 | VERIFIED | CR:44; AC:19·98–100 | `§2 3행 + §3 1건`, `나머지 5행`; AC-V1-8~10 존재 | 신규 AC의 판정 의미는 R8-06 |
| R4C-21 | VERIFIED | TEST:89 | SE-08은 `관찰 범위 내 신호 미탐지`를 실패, 범위 밖은 `미관찰 — 부분 DETECTED`로 분리 | 없음 |
| R6A-03 | VERIFIED | AI:122·128; PR:208·214 | 내장 파일 도구만 `supported` 예외, 플러그인은 `conditional(UNVERIFIED)` | 없음 |
| R6A-04 | VERIFIED | MASTER:124; AI:122 | `supported/conditional/unsupported`; `능력 보증이 아니다` | 없음 |
| R6A-06 | VERIFIED | AI:113; PB:51; MASTER:67 | 요청 없이 거부돼도 무단 변경 0이면 S1a 통과 | 없음 |
| R6A-07 | VERIFIED | PB:96·102 | T5b를 P09 Task로 정의하고 P10b 선행에서 제외 | 없음 |
| R6A-08 | VERIFIED | PB:66; FD:65 | Renderer 직접 연결 대신 `main IPC 릴레이` | 없음 |
| R6A-09 | VERIFIED | MASTER:40; AC:87 | Review Focus 4가 `AC-P08b-2`를 가리킴 | 없음 |
| R6B-02 | **INSUFFICIENT** | AI:69–70; [스키마 발췌](/D:/LLM/agent-studio/docs/planning/evidence/codex_0.166.0_v2_schema_excerpt.json) | 활성 v2 값은 `on-request`로 통일됐으나 발췌 파일은 출처를 적은 **재구성 JSON**이고 원본 생성물·명령 출력의 무결성 증거가 없음 | P00에서 설치 CLI의 원본 생성물과 버전·해시를 보존 |
| R6B-03 | VERIFIED | AI:122·128 | `유일한 예외는 내장 파일 도구`; Codex 플러그인은 `conditional` | 없음 |
| R6B-09 | VERIFIED | MASTER:120–124; PB:62 | S9 타입·행 수가 `CAP-01~09 × 2공급자` | 실제 탐침 (g) 누락은 R7-03 |
| R6B-10 | VERIFIED | MASTER:13; SEC:8 | 고위험 효과는 `정식 경로`, 독점 보장은 `엄격 모드 조건부` | 없음 |
| R6B-11 | VERIFIED | DB:60; AI:74 | `sessions.app_owned`, 외부 ref `기본 목록 제외`, 명시 가져오기 | 재생 출처의 모호성은 R8-09 |
| R6B-16 | VERIFIED | CR:26·44 | 디버깅 행 `1건 비교(1회)`, 전체 `4실험 각 1회` | 없음 |
| R6B-18 | **INSUFFICIENT** | DB:42·64·91; AI:72 | `text_enc` 암호화 원문은 생겼지만 DB는 `저널·백업에는 해시만`이라고 주장하면서 백업 정책은 DB 전체 백업 | 원문 보관·백업·복원 계약 정정 |
| R6C-01 | **INSUFFICIENT** | SEC:76–84 | MCP·브라우저 경로는 나뉘었으나 보장 셀의 감사·시험이 빠져 있고 자동 모드의 등급 변환을 표에서 재현할 수 없음 | 자동 모드별 셀 또는 판정 규칙 작성 |
| R6C-02 | VERIFIED | FD:31; OI:19; CK:28; MASTER:28; PB:93; PR:220; AI:77; SEC:134 | 공통 문구 `결정 전 기본 동작 = 분리 프로필` | 사용자 U9 결정 유지 |
| R6C-03 | VERIFIED | SEC:80–82; AI:122 | 앱 MCP 서버 정식 경로와 셸·플러그인 우회 경로를 분리 표기 | 서버 감사 이벤트 결함은 R8-02 |
| R6C-04 | VERIFIED | AC:98–100; MASTER:124 | AC-V1-8·9·10 신설; S9를 `경로를 결정하는 게이트`로 규정 | AC 의미 충돌은 R8-06 |
| R6C-06 | VERIFIED | CR:44; AC:19 | `3행 + 1건`, `5행 잠정` 일치 | 없음 |
| R6C-08 | VERIFIED | LIM:8; SEC:24; PB:69 | 단계 `MVP-Core`, 정책 `원 11영역 + CAP 3영역` | 없음 |
| R6C-11 | VERIFIED | SEC:134; FD:31 | Codex 결정 전 분리, 공유 시 상속·정책 한계 표시 | 없음 |
| R7-01 | VERIFIED | AC:27·31 | AC-P01-2는 재생, AC-P01-6은 격리; ID 중복 없음 | 없음 |
| R7-02 | VERIFIED | FD:31; OI:19; CK:28; MASTER:28; PB:93; PR:220; AI:77; SEC:134 | 전부 결정 전 `분리 프로필` | U9 결정 대기 |
| R7-03 | **INSUFFICIENT** | PB:62; MASTER:124–126; AI:118 | PB에는 S9 `(g) CAP-09`가 있으나 MASTER의 탐침 구현 Step 3은 `(a)…(f)`로 끝나고 AI 제목은 `CAP-01~08` | Step 3의 공유/분리 비교와 AI 범위 갱신 |
| R7-04 | VERIFIED | PB:96·102·140–141 | `P09(T1~T6; T5b 제외)`와 `P10b T1→P09 T5b`; 순환 없음 | 게이트 누락은 R8-07 |
| R7-05 | VERIFIED | DB:59; RT:56–57; LIM:81 | 기본 `uncertain`, 자동 재개 `complete` 조건 전파 | 없음 |
| R7-06 | **INSUFFICIENT** | DB:64·91; AI:72 | 암호화 원문 전달은 적혔으나 `백업에는 해시만`은 DB 백업 내용과 충돌 | R8-04 해결 |
| R7-07 | **INSUFFICIENT** | SEC:81–84 | 정식/그 외 OS 입력 두 행은 생겼으나 `동일`과 등급만 있는 셀이 있고 자동 모드 판정 근거가 부족 | 셀별 집행자·신호·시험 명시 |
| R7-08 | VERIFIED | SEC:140 | CSP가 한 문자열이고 요구한 세 directive 포함 | 설치물 검증은 P00 S6 |
| R7-09 | VERIFIED | CR:44; AC:19 | 4실험 = 3행+1건, 나머지 5행 잠정 | 없음 |
| R7-10 | VERIFIED | DB:60; AI:74 | `app_owned=1` 정본이 sessions에 있고 외부 목록 필터 명시 | 재생 계약은 R8-09 |
| R7-11 | **INSUFFICIENT** | SEC:47–64; DB:42 | 14행 표는 생겼지만 9개 category의 감사 이벤트가 DB 최소 이벤트 목록에 하나도 없음 | 이벤트 이름·payload·생산자를 일치시킬 것 |
| R7-12 | VERIFIED | PB:66 | 입력 수락은 `SkillInjectionAccepted만`; 절차 관찰 전 `SkillLoadObserved` 금지 | 없음 |

### 신규 발견 (R8로 생긴 불일치)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R8-01 | High | SEC:72·76–84, FD:23, OI:51–52 | §2.1의 셀별 보장 계약이 미완성인데 D11·R19·R20은 그 표에 따른 UI·출고 판정을 요구 | 파일 시스템 행의 Codex 일반·Claude sandbox 셀, 실행 명령 행 대부분, 고위험 효과 일반/Claude 셀, **MCP 전 셀**, 그 외 OS 입력 전 셀에 명명된 관찰 신호 또는 시험 ID가 없다. `동일`은 셀 자체의 계약이 아니며, 자동 모드의 “브로커 집행자 제거 → 전부 POLICY_ONLY”는 프로세스 감사가 남는 `DETECTED` 셀에도 그대로 적용될 수 없다 | 28개 셀 각각 집행자·관찰·시험 또는 명시적 `UNVERIFIED/POLICY_ONLY`를 채우고 자동 모드의 재계산 규칙을 시험 가능하게 정의 |
| R8-02 | **Critical** | SEC:47–64, DB:42·63, OI:51–52 | §2.2의 감사 계약은 DB 이벤트 계약으로 구현할 수 없음 | 14행은 §2와 동일한 영역을 모두 포함한다. 그러나 `git_remote`, `db_change`, `dep_install`, `hook_enable`, `external_service`, `deploy`, `browser`, `computer_use`, `doc_export` **9개 category**에는 DB 목록에 존재하는 감사 이벤트가 **0개**다. 목록 밖 이름은 `InstructionFileChanged`, `EffectRecorded`, `unapproved_write`, `ProcessObserved`, `external_call_detected`, `remote_ref_changed`, `lockfile_changed`, `HookToggled`, `SettingsFileChanged`, `McpCallObserved`, `ToolServerAction`, `input_api_detected`. 또 SEC:64는 `category`와 `effects.kind`를 “공통 enum”이라 하지만 DB:63의 `git_push/pkg_install/external_service` 등은 SEC의 `git_remote/dep_install` 등과 다르다 | 정식 이벤트 타입·payload·발생원과 category→effects.kind 매핑을 정의하고 R19·R20 출고 시험에서 실제 이벤트를 검증 |
| R8-03 | High | SEC:79·86, AC:39, TEST:79 | 엄격 모드의 “실행 불가” 단언에 필요한 S4 조건이 AC와 SE-01a에서 빠짐 | SEC는 `S1c·S4 실측 전 DETECTED`라고 명시하지만 AC-P10a-5와 SE-01a는 `S1c`만 사전조건으로 요구 | S4의 해당 OS·공급자 결과와 사용자 MCP·Hook 제외를 두 시험의 명시 사전조건으로 맞춤 |
| R8-04 | High | DB:64·87–91, SEC:122, MASTER:26 | `pending_inputs` 원문 보관·백업 계약 충돌 | DB:64의 `text_enc`는 복호 가능한 원문인데 같은 행은 `저널·백업에는 해시만`이라 한다. DB:89는 온라인 **DB 전체** 백업, DB:91은 암호화 `선택`, SEC:122와 MASTER:26은 백업 **항상 암호화** | 백업에 암호문 열이 포함됨을 명시하고 암호화 의무·키 복원·삭제 시점을 단일 규칙으로 고정 |
| R8-05 | High | CK:24, MASTER:113, PB:93 | U5의 승인 대상과 실행 지시가 다름 | 사용자는 `SKILL.md만` 복사하는 선택지를 보지만 실행 지시는 `스킬 폴더 전체` 복사 | 참조 파일·스크립트 포함 여부를 U5에서 명시하고 그 결정을 S7·P07에 그대로 반영 |
| R8-06 | High | MASTER:124–126; AC:23·98–101; SEC:41·81–82 | S9의 경로 판정과 V1 합격 조건이 맞물리지 않음 | S9는 `unsupported`도 유효한 판정인데 AC-V1-8은 `supported/conditional인 경로`만 시험한다. AC-V1-10은 **공급자 플러그인 경로에서도** `승인 요청(ASK) 발생`을 요구하지만 SEC의 그 외 경로는 `DETECTED/UNVERIFIED`다. AC-V1-7의 스크립트 `DETECTED`도 OS별 보장 표와 이벤트 계약이 없다 | unsupported가 V1 실패·범위 변경 중 무엇인지 결정하고, 정식 앱 MCP 경로와 플러그인 경로의 AC를 분리 |
| R8-07 | Medium | PB:96·102·140–141; AC:89·116 | T5b의 순환은 없어졌지만 V1 게이트에서 빠질 수 있음 | `P10b T1→P09 T5b`이나 P10b는 `T5b 제외`로 진입한다. V1 요약은 `AC-V1 전부 + CO 전부`라고만 하며 AC-P09-4를 요구하지 않는다 | V1 게이트에 AC-P09-4를 추가하고 T5b 완료 시점을 P11b 이전으로 명시 |
| R8-08 | Medium | [스키마 발췌](/D:/LLM/agent-studio/docs/planning/evidence/codex_0.166.0_v2_schema_excerpt.json); [REVIEW §9.3](/D:/LLM/agent-studio/docs/planning/06_codesign/REVIEW_RESOLUTION.md:584) | 발췌본은 원본 생성 스키마 자체임을 입증하지 못하고 §9.3 요약도 파일과 완전히 같지 않음 | 파일의 `source`는 자기 진술이며 원본 파일·해시·실행 출력이 없다. §9.3은 SandboxPolicy.type을 세 값으로 요약하지만 발췌에는 `externalSandbox`도 있다. 파일 **내용상** `AskForApproval`은 `untrusted/on-request/never/{granular}`이고 `onRequest/on-failure`는 없다 | P00에서 CLI 원본 스키마를 보존·대조하고 §9.3 목록에 `externalSandbox`를 반영 |
| R8-09 | Medium | PB:66·118–131; DB:42·60; AI:74 | 새 투영·항목의 유일성 검증이 부족 | PB P01은 `17. 증거`가 두 번이다. `sessions.app_owned=1`의 등록은 명시됐으나 DB 이벤트 목록에는 세션 생성·외부 세션 가져오기 이벤트가 없고, 재생 시 어떤 이벤트가 `sessions` 행을 생산하는지 이 문서만으로 결정할 수 없다 | 번호 중복 제거; `AgentRunStarted`를 생산 이벤트로 쓸지 별도 세션 이벤트를 둘지 `projections.md` 계약에 명시 |
| R8-10 | Low | [PLANNING_STATUS](/D:/LLM/agent-studio/docs/planning/PLANNING_STATUS.md:24), PR:5, LIM:18 | 요청한 용어 정리의 예외 범위 밖에 과거 표기가 남음 | `PLANNING_STATUS` 24·26에는 `on-failure`·`onRequest`가 이력으로 남는다. plain `MVP`는 PR:5 상태 이력과 LIM:18 변경 이력에도 남는다. **활성 app-server v2 설정값**에서는 `onRequest/on-failure`를 찾지 못했다 | 이력임을 유지한다면 허용 예외 범위를 명시하거나 표기를 정리 |

**참조 검사:** R8 수정 대상에서 직접 표기된 `TEST-*`·`AC-*` ID의 미정의 사례는 찾지 못했다. `AC-P01-1~7`은 각각 한 번 정의된다. 참조된 P01 T10–T12, P08b T1·T6, P09 T5b, P10b T1·T7·T9도 PB의 Task 목록에 있다. 위 R8-10은 **문자열 출현 위치** 문제이며 활성 설정값의 오기와 구별했다.

### 사용자 결정 대기로 표시할 항목

- **U1 인증 모드:** API key 기본, 설치 CLI 인증 재사용, 공급자 확인 후 결정 중 선택 필요([OI:14](/D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:14), [CK:20](/D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:20)).
- **U5 Codex 스킬 설치:** 현재 선택지 자체가 R8-05와 충돌한다. 설치 범위를 정정한 문구로 결정받아야 한다.
- **U8 자동 권한 모드:** 결정 전 기본은 `(b-제한)`이며 Claude native Windows 자동 수정 UI는 비노출이다([OI:18](/D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:18)).
- **U9 CODEX_HOME:** 모든 지정 문서는 결정 전 **분리 프로필**, 공유는 프로젝트별 옵트인으로 일치한다. 공유·분리의 최종 선택은 남아 있다([FD:31](/D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:31)).
- 체크리스트에는 별도로 U3·U4 및 합의 확인 항목 U2·U6·U7도 미체크 상태다. 이는 네 핵심 결정과 구분해 기록해야 한다.

### UNVERIFIED

[스키마 발췌본](/D:/LLM/agent-studio/docs/planning/evidence/codex_0.166.0_v2_schema_excerpt.json)은 **현재 파일이 담은 값에 관한 1차 자료**이지만, 설치된 `codex-cli 0.166.0`이 실제 생성한 **원본 출력임을 독립 입증하는 1차 출처로는 부족**하다. 따라서 문서의 `on-request` 사용은 확인했지만 설치 CLI와의 일치는 `UNVERIFIED`다. 발췌 파일 자체에는 `externalSandbox`가 있으며, 문서의 기본 정책이 그것을 허용한다는 뜻은 아니다.

계획 문서가 P00에 남겨 둔 `forkSession` typings·실호출, SDK의 `--chrome` 상당 옵션, 공유 홈 `-c mcp_servers.*`의 기존 설정 제거 효과, 헤드리스 플러그인 기동, Windows/OS 샌드박스의 실제 차단 역시 이 읽기 전용 재검증에서 실행 증거가 없으므로 `UNVERIFIED`다. §2.1의 조건부 ENFORCED와 AC의 기능 실현은 해당 실측 및 R8-01~06 계약 정정 전까지 완료 사실로 취급할 수 없다.