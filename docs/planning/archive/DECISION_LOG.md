# DECISION_LOG — 설계 문서에서 떼어낸 결정 이력 (2026-11-01)

설계 문서(`docs/planning/0*`)에는 확정된 내용만 남겼다. 그 결정이 어떤 선택지·입장·리뷰를 거쳐 나왔는지는 여기에 모은다. 상세 원문은 `06_codesign/REVIEW_RESOLUTION.md`(판정 66+39+55+21+35건), `06_codesign/ARCHITECTURE_DEBATE.md`(27쟁점), `codex/*/response.md`(Codex 원문), `PLANNING_STATUS.md`(STEP·호출 카운터)에 있다.

## 1. 사용자 결정 (2026-11-01)

| # | 쟁점 | 선택지 | Claude 입장 | Codex 입장 | **결정** | 설계 문서 반영 |
|---|---|---|---|---|---|---|
| U1 | 인증 모드 기본값 | (a) API key 기본 (b) 설치된 CLI 로그인 재사용(약관 자기 책임) (c) 공급자 확인 후 | (a) 권고 | (a) 권고 — API key 경로로 완성 가능하게 설계 | **(b)** — 양측 권고 미채택, 약관 위험은 R21로 등록 | ADR-0007 ACCEPTED, FINAL D20, TECH_STACK, AGENT_INTEGRATION 인증 행, UI 첫 실행 |
| U2 | MVP-Core 백그라운드 지속 | (a) 독립 데몬 생존을 MVP-Core 게이트로 (b) S5 실패 시 "안전 중단·재개"로 축소 | (a) | (a) | **(a)**, S5 실패 시 재보고 | FINAL D4, MASTER 범위 축소 규칙 |
| U3 | 기준 문서 `(2)` 버전 부재 | `CLAUDE_CODE_SKILLS_SETUP.md`로 대체 | 수용 제안 | — | **수용** | 스킬 문서 출처 |
| U4 | 설치 스킬 업데이트(impeccable 4f95649→77ac20b, orca 4e2fcfe9→89f9ce0) | 업데이트 / 보류 | 보류 | — | **보류** | SKILL_COMPATIBILITY_MATRIX §G |
| U5 | Codex용 스킬 설치(`~/.codex/skills`) | 주도 8종 폴더 전체 / 38개 전부 / 보류 | 주도 8종 | 주도 스킬 우선 | **보류 — 설치 안 함**. 14:02Z 외부 생성된 52개 폴더(Claude 작업 아님, 원인 미확정)는 사용자 지시로 14:57Z 삭제, 백업 scratchpad `codex_skills_backup_20261101T145734Z`(519파일), `.system` 5개·`config.toml`·`AGENTS.md` 미수정 | FINAL D18, USAGE/ROUTING/CONFLICT, MASTER S7, PHASE P00·P07 |
| U6 | 동시 수정 단위 | 프로젝트당 1 / worktree당 1 | MVP-Core 프로젝트당 1 → V1 worktree당 1 | 동의 | **수용** | FINAL D14, EXECUTION_LIMITS |
| U7 | 선행 설치 | 없음(TS만); 네이티브 빌드 도구는 P00 S6에서 필요 시 | 동의 | 동의 | **수용**, C3 별도 승인 | TECH_STACK, CHECKLIST C3 |
| U8 | 자동 권한 모드 | (a) 금지 (b) 프로젝트별 옵트인 전 선택지 + 안전 기본값 + 정직한 보장 표시 (b-제한) 격리 실측 조합(Codex sandbox/WSL2)에서만 자동 수정, Claude native Windows는 읽기·참석 (c) 전면 허용 | (b) | (b-제한) — Claude native Windows 자동 모드는 사전 강제 보장이 없어 제품 보장으로 쓸 수 없음 | **(c)** — 기본은 안전 모드(Claude `default`, Codex `on-request`), 사용자가 모든 공급자·OS·격리 조합에서 자동 모드를 켤 수 있음. 양측 비권고 선택. S4 격리 게이트는 차단 → 경고 배지 + 활성 시 1회 확인(`capabilities.isolation_warning`). R20 Critical 유지 | FINAL D11·D13, SECURITY §2.1·§7, AGENT_INTEGRATION, PRODUCT REQ-CAP-02, UI, MASTER, PHASE S4·P01 T11, AC-P00-7b·P01-6·P02-6, TEST-SE-08/09 |
| U9 | Codex `CODEX_HOME` 공유 vs 분리 | (a) 사용자 것 공유 기본 + 격리 옵션 (b) 분리만 (c) 프로젝트별 선택, 기본 분리 | (a) — 기능 상속이 사용자 기대의 핵심 | (c) — 공유 홈은 사용자 `notify` hook·`mcp_servers`·플러그인·세션 목록을 앱 run에 노출 | **(a)** — 공유 기본, 격리는 프로젝트별 옵션. 공통 의무(유효 설정 스냅숏·앱 소유 스레드 필터·`config.toml` 미수정) 유지. MCP 보장 수준은 공유 기본 POLICY_ONLY / 격리 옵션 조건부 ENFORCED | FINAL D19, SECURITY §2.1 MCP·§6, AGENT_INTEGRATION MCP 행·CAP-09, PRODUCT REQ-CAP-09 |
| C5 | P00 실호출 상한 | 횟수 상한 / 없음 | 공급자별 30회 제안 | — | **없음(보고만)** | MASTER P00 보고, CHECKLIST |
| C7 | 개발 저장소 | 로컬만 / private / public | 로컬만 제안 | — | **public GitHub + 커밋마다 push + CI**(구현 착수 시). 첫 push 전 민감 정보 점검(R22): 홈 경로·사용자명, 지시서 전문, Codex 원문·thread id, settings 키 | CHECKLIST, PHASE P00 선행, R22 |
| 일괄 | A1~A5(아키텍처·릴리스 범위·Phase 순서·미해결 리뷰 확인·최대 통과 원칙), C1·C2·C6·C8, D1~D6 | 수용 / 개별 검토 | — | — | **전부 수용**. D1은 "merge/deploy 금지, push는 C7 허용", D6은 "경고 + 1회 확인"으로 조정 | CHECKLIST |

