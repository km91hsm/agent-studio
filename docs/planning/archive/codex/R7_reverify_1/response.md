### 요약

- 검증 대상 72건 중 **확인 29 / 불충분 43 / 미반영 0**으로 판정했다. 수정으로 생긴 문서 간 불일치는 **신규 12건**이다.
- **잔존 Critical·High 있음.** 특히 `SECURITY_MODEL`의 보장 등급, 미확정 `U9`의 공유 기본값, 복구의 자동 재개 조건이 출고 판단에 영향을 준다.
- `SECURITY_MODEL` §2의 정책 영역은 14행이다. 그러나 §2.1의 일부 `ENFORCED`·`DETECTED` 셀에는 그 등급을 뒷받침할 집행자, 관찰 신호, 시험 전제가 빠져 있다.
- 아래 `VERIFIED`는 **현재 계획 문서에 수정 내용이 반영됐다는 판정**이다. 계획된 구현이나 실호출 시험의 성공을 뜻하지 않는다. 파일은 수정하지 않았다.

위치 약어: [PR](</D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md>) · [UI](</D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md>) · [SA](</D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md>) · [FD](</D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md>) · [AI](</D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md>) · [DB](</D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md>) · [SR](</D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md>) · [CP](</D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md>) · [PM](</D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md>).

[SEC](</D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md>) · [TS](</D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md>) · [RT](</D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md>) · [LIM](</D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md>) · [PB](</D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md>) · [MP](</D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md>) · [AC](</D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md>) · [OI](</D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md>) · [CK](</D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md>).

[RP](</D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md>) · [UP](</D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md>) · [ES](</D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md>) · [CR](</D:/LLM/agent-studio/docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md>) · [CM](</D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md>).

### §6.1 잔존 37건 재검증

