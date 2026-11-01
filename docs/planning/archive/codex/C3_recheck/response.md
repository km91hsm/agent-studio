## 1. 요약

작업 트리 변경분을 `402a5c0` 및 `DECISION_LOG` §6.3과 대조했다. 아래 집계는 **C2의 33건**에 대한 판정이다.

| 해소 | 부분 해소 | 미해소 | 반영이 새 문제를 만듦 |
|---:|---:|---:|---:|
| 23 | 9 | 0 | 1 |

주요 잔여 사항은 P00 요약에서 사라진 시험 입력, `8개 설치/9개 전체 주도 스킬`의 수 구분, 위험표 일부의 잘못된 Task·TEST 연결이다. 문서는 수정하지 않았다.

## 2. 항목별 판정

| # | 판정 | 근거(파일·절·인용 ≤100자) | 남은 수정(바로 적용할 문장) |
|---|---|---|---|
| A1 | 해소 | CHECKLIST §1: “설계 수정분의 Codex 독립 재검증 결과” | — |
| B1 | 해소 | COLLABORATION §2: “§5의 5번 리뷰 생략 규칙” | — |
| B2 | 해소 | PHASE_MANAGEMENT §2: “§5 5번 … `capture_confidence=complete`” | — |
| B3 | 해소 | USAGE_PLAN §2 아래: “ROUTING_POLICY §1 2번” | — |
| B4 | 해소 | EVIDENCE_SPEC §5: “대조 결과(ROUTING_POLICY §3)” | — |
| B5 | 해소 | CONFLICT §3: “§4의 0번 확정 규칙” | — |
| B6 | 해소 | DATABASE_SCHEMA §4: “SECURITY_MODEL §5 ‘백업’ 행” | — |
| C1 | 해소 | COLLABORATION 메타에서 `UNVERIFIED \| 0` 삭제 | — |
| C2 | 해소 | PHASE_MANAGEMENT 메타에서 `UNVERIFIED \| 0` 삭제 | — |
| C3 | 해소 | MATRIX §B: `research`·`codebase-design`이 “실행 관찰됨” | — |
| C4 | 부분 해소 | MATRIX §E: “Claude 측 실행 관찰 2건 … 증거는 `archive/evidence/…`” | “분류는 55행을 기준으로 집계한다. 계획 세션의 실행 증거는 archive에서 확인한다.” |
| C5 | 해소 | MATRIX §G: “설치본은 … 고정한다. 업데이트는 … 승인 후” | — |
| C6 | 부분 해소 | OPEN_ISSUES §3: “계획 수립 중 확인한 사실(…52/52…)” | §3의 과정 사실 나열을 삭제하고 “당시 확인 근거는 `archive/evidence/`를 참조한다”만 남긴다. |
| D1 | 해소 | FINAL D11: “조합별 보장 수준·자동 모드 적용값·UI 문구는 SECURITY_MODEL §2.1” | — |
| D2 | 부분 해소 | PHASE P00 7항: “입력·단언·보고서의 정본은 MASTER…” | MASTER S4에 Claude WSL2 비교, S5에 Electron 종료 후 생존, S9에 `settingSources` 영향 탐침을 명시한다. |
| D3 | 해소 | TECH_STACK §1: 대안 재서술을 제거하고 C의 위험·E1~E5를 유지 | — |
| E1 | 해소 | FINAL D18: “C4 승인 후 P00 S7 전에 … 설치” | — |
| E2 | 부분 해소 | SYSTEM §2·§3: `expose(…)`, `reconcile(…)`, 관찰 후 `SkillSelected` | AGENT_INTEGRATION §3의 “스킬” 행에도 implicit 관찰 경로를 적고, PHASE P01 T12의 최소 관찰 범위를 명시한다. |
| E3 | 해소 | ROUTING §1·§4: “명시한 허용 스킬은 … 오선택으로 보지 않는다” | — |
| E4 | 해소 | OPEN_ISSUES V34: Codex 자율 선택 신호·오탐을 P00 S7에서 실측 | — |
| E5 | 해소 | TEST-CO-06·AC-P10a-6: implicit에는 주입 이벤트를 요구하지 않음 | — |
| E6 | 해소 | PHASE P07 T3: “자율 선택 시그니처(implicit)와 명시 skill 입력(explicit)” | — |
| E7 | 반영이 새 문제를 만듦 | DATABASE_SCHEMA `skill_evidence`: “`invocation_mode` … `SkillSelected`에서 재생”; EVIDENCE §4: “필드 1~8” | “`SkillSelected` payload에 `invocation_mode`를 포함한다.” 재생 원본이 정해진 뒤에야 새 투영 열을 재생할 수 있다. |
| E8 | 부분 해소 | C4·USAGE §3은 “후보 폴더 9개”; ROUTING §2는 `brainstorming`을 Codex “미라우팅” | “CONFLICT 8행의 전체 주도 스킬은 9개다. Codex 설치 대상 8개는 `brainstorming`을 제외한 나머지 8개이며, C4에서 경로·해시를 승인한다.” 시그니처도 전체 9개와 Codex 설치 8개를 구별한다. |
| E9 | 부분 해소 | CONFLICT §3 본문은 노출 판정으로 수정됐으나 행 제목은 “라우터 vs … 자동 트리거” | 행 제목을 “`using-superpowers` 노출과 mattpocock 자동 트리거의 충돌”로 바꾸고 MASTER S7의 같은 표현도 맞춘다. |
| E10 | 해소 | MASTER S7: “Claude = Skill 도구 … Codex = `skills/list`·선택 관찰…” | — |
| F1 | 해소 | README 8번: 네 `tasks.kind`에 한해 산출물과 결합한 `LOAD_OBSERVED` 허용 | — |
| F2 | 해소 | README 지도: “3행 + 횡단 충돌 1건 … 나머지 5행” | — |
| F3 | 해소 | README 지도: “R1~R23 … V1~V35” | — |
| F4 | 부분 해소 | AC-P00-1은 S9 상태 보고서를 허용; CHECKLIST는 여전히 “P00 종료 게이트 후” | “S9 미완으로 AC-P00-9가 미통과이면, 2차 승인에서 그 예외를 사용자가 명시적으로 수용한 경우에만 P01에 진입한다.” |
| F5 | 해소 | COLLABORATION §1: “정식 경로는 앱 전용 실행기 … 사전 차단 여부는 §2.1” | — |
| F6 | 부분 해소 | SYSTEM §4: “샌드박스가 있는 조합에서만 사전 차단(Codex `workspaceWrite`…)” | “해당 OS·공급자 조합에서 S4 차단 시험에 합격한 경우에만 사전 차단으로 표시한다.” |
| F7 | 부분 해소 | OPEN_ISSUES §1에 R1~R17의 소유·시험을 기재했지만 아래 대조에서 불일치 확인 | 아래 R5·R8·R9·R12·R14·R16·R17을 바로잡는다. |