승인 범위: 1차 승인 = P00(스파이크 S1a~S9)까지. P01 이후는 P00 보고서 11건 + R10 조치분(Codex 미재검증)의 재검증 후 2차 승인. C3(빌드 도구)·C9(MCP 도구 서버 범위)는 S6·S9 결과 후 별도 승인.

### 1.1 추가 결정 (2026-11-02)

| # | 쟁점 | 선택지 | 결정 | 반영 |
|---|---|---|---|---|
| U10 | 스킬 선택 주체 | (a) 에이전트 자율 선택 기본 + 앱 노출 필터·증거 검증·명시 override (b) 자율 선택 + 앱 권장 힌트 (c) 앱 Router 자동 분석 유지(기존 "명시 호출 우선") | **(a)**. 제품 Router와 Agent Studio 개발 세션(REQ-DEV-03) 둘 다 적용. 사용자 `/name`은 항상 우선 | ROUTING §1·§2·§3·§4, PRODUCT REQ-SK-04·DEV-02·DEV-03, EVIDENCE §2·§3·§4, CONFLICT §3·§4, MATRIX, USAGE §0·§3, MASTER 제약·S7, PHASE §1·P00·P07, AC-P00-6·P07-1, CHECKLIST D2, R23, README |
| U5 재결정 | Codex용 스킬 설치 | 주도 8종 설치 / 앱 주입만 / 스킬 없이 | **주도 스킬 8종 폴더 전체 설치** — U10으로 Codex 자율 선택에 설치본이 필요. PLAN ONLY 기간에는 설치하지 않고 구현 착수 시 CHECKLIST C4 승인 후 P00 S7 전 수행 | CHECKLIST C4, USAGE §3, MASTER S7, FINAL 메타 |

## 2. 양측 입장 변경 기록