| 원 ID | 판정 (VERIFIED / INSUFFICIENT / NOT_APPLIED) | 현재 문서·위치 | 근거 인용 | 잔여 조치 |
|---|---|---|---|---|
| R4A-02 | INSUFFICIENT | PR:119, LIM:8 | `REQ-SK-01`은 `V1(P07)`로 옮겼다. 그러나 제한 정책은 아직 `P00·MVP 실측 후`라고 쓴다. | 단계명 전수 정규화의 남은 본문을 고친다. |
| R4A-05 | INSUFFICIENT | SA:54, PB:66 | 접속 계약은 `데몬 WS에 접속하는 프로세스는 main 하나`라고 한다. 반면 P01 T2는 `Renderer 단기 토큰 발급`을 여전히 구현 대상으로 둔다. | T2에서 Renderer 토큰을 제거하고 IPC 릴레이만 명시한다. |
| R4A-09 | VERIFIED | PR:103, PB:99, AC:87 | `REQ-WS-03`은 `P08b T6`을 소유 Task로, `AC-P08b-3`을 첨부 왕복 기준으로 지정한다. | 문서상 잔여 조치 없음. |
| R4A-10 | VERIFIED | AI:23–30, SA:60 | `RunHandle.respond(requestId, answer)`와 SA의 `respond(...ApprovalAnswer\|UserInputAnswer\|ElicitationAnswer)`가 같은 서명이다. | 문서상 잔여 조치 없음. |
| R4A-14 | INSUFFICIENT | SEC:118, PB:84, AC:30 | SEC는 CSP를 `단일 정의 위치`라고 하지만 PB는 별도로 `script-src 'self' app:`와 `worker-src app:`를 고정한다. SEC의 문자열은 `frame-src 'none'` 뒤에서 끝나고 `base-uri` 등은 문자열 밖에 있다. | 유효한 CSP 문자열 하나로 정리하고 PB는 참조만 남긴다. |
| R4A-18 | VERIFIED | UI:56·59, PB:108·114 | Planning V2가 `P12 T4`, Skills V2가 `P11c T4`에 연결됐고 두 Task가 실제로 정의돼 있다. | 문서상 잔여 조치 없음. |
| R4B-01 | INSUFFICIENT | CM:52·110, SEC:55–60 | CM은 브로커·앱 실행기가 hook을 `대체`한다고 쓰면서 SEC의 조건부·부분 보장만 참조한다. SEC §2.1 자체도 영역별 집행 범위가 불명확하다. | `대체`의 기능과 강제 보장을 구분하고 해당 셀을 확정한다. |
| R4B-03 | INSUFFICIENT | DB:42·59, SR:46–47 | 이벤트와 열은 생겼다. SR은 `기본값은 uncertain`이라고 하나 DB의 `agent_runs.capture_confidence` 행에는 기본값과 초기화 시점이 없다. | DB 투영 계약에 기본값과 `complete` 승격 조건을 명시한다. |
| R4B-04 | INSUFFICIENT | DB:44, PB:66 | 열별 대응은 현재 문서에 없고 `P01 T3 산출물 packages/protocol/projections.md`로 미뤘다. `RC-S16·S19`가 그것을 검증하도록 지정한 점은 진전이다. | 산출물의 필수 열·이벤트 범위와 생성 게이트를 P01 AC에 연결한다. |
| R4B-05 | VERIFIED | PM:80·90–95, PB:66 | 와일드카드 전이를 명시 상태 집합으로 바꿨고 `task-transitions.json`을 `P01 T4 산출물`이라고 표시한다. | 문서상 잔여 조치 없음. |
| R4B-06 | VERIFIED | CP:72, PM:88 | Manual 선택 뒤에도 `반대편 에이전트의 리뷰` 또는 명시적 생략이 필요하며, 금지 범주와 `capture_confidence=uncertain`에는 생략을 허용하지 않는다. | 문서상 잔여 조치 없음. |
| R4B-07 | VERIFIED | CP:76 | 생략 조건에 `변경 파일 ≤ 2`, 테스트 통과, 외부 효과 없음, `capture_confidence=complete`가 모두 들어갔다. | 문서상 잔여 조치 없음. |
| R4B-10 | INSUFFICIENT | ES:46, MP:113 | 시그니처 스키마·작성자·순서 판정은 추가됐다. ES는 `주도 스킬 8종 시그니처 작성`을 요구하지만 S7 Steps는 로드 실측 1회와 충돌 실험 4쌍만 적는다. | 8종 작성·검토 작업과 수용 증거를 S7에 배정한다. |
| R4B-13 | INSUFFICIENT | AI:57, MP:84–91 | AI는 `forkSession(sessionId,{upToMessageId})`의 설치 버전 동작을 P00 확인으로 남긴다. MP S2의 실제 Step에는 이 호출의 typings 검사·실호출 단언이 없다. | S2 테스트 항목으로 추가하고 결과 전까지 `UNVERIFIED`를 유지한다. |
| R4B-14 | INSUFFICIENT | SR:46–47, RT:56–57 | SR은 confidence에 따라 자동 재개를 나눈다. RT §3은 여전히 `present / 없음 / 없음 → 자동 재개 허용`이라고 쓰며 confidence 사전조건을 누락한다. | 복구 시험 판정표와 LIM §6에도 `complete` 조건을 넣는다. |
| R4B-17 | VERIFIED | AI:71·89–91 | `15분 초과 시 decline + turn/interrupt` 후 `BLOCKED(approval_expired)`로 전이하며 복귀는 `새 run·새 요청`이다. | 문서상 잔여 조치 없음. |
| R4B-21 | VERIFIED | RP:13, PB:96·108·111·114 | 라우팅 정책이 왼쪽→오른쪽을 단계 순서로 정의했고 P09 및 V2 Phase들이 스킬의 사용 단계를 적는다. | 문서상 잔여 조치 없음. |
| R4B-23 | INSUFFICIENT | UP:58, PB:93, MP:113 | UP과 PB는 `스킬 폴더 전체` 복사를 지정하지만 MP S7은 여전히 `SKILL.md만 복사`라고 한다. | S7 설치 절차를 폴더 전체 복사로 맞춘다. |
| R4B-24 | INSUFFICIENT | DB:57, ES:61, MP:27 | DB·ES의 `LOAD_OBSERVED` 허용 kind는 닫힌 목록이다. MP는 `조사·프로토타입·문서·리뷰 Task`라는 다른 범주를 쓴다. | MP를 `tasks.kind` enum과 같은 조건으로 바꾼다. |
| R4C-01 | INSUFFICIENT | SEC:55–64, AC:38, TS:79 | 엄격 모드 셀은 `readOnly(셸 쓰기 없음)`을 근거로 원격 Git·외부 전송까지 `ENFORCED 조건부`라 적는다. 명령 실행 셀 자체는 `UNVERIFIED → S4·S1c`다. | readOnly의 셸·네트워크·MCP·Hook 우회를 입증하기 전 고위험 효과의 `실행 불가` 단언을 보류한다. |
| R4C-02 | INSUFFICIENT | PB:66, AC:26–28 | `P01 T11`과 차단 AC는 추가됐다. 그러나 **`AC-P01-2`가 차단 집행과 투영 재구성에 중복 배정**됐다. | 두 기준에 별도 ID를 주고 모든 참조를 갱신한다. |
| R4C-03 | INSUFFICIENT | SEC:55–60 | §2.1의 파일·명령·네트워크·고위험 효과·MCP·브라우저 행 중 여러 셀은 `집행자 / 관찰 이벤트 / 우회 시험` 세 요소를 모두 갖추지 못했다. 예컨대 네트워크 행은 `S4 합격 시`만 적는다. | 공급자×OS×모드별 관찰 신호와 시험을 채우거나 `UNVERIFIED`로 낮춘다. |
| R4C-04 | VERIFIED | LIM:63–67, TS:125 | 단조 시계와 재기동 후 저널 wall-clock의 역할을 분리했고 활성 중 재기동의 불확실 구간을 `active_ms`에 보수적으로 가산한다. `TEST-LIM-05`도 있다. | 계획의 실제 통과 여부는 구현 시험에서 판정한다. |
| R4C-05 | INSUFFICIENT | RT:50·65, AC:63 | `RC-S22`가 게이트에 들어갔다. 다만 한 예상 결과 안에 `새 run·새 승인 요청`과 `원장 밖 변경은 … 자동 재개 금지`를 함께 적어 사용자 대조 전후 순서가 불분명하다. | 원장 밖 변경 발견 시 보류, 사용자 판정 뒤 재개라는 분기를 명시한다. |
| R4C-06 | INSUFFICIENT | TS:79–81, SEC:34 | `SE-01a`와 `01a'`는 분리됐다. `SE-01b`는 원격 Git 행의 `명시 작업 시` 규칙을 인용하지만 SEC의 원격 Git 기본 행에는 `push … DENY / fetch ASK`만 있다. | `DENY→ALWAYS_ASK(once)→DENY` 전이를 정책 행에 적는다. |
| R4C-07 | VERIFIED | TS:45·99·103 | `AG-02`, `DT-03`, `DT-07`의 입력·예상·실패 처리·증거가 구체화됐다. | 문서상 잔여 조치 없음. |
| R4C-09 | INSUFFICIENT | MP:11, LIM:8 | Goal은 `MVP-Core → V1(…제품 MVP)`로 정리됐다. LIM의 `P00·MVP 실측 후`는 여전히 어느 게이트인지 불명확하다. | LIM 본문을 `MVP-Core` 또는 `V1`로 지정한다. |
| R4C-10 | INSUFFICIENT | AC:39, PB:66, ES:44 | 공급자별 수동 증거·보관 위치는 생겼다. P01 T12는 Codex의 `skill 입력 전송 로그`를 `SkillLoadObserved`로 기록한다고 하는데 ES는 그 증거의 상한을 `INJECTION_ACCEPTED`라고 한다. | 관찰자가 실제 고유 절차를 확인한 때에만 `SkillLoadObserved`를 발행한다. |
| R4C-11 | INSUFFICIENT | PB:96, PM:90 | P09는 패치만 비교하고 실패 시 `WAITING_APPROVAL(compare_blocked)`를 지정한다. PM의 허용 이벤트에는 `compare_blocked`가 없고, P10b가 P09 전체를 선행으로 요구해 T5b와 순환한다. | 보류 이벤트·전이 및 T5b의 별도 완료 경계를 정의한다. |
| R4C-12 | INSUFFICIENT | MP:67, PB:51, AC:15 | MP와 AC는 승인 요청을 관찰값으로 둔다. PB S1a는 여전히 `requestApproval 수신(관찰)→decline/accept`를 기본 왕복의 필수 단계처럼 배열한다. | PB에 요청이 없을 때의 안전한 성공 경로를 명시한다. |
| R4C-14 | VERIFIED | LIM:15·17·25, TS:124 | 경험적 수치를 `설계 가설(실측 전)`로 표시하고 `TEST-LIM-04`를 정의했다. | 문서상 잔여 조치 없음. |
| R4C-16 | INSUFFICIENT | PB:89–126 | V2 세 Phase는 실제로 18개 번호가 있다. 그러나 §2.1은 P06·P07·P09를 `16/18`이라 쓰지만 각 본문에는 **9개 번호**만 있다. P10a·P02도 각 14개, P11a는 11개다. | 표를 실제 개수로 고치고 빠진 항목을 채운다. |
| R4C-17 | VERIFIED | PB:60·63·66, MP:113 | S7의 제품 패키지·CI 생성은 `P01 T10`으로 옮겼고, P00 위험 실험 2주와 S9 탐색 1주를 분리했다. | 문서상 잔여 조치 없음. |
| R4C-18 | INSUFFICIENT | AC:19·23·95–97, CR:44 | AC는 `4쌍 확정 + 나머지 4행 잠정`이라고 한다. CR §2의 8행 중 실험 대상은 3행이고 나머지는 5행이며, 네 번째 실험은 §3의 별도 라우터 충돌이다. S9 뒤 CAP-04~06의 실현 AC도 V1-5~7에 없다. | 8행 계산을 바로잡고 문서·이미지·브라우저의 기능 AC를 만든다. |
| R4C-19 | VERIFIED | OI:51–52, SEC:143–144 | R19·R20에 소유 Task와 `SE-08`, `SE-09·10` 출고 차단 조건이 들어갔다. | 문서상 잔여 조치 없음. |
| R4C-21 | INSUFFICIENT | TS:88–89, SEC:58 | 로컬 수신 서버와 모드별 예상은 추가됐다. 그러나 `SE-08`은 설치·DB·외부 전송까지 완전한 탐지를 실패 기준으로 쓰는 반면 SEC는 그 신호를 `부분 DETECTED`라고 제한한다. | 테스트 실패 기준을 실제 관찰 범위별로 나누고 미관찰 영역을 출고 위험으로 남긴다. |
| R4C-22 | VERIFIED | AC:63, RT:65 | 양쪽 MVP-Core 목록이 `S01~S05, S07, S12, S13, S15, S16, S20, S22`로 일치한다. | 문서상 잔여 조치 없음. |