### F7 행별 Task·TEST 대조

`PHASE_BREAKDOWN` §2의 각 Phase 7항과 `TEST_STRATEGY` 표를 기준으로 확인했다. “해당 없음”은 시험 ID 누락과 구분했다.

| 위험 | 대조 결과 |
|---|---|
| R1 | 일치. P00 S5, P01 T2·T6가 데몬 기동·접속을 맡고 BG-01~04·RC-01~03이 존재한다. |
| R2 | Task 일치. P01 T10은 스키마 diff, P02 T2는 Codex 어댑터다. 출고 차단은 명명된 TEST ID 대신 시작 스모크·CI diff 조건으로 적혀 있다. |
| R3 | 일치. P02 T3·T4와 AG-06·RF-05가 인증·fault 경로를 다룬다. |
| R4 | 일치. P11a T2는 데몬 런타임 패키징, DT-01은 Windows 설치물 시험이다. |
| R5 | **표현 수정 필요.** P08a T2는 Monaco 계약이고 DT-04는 설치물 worker를 확인한다. DT-06은 Git Diff E2E이며 설치물 worker 단언은 없다. “DT-04 설치물 worker 실패 또는 DT-06 Diff 실패”로 구분한다. |
| R6 | 일치. P04 T5가 15분 만료를 맡고 BG-05·RF-02가 늦은 승인을 검사한다. |
| R7 | 일치. P07 T3·T4는 증거·Verifier, CO-06은 스킬 증거 시험이다. |
| R8 | **Task 번호 보완.** P10b의 한도 UI는 T8이다. “P10b T8”로 적는다. |
| R9 | **Task·게이트 보완.** P11b의 서명·패키징은 T4·T5·T6, 생명주기는 T10이다. DT-02·03은 macOS·Linux 설치 시험이며 Windows 공개 빌드 서명 검증을 직접 단언하지 않는다. |
| R10 | 일치. P07 T1·T7과 SE-05의 격리·라우팅 제외가 맞는다. |
| R11 | 일치. P07 T1 Registry·T6 Skills 화면에 해당하며 “출고 차단 해당 없음”을 명시했다. |
| R12 | **소유 불일치.** SE-07은 악성 지침 시험이 맞지만 P10a T3은 Redaction이다. 지침 해시·신뢰 재검토·경고를 어느 Task가 구현할지 Phase 7항에 명시해야 한다. |
| R13 | 일치. P10a T1·T7과 SE-01a·SE-08·RF-01이 정책·실행기·감사를 다룬다. |
| R14 | **Task 번호 보완.** P01 T11은 경고 집행이다. P11a는 T3 수용 시험으로 특정한다. SE-08·09는 존재한다. |
| R15 | 일치. P04 T3·T4, P05 T4와 RC-04·05·06이 복구·효과·Git 상태를 검사한다. |
| R16 | **TEST ID 오류.** RC-02는 데몬 kill 뒤 복구 시험이며 자손 정리를 단언하지 않는다. 자손 0은 BG-03과 P00 S5의 단언이다. |
| R17 | **Task 범위 부족.** V32가 P10a T3을 가리키지만 Phase의 T3은 앱 Redaction만 적는다. SE-04도 앱 저널·로그·렌더러만 검사한다. T3에 CLI 자체 로그의 보존·접근 정책 점검과 사용자 고지를 추가해야 한다. |