| 주체 | 변경 | 라운드 |
|---|---|---|
| Codex | Electron Forge → electron-builder | R2-1 |
| Codex | 에이전트 호출 30분 → 20분 | R2-3 |
| Claude | Electron 내장 Node로 데몬 실행 → 동봉 Node 우선 비교(runAsNode 보류) | R2-1 |
| Claude | `tool_call` 별도 이벤트 → `item_started{kind}` | R2-2 |
| Claude | "모든 외부 효과가 승인 경로 통과" → 다층 방어·앱 실행기 | R2-2 |
| Claude | 승인 보류 24h → 15분 후 BLOCKED(approval_expired) | R2-3 |
| Claude | 동시 수정 worktree당 1 → MVP-Core 프로젝트당 1 | R2-3 |
| Claude | lease 60/15 → 90/20 | R2-2 |
| Claude | Zustand 즉시 채택 → 후결정 | R2-1 |
| Claude | 권한 모드 `default` 고정·자동 모드 금지 → 런타임 선택지 전부 노출 + 안전 기본값 + 옵트인 | 2차 사용자 요청 |
| Claude | Codex 별도 `CODEX_HOME` 프로필 → 사용자 `CODEX_HOME` 공유 기본 | 2차 사용자 요청 |
| Claude | 스킬 증거 2등급(LOADED_ONLY/VERIFIED) → 4등급 | R4B-10 |
| Claude | git 조회 Shell 소유 → 데몬 `GitReadService` | R4A-04 |
| Claude | Renderer 직접 WS(토큰 미노출 모순) → main 중계 단기 토큰 → R6A-08로 재폐기 | R4A-05 |
| Claude | 공통 이벤트 8종 → 10종(승인·질문·elicitation 분리) | R4B-09 |
| Claude | `turn/completed.usage` → `thread/tokenUsage/updated` | R4B-08 |
| Claude | MVP(Windows) → MVP-Core 명명, 핵심 UX 게이트 = V1 | R4C-09 |
| Claude | P00 S1 단일 → S1a/b/c 분할, S7 충돌 실험 8쌍×2 → 4쌍×1 | R4C-17 |
| Claude | 비정상 종료 시 "lease 유지 중 1회 재기동 → 판정" → "실행 차단 → 효과 평가 → 판정" | R4B-02 |
| Claude | Renderer 단기 토큰 직접 WS → main IPC 릴레이만(CSP `connect-src 'none'`) | R6A-08 |
| Claude | Codex 자동 모드 `never\|on-failure` → `never`만; 허용 값은 설치본 v2 스키마 `untrusted/on-request/never/granular`(Codex R6의 `onRequest` 표기는 스키마와 불일치 → 미채택) | R6B-02, B4 |
| Claude | "불가 판정 없음" → S9 `supported/conditional/unsupported` 판정 허용 | R6A-04 |
| Claude | U8·U9 기본 제안 단독 제시 → Codex 권고와 병기해 사용자 결정 | R6C-01·02 |
| 사용자 | U1 (b)·U5 보류·U8 (c)·U9 (a) 결정 | 2026-11-01 |

## 3. 리뷰 라운드 요약 (상세: `06_codesign/REVIEW_RESOLUTION.md`)

| 라운드 | Codex 세션 | 건수 | 결과 |
|---|---|---|---|
| R4 독립 리뷰(3 세션) | B1·B2·B3 | 66(Critical 5·High 29·Medium 29·Low 3) | §1~§3 판정, R5 반영 |
| R6 재검토(3 세션 resume) | B1·B2·B3 | 원 66 재판정 + 신규 39(ACCEPTED 33·PARTIALLY 2·NO_ACTION 4) | §6, R7 반영. 사실 오류 정정: v2 `AskForApproval`에 `on-failure` 없음 |
| B4 독립 재검증 | B4 | 72(확인 29·불충분 43) + 신규 R7-01~12 | §9, R8 반영. 설치본 생성 스키마로 `on-request` 철자 확정 |
| B5 독립 재검증 | B5 | 55(확인 44·불충분 11) + 신규 R8-01~10 | §11, R9 반영 |
| B6 독립 최종 검증 | B6 | R9 21(확인 17·불충분 4) + 결정 반영 일관성 R10-01~14 | §13, R10 반영. **R10 조치분은 Codex 미재검증** |