### §6.2 신규 35건 재검증 (ACCEPTED 33 + PARTIALLY_ACCEPTED 2)

| 원 ID | 판정 (VERIFIED / INSUFFICIENT / NOT_APPLIED) | 현재 문서·위치 | 근거 인용 | 잔여 조치 |
|---|---|---|---|---|
| R6A-02 | VERIFIED | AI:56·70, AC:44, UI:108 | `dontAsk`가 선택지에 들어갔고 UI 경고가 파일·명령·외부 전송을 명시한다. | 문서상 잔여 조치 없음. |
| R6A-03 | INSUFFICIENT | AI:122·128, PR:214 | 판정 규칙은 `S9 전까지 전부 conditional(UNVERIFIED)`라지만 두 CAP-03 행은 내장 경로를 `supported`라고 표시한다. | 실측 전 상태와 기능 종류별 상태를 분리한다. |
| R6A-04 | INSUFFICIENT | FD:38, MP:55, AI:122 | D26은 `unsupported`를 허용한다. MP는 S9 미지원도 `불가 판정 아님`이라 하므로 판정 결과의 의미가 다르다. | 경로 탐색 원칙과 실제 지원 판정을 같은 용어로 통일한다. |
| R6A-05 | VERIFIED | AI:77, OI:50 | 공유 홈에서 `mcp_servers`, `notify`, hooks, 플러그인 경로의 유효 설정을 열거·표시하고 변경을 감지하도록 지정했다. | 이 절차의 구현·실측은 S9 이후 검증한다. |
| R6A-06 | INSUFFICIENT | AI:113, PB:51–54, MP:67, AC:15 | S1b·S1c의 큰 범위는 일치한다. S1a 승인 요청은 AI·PB에서 왕복 항목이지만 MP·AC에서는 선택적 관찰값이다. | 네 문서에 요청 없음 경로를 똑같이 적는다. |
| R6A-07 | INSUFFICIENT | PB:96·102, AC:88 | `T5b`와 `AC-P09-4`는 존재한다. 그러나 T5b는 `P10b T1`을 선행으로, P10b는 P09 전체를 선행으로 둔다. | P09의 순차형 완료와 후속 T5b의 완료를 분리한다. |
| R6A-08 | INSUFFICIENT | SA:54, PB:66, FD:59·65 | SA의 IPC 채널·발신 검증·재연결 계약은 구현 가능한 수준으로 적혔다. PB T2의 `Renderer 단기 토큰 발급`과 FD의 이전 입장 변경 행은 직접 접속을 다시 암시한다. | 활성 Task에서 토큰을 삭제하고 FD의 이전 행은 폐기된 단계라고 표시한다. |
| R6A-09 | INSUFFICIENT | AC:86, MP:40 | `AC-P08b-2`는 base 해시 불일치 Save 거부를 정의한다. MP의 `TEST-RF-04` 연결은 아직 `AC-P08b-1`이다. | Review Focus 참조를 `AC-P08b-2`로 바꾼다. |
| R6A-10 | VERIFIED | PB:102·108·111·114, UI:56·59 | 브라우저 자동화는 `P10b T9`, 미리보기는 `P08c`, Planning V2는 `P12 T4`, Skills V2는 `P11c T4`에 배정됐다. | 문서상 잔여 조치 없음. |
| R6B-02 | INSUFFICIENT | AI:69–70, PR:213, FD:66, MP:24 | 활성 v2 설정은 `onRequest`이고 CLI/config는 `on-request`라고 구분한다. 하지만 제외 대상 밖의 문서 **5곳**에 `on-failure` 문자열이 남아 있으며, 설치본 v2 허용값은 스키마로 독립 확인하지 못했다. | 역사 설명은 한곳에 모으고 v2 생성 스키마로 네 값을 확인한다. |
| R6B-03 | INSUFFICIENT | AI:122·128, PR:214 | 내장 도구와 Desktop 플러그인 경로를 나눈 것은 맞다. `supported(내장)` 표기는 같은 절의 S9 전 `conditional` 원칙과 충돌한다. | CAP별 상태를 실측 전/후로 구분한다. |
| R6B-04 | VERIFIED | AI:129, PR:215 | 문서 생성 경로를 `conditional(…UNVERIFIED)`로 낮추고 `산출물 재열기 검증`을 붙였다. | 문서상 잔여 조치 없음. |
| R6B-05 | VERIFIED | AI:130, PR:216 | `imagegen` 존재와 headless `image_gen` 호출 가능성을 구분하고 후자를 `conditional(UNVERIFIED)`로 둔다. | 문서상 잔여 조치 없음. |
| R6B-06 | VERIFIED | AI:131, PR:217 | Claude `--chrome` 플래그 확인과 SDK 옵션·확장 연계 미검증을 구분한다. | 문서상 잔여 조치 없음. |
| R6B-09 | INSUFFICIENT | AI:134, PR:220, MP:122–125 | CAP-09는 두 표에 있다. 하지만 S9 결과 타입은 `'CAP-01'..'CAP-08'`인데 바로 다음 Step은 `CAP-01~09` 배열을 단언한다. | S9 범위·타입·탐침 목록을 CAP-09까지 맞춘다. |
| R6B-10 | INSUFFICIENT | FD:23, SEC:127, MP:13 | FD·SEC는 자동 모드에서 앱 실행기 우회를 사전 차단하지 못한다고 인정한다. MP Goal 아래 Architecture 문장은 여전히 `고위험 효과는 앱 전용 실행기만 통과한다`고 단언한다. | MP의 보장 문장을 엄격 모드 조건부로 한정한다. |
| R6B-11 | INSUFFICIENT | AI:74, DB:59–60 | AI는 앱 소유 thread를 `sessions.app_owned=1`에 등록한다고 한다. DB에는 `agent_runs.app_owned`만 있고 `sessions`에는 그 열이 없다. | 소유 플래그의 정본 테이블과 thread 필터 질의를 지정한다. |
| R6B-12 | VERIFIED | AI:122, ES:47 | 3단 설치를 승인 효과로 제한하고 OS 입력 제어를 금지했다. 생성 산출물에 해시·파서 재열기·렌더 검사도 지정했다. | 문서상 잔여 조치 없음. |
| R6B-13 | VERIFIED | DB:42, SR:67 | `PlanArtifact`, `PlanReview`, `ReviewReport`, `ReworkResponse`가 이벤트 목록에 추가됐고 Git 실행 신호에 `stderr_digest`가 있다. | 문서상 잔여 조치 없음. |
| R6B-14 | VERIFIED | AI:71·90 | 승인 15분 만료 뒤 즉시 `BLOCKED(approval_expired)`로 전이하는 흐름이 일치한다. | 문서상 잔여 조치 없음. |
| R6B-15 | VERIFIED | UP:19·59, ES:32 | 사용 계획은 전송 수락을 `INJECTION_ACCEPTED 상한`이라 하고, `LOADED_ONLY`는 ES에서 구 명칭 대응으로만 남긴다. | 문서상 잔여 조치 없음. |
| R6B-16 | INSUFFICIENT | CR:22–29·44 | §4의 `각 1회`와 달리 §2의 디버깅 행은 `버그 1건·성능 회귀 1건` 비교를 요구한다. `나머지 4행`도 실제로는 5행이다. | §2 실험 열과 §4의 범위·횟수를 함께 고친다. |
| R6B-17 | VERIFIED | RP:13, PB:93 | 자동 후보 필터가 `user_only == false AND classification ∈ {공통, 프로젝트, 조건부}`로 닫혔고 P07 T2의 제외 테스트 대상도 적혀 있다. | 문서상 잔여 조치 없음. |
| R6B-18 | INSUFFICIENT | DB:42·64, AI:72 | `text_masked`, hash, 만료는 추가됐다. 그러나 AI는 큐의 입력을 다음 `turn/start`에 **그대로 전달**해야 하고, DB에는 원문 대신 마스킹된 텍스트만 있다. | 비밀을 저장하지 않으면서 원래 지시를 전달할 방식, 또는 입력 변형 고지·재확인 규칙을 정한다. |
| R6C-01 | INSUFFICIENT | SEC:60·62, SEC:127, OI:18 | 자동 적용값은 Claude native Windows의 `모든 영역이 POLICY_ONLY 또는 부분 DETECTED`라고 한다. 같은 표는 앱 MCP 브라우저·컴퓨터 사용을 `ENFORCED`라 하고 §8은 자동 모드에서도 `ALWAYS_ASK 유지`라 한다. | 네이티브 경로와 앱 MCP 경로의 보장·우회 가능성을 각각 표기하고 U8 결정 전 제한을 일관되게 적용한다. |
| R6C-02 | INSUFFICIENT | FD:31, OI:19, MP:28, PB:93 | FD·OI는 U9를 사용자 결정으로 남긴다. MP는 `사용자 것을 공유(U9 기본 제안)`, PB는 `사용자 CODEX_HOME 공유 기본`이라고 활성 구현 규칙처럼 쓴다. | 결정 전 기본 동작을 모든 문서에 하나로 명시한다. |
| R6C-03 | INSUFFICIENT | SEC:42·60, TS:91, AC:97 | 3단 입력 스크립트 금지와 분리 승인은 들어갔다. 하지만 SEC는 앱 MCP 경로를 `ENFORCED`라 하고 셸 스크립트 우회는 `DETECTED`라 한다. `SE-10`도 우회를 사후 탐지하는 시험이다. | `앱 서버 전용`이 강제 경계인지 정식 경로인지 구분한다. |
| R6C-04 | INSUFFICIENT | AC:23·95–97, PB:102 | S9는 결정 게이트로 바뀌었다. 기능 실현을 맡긴다는 `AC-V1-5~7`은 각각 OS 생명주기, 핵심 UX, 컴퓨터 사용이며 CAP-04 문서·CAP-05 이미지·CAP-06 브라우저 실현 기준은 없다. | 해당 CAP별 V1 기능·보안 AC를 추가한다. |
| R6C-05 | VERIFIED | AC:44–45 | `AC-P02-3`은 옵트인 **없는** 주입만 거부하고 위험 플래그는 항상 거부한다. `AC-P02-6`은 옵트인 값 전달을 요구한다. | 문서상 잔여 조치 없음. |
| R6C-06 | INSUFFICIENT | AC:19, CR:22–29·44 | AC 문장은 `4쌍 확정 + 나머지 4행 잠정`으로 바뀌었다. CR의 실험 4쌍 중 하나가 §2의 8행 밖에 있어 그 산술이 여전히 틀리다. | 확정·잠정의 대상 행을 ID로 열거한다. |
| R6C-07 | VERIFIED | TS:79–91·121–125, RT:50 | 분리된 `SE-01a/01a'/01b`, `SE-06a/b`와 신설 `SE-10`, `LIM-04/05`, `RC-S22`의 정의가 있다. PB·AC의 정확한 `TEST-*` 인용은 정의 행 또는 `BG-06~10` 범위 행에 대응한다. | 문서상 잔여 조치 없음. |
| R6C-08 | INSUFFICIENT | SEC:24, PB:69, PR:172, LIM:8 | 보안 매트릭스와 P10a는 14행으로 고쳤다. PR의 원 요구 11종은 유지 가능하지만 LIM은 단계명을 `MVP`라 쓴다. | 릴리스명 잔여 문구를 고친다. |
| R6C-09 | VERIFIED | AC:14, PB:54, MP:128 | 세 문서 모두 보고서 11건과 `S1a → (S1b ∥ S1c)` 순서를 명시한다. | 문서상 잔여 조치 없음. |
| R6C-10 | VERIFIED | AC:63, RT:65 | MVP-Core 복구 게이트 두 목록에 `S20`과 `S22`가 모두 포함됐다. | 문서상 잔여 조치 없음. |
| R6C-11 | INSUFFICIENT | SEC:112, FD:31, MP:28 | SEC·FD는 기본 상속을 `POLICY_ONLY`, 격리 옵션을 `ENFORCED`로 설명한다. MP는 U9 미결 상태에서 공유를 기본 구현으로 고정한다. | U9 결정 전 프로필 기본값과 MCP 집행 등급을 통일한다. |