### D2 상세: MASTER에 없는 옛 P00 정보

정리 전 PHASE P00 7항의 세 입력이 새 요약에서 빠졌고 MASTER의 해당 Task에도 없다. S4의 **Claude native 대 WSL2 비교**, S5의 **실제 창·Electron 종료 후 데몬 생존**, S9의 **`settingSources` 영향 탐침**이다. 관련 주제는 SECURITY_MODEL·AGENT_INTEGRATION에 언급되지만, P00 실행 Task의 단언으로는 내려오지 않았다.

### C6 상세: 삭제된 확인 사실 9행

Codex 설치 경로는 PRODUCT REQ-SK-10·USAGE §3, 협업 도구는 PRODUCT §15 #13, 스키마 입력은 AGENT_INTEGRATION §3·EVIDENCE §3, 당시 미설치 상태는 USAGE 메타, SDK 라이선스는 TECH_STACK, usage 필드와 `-32001`은 AGENT_INTEGRATION·EXECUTION_LIMITS, CAP 경로는 AGENT_INTEGRATION §7에 남아 있다. **`52/52` 해시 일치만 다른 활성 설계 절에 없고**, 새 OPEN §3 문단과 archive 증거에 남는다. 이는 당시 검증 기록이므로 활성 설계에서 유지할 필요는 없다.

## 3. 새 지적

| # | 판정 | 근거(파일·절·인용 ≤100자) | 남은 수정(바로 적용할 문장) |
|---|---|---|---|
| N1 | 새 끊어진 근거 참조 | PRODUCT §15 #13: “무관 프로젝트(OPEN_ISSUES_AND_RISKS §3)” | OPEN §3은 이제 도구 이름·판정 근거를 싣지 않는다. “무관 프로젝트(당시 확인 근거: `archive/evidence/`의 해당 조사 기록)”처럼 정확한 archive 문서를 가리키거나 괄호 참조를 삭제한다. |
| N2 | 잔존 공급자별 증거 모순 | CONFLICT §4: “Skill 도구 호출 블록 인용 필수”; EVIDENCE §5: “Task마다 … Skill 도구 블록 인용” | “Claude는 Skill 도구 블록, Codex는 선택 관찰·고유 절차 이벤트를 인용한다.” MASTER S7과 AC-P10a-6에 반영한 공급자별 규칙을 이 두 곳에도 적용한다. |
| N3 | 잔존 단계 순서 모순 | CONFLICT §2 UI 행·FINAL D18: `frontend-design→ui-ux-pro-max`; ROUTING §1: “디자인 체계 → UI 구현” | “UI 디자인: `ui-ux-pro-max`(초기 디자인 체계) → `frontend-design`(구현)”으로 CONFLICT·FINAL을 맞춘다. |
| N4 | 설치 수와 시그니처 수 혼용 | MASTER S7·AC-P00-6: “주도 스킬 8종 시그니처”; CONFLICT §2는 8행·고유 폴더 9개 | “Codex 설치 대상 8개와 Claude 전용 `brainstorming`을 합친 주도 스킬 9개의 시그니처를 작성한다.” 설치 수 8은 U5대로 유지한다. |

## 4. C4 준비 판정

**아래 수정 후 가능.** 특히 E7의 재생 이벤트 계약, Codex 설치 8개 명단, D2의 P00 시험 입력 세 가지, F7의 잘못 연결된 위험 행을 먼저 고쳐야 한다.