Codex 호출: 계획 15/15(R0 스모크, R1 제안, R2×3 토론, R4×3 리뷰, R6×3 재검토, B4, B5, B6) + 정리 작업 예산 6회(C1~, `codex/C*`).

## 4. 완료된 승인 체크리스트 (원본: 정리 전 `IMPLEMENTATION_APPROVAL_CHECKLIST.md`, 커밋 `1ff4372`)

- A1~A5 계획 수용: 아키텍처 D1~D28, MVP-Core/V1/V2 범위, Phase 순서·P00 스파이크 9개, 리뷰 미해결 항목 확인, "최대 통과 + 3단 보충" 원칙.
- B 사용자 결정: 위 §1.
- C 환경 승인: C1 프로젝트 로컬 npm 설치, C2 테스트 저장소 `spikes/fixtures/sample-node-repo`, C4 Codex 스킬 설치 없음(U5), C5 상한 없음, C6 `~/.claude/skills` 무변경, C7 public 저장소, C8 S9 탐침이 사용자 `CODEX_HOME`을 읽기 전용으로 사용. **미결: C3, C9**.
- D 안전 장치: D1 자동 merge/deploy 금지(push는 C7), D2 매 Task 주도 스킬 호출·증거, D3 교차 리뷰, D4 P00 실패는 사용자 재보고, D5 개발 세션은 자동 모드 미사용, D6 S4 불합격은 경고 + 1회 확인.
- 승인 기록: 사용자, 2026-11-01(AskUserQuestion 응답).

## 5. 계획 범위 밖 환경 변경 기록

- `~/.claude/settings.json`에 `remoteControlAtStartup: true` 추가(사용자 명시 지시, 12:48Z). 백업 scratchpad.
- `~/.codex/skills`에 14:02Z 후보 52개 폴더 외부 생성, `config.toml`·`AGENTS.md` 변경 감지(Claude 작업 아님, 원인 미확정; Codex Desktop 조작 가능성) → U5 결정으로 52개 삭제(백업), 나머지 미수정.
- 삭제된 Codex 스킬 백업은 세션 scratchpad에 있어 보존이 필요하면 이동해야 한다.

## 6. 정리 작업 기록 (2026-11-02)

### 6.1 정리 기준 — Codex C1 합의 (`codex/C1_cleanup_criteria/response.md`)

| # | Claude 초안 | Codex 판정 | 합의 결과(적용 규칙) |
|---|---|---|---|
| 1 | 리뷰·라운드 표식(`R4B-23`, `STEP 11`, 검증 경로 문구) 제거 | 동의 | 제거. 표식 뒤에 붙은 시험 사전조건·실패 처리는 현행 설계로 유지 |
| 2 | 결정 과정 서술(입장 변경 표, OPEN_ISSUES §1·§1.1, CHECKLIST 완료 항목) → DECISION_LOG | 동의 | 본 문서 §1~§4로 이동. 설계 문서에는 선택 결과만 사실로 서술 |
| 3 | 메타 행을 `상태`만 남김 | 수정 | `참조 출처`·`UNVERIFIED 항목 수`·`Codex 검증 경로` 제거. `요구사항`·현재 설계에 필요한 참조(공식 조사 노트·스키마)는 유지. 상태는 `FINAL (2026-11-01)`, ADR은 `ACCEPTED` |
| 4 | OPEN_ISSUES §3.1 자동 집계 삭제 | 수정 | §3.1 삭제 + §3을 검증 작업 목록(활성 문서·미검증 사실·해소 Phase/Task·반영 정본 열)으로 재작성. 해소·범위 밖 항목은 미검증 수에 섞지 않음 |
| 5 | CHECKLIST는 미결 승인 + D1~D6만 | 수정 | 완료 항목은 §4로. C3·C9·2차 승인 조건·첫 push 전 점검·D1~D6 유지. C5(P00 실호출 무상한)·C7(public repo·매 커밋 push·CI)은 현행 실행 조건이라 P00 계획에도 한 줄 유지 |
| 6 | 문서 간 중복 → 단일 출처 | 수정 | 문서 역할 분리: PRODUCT=무엇, 설계 문서=어떻게, AC=어떤 증거, TEST·RECOVERY_TEST=시험 입력·기대. 추적 링크에서 ID·수치가 반복되는 것은 중복이 아님. `ARCHITECTURE_COMPARISON`은 TECH_STACK §1에 짧은 비교(점수 미인용)로 통합, 원본은 `archive/06_codesign/` |
| 7 | 과정 상태 메모 제거, 조건은 유지 | 수정 | 보장 수준을 결정하는 `UNVERIFIED`는 셀에 유지(SECURITY §2.1 등). "Codex 미재검증" 같은 과정 상태만 제거 |
| 8 | `evidence/spikes` 미래 경로 재지정 | 동의 | 스파이크 보고서 `docs/spikes/S*.md`, 충돌 실험 `docs/spikes/skill_conflict_experiments/`. `archive/evidence/`는 계획 당시 증거로만 참조 |
| 9 | — | Codex 추가 | 낡은 제목·링크·도식 수정: ADR-0007 파일명·제목("MVP 기본 API key") 변경, TECH_STACK §3 완료된 미결 제거, COMPARISON의 Renderer 직접 WS 그림은 복사하지 않음, RECOVERY_TEST_PLAN 마지막 절 번호 정정, OPEN_ISSUES 제목 "위험·미검증 작업"(파일명 유지) |
| 10 | — | Codex 추가 | ADR의 기술적 재검토 조건은 이력이 아니므로 유지 |