### 신규 발견 (R7로 생긴 불일치)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R7-01 | High | AC:26–28 | `AC-P01-2`가 두 조건의 ID다. | 첫 행은 `격리 게이트 집행`, 둘째 행은 `투영 삭제 후 저널에서 100% 재구성`이다. RT:80도 같은 ID를 재구성에 연결한다. | ID를 분리하고 PB·RT·체크리스트 참조를 갱신한다. |
| R7-02 | High | FD:31, OI:19, MP:28, PB:93, PR:220 | 미결 `U9`의 Claude 제안이 구현 기본값으로 반복된다. | FD는 `사용자 결정 U9`인데 PB는 `사용자 CODEX_HOME 공유 기본`, PR은 `공유해 … 상속`이라고 단정한다. | 사용자 결정 전 기본 동작을 하나로 정하고 모든 문서에서 제안과 결정의 상태를 분리한다. |
| R7-03 | High | MP:122–125, PB:62, AC:23 | CAP-09 추가 뒤 S9 타입·검증 범위가 갈라졌다. | MP의 `CapabilityProbeResult`와 PB 산출은 `CAP-01~08`, MP Step 1과 AC는 `CAP-01~09 × 2공급자`다. | 결과 타입·실험 항목·AC를 같은 행 집합으로 만든다. |
| R7-04 | High | PB:96·102 | `P09 T5b`와 P10b 사이에 완료 의존성이 순환한다. | T5b는 `P10b T1 이후`; P10b 전체의 선행은 `P09`다. | P09 순차형 완료 후 P10b T1, 그 뒤 T5b를 별도 후속 Task로 둔다. |
| R7-05 | High | SR:46–47, RT:56–57, LIM:81 | 복구 자동 재개의 새 confidence 조건이 시험·제한 정책에 전파되지 않았다. | SR은 `capture_confidence=complete`가 필수인데 RT·LIM은 `present/효과 없음/git 변화 없음`만으로 자동 재개를 허용한다. | 두 판정표에 confidence와 관찰 누락 시 `uncertain`을 넣는다. |
| R7-06 | High | DB:64, AI:72 | 마스킹된 보류 입력은 원 지시를 재전달할 수 없다. | DB는 `text_masked`와 `text_hash`만 저장하지만 AI는 steer 실패 후 다음 `turn/start`에 입력을 전달한다. hash로 원문 복원은 불가능하다. | 원문 보존 방식의 보안 계약을 정하거나 변형된 입력을 사용자에게 다시 확인받는다. |
| R7-07 | High | SEC:60·62·127, TS:91 | 자동 모드의 보장값과 컴퓨터 사용 승인 설명이 서로 다르다. | 표는 앱 MCP를 `ENFORCED`, 자동 적용 문단은 Claude native의 모든 영역을 `POLICY_ONLY 또는 부분 DETECTED`, §8은 `ALWAYS_ASK 유지`라고 한다. 셸 우회는 `SE-10`에서 탐지만 한다. | 정식 MCP 호출의 승인과 다른 OS 입력 경로의 보장을 별개 셀로 적는다. |
| R7-08 | Medium | SEC:118, PB:84, AC:30 | CSP 단일 정의가 문법과 참조 양쪽에서 깨졌다. | backtick 문자열은 `frame-src 'none'`에서 끝나고 `base-uri 'none'; form-action 'none'`은 밖에 있다. PB는 다른 `script-src`·`worker-src` 값을 다시 적는다. | 하나의 완전한 CSP 문자열과 설치물 worker 단언을 사용한다. |
| R7-09 | Medium | CR:22–29·44, AC:19 | `8행 = 확정 4 + 잠정 4` 계산이 실제 실험 대상과 맞지 않는다. | §2의 실험 대상은 TDD·디버깅·리뷰 3행이고 네 번째는 §3 라우터 충돌이다. §2의 비실험 행은 5개다. | 행과 횡단 충돌을 따로 세고 확정 대상을 명명한다. |
| R7-10 | High | AI:74, DB:59–60 | 앱 소유 세션 필터의 저장 위치가 존재하지 않는다. | AI는 `sessions.app_owned=1`을 요구하지만 DB는 `agent_runs.app_owned`만 정의한다. | 세션별 소유 플래그와 run–session 연결 시 갱신 규칙을 정의한다. |
| R7-11 | High | SEC:28–43, AI:84–94, SA:62 | 14영역 정책과 ApprovalBroker 입력 분류 사이의 계약이 부족하다. | AI의 매핑은 Codex `commandExecution/fileChange/permissions/MCP`, Claude 도구 이름·문자열 패턴 중심이다. 프로젝트 신뢰·Hook·앱 실행기 경유 원격 Git 등 앱 자체 사건이 어떤 `category`가 되는지 적혀 있지 않다. | 14행 각각의 발생원·분류 ID·집행 경로·감사 이벤트를 연결한다. |
| R7-12 | High | PB:66, ES:44, AC:39 | P01 관찰자가 Codex 스킬 입력을 로드 증거로 승격할 수 있다. | PB T12는 `skill 입력 전송 로그`를 `SkillLoadObserved`로 기록한다고 한다. ES는 같은 입력의 증거 상한을 `INJECTION_ACCEPTED`로 둔다. | 전송·수락 이벤트와 절차 관찰 이벤트를 분리한다. |