Codex가 추가로 지정한 삭제 금지 항목: 조건부 보장의 사전조건(S1c·S4 실측, MCP·Hook 제외), 불확실 시 처리(`capture_confidence` 기본 `uncertain`, `unverifiable` 자동 처리 금지, 만료 승인 재사용 금지), CAP 판정 축 구분(`supported/conditional/unsupported` vs 발견→기동→실행→산출물), 설치·공개 실행 경계(U5 예외, C5, C7, R22 점검), 작은 수치(변경 파일 ≤2, 1,000 delta/s·p95 100ms, Monaco p95 200ms, 토큰 임시 기본값, 저널 180일), 보안·데이터 경계(CLI 자격증명 미복사, `text_enc` 백업, CSP 문자열, `CODEX_HOME` 스냅숏), 추적성(REQ→Phase→AC→TEST, R→Task→출고 차단, UNVERIFIED→실측 Task→정본).

### 6.2 정리에서 archive로만 남긴 내용

- `ARCHITECTURE_COMPARISON.md`(12기준 점수 51/60·47/60, B1/B2 해석 차이, E1~E5) → `06_codesign/ARCHITECTURE_COMPARISON.md`. 비교 요지는 TECH_STACK §1.
- `PRODUCT_REQUIREMENTS` §15 "누락·모순·위험 분석" 해결 과정표(당시 제안·해소 라운드) → 커밋 `1ff4372` 원문. 현행 규칙만 §15에 남김.
- `FINAL_ARCHITECTURE_DECISIONS` §2 입장 변경 표 → 본 문서 §2.
- ADR-0007 원 제목 "인증 모드를 공급자별 1급 설정으로, MVP 기본 API key"(원 제안 (a) API key 기본) → 파일명 `ADR-0007-인증-모드-CLI-로그인-재사용-기본.md`로 변경.
- `SKILL_EXECUTION_EVIDENCE_SPEC` 구 등급명 대응 메모(`LOADED_ONLY`→`INJECTION_ACCEPTED`, `VERIFIED`→`APPLIED_VERIFIED`) 삭제. 현행 4등급명만 사용.
- `SKILL_COMPATIBILITY_MATRIX` §G의 U4 업데이트 제안(impeccable 4f95649→77ac20b, orca 4e2fcfe9→89f9ce0 비교) → 보류 결과만 남김(§1 U4).
- `DEVELOPMENT_SKILL_USAGE_PLAN` §4 계획 수립 중 스킬 호출 선례표 → `evidence/PLANNING_SKILL_LOG.md` 한 줄 참조.
- `IMPLEMENTATION_APPROVAL_CHECKLIST` A(계획 승인)·B(사용자 결정 표)·E(승인 기록) → 본 문서 §1·§4. 남은 것은 C3·C9·2차 승인·첫 push 전 점검·D1~D6.
- `OPEN_ISSUES_AND_RISKS` §1(결정 대상)·§1.1(결정 이력) → 본 문서 §1; §3.1 자동 집계(26문서 115건 grep 표) 삭제; §3 문서별 UNVERIFIED 표를 활성 문서 기준 검증 작업 목록(V1~V33)으로 재작성; archive 문서(RESEARCH_*, 초안, Codex 응답)의 UNVERIFIED 집계는 그 문서에만 남김.
- `PHASE_BREAKDOWN` §2.1 "분할 Phase 18항목 보완 확인" 검산표(전 Phase 18/18, R8 보완 내역) 삭제. P00 Task 상세는 MASTER로 일원화.
- `MASTER_IMPLEMENTATION_PLAN` "Self-Review 결과" 5항목 삭제. 기록: PRODUCT 14영역 전부 Phase 매핑(REQ-PH-07·SM-09·WS-08·11·SK-09는 V2, REQ-OPS-06→P10a T6, REQ-PM-03→P06); P00 Task 전부 실패 테스트→구현→통과→기록→커밋 구조; 인터페이스 이름 일치 확인; Review Focus 5건 TEST-RF-01~05 연결.
- U5 관련 이력(2026-11-01 14:02Z `~/.codex/skills`에 52개 폴더 외부 생성 → 14:57Z 삭제·백업 `codex_skills_backup_20261101T145734Z`)은 §5에 기록, 설계 문서에서는 제거.

### 6.3 Codex C2 전체 검토 반영 (2026-11-02, `codex/C2_full_review/response.md`)

판정 "수정 후 수용"(Critical 5·High 13·Medium 11·Low 4). 반영: A1 2차 승인 입력에 Codex 독립 재검증 결과 복원; B1~B6 절 참조 수정(§5 5번, §1 2번, §4 0번, SECURITY §5 백업, EVIDENCE §8→ROUTING §3); C1~C6 메타 `UNVERIFIED | 0` 삭제, MATRIX "계획 중 적용"·실행 검증 집계·U4 커밋 비교 삭제, OPEN_ISSUES §3을 한 문단으로 축약; D1 FINAL D11 축약(정본 SECURITY §2.1), D2 PHASE P00 7항 요약(정본 MASTER), D3 TECH_STACK §1 대안 재서술 삭제; E1 D18을 U5 재결정으로 정정, E2 SYSTEM_ARCHITECTURE Router 인터페이스 `expose/reconcile`·`SkillSelected` 관찰 후 기록, E3 ROUTING §4 사용자 명시 호출 예외 행, E4 V34 신설, E5 TEST-CO-06·AC-P10a-6 implicit/explicit 분리, E6 P07 T3, E7 `skill_evidence.invocation_mode`, E8 C4·USAGE §3 후보 폴더 9개 명시 + V35, E9 CONFLICT §3·MATRIX 표현, E10 MASTER S7 Step 3 증거 인용 분리; F1 README 8번 `LOAD_OBSERVED` 예외 복원, F2·F3 README 문서 지도, F4 S9 상태 보고서 규칙(AC-P00-1·MASTER·PHASE), F5 COLLABORATION §1·F6 SYSTEM_ARCHITECTURE §4 조합별 보장으로 정정, F7 R1~R17 소유·출고 차단 열 개별화.

### 6.4 Codex C3 재확인 반영 (2026-11-02, `codex/C3_recheck/response.md`)