### 사용자 결정 대기로 표시할 항목

- **U8 — 자동 권한 모드 범위:** [OI:18](</D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:18>)와 [CK:27](</D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:27>)은 Claude의 전 선택지 옵트인 `(b)`와 Codex의 격리 조합 한정 `(b-제한)`을 병기한다. **결정 전 기본 동작은 `(b-제한)`**으로 적혀 있다. 그동안 Claude native Windows 자동 수정 UI는 비노출이며, 이 규칙을 AI·SEC·MP의 활성 설명에도 일치시켜야 한다.
- **U9 — `CODEX_HOME` 공유:** [FD:31](</D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:31>), [OI:19](</D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:19>), [CK:28](</D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:28>)은 공유 기본 `(a)`와 프로젝트별 선택·분리 기본 `(c)`을 **미결**로 둔다. **결정 전 기본 프로필은 문서 간 합의되지 않았다.** MP·PB·PR이 공유 기본을 결정된 동작처럼 쓰는 상태에서 이를 구현 기준으로 삼을 수 없다.

### UNVERIFIED

- 설치 경로의 `codex.exe --version` 실행 결과는 **`codex-cli 0.166.0`**이었다. 같은 실행 파일의 CLI 도움말은 `--ask-for-approval` 값으로 `on-request`, `never`를 표시했다. 이는 **CLI 표면**의 확인값이다.
- app-server v2 JSON의 `approvalPolicy` 허용값 **`untrusted/onRequest/granular/never`는 독립 확인하지 못했다.** 설치본 `generate-json-schema`는 `--out <DIR>`를 필수로 요구하며, 이번 읽기 전용 작업에서는 생성 파일을 쓸 수 없었다. 따라서 네 값과 `on-failure`의 v2 부재는 현재 계획 문서의 주장으로 남는다. 문서들은 활성 JSON의 `onRequest`와 CLI/config의 `on-request`를 구분하지만, `on-failure`라는 문자열 자체는 허용 제외 범위 밖의 PR:213, FD:66, AI:70, MP:24, `PLANNING_STATUS.md:24`에 남아 있다. 모두 설명·이력 문맥이며 활성 v2 설정값으로 사용한 행은 찾지 못했다.
- `Claude Agent SDK 0.3.316`의 `forkSession(sessionId,{upToMessageId})`, `--chrome` 상당 SDK 옵션, 공유 홈의 `-c mcp_servers.*` 제거 효과, 플러그인 headless 기동, 각 OS 샌드박스의 실제 차단과 §2.1 감사 신호는 이번 검증에서 실호출로 입증되지 않았다. 이에 의존하는 `ENFORCED`·`DETECTED` 주장은 위 표에서 계획의 증거 부족으로 판정했다.
- 교차 참조 점검에서 PB가 인용한 `AC-*`는 모두 AC에 문자열상 존재했고, 요청에 지정된 P01 T10~T12·P08b T6·P09 T5b·P10b T9·P12 T4·P11c T4도 정의돼 있었다. `TEST-*` 정확 인용도 TS·RT의 행 또는 `TEST-BG-06~10` 범위 행에 대응했다. 다만 **ID 존재는 의미 일치를 보증하지 않는다**. `AC-P01-2` 중복이 그 반례다.