판정: 33건 중 해소 23 / 부분 9 / 미해소 0 / 새 문제 1(E7), 새 지적 N1~N4. 반영: C4 MATRIX §E 문구, C6 OPEN_ISSUES §3을 근거 참조 한 문단으로, D2 MASTER S4(Claude native vs WSL2 비교)·S5(Electron 종료 후 생존)·S9(a)(`settingSources`) 입력 복원, E2 AGENT_INTEGRATION §3 스킬 행·PHASE P01 T12에 implicit 경로, E7 `SkillSelected{skill_id, selection_reason, invocation_mode, expected_lead}` payload + EVIDENCE §4, E8·N4 Codex 설치 8개(주도 9개 − brainstorming) 명단·시그니처 9개, E9 "라우터 vs"→"노출 vs", F4 2차 승인 S9 예외 조건, F6 SYSTEM §4 S4 합격 조합 조건, F7 R5·R8·R9·R12·R14·R16·R17 Task·TEST 정정 + PHASE P10a T1·T3 범위 보강, N1 PRODUCT §15 #13 근거 참조, N2 CONFLICT §4·EVIDENCE §5 공급자별 증거 인용, N3 UI 순서 ui-ux-pro-max→frontend-design(CONFLICT §2·FINAL D18).

### 6.5 Codex C4 독립 검증 반영 (2026-11-02, `codex/C4_independent_verify/response.md`, 새 세션 E)

판정: 인벤토리 1,356항목 손실 0, "수정 후 수용" 14건. 반영: B1 OPEN_ISSUES §3→§2 참조 5곳, B2 `ACCEPTANCE §MVP-Core/§V1`→§1 P11a·P11b + §2 행, B3 충돌 실험 참조에 SKILL_CONFLICT_RESOLUTION 문서명, B4 기준 문서 `CLAUDE_CODE_SKILLS_SETUP.md` 사본을 `archive/evidence/`에 보관(CHECKLIST §2 공개 점검 항목 추가), B5 `SOURCES.md`→`archive/evidence/SKILL_INVENTORY.md`, C1 USAGE §4 한 줄, C2 OPEN §2 끝·§3 과정 표현 제거, C3 README "계획 당시" 제거, D1 SECURITY §5 CLI 자격증명 행을 ADR-0007과 일치, D2 §3 엄격 모드 보장 표현을 §2.1 조건부로, D3 P11a 보안 항목(내부 unsigned·해시 검증, 서명 검증은 P11b), E1 S4 테스트를 판정값 기록 방식으로(AC-P00-7b와 정합), E2 AC-P00-2 S1c 조건부 문장, E3 P00 첫 Task를 S0(저장소 개설) 단계로 정의.

### 6.6 Codex C5 재검증 반영 (2026-11-02, `codex/C5_reverify/response.md`)

판정: 해소 11 / 부분 3 / 새 지적 7, "수정 후 수용". 반영: C1 USAGE_PLAN §4 선례 절 삭제(형식 참조는 EVIDENCE_SPEC §5), C2 OPEN_ISSUES §2 끝 문장 정리·§3 삭제·메타 범위 갱신, N1 MASTER Phase 00 서문에서 스파이크 Task와 S0 구분(S0 7단계: 점검 기록→마스킹→repo create→CI→커밋→push→CI 확인), N2 PHASE P00 7항에 S0 선행·11건은 S0 제외, N3 AC-P00-1 증거를 11개 파일로 한정, N4 2차 승인 입력에 S0 보고서 1건, N5 R22 공개 점검 대상에 기준 문서 사본, N6 새 파일 `archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md`를 커밋 ②에 포함, N7 OPEN_ISSUES 메타 U1~U10.

### 6.7 Codex C6 최종 판정 반영 (2026-11-02, `codex/C6_final_acceptance/response.md`, 예산 6/6 소진)

판정: C5 잔여 10건 중 9건 해소, N6(새 파일 커밋 포함)은 커밋 ②에서 stage로 해소. 새 지적 X1(MATRIX §E·EVIDENCE_SPEC §5·CHECKLIST D2의 "계획 세션/형식 선례" 문구 삭제)·X2(MASTER S0에 8단계 "첫 push SHA·CI 링크·결과를 `S0.md`에 추가하고 커밋·push")는 Codex가 제시한 문장을 그대로 적용했다. 추가 호출 예산이 없어 적용 후 Codex 재확인 없이 커밋했다(최종 판정 "수정 후 수용" 조건 충족).
