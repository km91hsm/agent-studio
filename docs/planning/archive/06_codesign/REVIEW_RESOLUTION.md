# REVIEW_RESOLUTION — Codex R4 리뷰 66건 판정·반영 기록 (Round 5) + R6 재검토 39건 반영 (Round 7)

| 메타 | 값 |
|---|---|
| 상태 | FINAL — R4 66건·R6 39건·B4 55건·B5 21건·B6 35건(Part A 21 + R10-01~14) 판정 반영 완료, 원문 §7·§10·§12·§14 보존. R10 조치분은 Codex 미재검증(예산 15/15 소진) |
| 입력 | `CODEX_PLAN_REVIEW.md`(R4-1 19건 R4A, R4-2 25건 R4B, R4-3 22건 R4C — 원문 바이트 보존) |
| 판정 종류 | ACCEPTED / PARTIALLY_ACCEPTED / REJECTED_WITH_RATIONALE / NEEDS_VERIFICATION |
| 집계 | ACCEPTED 59 · PARTIALLY_ACCEPTED 5 · NEEDS_VERIFICATION 2 · REJECTED 0 |
| 반영 커밋 | STEP 10 커밋(이 문서와 같은 커밋; 해시는 `PLANNING_STATUS.md` 체크포인트 표) |
| 병합된 변경 | 2차 사용자 요청(2026-11-01 12:45Z) "최대 통과 + 3단 보충"(REQ-CAP-01~09, U8, U9, R18~R20, P00 S9) — §4 |

판정 원칙: Codex 지적이 공식 소스(openai/codex `rust-v0.166.0`, Electron·Node·Monaco·SDK LICENSE)로 뒷받침되면 ACCEPTED. 지적의 전제 일부가 Claude 환경 조사로 반증되거나 범위를 조정해 수용한 경우 PARTIALLY_ACCEPTED(사유 기재). 설치 버전에서 아직 확인하지 못한 API는 NEEDS_VERIFICATION으로 두고 P00 스파이크에 배정. REJECTED는 0건 — 원문 중 사실 오인은 없었다.

## 1. R4-1 (제품·아키텍처·기술·UI/UX) — R4A-01~19

| ID | 심각도 | 판정 | 반영 문서·위치 | 처리 요지 |
|---|---|---|---|---|
| R4A-01 | High | ACCEPTED | TECH_STACK_DECISIONS §1 Gateway(Claude) 행·§2 라이선스 행 | `@anthropic-ai/claude-agent-sdk`는 Anthropic Commercial Terms(MIT 아님) 명시, Codex Apache-2.0 명시, 배포 전 조건 확인을 ADR-0007 게이트로 |
| R4A-02 | High | ACCEPTED | PRODUCT_REQUIREMENTS 머리 범례·PM/PH/SK 표, PHASE_BREAKDOWN §0, MASTER 릴리스 정의, FINAL D28 | 릴리스 열을 `MVP-Core(최소 범위)/V1(확장)`으로 분리 표기. P06·P07 의존 항목은 V1 |
| R4A-03 | High | ACCEPTED | UI_UX_SPECIFICATION §1 원칙 1, PRODUCT_REQUIREMENTS §15 #12 | 첫 실행 = 공급자별 인증 확인 + API key 설정 경로. 인증 준비된 공급자만 즉시 대화, 조용한 fallback 금지 |
| R4A-04 | High | ACCEPTED | SYSTEM_ARCHITECTURE §1 다이어그램·본문, §2 `GitReadService`, PHASE_BREAKDOWN P08a T1, FINAL D27 | Git 읽기(스냅숏·diff·충돌·blob)를 데몬 소유 서비스로 이동. Shell은 사용자 터미널만 |
| R4A-05 | High | ACCEPTED | SYSTEM_ARCHITECTURE §1 "RPC 접속 계약", §2 Shell `issueRendererToken`, §4 경계 표, P01 T2, FINAL D27 | main이 주 토큰으로 접속, Renderer는 단기(10분)·구독 전용 토큰, 쓰기 RPC는 main 경유 |
| R4A-06 | High | ACCEPTED | TECH_STACK_DECISIONS §1 터미널 행·§2 구현 가능성 행, OPEN_ISSUES §1.1 U7, CHECKLIST C3 | node-pty Windows C++ 툴체인 전제 명시, PATH에 `cl`·`msbuild` 없음 기록, S6에서 prebuilt 확인 |
| R4A-07 | Medium | ACCEPTED | PRODUCT_REQUIREMENTS REQ-MODE-01~03 | Claude Mode 디버깅·테스트, Codex Mode 코드 작성·수정·테스트·리뷰, Auto 요구사항 분석·설계 계획 문구 복원 |
| R4A-08 | Medium | ACCEPTED | PRODUCT_REQUIREMENTS REQ-REC-01~14 개별 행, REQ-UI 표 릴리스 열, REQ-DEV 적용 열 | REC 14행 개별 릴리스·Phase, UI 8행 릴리스·Phase, DEV 5행 적용 범위 |
| R4A-09 | Medium | ACCEPTED | PRODUCT_REQUIREMENTS REQ-WS-03, PHASE_BREAKDOWN P03 T7, UI §3.2 | 첨부 입력 형식·에이전트 전달 방식(Claude 블록/Codex `localImage`)·저장 위치를 명시, P03 T7(V1 이월) |
| R4A-10 | Medium | ACCEPTED | SYSTEM_ARCHITECTURE §2 AgentGateway 행, §6 `packages/protocol/gateway.ts`, P01 T9, FINAL D27 | Gateway 서명 단일 출처. `resumeRun/forkRun`을 `startRun(spec.mode)`로 통합해 AGENT_INTEGRATION §1과 일치 |
| R4A-11 | Medium | ACCEPTED | UI §3.2 탐색기 행, SYSTEM_ARCHITECTURE §1·§4 경계 표, P08a T3 | 귀속 3등급(관찰됨/실행 연결/불명). 터미널 변경은 `unknown`, 앱 관찰 변경만 `user` 확정 |
| R4A-12 | Medium | ACCEPTED | PRODUCT_REQUIREMENTS REQ-WS-05, UI §3.2 Diff 행, P08a 범위·T4 | MVP-Core "승인" = 결과 수락 + 턴 단위 전체 되돌리기. 파일 선별은 V1(P08b T5) |
| R4A-13 | Medium | ACCEPTED | UI §3.2 미리보기 행, PHASE_BREAKDOWN P08c T1 | `<webview>` 고정 철회 → `WebContentsView`/외부 연동을 V2 설계 ADR로 |
| R4A-14 | Medium | ACCEPTED | PHASE_BREAKDOWN P08a T2 | 설치물 Monaco 로딩 계약(`app://` scheme, `getWorker`, CSP `script-src 'self' app:`+`worker-src app:`, `unsafe-eval` 금지) 고정, S6 결과로 조정 |
| R4A-15 | Medium | ACCEPTED | ARCHITECTURE_COMPARISON §5 E3 | 동봉 Node / `runAsNode` 두 방식 각각 로드 시험. `electron-rebuild`는 `runAsNode` 경로에만 |
| R4A-16 | Medium | ACCEPTED | SYSTEM_ARCHITECTURE §5 OS 범위, TEST_STRATEGY TEST-BG-06~10, PHASE_BREAKDOWN P11b T10 | macOS·Linux 동등 생명주기 게이트를 V1(P11b)로 |
| R4A-17 | Medium | ACCEPTED | ARCHITECTURE_COMPARISON §1 본문·표 머리 | B1(Electron main 통합)/B2(Tauri+Rust) 분리. C 선택 근거를 점수가 아닌 필수 조건 3개 충족으로 재서술 |
| R4A-18 | Low | ACCEPTED | UI §3.2a 화면별 릴리스 노출 표 | 7화면 × MVP-Core/V1/V2 표 신설 |
| R4A-19 | Low | ACCEPTED | TECH_STACK_DECISIONS §2.1 기각 대안·되돌릴 조건 표 | Monaco·node-pty·keyring·테스트 러너·배포 포맷·서명 각 대안·기각 이유·되돌릴 조건 |

## 2. R4-2 (에이전트·상태·복구·협업·스킬) — R4B-01~25

| ID | 심각도 | 판정 | 반영 문서·위치 | 처리 요지 |
|---|---|---|---|---|
| R4B-01 | Critical | ACCEPTED | COLLABORATION_PROTOCOL 모드 표 승인 열, SKILL_COMPATIBILITY_MATRIX 29행, SECURITY_MODEL §2·§2.1, CLAUDE_INITIAL_PROPOSAL 128행 폐기 주석, FINAL D11 | "브로커는 승인 요청이 발생한 효과만 판정"으로 전면 교체. 보장 수준 표(ENFORCED/DETECTED/POLICY_ONLY). R1 원문은 폐기 표시만(기록 보존) |
| R4B-02 | Critical | ACCEPTED | SESSION_RECOVERY_DESIGN #3, FINAL §2 입장 변경 | 비정상 종료 처리 순서를 "실행 차단 → 효과 평가(§3 판정) → 판정 후 재기동"으로. 재기동은 관찰 전용 |
| R4B-03 | Critical | ACCEPTED | DATABASE_SCHEMA `effects` 열, SESSION_RECOVERY §3 | 종류별 필수 필드: `file_patch{base_blob,target_blob,patch_hash,file_mode}`, 외부 효과 `external_ref`; `unverifiable`은 자동 건너뛰기·재시도 금지 |
| R4B-04 | High | ACCEPTED | DATABASE_SCHEMA 이벤트 타입 확장·재생 불변식 | 정책·설정·요구사항·phase_deps·Registry·MCP 상태·PAUSED를 이벤트로 추가, 재생 불변식을 "이벤트 + 스냅숏 테이블 명시 목록"으로 정직하게 재정의 |
| R4B-05 | High | ACCEPTED | PHASE_MANAGEMENT_DESIGN 전이표, `packages/protocol/task-transitions.json` 단일 출처, P01 T4 | REWORK→CANCELLED, BLOCKED→CANCELLED, WAITING_APPROVAL→CANCELLED(사용자), VERIFYING→WAITING_APPROVAL/BLOCKED 추가 |
| R4B-06 | High | ACCEPTED | COLLABORATION_PROTOCOL §5 | `implementer_agent/reviewer_agent` 기록, REWORK는 동일 구현자, Manual 모드 동일 Task 양측 작업 시 리뷰어 = 제3 세션 또는 사용자 |
| R4B-07 | High | ACCEPTED | COLLABORATION_PROTOCOL 리뷰 생략 정책 | 상한 고정 ≤2 파일, 금지 범주(인증·권한·보안·실행기·마이그레이션·CI) 하드코딩, `max_files` 사용자 상향 불가 |
| R4B-08 | High | ACCEPTED | AGENT_INTEGRATION_DESIGN 사용량 행·UNVERIFIED, MASTER S1a Step 1(c), OPEN_ISSUES §4 | `turn/completed.usage` 제거 → `thread/tokenUsage/updated` 사용(증분·누적 의미는 S1a 실측) |
| R4B-09 | High | ACCEPTED | AGENT_INTEGRATION_DESIGN 공통 이벤트 10종, FINAL D10 | `approval_requested`/`user_input_requested`/`elicitation_requested` 분리, 응답 구조 각각 정의 |
| R4B-10 | High | ACCEPTED | SKILL_EXECUTION_EVIDENCE_SPEC 필드 13·판정표·완료 조건, FINAL D17 | 4등급(DISCOVERED/INJECTION_ACCEPTED/LOAD_OBSERVED/APPLIED_VERIFIED). 승격은 스킬 고유 절차 시그니처에 연결될 때만 |
| R4B-11 | High | ACCEPTED | SESSION_RECOVERY_DESIGN Checkpoint Restore | dirty 파일을 "분리 보존(stash-like 스냅숏) 후 사용자 선택" 기본, 자동 병합 금지 |
| R4B-12 | High | ACCEPTED | AGENT_INTEGRATION_DESIGN steer 실패 처리, MASTER S1b | `thread/queue/add`는 experimental opt-in 명시, 거부 시 "다음 턴 입력으로 보류" 대체, 중복 방지 규칙 |
| R4B-13 | High | PARTIALLY_ACCEPTED + NEEDS_VERIFICATION | SESSION_RECOVERY_DESIGN Fork 행·UNVERIFIED, OPEN_ISSUES §3 | 공식 SDK에 `forkSession(sessionId,{upToMessageId})`가 존재한다는 지적은 수용해 `RunSpec.forkAt`을 Claude에도 매핑. 단 **설치 버전 0.3.316에 해당 시그니처가 있는지는 미확인** → P00 S2 추가 테스트 |
| R4B-14 | High | ACCEPTED | SESSION_RECOVERY_DESIGN 판정표 6행 | "intended 없음·git 변화 없음 → 자동 재개" 삭제. 셸·스킬 스크립트·MCP 실행 중이었으면 `WAITING_APPROVAL(review)` |
| R4B-15 | High | ACCEPTED | SESSION_RECOVERY_DESIGN #11, SYSTEM_ARCHITECTURE `GitReadService.snapshot.conflicts`, RECOVERY_TEST_PLAN S20 | 충돌 신호 = `ls-files -u`·MERGE_HEAD/REBASE_HEAD 마커, 소유자 = 데몬 GitReadService. 비충돌 dirty는 별도 분류(S20) |
| R4B-16 | Medium | ACCEPTED | PHASE_MANAGEMENT_DESIGN §2 전이 규칙표 일시정지 행·§3, DATABASE_SCHEMA `tasks.paused` 열·이벤트 `PauseRequested/Paused/ResumeRequested`, SESSION_RECOVERY 일시정지 행 | 플래그 방식은 유지하되 투영 열·이벤트 3종·복구 전이(재기동 후 `paused=1`이면 다음 턴 금지)에 명시 |
| R4B-17 | Medium | ACCEPTED | EXECUTION_LIMITS_POLICY §4 시간 계산 예제, PHASE_MANAGEMENT_DESIGN §2 시계 정의, DATABASE_SCHEMA `tasks.active_ms/wait_ms` | 세 시계 `active_ms/wait_ms/turn_ms` 정의. 24시간 Task 보류 삭제 → 15분 만료로 단일화 |
| R4B-18 | Medium | ACCEPTED | SESSION_RECOVERY_DESIGN #12 세션 상태 분류 | `present/absent/inaccessible/transient_error` 4분류, 일시 오류는 재시도 후 판정 |
| R4B-19 | Medium | ACCEPTED | SESSION_RECOVERY #6, EXECUTION_LIMITS 오류 분류 | `-32001`을 네트워크 단절 신호에서 제거(서버 과부하로 재분류). stdio 전송의 단절 신호 = 프로세스 종료·EPIPE |
| R4B-20 | Medium | ACCEPTED | SKILL_COMPATIBILITY_MATRIX §D | `superpowers` 묶음 행 추가(분류 "통합", 하위 15행으로 펼침) → 55행 |
| R4B-21 | Medium | ACCEPTED | DEVELOPMENT_SKILL_ROUTING_POLICY §2 규칙 2·표, USAGE_PLAN P03 행, PHASE_BREAKDOWN P00·P03·P08b 스킬 항목 | "Task·단계당 lead 1" 규칙으로 정정, Phase 표를 단계별로 분해(디자인 체계 T0 → 구현 → 테스트 → 검증) |
| R4B-22 | Medium | ACCEPTED | ROUTING_POLICY 규칙 3·handoff 행, USAGE_PLAN P05·P09 행 | `handoff`를 lead/support 집합에서 제외, "사용자 호출 제안" 열로 분리. 라우터 필터 단일 규칙 명시 |
| R4B-23 | Medium | ACCEPTED + NEEDS_VERIFICATION | USAGE_PLAN §3 설치 방식 2 | "`display_name`만 가진 openai.yaml" 절차 철회. `SKILL.md`만 복사해 `skills/list` 발견 시험 우선. 파서 스키마는 S7에서 확인 |
| R4B-24 | Medium | PARTIALLY_ACCEPTED | USAGE_PLAN 설치 범위 행, EVIDENCE_SPEC 완료 조건, CODEX_PLAN_REVIEW §5 메모 | 완료 판정 모호성(LOAD_OBSERVED로 충분한 Task 유형 한정 열거)은 수용. "Codex 홈 확인 불가"는 Claude 환경 조사로 **확인됨**(`~/.codex/skills/.system/*` 5개만 존재) → 문구를 "검토 후보 38개 미설치 확인됨"으로 |
| R4B-25 | Low | ACCEPTED | SKILL_COMPATIBILITY_MATRIX §E | 행별 분류 1개씩 재집계(공통 18·프로젝트 7·조건부 18·통합 2·중복제외 1·미확인 0·보류 9 = 55), 상태 열은 별도 집계 |

## 3. R4-3 (보안·실행 제한·테스트·Phase·마스터플랜) — R4C-01~22

| ID | 심각도 | 판정 | 반영 문서·위치 | 처리 요지 |
|---|---|---|---|---|
| R4C-01 | Critical | ACCEPTED | SECURITY_MODEL §2·§2.1 보장 수준 표, ACCEPTANCE AC-P10a-5 재정의 | "외 경로로 실행 불가" 단언 철회 → "앱 실행기 외 경로는 DETECTED(사후 감사) 또는 POLICY_ONLY" 조합별 명시 |
| R4C-02 | Critical | ACCEPTED | ACCEPTANCE AC-P00-7b, PHASE_BREAKDOWN P00 18항·진입 조건, MASTER 범위 축소 규칙, CHECKLIST D6 | S4를 격리 게이트로. 불합격 조합은 P01 진입 시 쓰기·무인 실행 비활성화 |
| R4C-03 | High | ACCEPTED | SECURITY_MODEL §2 모드별 강제 경로 열 | 파일·명령·네트워크·MCP의 강제 경로를 Claude native / Codex sandbox / WSL2 조합별로 표기 |
| R4C-04 | High | ACCEPTED | EXECUTION_LIMITS_POLICY §1.1·§4, TEST-LIM-01·02, PHASE_MANAGEMENT_DESIGN §2 시계 | `active_ms`는 승인 요청 수신 시 정지, 응답 시 재개(턴 내부 포함). 재기동 후 저널 시각으로 복원 |
| R4C-05 | High | ACCEPTED | SECURITY_MODEL §8, EXECUTION_LIMITS §6, SESSION_RECOVERY `approval_expired` 복귀 | 복귀 시 효과 원장 `assess` → 완료 효과 제외한 잔여만 새 run·새 승인 요청으로 |
| R4C-06 | High | ACCEPTED | TEST_STRATEGY SE-01a/01b | SE-01a: 기본 DENY에서 `git push` 시도 → 거부·감사 기록. SE-01b: 정책 ASK로 바꾼 프로젝트에서 승인 왕복 |
| R4C-07 | High | ACCEPTED | TEST_STRATEGY 전면 재작성 | 35개 시나리오 전부 환경·사전조건·입력·예상·실패 처리·증거 6필드 기입 |
| R4C-08 | High | ACCEPTED | TEST_STRATEGY §1 의무 실호출 표 | 녹화 재생은 어댑터 파싱·전이에 한정. 승인 콜백·무승인 쓰기·OS 격리·스킬 로드·중단은 설치 버전 실호출 의무 |
| R4C-09 | High | ACCEPTED | MASTER 릴리스 정의·Global Constraints, PHASE_BREAKDOWN §0, ACCEPTANCE, FINAL D28 | "MVP-Core(단독 에이전트 검증판)" 명명. 핵심 사용자 경험 완성 게이트 = V1 |
| R4C-10 | High | ACCEPTED | ACCEPTANCE AC-P10a-6, MASTER Global Constraints, EVIDENCE_SPEC 완료 조건, P01 T3 | P07 이전은 수동 증거 프로토콜(`SkillSelected` 저널 + Skill 도구 블록 인용 + 산출물), 관찰 이벤트 타입은 P01에서 |
| R4C-11 | High | ACCEPTED | PHASE_BREAKDOWN P08a 선행(P05)·P09 범위(순차형 Manual)·§3 DAG | 상세 선행과 DAG 통일(불일치 시 상세를 고침). P09 Manual 비교 뷰는 순차형, 병렬 비교는 P10b T1 이후 T5b |
| R4C-12 | High | ACCEPTED | MASTER S1a Step 1 | `readOnly`+`on-request`에서 "파일 미변경 AND 승인 요청 ≥1" 단언; `workspaceWrite` 자동 쓰기는 별도 테스트에서 단언 없이 기록 |
| R4C-13 | High | ACCEPTED | TEST_STRATEGY TEST-BG-01~10, ACCEPTANCE AC-P11a, PHASE_BREAKDOWN P11a·P11b | 수용 시험 5개를 개별 TEST-ID·증거로, mac/Linux 반복은 BG-06~10(V1) |
| R4C-14 | Medium | ACCEPTED | EXECUTION_LIMITS_POLICY 근거 열·§1.1 조정 규칙 | 9행 각 근거, 프로젝트/일/작업 규모별 조정 규칙, 토큰 임시 한도(3M/30M/300M) |
| R4C-15 | Medium | ACCEPTED | TEST_STRATEGY TEST-RF-01~05, MASTER Review Focus | 5건 각 TEST-ID·소유 Task·AC 연결 |
| R4C-16 | Medium | PARTIALLY_ACCEPTED | PHASE_BREAKDOWN P08b·P10b·P11b·P12·P08c·P11c 분리, §2.1 보완 확인표 | 묶음 Phase를 6개로 분리해 18항목 기입. 단 일부 항목(모듈·복구)은 "해당 없음"을 명시하는 방식으로 채움 — 모든 Phase에 동일 깊이의 서술을 두지는 않음 |
| R4C-17 | Medium | PARTIALLY_ACCEPTED | PHASE_BREAKDOWN P00 S1a/b/c·S7, MASTER S1a/S1b/S1c·S7, SKILL_CONFLICT_RESOLUTION §4.0 | S1을 3단계로 분할(S1a 통과가 선행), S7 충돌 실험 8쌍×2회 → 핵심 4쌍×1회. S2 범위는 유지(권한 모드 기록 테스트 1개 추가가 2차 요청으로 필요) |
| R4C-18 | Medium | ACCEPTED | ACCEPTANCE AC-P00-1~9(판정표 포함), AC-V2-1~4 분할 | 보고서 존재가 아닌 pass/fail 판정표가 증거. V2 묶음 AC를 4개로 분할 |
| R4C-19 | Medium | ACCEPTED | OPEN_ISSUES §2 R19·R20(Critical 관리), SECURITY_MODEL §10 | 일반 모드 고위험 효과 우회·자동 모드 옵트인을 Critical 위험으로 등록 |
| R4C-20 | Medium | ACCEPTED | OPEN_ISSUES §1(실제 결정만)·§1.1 결정 이력, CHECKLIST B표 | U2·U6·U7을 "합의 확인"으로 분리, 영향 열 전부 기입 |
| R4C-21 | Medium | ACCEPTED | TEST_STRATEGY SE-06a/06b·SE-08·SE-09 | 외부 접근 시험을 RPC 무토큰 + 프로젝트 외부 파일 + 미등록 호스트 + 외부 서비스 전송으로 확장 |
| R4C-22 | Medium | ACCEPTED | RECOVERY_TEST_PLAN §2.6 추적표 | TEST-RC-01~07 ↔ RC-S01~S21 대응표 |

## 4. 2차 사용자 요청 병합 (R4 외 변경 — R6 검토 대상)

| 변경 | 문서 | 내용 |
|---|---|---|
| 설계 원칙 D26 | FINAL_ARCHITECTURE_DECISIONS, AGENT_INTEGRATION §7, PRODUCT_REQUIREMENTS §13A | **최대 통과 + 3단 보충**: 런타임 통과 → 앱 MCP 도구 서버 → LLM 스크립트. 불가 판정 없음 |
| REQ-CAP-01~09 | PRODUCT_REQUIREMENTS §13A | 플랜 모드·자동 권한 모드(옵트인)·문서 읽기·문서 생성·이미지 생성·브라우저·컴퓨터 사용·앱 MCP 도구 서버·`CODEX_HOME` 공유 |
| D11 개정(U8) | FINAL D11, MASTER Global Constraints, SECURITY_MODEL §8, UI 권한 모드 선택·배지 | 권한 모드 전 선택지 노출, 기본 안전 모드, 자동 모드 옵트인 + 앱 실행기·사후 감사 유지. Agent Studio 개발 세션은 기본 모드만(CHECKLIST D5) |
| D19 개정(U9) | FINAL D19, AGENT_INTEGRATION MCP 행, PHASE_BREAKDOWN P07 | Codex `CODEX_HOME` 공유 기본, 분리 프로필은 격리 옵션 |
| P00 S9 | PHASE_BREAKDOWN P00, MASTER Task S9, ACCEPTANCE AC-P00-9 | 기능 상속 탐침 6항목, CAP 실측표 산출 |
| 위험 R18~R20 | OPEN_ISSUES §2 | Desktop 전용 기능 소실(High), 일반 모드 우회(Critical), 자동 모드 옵트인(Critical) |
| 체크리스트 | IMPLEMENTATION_APPROVAL_CHECKLIST A5·U8·U9·C8·C9·D5·D6 | 사용자 결정·승인 항목 추가 |
| 범위 외 | `~/.claude/settings.json` `remoteControlAtStartup:true` | 사용자 명시 지시(계획 산출물 아님). `PLANNING_STATUS.md` 2차 요청 절에 기록. `~/.claude/skills`·`~/.codex/config.toml` 무변경 |

## 5. R6 재검토 요청 범위

1. 66건 각 판정의 타당성 — 특히 PARTIALLY_ACCEPTED 5건(R4B-13·24, R4C-16·17)과 NEEDS_VERIFICATION 2건(R4B-13·23)의 P00 배정이 적절한지.
2. §4의 2차 요청 변경이 R4B-01·R4C-01·03·19(승인 경계·보장 수준)와 모순 없이 성립하는지 — 자동 권한 모드 옵트인(U8-b)과 `CODEX_HOME` 공유(U9-a)가 보안 모델을 어디까지 약화시키는지 독립 평가.
3. 수정 과정에서 새로 생긴 불일치(문서 간 ID·이름·릴리스 열) 탐지.
4. 미해결 Critical/High 잔존 여부. 잔존 시 "사용자 결정 대기"로 표시할 항목 지정.

## 6. R6 재검토 판정 반영 (Round 7 수정 패스)

R6 3건(호출 10~12, R4 세션 B1/B2/B3 resume)의 판정은 Codex 원문(§7)을 그대로 따른다. 아래 표의 "R6 판정" 열은 Codex가 쓴 값이고 "R7 조치" 열만 Claude가 쓴다.

| 라운드 | thread | 시각(UTC) | exit | 원 지적 판정(RESOLVED/PARTIAL/NOT/NEW_ISSUE) | 신규 지적 |
|---|---|---|---|---|---|
| R6-1 제품·아키텍처·기술·UI/UX | `<thread-id>` | 13:26:35~13:33:07 | 0 | 13/6/0/0 | 10건 {'Low': 1, 'High': 6, 'Medium': 3} |
| R6-2 에이전트·상태·복구·협업·스킬 | `<thread-id>` | 13:26:35~13:35:28 | 0 | 12/11/1/1 | 15건 {'High': 6, 'Medium': 8, 'Critical': 1} |
| R6-3 보안·실행 제한·테스트·Phase·마스터플랜 | `<thread-id>` | 13:26:35~13:32:37 | 0 | 0/16/0/0 | 10건 {'High': 4, 'Medium': 6} |

### 6.1 원 지적 66건 — R6 판정과 R7 조치

| 원 ID | R6 판정(Codex) | R7 조치(Claude) |
|---|---|---|
| R4A-01 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-02 | PARTIALLY_RESOLVED | 릴리스 열 전수 정규화(MVP→MVP-Core, '제품 MVP'는 V1 설명으로 유지), REQ-SK-01 V1(P07)로 정정 |
| R4A-03 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-04 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-05 | PARTIALLY_RESOLVED | Renderer 직접 WS 전부 삭제 → main IPC 릴레이(SYSTEM_ARCH 다이어그램·접속 계약·§3·§4, D27) |
| R4A-06 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-07 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-08 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-09 | PARTIALLY_RESOLVED | REQ-WS-03 소유 P08b T6 + AC-P08b-3 신설 |
| R4A-10 | PARTIALLY_RESOLVED | `respond(requestId, answer)` 단일 서명으로 §1 코드 블록·SYSTEM_ARCH 표·ADR-0006 통일 |
| R4A-11 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-12 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-13 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-14 | PARTIALLY_RESOLVED | CSP 단일 정의 = SECURITY §7, AC-P01-4 바이트 일치·AC-P00-5/P08a-2 worker 시험 연결 |
| R4A-15 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-16 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-17 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4A-18 | PARTIALLY_RESOLVED | UI §3.2a Skills·Planning V1 범위 구체화, V2 기능에 P12 T4·P11c T4 연결 |
| R4A-19 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-01 | PARTIALLY_RESOLVED | ROUTING·USAGE·MATRIX·CONFLICT 잔존 5곳 '차단/대체' 문구 → 판정+보장 수준 참조로 교체 |
| R4B-02 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-03 | PARTIALLY_RESOLVED | `CaptureConfidenceChanged` 이벤트·`agent_runs.capture_confidence` 추가, 복구 판정표에 기계 판정 행 |
| R4B-04 | PARTIALLY_RESOLVED | 투영 대응표를 P01 T3 산출물 `projections.md`로 지정, RC-S16·S19가 기준 |
| R4B-05 | PARTIALLY_RESOLVED | `*→` 와일드카드 2행을 명시 상태 집합으로 한정, `task-transitions.json`은 P01 T4 산출물임을 명시 |
| R4B-06 | PARTIALLY_RESOLVED | Manual 선택 시 사용자 생략에도 생략 금지 범주·`capture_confidence=uncertain` 적용 |
| R4B-07 | PARTIALLY_RESOLVED | 리뷰 생략 조건 (c)에 `capture_confidence=complete` 추가 |
| R4B-08 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-09 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-10 | PARTIALLY_RESOLVED | 시그니처 스키마·작성자·저장 위치·판정 알고리즘을 EVIDENCE_SPEC에 정의 |
| R4B-11 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-12 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-13 | PARTIALLY_RESOLVED | NEEDS_VERIFICATION 유지(P00 S2 typings·실호출) |
| R4B-14 | PARTIALLY_RESOLVED | 복구 판정표: 기본값 `uncertain`, 파일 도구만 관찰 시 `complete` |
| R4B-15 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-16 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-17 | NOT_RESOLVED | AGENT_INTEGRATION 승인 흐름 24h 경로 삭제 → 15분 즉시 BLOCKED(approval_expired) |
| R4B-18 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-19 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-20 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-21 | PARTIALLY_RESOLVED | ROUTING에 단계 순서 규칙 명시(P09·P12·P08c·P11c 스킬 열 단계 표기) |
| R4B-22 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4B-23 | RESOLVED_BUT_NEW_ISSUE | 스킬 폴더 전체 복사로 변경(USAGE_PLAN, PHASE P07) |
| R4B-24 | PARTIALLY_RESOLVED | `tasks.kind` enum = {plan, research, prototype, impl, review, verify, replan}, LOAD_OBSERVED 충분 kind 닫힌 목록 |
| R4B-25 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4C-01 | NOT_RESOLVED | SECURITY §2.1 셀마다 집행자·관찰·시험 명시, 엄격 모드 '조건부 ENFORCED', 상단 결론·AC-P10a-5 사전조건 재정의 |
| R4C-02 | PARTIALLY_RESOLVED | P01 T11 capability 차단 Task + AC-P01-2 신설 |
| R4C-03 | PARTIALLY_RESOLVED | §2.1 표 재작성(입증 못한 셀 UNVERIFIED/POLICY_ONLY), 자동 모드는 별도 열이 아니라 적용 규칙 |
| R4C-04 | PARTIALLY_RESOLVED | TEST-LIM-05 신설, §4 활성 중 재기동 보수 가산·`time_uncertain`, 단조/wall-clock 역할 분리 |
| R4C-05 | PARTIALLY_RESOLVED | TEST-RC-S22 신설 + MVP-Core 게이트·AC-P05-2 포함 |
| R4C-06 | PARTIALLY_RESOLVED | SE-01a 엄격/일반 분리(01a'), SE-01b 정책 전이 사전조건 |
| R4C-07 | PARTIALLY_RESOLVED | AG-02·DT-03·DT-07 6필드 구체화 |
| R4C-08 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4C-09 | RESOLVED_BUT_NEW_ISSUE | 전 문서 MVP→MVP-Core 정규화(보존본·evidence 제외) |
| R4C-10 | PARTIALLY_RESOLVED | AC-P10a-6 공급자별 수동 증거 입력·판정자·보관 위치, P01 T12 관찰자 최소 구현 |
| R4C-11 | PARTIALLY_RESOLVED | P09 비교를 패치 대상 한정 + dirty 스냅숏 보존 + `compare_blocked` 보류, T5b 정의 |
| R4C-12 | PARTIALLY_RESOLVED | S1a Step 1 재정정(무단 변경 0 필수, 승인 요청은 관찰, 자동 쓰기 감사 포착 단언) |
| R4C-13 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4C-14 | PARTIALLY_RESOLVED | EXECUTION_LIMITS 근거 '설계 가설' 표시, TEST-LIM-04 작성 |
| R4C-15 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4C-16 | PARTIALLY_RESOLVED | §2.1 표를 실제 체크 결과로 교체, P12/P08c/P11c 누락 항목 기입 |
| R4C-17 | PARTIALLY_RESOLVED | 출고 위험 2주 + S9 1주 분리, S7 packages/protocol·CI → P01 T10 |
| R4C-18 | PARTIALLY_RESOLVED | AC-P00-6 4행 확정·4행 잠정, S9 미지원 항목 V1 AC(AC-V1-5~7) 분리 |
| R4C-19 | PARTIALLY_RESOLVED | OPEN_ISSUES R19·R20 소유 Task·출고 차단 조건 열 추가, SECURITY §10 R20 행 |
| R4C-20 | RESOLVED | 해결 확인 — 추가 조치 없음 |
| R4C-21 | PARTIALLY_RESOLVED | SE-07/08 모드별 예상값·로컬 수신 서버·대상별 전후 상태 신호 |
| R4C-22 | PARTIALLY_RESOLVED | AC-P05-2 목록 = RECOVERY §4(S20·S22 추가) |

집계: RESOLVED 29 · PARTIALLY_RESOLVED 33 · NOT_RESOLVED 2 · RESOLVED_BUT_NEW_ISSUE 2. PARTIALLY/NOT/NEW_ISSUE 전부에 R7 조치를 기재했다.

### 6.2 신규 지적 39건 — 판정과 조치

| ID | 심각도(Codex) | 판정(Claude) | 조치 |
|---|---|---|---|
| R6A-01 | Low | NO_ACTION | 문제 없음(Codex 판정) |
| R6A-02 | High | ACCEPTED | CAP-02·AC-P02-6·MASTER에 `dontAsk` 추가, 배지 문구 '사전 차단 보장 없음'(UI §, SECURITY §8) |
| R6A-03 | High | ACCEPTED | CAP 표 1단 표기를 S9 전 conditional로, 판정 규칙 §7 추가 |
| R6A-04 | High | ACCEPTED | D26·§13A '불가 판정 없음' → supported/conditional/unsupported 판정 허용 |
| R6A-05 | High | ACCEPTED | R18 확장(유효 설정 스냅숏·변경 감지), AGENT_INTEGRATION MCP 행 의무 절차 |
| R6A-06 | High | ACCEPTED | AC-P00-2·AGENT_INTEGRATION §6을 PHASE/MASTER 분할(S1b=제어·세션, S1c=쓰기 범위·보류)로 통일 |
| R6A-07 | Medium | ACCEPTED | P09 T5b 정의 + AC-P09-4, P06/P07 선행 MVP-Core |
| R6A-08 | High | ACCEPTED | Renderer 직접 WS 삭제 → main IPC 릴레이, CSP `connect-src 'none'` 유지(D27 개정) |
| R6A-09 | Medium | ACCEPTED | AC-P08b-2(base 해시 불일치 Save 거부) 신설, RF-04·P08b 참조 정정 |
| R6A-10 | Medium | ACCEPTED | CAP-06 자동화 연계 V1 P10b T9, P08c는 미리보기만; PH-07→P12 T4, SK-09→P11c T4 |
| R6B-01 | — | NO_ACTION | 문제 없음(Codex 판정) |
| R6B-02 | High | ACCEPTED | `on-failure` 전부 제거, v2 값 `untrusted/onRequest/granular/never` 명시(AGENT_INTEGRATION·PRODUCT·MASTER·SECURITY·AC-P02-6), config/CLI 표기와 구분 |
| R6B-03 | Medium | ACCEPTED | CAP-03 내장(supported)과 플러그인(conditional) 분리 |
| R6B-04 | Medium | ACCEPTED | CAP-04 양쪽 conditional, 산출물 재열기 검증 |
| R6B-05 | Medium | ACCEPTED | CAP-05 `imagegen` 존재 ≠ headless 호출, conditional |
| R6B-06 | Medium | ACCEPTED | CAP-06 `--chrome` 플래그 확인만, 헤드리스 호출 conditional |
| R6B-07 | — | NO_ACTION | 문제 없음(Codex 판정) |
| R6B-08 | — | NO_ACTION | 문제 없음(Codex 판정) |
| R6B-09 | High | ACCEPTED | CAP-09 행을 §7 표에 추가 |
| R6B-10 | Critical | ACCEPTED | D11·R20·SECURITY 결론 정정: 앱 실행기는 '정식 경로'이며 자동 모드에서 우회 사전 차단 불가를 명시; U8 범위는 사용자 결정 |
| R6B-11 | High | ACCEPTED | `sessions/agent_runs.app_owned` + 기본 목록 앱 소유 필터, 공유 홈 의무 절차 |
| R6B-12 | High | ACCEPTED | 3단 설치는 의존성 설치 영역(승인), 산출물 증거 행을 EVIDENCE_SPEC에 추가 |
| R6B-13 | High | ACCEPTED | DATABASE_SCHEMA 이벤트 목록에 4종 추가, SESSION_RECOVERY #11 `stderr_digest` |
| R6B-14 | Medium | ACCEPTED | R4B-17과 동일 수정 |
| R6B-15 | Medium | ACCEPTED | USAGE_PLAN `LOADED_ONLY` → `INJECTION_ACCEPTED` |
| R6B-16 | Medium | ACCEPTED | CONFLICT 표 '3회 반복' → 1회(§4.0과 일치) |
| R6B-17 | Medium | ACCEPTED | ROUTING 필터를 매트릭스 enum 기준 포함 목록으로 재정의 + P07 T2 단언 |
| R6B-18 | High | ACCEPTED | `pending_inputs` text_masked·hash·expires_at, 앱 입력 분류·마스킹·만료 |
| R6C-01 | Critical | PARTIALLY_ACCEPTED | §2.1 자동 모드 적용값(브로커 집행자 제거 → Claude native Windows 전 영역 POLICY_ONLY) 반영, UI 비노출 기본. **(b-제한) 채택 여부는 사용자 결정 U8**(Claude 제안 (b)와 병기) |
| R6C-02 | High | PARTIALLY_ACCEPTED | 공유 시 의무 절차·MCP 영역 보장 수준 반영. **분리 기본(c) 채택 여부는 사용자 결정 U9**(Claude 제안 (a)와 병기) |
| R6C-03 | High | ACCEPTED | CAP-07 입력 제어는 앱 MCP 서버 전용 capability, 3단 스크립트 금지, 캡처·입력 분리 승인, TEST-SE-10·AC-V1-7 |
| R6C-04 | Medium | ACCEPTED | S9를 결정 게이트로 재정의(AC-P00-9: 판정 완료 + 경로 확정이 통과), 기능 실현은 V1 AC |
| R6C-05 | High | ACCEPTED | AC-P02-3 재정의: 옵트인 없는 주입만 거부, danger* 플래그는 항상 거부; AC-P02-6 옵트인 값만 전달 |
| R6C-06 | High | ACCEPTED | AC-P00-6 4행 확정 + 4행 잠정 |
| R6C-07 | Medium | ACCEPTED | TEST-SE 구 ID 참조 갱신(PHASE P01·P10a·P04, AC-P10a-1·P01-4/5), TEST-LIM-04·05·SE-10·RC-S22 작성 |
| R6C-08 | Medium | ACCEPTED | '11영역' → 14행(SECURITY §2 제목·UI·D12·SYSTEM_ARCH·AGENT_INTEGRATION), MVP 정규화 |
| R6C-09 | Medium | ACCEPTED | AC-P00-1 11건, S1a→(S1b∥S1c) 표기 통일 |
| R6C-10 | Medium | ACCEPTED | AC-P05-2·RECOVERY §4에 S20·S22 |
| R6C-11 | Medium | ACCEPTED | SECURITY §6과 D19를 '기본 상속(POLICY_ONLY) + 격리 옵션(ENFORCED)'으로 통일 |

집계: {'NO_ACTION': 4, 'ACCEPTED': 33, 'PARTIALLY_ACCEPTED': 2}. REJECTED 0. PARTIALLY_ACCEPTED 2건(R6C-01·02)은 Codex 권고의 기술적 근거를 수용해 문서에 반영했으나 **기본값 선택은 양측 불일치로 사용자 결정(U8·U9)**으로 남긴다(지시서: 합의 실패 항목은 사용자 결정 대상).

### 6.3 사실 오류 정정

- **(R8 추가) 철자 정정**: R6에서 Codex가 제시한 v2 값 `onRequest`는 설치본 생성 스키마와 다르다. 정본은 `on-request`(§9.3). R7에서 적용한 `onRequest`는 R8에서 전부 `on-request`로 되돌렸다.
- Codex `approvalPolicy` 값 `on-failure`는 app-server v2 `AskForApproval`(rust-v0.166.0 `v2/shared.rs`)에 존재하지 않는다(R6B-02). 이전 라운드 문서의 `on-failure` 표기는 Claude의 오류였고 전부 제거했다. config.toml/CLI `approval_policy`(kebab-case `on-request`, 공식 config-reference는 `on-failure`를 deprecated로 기재 — `evidence/research/RESEARCH_AGENT_GATEWAY.md`)와 app-server v2 JSON(camelCase `onRequest`)은 다른 표면이며 문서는 표면별로 표기한다.

### 6.4 R7에서 사용자 결정으로 남긴 항목

| ID | Claude 제안 | Codex 권고(R6) | 결정 전 기본 동작 |
|---|---|---|---|
| U8 자동 권한 모드 | (b) 프로젝트별 옵트인 전 선택지 + 정직한 POLICY_ONLY 표시 | (b-제한) S4 합격 Codex sandbox / WSL2·VM Claude에서만 자동 수정, Claude native Windows는 읽기·참석(R6C-01, R6B-10) | (b-제한) — Claude native Windows 자동 모드 UI 비노출 |
| U9 `CODEX_HOME` | (a) 공유 기본 + 격리 옵션 | (c) 프로젝트별 선택, 기본 분리 + 공유 시 유효 설정 열거·승인(R6C-02, R6B-11, R6A-05) | **분리 프로필**(R8 단일화) — 어느 쪽이든 유효 설정 스냅숏·앱 소유 스레드 필터·`config.toml` 미수정은 의무 |

## 7. R6 Codex 응답 원문 보존 (response.md 바이트 일치, Claude 가공 없음)

## 7.1 원문 — R6_rereview_1 (제품·아키텍처·기술·UI/UX) · thread `<thread-id>` · 2026-11-01T13:26:35Z~2026-11-01T13:33:07Z · exit 0

### 요약

**원 지적 19건: 해결 13 / 부분 해결 6 / 미해결 0. 신규 문제 9건.** 잔존 **High 있음**, Critical은 이번 범위에서 새로 확정하지 않았다. 특히 `MVP-Core` 표기, Renderer 접속 경계, Gateway 서명이 아직 문서 전체에서 일치하지 않는다. 2차 요청의 기능 상속은 유용한 조사 방향이지만, 일부 CAP 행은 헤드리스에서의 *발견*을 *실행 가능*으로 앞서 표기했다. 아래 판정은 현재 디스크의 문구를 기준으로 한다.

### 원 지적 재검토

| 원 ID | 판정(RESOLVED/PARTIALLY_RESOLVED/NOT_RESOLVED/RESOLVED_BUT_NEW_ISSUE) | 현재 문서·위치 | 근거 인용 | 잔여 조치 |
|---|---|---|---|---|
| R4A-01 | RESOLVED | [TECH_STACK_DECISIONS §1·2](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:22) | “**Anthropic Commercial Terms** … MIT 아님”, “공개 배포 전 … 조건 확인 게이트”. [SDK LICENSE](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/LICENSE.md)와 일치한다. | 배포 조건의 실제 판정은 U1·ADR-0007에서 수행. |
| R4A-02 | PARTIALLY_RESOLVED | [PRODUCT_REQUIREMENTS 범례·SK 표](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:11), [PHASE_BREAKDOWN P01](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:66) | 범례는 `MVP-Core`를 정의했으나 **41개 REQ 행**에 여전히 plain `MVP`가 남는다. `REQ-SK-01`의 “Registry 스캔·해시만, P01 T3”도 P01 T3의 실제 작업인 “Journal … 스킬 관찰 이벤트 타입”과 다르다. | 41행을 Core/V1 기준으로 정규화하고 SK-01의 실제 구현 Phase를 맞출 것. |
| R4A-03 | RESOLVED | [UI §1](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:13), [PRODUCT REQ-UI-01](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:197) | “공급자별 인증 상태”, “API key면 키 입력 경로”, “인증이 준비된 공급자만 … 즉시 대화”. | U1 결정 뒤 기본 흐름 확정. |
| R4A-04 | RESOLVED | [SYSTEM_ARCHITECTURE §1·2](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:52), [P08a T1](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:84) | “Git 읽기 … 데몬 소유 `GitReadService`”, T1에 snapshot·diff·충돌 마커·blob 해시가 있다. | 구현 시 Shell 부재 시험. |
| R4A-05 | PARTIALLY_RESOLVED | [SYSTEM_ARCHITECTURE RPC 계약](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:54)·[§4](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:89) | 계약은 **main 발급 중계, 10분, 읽기·구독 한정, 쓰기는 main 경유, 재연결 시 재발급**을 정의했다. 그러나 §4는 아직 “Renderer ↔ 데몬 \| localhost WS, **1회성 토큰(키링)**”이라 주 토큰을 Renderer가 가진다는 해석을 남긴다. §3도 “Renderer → RPC `task.submit`”으로 쓰기 경유를 생략한다. | §3·§4를 계약과 동일하게 수정. CSP 문제는 R6A-08 참조. |
| R4A-06 | RESOLVED | [TECH_STACK §1·2](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:20) | “node-pty는 Windows C++ 컴파일러·SDK 전제”, “PATH에 `cl`·`msbuild` 없음”, S6 확인으로 바뀌었다. [node-pty README](https://github.com/microsoft/node-pty/blob/main/README.md)의 빌드 전제와 맞는다. | 툴체인 실재·prebuilt 로드는 P00에서 확인. |
| R4A-07 | RESOLVED | [PRODUCT MODE 표](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:29) | Claude “디버깅 및 테스트”, Codex “코드 작성·수정·테스트 및 코드 리뷰”, Auto “요구사항 분석·설계 및 구현 계획”이 명시됐다. | 없음. |
| R4A-08 | RESOLVED | [PRODUCT REC·DEV·UI 표](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:152) | `REQ-REC-01`~`14`가 개별 행이고 UI에는 “릴리스·Phase”, DEV에는 “공통 게이트” 적용 열이 있다. | 릴리스 명칭의 전체 정규화는 R4A-02에 남음. |
| R4A-09 | PARTIALLY_RESOLVED | [PRODUCT REQ-WS-03](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:103), [P03 T7](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:78) | 형식·전달·저장 위치는 적혔다. 하지만 T7은 MVP-Core 이전 P03 안에서 “**V1 이월**”이라고만 하며, V1 Phase의 Task로 다시 배정되지 않았다. | P08b 또는 다른 V1 Phase에 T7의 소유·AC를 명시. |
| R4A-10 | PARTIALLY_RESOLVED | [SYSTEM §2](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:60), [AGENT_INTEGRATION §1](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:12) | `capabilities`, `startRun`, `listSessions`, `readSession`, `runId`, `sessionRef`, `events`, `steer`, `interrupt`, `close`는 대응한다. **시스템의 `respond(requestId, answer)`와 통합 설계의 `respondApproval(requestId, decision)`는 다르다.** `RunSpec`도 시스템 표에는 일부 필드만 축약돼 있다. | 응답 메서드 이름·인자 타입을 단일 서명으로 맞추고 두 문서가 그 서명만 인용. |
| R4A-11 | RESOLVED | [SYSTEM §1](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:52), [UI §3.2](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:42) | 터미널 변경은 `actor=unknown`; UI는 “관찰된 Diff / 실행과 연결됨 / 작성자 불명”을 표시한다. | 없음. |
| R4A-12 | RESOLVED | [PRODUCT REQ-WS-05](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:105), [UI Diff 행](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:44) | MVP-Core “Diff 보기 + 턴 단위 전체 되돌리기”, V1 “파일 선별”; 결과 수락과 실행 승인을 구분했다. P08a T4·P08b T5에도 배정됐다. | 없음. |
| R4A-13 | RESOLVED | [UI 미리보기 행](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:47), [P08c](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:111) | `<webview>` 고정을 철회하고 `WebContentsView`/외부 브라우저를 V2 ADR에서 결정한다. 이는 [Electron의 `<webview>` 비권장 안내](https://www.electronjs.org/docs/latest/api/webview-tag)에 맞는다. | 없음. |
| R4A-14 | PARTIALLY_RESOLVED | [P08a T2](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:84), [SECURITY_MODEL §7](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:114) | P08a는 `app://`·`getWorker`·`script-src 'self' app:`·`worker-src app:`을 지정한다. 보안 문서의 정식 CSP는 `script-src 'self'; worker-src 'self'; connect-src 'none'`이다. 같은 `app://` origin이면 `'self'`로 worker가 허용될 수 있으나 host·URL 계약이 없어 **UNVERIFIED**다. `webviewTag:false`는 `WebContentsView` 선택과 충돌하지 않는다. | CSP를 한 곳에서 정의하고 같은 origin의 설치물 worker 시험을 AC로 연결. |
| R4A-15 | RESOLVED | [ARCHITECTURE_COMPARISON E3](D:/LLM/agent-studio/docs/planning/01_architecture/ARCHITECTURE_COMPARISON.md:81) | 동봉 Node와 `runAsNode`를 각각 시험하고 “`electron-rebuild`는 `runAsNode` 경로에만 적용”이라고 고쳤다. | 실제 재빌드 필요성은 P00 결과로 판정. |
| R4A-16 | RESOLVED | [SYSTEM §5](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:102), [P11b T10](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:105) | macOS·Linux 설치물에서 창·앱 종료, 재접속, 자손 정리를 `TEST-BG-06~10`으로 반복한다. | 없음. |
| R4A-17 | RESOLVED | [ARCHITECTURE_COMPARISON §1·3](D:/LLM/agent-studio/docs/planning/01_architecture/ARCHITECTURE_COMPARISON.md:18) | “B1 … B2 … 분리해 읽어야 한다”, “점수 합계만으로 영향 없음을 주장하지 않는다”로 바뀌었다. 표 머리도 B1/B2를 표시한다. | 없음. |
| R4A-18 | PARTIALLY_RESOLVED | [UI §3.2a](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:50) | 7개 화면의 릴리스 표는 생겼다. 다만 Skills & MCP의 V1은 “**전부**”인데 같은 행 V2가 “업데이트·롤백”이고, Project Planning V2 “재계획 Diff”의 구현 Task도 불명확하다. | “전부”를 V1 범위로 한정하고 V2 기능에 Task를 연결. |
| R4A-19 | RESOLVED | [TECH_STACK §2.1](D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:52) | Monaco·node-pty·keyring·테스트·배포·서명마다 대안, 기각 이유, 되돌릴 조건이 생겼다. | 없음. |

**Plain `MVP` 잔존 41개:** `REQ-GOAL-01·02·03·05·06`; `REQ-SM-01·02·03·05·06·07·10·11·13`; `REQ-CE-06·07·08·10·11`; `REQ-WS-01·02·09·13`; `REQ-OPS-01·03·04·05`; `REQ-STATE-01~04`; `REQ-REC-15`; `REQ-SEC-01·02·03·05·06`; `REQ-LIM-01~04`. `REQ-GOAL-01`과 `REQ-SEC-02`는 V1을 함께 쓰지만 첫 단계가 여전히 plain `MVP`다. 중복된 REQ-ID는 발견되지 않았다.

### 2차 요청 변경 평가 (REQ-CAP·D11·D19·D26)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R6A-01 | Low | [PRODUCT §13A](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:212) | **문제 없음 — CAP-01의 대체 경로 표기.** | Claude `plan`과 Codex `readOnly`+`on-request`를 각각 적어 동일 API라고 주장하지 않는다. | P00에서 실제 쓰기 차단과 UI 명칭만 확인. |
| R6A-02 | High | [FINAL D11](D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:23), [AGENT_INTEGRATION 권한 행](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:54), [UI §7](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:108) | “런타임 전 모드 노출”과 실제 선택지·경고가 다르다. | Claude 목록은 `plan/default/acceptEdits/auto/bypassPermissions`로, [공식 SDK 변경 기록](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md)에 등장하는 `dontAsk`가 빠졌다. UI 경고는 파일 변경만 말하며 원격 명령·전송의 사전 승인 보장 감소를 설명하지 않는다. PRODUCT/UI에 옛 “자동 모드 금지” 문장은 찾지 못했으나 통합 설계의 고정 `turn/start{approvalPolicy:"on-request"}`와 P02의 “샌드박스 옵션 고정”은 모드 선택 반영 방법을 흐린다. | 지원 모드별 동작·보장 수준을 capability 기반으로 표시하고, 프로젝트 옵트인 화면에 감소하는 보장을 구체적으로 적을 것. |
| R6A-03 | High | [PRODUCT CAP-03~07](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:214), [P00 S9](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:62) | 1단 기능 상속의 표시가 검증 범위를 앞선다. | CAP-03은 PDF·이미지 읽기를 `MVP-Core` 1단으로, CAP-04·06은 Desktop 번들 기능을 1단으로 제시한다. S9는 주로 `skills/list` 노출·기동 여부를 본다. **목록 발견은 헤드리스 호출·결과 생성의 증거가 아니다.** [OpenAI 플러그인 공식 설명](https://developers.openai.com/plugins/concepts/plugins)는 기능이 surface별로 다를 수 있다고 명시한다. CAP-04·05에는 UNVERIFIED가 있으나 CAP-03 Codex와 CAP-06 Codex 행에는 부족하다. | 각 CAP를 `발견/기동/실제 작업/산출물`로 시험하고 그 전에는 경로를 조건부·UNVERIFIED로 표시. |
| R6A-04 | High | [FINAL D26](D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:38), [PRODUCT §13A](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:208) | “어떤 기능도 불가능으로 닫지 않음”은 설계 원칙을 능력 보증처럼 만든다. | CAP-05 이미지 생성은 공급자 API·인증이 필요하고, CAP-07 컴퓨터 사용의 2단 OS 입력 제어는 P00 S9가 검증하지 않는다. 3단 LLM 스크립트도 라이브러리·OS 권한·서비스가 없으면 대체할 수 없다. | `supported/conditional/unsupported` 판정을 허용하고, 2단 도구 서버 자체의 OS별 실행 시험을 별도 게이트로 둬라. |
| R6A-05 | High | [FINAL D19](D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:31), [OPEN_ISSUES R18](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:50) | 공유 `CODEX_HOME`의 설정 변동·플러그인 hook 영향이 R18에 잡히지 않았다. | R18은 “Desktop 전용 기능 소실”만 다룬다. 공유 홈은 사용자 설정·MCP·플러그인 변경을 데몬 실행에도 반영할 수 있다. [OpenAI 플러그인 문서](https://developers.openai.com/plugins/build/plugins)는 사용자·프로젝트 설정 우선순위와 플러그인 lifecycle hook을 설명한다. 현재 문서는 `config.toml` 미수정만 보장한다. | 시작 시 유효 설정·플러그인·hook의 스냅숏과 변경 감지, 실행별 출처 표시, 격리 프로필 전환 조건을 위험표와 UI에 추가. |

### 신규 발견 (수정으로 생긴 불일치)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R6A-06 | High | [PHASE P00](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:51), [AC-P00-2](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:15), [AGENT_INTEGRATION §6](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:111) | S1b/S1c의 시험 소유가 뒤바뀌었다. | Phase는 **S1b=steer·interrupt·resume·fork**, **S1c=자동 쓰기·승인 보류**다. AC와 통합 설계는 **S1b=자동 쓰기**, **S1c=steer·fork**라고 적는다. | Phase·MASTER·AC·통합 설계의 S1a/b/c 범위를 하나로 통일. |
| R6A-07 | Medium | [PHASE P09·DAG](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:96) | `P09 T5b`는 참조되지만 정의된 Task가 없다. P06·P07의 선행 조건도 “MVP”로 남았다. | P09 Task 목록은 T1~T6이며 DAG는 “P10b T1 → **P09 T5b**”를 요구한다. P06·P07 §4는 “선행: **MVP**”다. | T5b를 실제 V1 Task·AC로 정의하고 선행을 `MVP-Core`로 고쳐라. |
| R6A-08 | High | [SYSTEM RPC 계약](D:/LLM/agent-studio/docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md:54), [SECURITY_MODEL §7](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:114), [MASTER Constraints](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:23) | Renderer의 구독 전용 **직접 WebSocket**과 전역 `connect-src 'none'`가 충돌한다. | [CSP `connect-src` 명세](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)는 WebSocket을 통제한다. `webviewTag:false`는 문제없고, [Electron custom protocol](https://www.electronjs.org/docs/latest/api/protocol/)의 `standard`·`secure` 설정도 방향은 맞다. | Renderer WS를 유지한다면 정확한 loopback `ws:` 대상만 CSP에 허용하거나, 구독까지 main 프록시로 옮겨 `connect-src 'none'`을 유지. |
| R6A-09 | Medium | [P08b AC](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:99), [AC-P08b-1](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:84) | AC-ID는 존재하지만 참조한 판정 내용이 다르다. | Phase는 “`AC-P08b-1`(**해시 불일치 Save 거부**)”라고 하고 실제 AC는 “편집·저장 `actor=user` 저널, 에이전트가 PTY에 접근 불가”다. 검색한 **명시적 AC-ID는 모두 존재**했으나 이 의미 불일치는 남는다. | 해시 충돌 거부를 AC에 추가하거나 별도 ID를 만들고 Phase 참조를 교정. |
| R6A-10 | Medium | [PRODUCT CAP-06·PH-07·SK-09](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:216), [UI §3.2a](D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:56), [PHASE P12·P08c](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:108) | 릴리스와 Task가 엇갈린다. | CAP-06은 **V1**인데 P08c가 이를 V2 REQ로 다시 소유한다. `PH-07`·`SK-09`는 **V2**로 P12 REQ에만 있고, P12 T1~T3에는 변경 영향 분석·재계획 및 스킬 업데이트·롤백 Task가 없다. UI는 Project Planning “V2 재계획 Diff”를 약속한다. | CAP-06의 V1 자동화 연계와 V2 미리보기를 분리하고, PH-07·SK-09에 V2 Task·AC를 배정. |

### 사용자 결정 대기로 표시할 항목

- **U1 (High):** 공급자별 기본 인증 방식. 첫 실행 UX와 Claude SDK 배포 조건의 실제 판정에 필요하다.
- **U8 (High):** 자동 권한 모드의 제품 허용 범위. 문서의 경고·보장 수준을 먼저 고친 뒤 선택지를 제시해야 한다.
- **U9 (High):** 공유 `CODEX_HOME` 기본값 여부. R6A-05의 설정·hook 변동 위험과 격리 옵션을 반영한 선택이 필요하다.

R4A-02·05 및 R6A-06·08 같은 **문서 간 불일치는 사용자 결정을 기다릴 사안이 아니다.** 작성자가 우선 수정할 수 있다.

### UNVERIFIED

- 헤드리스 `codex app-server`에서 Desktop 번들 플러그인이 목록에 보이는 수준을 넘어 실제 호출·산출까지 작동하는지.
- 현재 설치된 Claude SDK 0.3.316에서 `auto`를 포함한 모드 전환, synced 스킬 및 `--chrome` 상당 경로가 실제 작동하는지.
- CAP-07·08의 화면 입력·브라우저 연계가 3 OS에서 앱 MCP 도구 서버로 구현·승인·복구 가능한지.
- `app://`의 최종 host와 Monaco worker URL이 동일 origin으로 묶이고, 설치물의 정식 CSP에서 worker가 로드되는지.
- 공유 `CODEX_HOME`의 사용자 설정·플러그인 변경이 진행 중 데몬 run에 어느 시점부터 반영되는지.

## 7.2 원문 — R6_rereview_2 (에이전트·상태·복구·협업·스킬) · thread `<thread-id>` · 2026-11-01T13:26:35Z~2026-11-01T13:35:28Z · exit 0

### 요약

원 지적 25건을 현재 파일로 재판정한 결과 **해결 12건, 부분 해결 11건, 미해결 1건, 해결됐으나 신규 문제 발생 1건**입니다.  
2차 요청과 수정본에서 별도 결함 **15건**을 발견했습니다. 잔존 **Critical·High 있음**: 자동 권한 모드의 집행 보증, 미기록 효과의 복구, 존재하지 않는 Codex `on-failure` 값이 핵심입니다.  
검토는 읽기 전용으로 수행했으며, 해결 기록의 `ACCEPTED`는 판정 근거로 사용하지 않았습니다.

### 원 지적 재검토

| 원 ID | 판정 | 현재 문서·위치 | 근거 인용 | 잔여 조치 |
|---|---|---|---|---|
| R4B-01 | PARTIALLY_RESOLVED | [COLLABORATION_PROTOCOL](/D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md:19), [ROUTING_POLICY](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:60) | “승인 요청이 발생한 효과만”은 정확해졌으나 “전역 설치, push 등 … ApprovalBroker가 차단”은 무승인 셸 실행까지 차단하는 듯하다. | 아래 잔존 문구 전부 수정하고 집행 수준을 모드별로 표시. |
| R4B-02 | RESOLVED | [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:58) | #3 “프로세스 종료 확정·실행 경로 봉쇄 → §3 평가 → 판정표”. | 없음. |
| R4B-03 | PARTIALLY_RESOLVED | [DATABASE_SCHEMA](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:63) | `base_blob, target_blob, patch_hash, file_mode, external_ref, verify_json` 선언. 단일 파일의 3분기는 계산 가능하나 미기록 효과까지 증명하지 못한다. | 효과 포착 범위와 파일 유형별 판정 규칙 명시. |
| R4B-04 | PARTIALLY_RESOLVED | [DATABASE_SCHEMA](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:42) | “모든 투영 열은 … 이벤트 … 에서만”이라는 불변식과 재생 시험은 생겼다. 그러나 `sessions.title/last_seen_at`, `agent_runs.ended_at/turns` 등의 갱신 payload 계약은 없다. | 투영 열별 생산 이벤트·필드를 대응시키기. |
| R4B-05 | PARTIALLY_RESOLVED | [PHASE_MANAGEMENT](/D:/LLM/agent-studio/docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md:80) | 요청한 취소·차단 전이는 표에 있다. 그러나 “`task-transitions.json` … 하나로 고정”이라면서 해당 파일은 현재 디스크에 없고 다이어그램도 수기 문서다. `*→WAITING_APPROVAL`은 `BLOCKED`까지 허용하는 듯하다. | 파일 생성·생성기·CI 대조 구현, 와일드카드 범위 한정. |
| R4B-06 | PARTIALLY_RESOLVED | [COLLABORATION_PROTOCOL](/D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md:72) | “Auto·Manual 모든 모드, REWORK 포함”과 동일 구현자 재작업은 명확하다. Manual의 `ReviewSkipped{reason:user_policy}`에는 위험 범주 제한이 연결되지 않았다. | 사용자 생략도 §5.5 금지 범주를 적용하거나 명시적 예외 정책 정의. |
| R4B-07 | PARTIALLY_RESOLVED | [COLLABORATION_PROTOCOL](/D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md:76) | 정책 생략은 “변경 파일 ≤2”, 금지 범주, 테스트를 둔다. 단 “`effects` 원장에 외부 효과 … 없음”은 미포착 효과가 없다는 증거가 아니다. | 효과 포착 불확실 시 생략 금지; Manual 우회도 동일 제한. |
| R4B-08 | RESOLVED | [AGENT_INTEGRATION](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:42) | “`thread/tokenUsage/updated`”; “`turn/completed`에는 `usage` 필드가 없음”. [공식 프로토콜](https://raw.githubusercontent.com/openai/codex/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/common.rs)과 일치. | 증분·누적 의미는 S1a 실측. |
| R4B-09 | RESOLVED | [AGENT_INTEGRATION](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:39) | `approval_requested`, `user_input_requested`, `mcp_elicitation_requested`가 별도 행·응답으로 분리됐다. [공식 요청 목록](https://raw.githubusercontent.com/openai/codex/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/common.rs)과 맞는다. | 없음. |
| R4B-10 | PARTIALLY_RESOLVED | [EVIDENCE_SPEC](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:46) | “고유 절차 시그니처(Registry에 등록: 기대 산출물 패턴·순서)”라고 하나 작성자·버전·저장 필드·판정 알고리즘이 없다. | 시그니처 스키마와 검토 주체 정의. |
| R4B-11 | RESOLVED | [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:17) | 현재 tree·untracked·해시 비교 후 사용자 선택, “별도 worktree”에서 시작. | 없음. |
| R4B-12 | RESOLVED | [AGENT_INTEGRATION](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:70) | `thread/queue/add`를 experimental opt-in으로 제한하고 실패 시 `PendingInputQueued`를 다음 턴에 전달한다. [0.166.0 선언](https://raw.githubusercontent.com/openai/codex/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/common.rs)과 일치. | 적용 완료 표시의 중복 방지 시험. |
| R4B-13 | PARTIALLY_RESOLVED | [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:16) | `forkSession(sessionId,{upToMessageId})` 매핑은 [Claude 공식 SDK 문서](https://code.claude.com/docs/en/agent-sdk/typescript)에 존재한다. 문서도 “0.3.316 동작 P00 확인”으로 남겼다. | 설치된 0.3.316 typings·실호출 증거 확보. |
| R4B-14 | PARTIALLY_RESOLVED | [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:46) | “효과 포착을 증명할 수 없는 실행 경로 … 진행 중이었음”이면 자동 재개 금지. 그러나 그 사실을 판정할 영속 플래그·도구 범위 원장이 없다. | 포착 불확실성을 기본값으로 두는 기계적 판정 추가. |
| R4B-15 | RESOLVED | [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:66) | `git ls-files -u`, MERGE_HEAD·rebase 마커를 데몬이 확인하고 자동 merge를 금지한다. | `GitCommandRun` 필드 불일치는 신규 발견 참조. |
| R4B-16 | RESOLVED | [DATABASE_SCHEMA](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:57), [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:76) | `tasks.paused`, 세 이벤트, 재기동 후 다음 턴 배정 금지가 명시됐다. | 없음. |
| R4B-17 | NOT_RESOLVED | [AGENT_INTEGRATION](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:88) | 승인 흐름에 여전히 “15분 초과 … Task 보류(최대 24h → BLOCKED)”가 있다. 같은 문서 :69와 상태 머신 :90은 즉시 `BLOCKED(approval_expired)`다. | 24시간 경로 삭제하고 하나의 타이머·상태로 통일. |
| R4B-18 | RESOLVED | [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:36) | `present/absent/inaccessible/transient_error` 분류, #12에서 확정 부재만 복원 제안. | 없음. |
| R4B-19 | RESOLVED | [SESSION_RECOVERY](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:61) | “`-32001`은 WebSocket ingress 과부하 … 네트워크 단절 아님.” [공식 설명](https://learn.chatgpt.com/docs/app-server)과 일치. | 없음. |
| R4B-20 | RESOLVED | [SKILL_MATRIX](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:80) | §D에 묶음 `superpowers` 1행과 폐기·통합 2행이 있다. A 15+B 17+C 20+D 3=55. | 없음. |
| R4B-21 | PARTIALLY_RESOLVED | [ROUTING_POLICY](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:12), [USAGE_PLAN](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:34) | “Task·단계당 주도 스킬 1개”와 P03 단계 분해는 명확하다. 다른 Phase 행은 복수 주도 스킬을 한 셀에 두고 단계·Task 매핑이 없다. | 전체 Phase에 동일한 단계별 표 적용. |
| R4B-22 | RESOLVED | [ROUTING_POLICY](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:40) | `handoff`는 “라우팅 없음”, “사용자 호출 제안”으로 분리됐다. | 자동 필터의 분류 값 오류는 신규 발견 참조. |
| R4B-23 | RESOLVED_BUT_NEW_ISSUE | [USAGE_PLAN](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:58) | `display_name` 단독 파일 절차는 “철회”, `agents/openai.yaml`은 선택 사항으로 정정됐다. 그러나 “`SKILL.md`만 그대로 복사”하면 참조·스크립트·자산이 빠진다. | 의존 파일까지 포함한 호환 패키지로 시험. |
| R4B-24 | PARTIALLY_RESOLVED | [EVIDENCE_SPEC](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:60) | `LOAD_OBSERVED` 허용 목록은 썼지만 `research/prototype`은 [DB의 `tasks.kind`](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:57)에 없고, “산출물 존재가 검증 근거”는 등급 의미를 흐린다. | 실제 Task kind 또는 skill ID로 닫힌 목록 정의. |
| R4B-25 | RESOLVED | [SKILL_MATRIX](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:92) | 행별 재계산: 18+7+18+2+1+0+9=55; 각 행에 분류 하나가 있다. | 없음. |

**R4B-01 문구 전수 확인:** 현행 문서에 “모든 부작용이 ApprovalBroker를 거친다”는 직접 단정은 없다. 다만 [ROUTING_POLICY:60](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:60)의 “ApprovalBroker가 차단”, [USAGE_PLAN:31](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:31)의 “앱 브로커가 대체”, [SKILL_MATRIX:52·110](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:52)의 “ApprovalBroker가 대체”(2곳), [SKILL_CONFLICT:39](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md:39)의 “설치는 어차피 ApprovalBroker 승인 대상”이 같은 보증을 암시한다. [초기 제안:128](/D:/LLM/agent-studio/docs/planning/06_codesign/CLAUDE_INITIAL_PROPOSAL.md:128)의 “모든 외부 효과…”는 취소선과 폐기 주석이 있어 **현행 주장으로 세지 않았다**.

### 2차 요청 변경 평가 (CAP 표·U8·U9·3단 위임)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R6B-01 | — | [AGENT_INTEGRATION §7 CAP-01](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:122) | **문제 없음.** Claude `plan`, Codex `readOnly` 경로는 문서상 성립한다. | [Claude 모드](https://code.claude.com/docs/en/agent-sdk/typescript), [Codex sandbox](https://learn.chatgpt.com/docs/app-server). | S9에서 설치 버전 확인. |
| R6B-02 | High | [CAP-02](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:123) | Codex `on-failure`는 0.166.0 app-server v2의 `AskForApproval` 값이 아니다. | [태그 소스](https://raw.githubusercontent.com/openai/codex/rust-v0.166.0/codex-rs/app-server-protocol/src/protocol/v2/shared.rs)는 `untrusted`, `onRequest`, `granular`, `never`만 선언한다. | CAP·SECURITY_MODEL·MASTER의 선택지에서 제거. |
| R6B-03 | Medium | [CAP-03](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:124) | 내장 파일 도구와 Desktop 번들 `pdf/documents` 플러그인의 헤드리스 가용성을 합쳐 “1단”으로 표시했다. | 행 자체가 “헤드리스 플러그인 로드 UNVERIFIED”라고 한다. | 내장 경로와 플러그인 경로를 분리해 S9 결과 전까지 후자를 조건부 표시. |
| R6B-04 | Medium | [CAP-04](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:125) | Claude synced 스킬·Codex 문서 플러그인 모두 헤드리스 로드를 입증하지 못했다. | “SDK 로드 UNVERIFIED”, S9 대기. | 1단을 확정 지원으로 표시하지 말고 실제 생성·열기 시험을 통과 조건으로. |
| R6B-05 | Medium | [CAP-05](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:126) | `imagegen` 스킬 존재와 headless `image_gen` 호출 가능성을 동일시한다. | API key 모드도 “UNVERIFIED”. | 인증 방식별 S9 실호출 전에는 1단 조건부. |
| R6B-06 | Medium | [CAP-06](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:127) | CLI `--chrome` 확인은 SDK 옵션·Desktop 브라우저 플러그인 상속의 증거가 아니다. | 행이 SDK 옵션을 UNVERIFIED로 둔다. | 공급자별 기동·도구 호출을 각각 S9에서 확인. |
| R6B-07 | — | [CAP-07](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:128) | **문제 없음.** Desktop 전제 가능성을 밝히고 2단·조건부로 둔다. | “SDK 불가 가능성 높음 → 2단”, “Desktop 앱 기동 전제 가능”. | S9 결과로 확정. |
| R6B-08 | — | [CAP-08](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:129) | **문제 없음.** 앱 MCP 서버를 구현 계획과 V1 범위로 제시한다. | “S9 결과로 범위 확정”. | 기능별 권한·감사 계약을 구현 시 명세. |
| R6B-09 | High | [AGENT_INTEGRATION §7](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:120), [PRODUCT_REQUIREMENTS](/D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:220) | 요구된 CAP-09가 §7 표에는 없다. | 표는 CAP-01~08로 끝나지만 요구사항은 “`CODEX_HOME` 공유”를 CAP-09로 둔다. | 공유의 기능·격리·세션 범위를 아홉 번째 행에 넣기. |
| R6B-10 | Critical | [AGENT_INTEGRATION](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:68), [SECURITY_MODEL §2.1](/D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:56) | U8에서 Codex `never+workspaceWrite`와 Claude `acceptEdits/bypassPermissions`는 승인 콜백을 우회한다. 셸이 허용되면 “앱 실행기만”이라는 사전 집행 보증이 성립하지 않는다. | [Claude 공식 문서](https://code.claude.com/docs/en/agent-sdk/typescript)는 자동 허용 호출이 `canUseTool`을 거치지 않는다고 명시한다. 문서의 고위험 효과 `DETECTED`도 미기록 DB·외부 서비스 변경에는 과장이다. | 엄격 모드 밖 고위험 효과를 `POLICY_ONLY` 또는 검증된 탐지 범위로 낮추고, 셸 차단·네트워크 격리의 실제 강제 경로를 명시. |
| R6B-11 | High | [AGENT_INTEGRATION](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:72), [§3](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:75) | U9 공유 홈에서 `thread/list`가 `cli`,`vscode`,`appServer`를 함께 요청한다. 사용자 기존 스레드 노출, 개인 스킬·플러그인·MCP·설정 및 `notify`/hook 실행 범위를 설계가 구분하지 않는다. | [공식 `thread/list`](https://learn.chatgpt.com/docs/app-server)는 source 필터를 제공하고, [공식 `CODEX_HOME` 설명](https://learn.chatgpt.com/docs/config-file/environment-variables)은 sessions·skills·config·auth를 공유 대상으로 든다. [설정 문서](https://learn.chatgpt.com/docs/config-file/config-advanced)는 사용자 수준 hook·`notify`를 설명한다. | 앱 소유 스레드 ID 필터, 설정·hook 사전 목록화, 격리 프로필 선택 기준과 S9 관찰 항목 추가. 실제 `notify` 발화는 UNVERIFIED. |
| R6B-12 | High | [AGENT_INTEGRATION §7](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:118), [SECURITY_MODEL](/D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:36) | 3단 LLM 스크립트는 Pillow/openpyxl 등이 없을 때 설치 승인이 필요하다. 생성 문서의 성공 기준도 스킬 증거와 별도여야 한다. | “라이브러리 설치 전제”와 “의존성 설치 ALWAYS_ASK”가 병존하며, [EVIDENCE_SPEC](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:44)는 스킬 절차 증거만 다룬다. | 설치는 앱 실행기로 별도 승인; 파일 형식 검증·재열기·렌더 검사·해시를 문서 산출물 증거로 규정. |

[OPEN_ISSUES R20](/D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:52)은 자동 모드의 사전 승인 소실을 **Critical**로 등록해 위험 자체는 인정한다. 그러나 “앱 전용 실행기 … 모드와 무관하게 승인 필요”라는 완화 문구는 셸 우회가 가능한 일반·자동 모드에서 집행 사실로 읽힌다. [SECURITY_MODEL:45](/D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:45)의 엄격 모드 한정 설명에 맞춰야 한다.

### 신규 발견 (수정으로 생긴 불일치)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R6B-13 | High | [COLLABORATION_PROTOCOL](/D:/LLM/agent-studio/docs/planning/02_agents_state/COLLABORATION_PROTOCOL.md:49), [DATABASE_SCHEMA](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:42) | `PlanArtifact/PlanReview/ReviewReport/ReworkResponse`를 “저널 이벤트”라 하지만 event type 목록에 없다. | 이름 네 개가 목록에 없음. | 이벤트로 등록하거나 `AgentEvent` payload 종류로 명시. |
| R6B-14 | Medium | [AGENT_INTEGRATION](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:88) | 오래된 24시간 승인 보류 경로가 남았다. | R4B-17 인용 참조. | :69·PHASE :90과 통일. |
| R6B-15 | Medium | [USAGE_PLAN](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:19) | 구 등급 `LOADED_ONLY`가 현행 계획에 남았다. | “skill 입력(LOADED_ONLY 상한)” 대 [EVIDENCE_SPEC:32](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:32)의 `INJECTION_ACCEPTED`. | 현행 등급으로 교체. `VERIFIED` 단독 등급은 발견되지 않음. |
| R6B-16 | Medium | [SKILL_CONFLICT](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md:35), [§4.0](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md:44) | 같은 충돌 실험을 “3회 반복”과 “핵심 4쌍 각 1회”로 동시에 지시한다. | 두 문구가 현행 본문에 공존. | 3회 지시를 축소 범위에 맞게 수정. |
| R6B-17 | Medium | [ROUTING_POLICY](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:13), [SKILL_MATRIX](/D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:96) | 자동 필터 `classification ∉ {보류, 제외}`의 `제외`는 실제 분류 `중복제외`와 다르다. | 폐기된 `resolving-merge-conflicts`가 조건을 통과할 수 있다. | 정확한 enum 사용, 폐기·묶음·사용자 전용 테스트 추가. |
| R6B-18 | High | [DATABASE_SCHEMA](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:64), [§1](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:17) | steer 실패 보류 입력은 `pending_inputs.text`에 원문으로 저장하지만 대화 원문 미저장 원칙과 보존·마스킹 계약이 연결되지 않았다. | `text` 투영과 `PendingInputQueued` 원문 payload 경계가 불명확하다. | 암호화·마스킹·삭제 시점 및 재생에 필요한 최소 payload 정의. |

현행 Gateway에는 `forkRun/resumeRun`이 없고 `startRun(spec.mode)`로 통일됐다. 해당 이름은 폐기 전 [초기 제안](/D:/LLM/agent-studio/docs/planning/06_codesign/CLAUDE_INITIAL_PROPOSAL.md:98)에만 남는다. 복구 시나리오 번호 #1~14의 이동도 발견되지 않았다. 다만 [SESSION_RECOVERY #11](/D:/LLM/agent-studio/docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md:66)의 `GitCommandRun{…,stderr}`와 [DB 목록](/D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:42)의 `stderr_digest`는 필드가 다르므로 R6B-13의 이벤트 계약 정리 때 함께 바로잡아야 한다.

### 사용자 결정 대기로 표시할 항목

[OPEN_ISSUES](/D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:14)의 **U1 인증 방식**, **U8 자동 권한 모드 허용 범위**, **U9 공유 `CODEX_HOME` 기본값**, 그리고 [USAGE_PLAN](/D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:55)의 **U5 Codex 호환 스킬 설치 승인**은 사용자 결정으로 남겨야 한다. 결정 화면에는 위 집행 수준과 공유 홈의 세션·설정 노출 범위를 먼저 제시해야 한다.

### UNVERIFIED

- 설치된 `@anthropic-ai/claude-agent-sdk` **0.3.316 typings**은 이 읽기 범위에서 확인하지 못했다. 공식 문서의 `forkSession(sessionId,{upToMessageId})` 존재는 확인했다. P00 S2는 설치 패키지 버전과 `.d.ts` 시그니처, 과거 메시지 UUID에서 분기한 새 세션 ID·복사 범위·원본 불변을 기록해야 한다.
- Desktop 번들 플러그인·Claude synced 스킬·`image_gen`·브라우저·컴퓨터 사용의 **headless 실사용**, 공유 홈의 `notify` 실제 발화, Windows sandbox의 차단 범위는 S9/S4 실측 전까지 미확인이다. `skills/list` 발견만으로 도구 실행 가능성을 증명할 수 없다.
- 단일 파일 `file_patch`의 blob 3분기는 선언 열로 계산할 수 있다. 다만 외부 효과의 **포착 완전성**, rename·symlink·다중 파일 쓰기, 원장 밖 셸·MCP 효과는 그 열만으로 판정할 수 없다. 따라서 #3의 자동 재개 분기에는 별도의 포착 증명이 필요하다.

## 7.3 원문 — R6_rereview_3 (보안·실행 제한·테스트·Phase·마스터플랜) · thread `<thread-id>` · 2026-11-01T13:26:35Z~2026-11-01T13:32:37Z · exit 0

### 요약

현재 문서 기준 **해결 4 / 부분 해결 16 / 미해결 1 / 해결됐으나 신규 문제 1**, 신규 발견 **11건**이다. 잔존 **Critical·High가 있다**. 특히 엄격 모드의 `ENFORCED` 보장, 자동 권한 모드, 공유 `CODEX_HOME`은 실행 경로가 증명되기 전 출고 보장으로 쓸 수 없다. 수정 로그의 `ACCEPTED` 판정만으로 해결 처리하지 않았다. 검토는 읽기 전용으로 수행했다.

### 원 지적 재검토

| 원 ID | 판정 | 현재 문서·위치 | 근거 인용 | 잔여 조치 |
|---|---|---|---|---|
| R4C-01 | **NOT_RESOLVED** | [SECURITY_MODEL §2.1](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:51>), [AC-P10a-5](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:37>) | 일반 모드의 불가 단언은 철회했지만 엄격 모드는 여전히 “앱 실행기 외 경로로 실행 불가(ENFORCED)”다. 표의 명령 통제 근거는 “실행 없음”뿐이고, 공유 MCP·공급자 도구를 제거하는 집행 절차가 없다. [상단 결론](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:8>)도 “앱 전용 실행기만 통과”라고 단정한다. | 엄격 모드에서 셸·네이티브 MCP·Hook을 실제로 차단하는 실행 표면과 시험을 지정하거나, AC를 검증 가능한 범위로 낮춘다. |
| R4C-02 | PARTIALLY_RESOLVED | [격리 게이트](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:76>), [P00 진입](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:63>), [AC-P00-7b](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:21>) | S4 실패 시 “쓰기·무인 실행을 비활성화”하도록 진입 조건은 생겼다. 그러나 P01 [T5](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:66>)는 정책 스키마이고, 실패 조합을 런타임에서 거부하는 Task·AC가 없다. AC 증거도 로그와 보장표 갱신 커밋이다. | P01에 조합별 capability 차단 구현과 기동·Task 제출 거부 시험을 명시한다. |
| R4C-03 | PARTIALLY_RESOLVED | [§2.1 보장표](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:47>) | 표는 추가됐으나 `Codex 엄격`의 명령 “ENFORCED(실행 없음)”, 네트워크 `ENFORCED`, MCP `ENFORCED(allowlist)`는 각각 도구 제거·네트워크 차단·사용자 설정 MCP 배제 메커니즘이 명명되지 않았다. `Claude native` 고위험 효과의 `DETECTED`도 설치·DB·외부 전송 전부를 포착하는 신호가 없다. 자동 모드 열의 “동일”은 공급자×OS별 보장값이 아니다. | 각 셀에 집행자·관찰 이벤트·우회 시험을 연결하고, 입증 못한 셀은 `POLICY_ONLY` 또는 `UNVERIFIED`로 내린다. |
| R4C-04 | PARTIALLY_RESOLVED | [실행 제한 §4](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:61>), [TEST-LIM-01/02](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:115>) | 예시는 손으로 계산해 `10:00–10:05` 5분 + `10:12–10:20` 8분 = **`active_ms` 13분**, `wait_ms` 7분으로 맞다. 그러나 “모두 단조 시계”라면서 재기동 후 저널 시각으로 재계산하고, `10:15` 재기동 예시에서는 `10:12–10:15` 활성 3분을 “미인정”한다. `TEST-LIM-02`는 승인 **대기 중** 재기동만 다룬다. | 활성 중 재기동 시험을 추가하고 누락 시간을 보수적으로 계산하거나 불확실 상태로 차단한다. 단조 시계와 영속 wall-clock의 역할을 분리한다. |
| R4C-05 | PARTIALLY_RESOLVED | [보안 §8](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:125>), [제한 §6](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:82>) | “완료 확정 단계 건너뛰기 → 남은 단계 재계획 → 새 run”이 명시돼 설계는 개선됐다. 하지만 [BG-05](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:112>)는 늦은 클릭 UI만, [RC-S13](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:41>)은 일반 부분 완료만 검증한다. | `approval_expired` 직전 완료 효과와 미기록 공급자 효과를 넣은 복귀 E2E를 별도 게이트에 둔다. |
| R4C-06 | PARTIALLY_RESOLVED | [TEST-SE-01a/b](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:79>), [정책표](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:34>) | 기본 `DENY` 시험과 명시 작업 시험은 분리됐다. 다만 01a는 “미실행, 원격 ref 불변”과 일반 모드 “우회 성공 시 탐지”를 한 예상에 넣고, 01b의 `ALWAYS_ASK` 전환 조건은 정책표의 원격 Git 행에 없다. | 01a를 엄격/일반 모드로 분리하고, 01b 사전조건에 사용자 명시 작업이 `DENY→ALWAYS_ASK`로 바뀌는 정책 전이를 적는다. |
| R4C-07 | PARTIALLY_RESOLVED | [35개 명세](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:40>) | 35개 모두 열은 갖췄다. 임의 표본 5개(`CO-04`, `DT-07`, `DT-08`, `SE-01a`, `SE-07`) 중 [DT-07](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:101>)의 실패 처리는 여전히 “—”다. 표본 밖 [AG-02](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:45>)는 입력·실패 처리·증거가 “동일”, [DT-03](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:97>)은 예상 “동일”, 실패 처리 “—”다. | 대용어와 빈 칸을 각 행의 구체적 입력·판정·증거로 바꾼다. |
| R4C-08 | **RESOLVED** | [실호출 의무표](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:22>) | “재생으로 대체할 수 없다”는 규칙과 P00/MVP/V1 게이트가 승인 콜백·무승인 쓰기·OS 격리·실제 스킬 로드·중단/재접속을 모두 포함한다. | 문서상 잔여 조치 없음. 실행 성공 여부는 `UNVERIFIED`. |
| R4C-09 | **RESOLVED_BUT_NEW_ISSUE** | [릴리스 정의](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:45>), [MVP-Core AC](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:104>) | “Phase 생성·Skills 선택·협업은 포함하지 않는다”, “제품 MVP 완성 게이트는 V1”이라고 명시해 범위 설명은 정직해졌다. 그러나 Master [Goal](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:11>)과 여러 한도·시험 문구는 여전히 “MVP”를 Windows 단계에 쓴다. | 전 문서에서 단계명을 `MVP-Core` 또는 `V1 제품 MVP`로 통일한다. |
| R4C-10 | PARTIALLY_RESOLVED | [수동 프로토콜](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:27>), [P01 T3](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:66>), [AC-P10a-6](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:38>) | P07 전 수동 증거 경로를 정의했으나 P01 T3는 관찰 **이벤트 타입**만 만들고 관찰자를 만들지 않는다. AC가 요구하는 “Skill 도구 블록 인용”은 Codex의 스킬 주입 증거와도 맞지 않는다. | P01–P07 전 Task의 공급자별 수동 증거 입력·리뷰어 판정·보관 위치를 정한다. |
| R4C-11 | PARTIALLY_RESOLVED | [P08a](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:84>), [P09](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:95>), [DAG](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:125>) | 명시 선행을 대조하면 P08a=P05, P11a=P05·P08a, P09=P06·P07, P10b=P06·P07·P09·P08b, P11b=P10b로 **실질 DAG 불일치는 없다**. 단 P06·P07의 선행은 여전히 “MVP”이고, P09의 “A 실행→스냅숏→턴 되돌리기→B 실행”은 사용자 변경·untracked 파일·외부 효과를 어떻게 보존할지 없다. | P09 비교를 순수 패치 대상으로 한정하거나 독립 작업 트리를 사용한다. 되돌리기 가능 조건과 실패 시 보류 상태를 명시한다. |
| R4C-12 | PARTIALLY_RESOLVED | [S1a Step 1](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:67>), [AC-P00-2](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:15>) | `readOnly`와 `workspaceWrite` 시험은 분리됐다. 그러나 S1a는 쓰기가 없을 뿐 아니라 `requestApproval`을 **반드시 1회 이상** 요구한다. 공급자가 읽기 전용 요청을 승인 요청 없이 거부해도 안전한 결과일 수 있다. `workspaceWrite` 시험은 “단언 없이 기록”인데 AC는 사후 diff 포착을 요구한다. | readOnly의 필수 단언은 무단 변경 0으로 두고 승인 이벤트는 관찰값으로 분리한다. 자동 쓰기 발생 시 감사 포착을 별도 단언한다. |
| R4C-13 | **RESOLVED** | [BG-01~05](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:104>), [AC-P11a-2](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:71>) | 창 종료·재접속·트레이 종료·재부팅·늦은 승인에 개별 ID와 프로세스·seq·승인 증거가 있다. | 문서상 잔여 조치 없음. |
| R4C-14 | PARTIALLY_RESOLVED | [제한 근거·조정표](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:12>) | 9행의 근거 열과 `3M/30M/300M` 임시 한도가 생겼다. “일시 오류 복구율은 2회 내 대부분”, “20분 넘게 출력 없는 경우 대부분 멈춤”은 실측 근거가 없는 주장이고, 토큰 한도가 참조한 `TEST-LIM-04`는 정의되지 않았다. | 근거를 설계 가설로 표시하고 실측 갱신 조건을 둔다. `TEST-LIM-04`를 작성한다. |
| R4C-15 | **RESOLVED** | [TEST-RF-01~05](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:123>), [Review Focus](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:33>) | 다섯 항목 각각 소유 Task·TEST-ID·AC가 연결됐다. | 문서상 잔여 조치 없음. |
| R4C-16 | PARTIALLY_RESOLVED | [분할 Phase](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:98>), [§2.1 확인표](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:116>) | 여섯 Phase를 분리했지만 “전부”라는 확인표는 틀리다. **P08b·P10b·P11b는 18번호가 모두 있다. P12는 10, P08c는 5·10·11·14·17, P11c는 5·6·10·11·14·17이 없다.** 세 V2 Phase의 `18. 진입: —`는 마지막 Phase라는 설명이 없어 정당화되지 않는다. P08b의 “복구: 없음”도 Save·되돌리기 실패 처리 설명이 아니다. | §2.1을 실제 체크 결과로 고치고 누락 번호와 ‘해당 없음’의 이유를 채운다. 기존 P06·P07·P09 등의 누락도 유지된다. |
| R4C-17 | PARTIALLY_RESOLVED | [P00 범위](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:49>), [S7](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:111>), [S9](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:120>) | S1 분할과 S7 4쌍 축소는 진전이다. 하지만 S9가 8 CAP×2 공급자 탐침을 더했고 2주 상한은 그대로다. S7은 여전히 `packages/protocol`과 CI를 생성해 P00의 “코드 제품 아님” 경계를 넘는다. | 필수 출고 위험 실험과 기능 탐색을 별도 시간 상한으로 나누고, 제품 패키지/CI 생성은 P01 Task로 이동한다. |
| R4C-18 | PARTIALLY_RESOLVED | [AC 원칙](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:7>), [AC-P00-6](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:19>), [AC-V2](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:94>) | pass/fail·버전·OS·시각 원칙과 V2 분할은 개선됐다. 그러나 P00 S7은 4쌍 실험·4행 잠정인데 AC는 “충돌 쌍 8행 주도 스킬 확정”을 계속 요구한다. `AC-P00-9`는 증거가 있는 분류표면 통과할 수 있어 기능 실현 게이트는 아니다. | S7 AC를 4행 확정·4행 잠정으로 맞추고, S9 후 미지원 기능의 V1 수용 조건을 따로 둔다. |
| R4C-19 | PARTIALLY_RESOLVED | [위험 R19·R20](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:51>), [SECURITY_MODEL §10](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:135>) | R19·R20은 `Critical`로 등록됐다. 그러나 위험표에는 **소유자** 열이 없고, §10 출고 차단표는 보장 라벨 불일치만 Critical로 다룬다. 자동 모드 R20의 차단 시험·게이트가 별도로 없다. | 두 위험에 소유 Task·완화 검증·출고 차단 조건을 지정한다. |
| R4C-20 | **RESOLVED** | [미결정 §1·결정 이력 §1.1](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:8>) | §1에는 U1·U3·U4·U5·U8·U9만 있고 U2·U6·U7은 합의 이력으로 이동했다. R6은 “앱 TTL **15분**”으로 수정됐다. | 문서상 잔여 조치 없음. |
| R4C-21 | PARTIALLY_RESOLVED | [SE-06b·07·08·09](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:86>) | 외부 파일·미등록 호스트·MCP를 `LIVE+INST`로 시험하도록 확장했다. 그러나 `SE-08`의 “외부 호출”은 대상 서비스·요청·감사 신호가 없고, `SE-09`는 경고 배지/설정 기록만 다룬다. Claude native에서 전송 성공 가능성을 인정하면서 `SE-07`은 모든 “전송 성공 → 실패”를 요구한다. | 모드별 예상값을 나누고 외부 서비스 전송에 서비스 측 확인값·네트워크 로그를 요구한다. |
| R4C-22 | PARTIALLY_RESOLVED | [복구 §2.6 추적표](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:67>), [AC-P05-2](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:62>) | RC-01~07의 대응표는 생겼다. 하지만 RC-06은 S20을 AC-P05-2에 연결하는데 그 AC의 MVP 목록은 S20을 제외한다. [복구 계획 게이트](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:64>)에는 S20이 포함된다. | AC-P05-2의 목록을 추적표·복구 게이트와 일치시킨다. |

### 2차 요청 변경 평가 (U8·U9·CAP-07/08·S9)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R6C-01 | **Critical** | [SECURITY_MODEL §2.1·§8](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:51>), [U8](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:18>) | 자동 모드의 `Claude native Windows`에 사전 강제 보장을 남겨서는 안 된다. 현재 “동일 + 배지”, MCP “동일”, 브라우저·컴퓨터 사용 “ALWAYS_ASK 유지”는 공급자 자동 허용 도구와 사용자 설정 경로를 포함한 집행 근거가 없다. | 문서는 native Windows를 `POLICY_ONLY`라면서 `acceptEdits/auto/bypassPermissions`를 프로젝트별로 허용한다. 배지는 사후 표시다. | **U8은 제한된 (b)로 결정 권고**: S4에 합격한 Codex sandbox 또는 Claude 전체 프로세스를 격리한 WSL2/VM에서만 수정 자동 모드를 허용한다. Claude native Windows는 읽기/참석 모드로 제한하고 UI에 “사전 차단 보장 없음”을 명시한다. |
| R6C-02 | High | [보안 §6](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:108>), [U9](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:19>), [D19](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:31>) | 공유 `CODEX_HOME`은 스킬·로그인뿐 아니라 사용자 `config.toml`의 `notify` hook, `mcp_servers`, 플러그인 바이너리도 앱 run에 노출할 수 있다. `-c mcp_servers.*`가 기존 설정을 **제거**한다는 증거는 문서에 없다. | 관련 영역은 Hook 활성화·MCP 실행·명령·파일·네트워크·외부 서비스 변경·공급망이다. 표의 MCP `ENFORCED(allowlist)`는 공유 설정을 포함해 증명되지 않았다. | **U9는 프로젝트별 선택 (c), 기본은 분리 프로필**을 권고한다. 공유를 고르면 유효 설정·서버 명령·`notify`·플러그인 경로를 먼저 열거해 보여 주고 승인된 항목만 실행한다. 실제 상속·오버라이드 동작은 S9에서 확인한다. |
| R6C-03 | High | [CAP-07/08](<D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:218>), [보안 매트릭스](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:41>), [P10b T9](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:101>) | 컴퓨터 사용의 승인 영역은 `ALWAYS_ASK(동작 단위)`로 적혔지만, 앱 MCP 서버가 OS 입력의 **유일한** 경로인지 검증되지 않았다. D26의 3단계 LLM 스크립트가 마우스·키보드를 제어하면 앱 실행기 원칙을 우회한다. | P10b는 capture·input·browser·image API를 묶어 도입하면서 대응 TEST-ID와 CAP 전용 AC가 없다. 화면 캡처의 민감 정보 처리도 “마스킹 대상” 이상으로 정의되지 않았다. | 입력 제어는 앱 실행기 전용 capability로 고정하고 스크립트 fallback을 금지한다. 화면 캡처와 click/type을 분리 승인하며 서버 측 동작 ID·대상 창·효과 로그·거부 시험을 V1 게이트에 둔다. |
| R6C-04 | Medium | [S9 Step 1·AC-P00-9](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:124>), [AC-P00-9](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:23>) | S9는 “상태 값은 단언하지 않는다”는 **기록형 탐침**이다. 탐색 게이트로는 허용 가능하지만 기능 제공의 pass 판정은 아니다. | `supported/unsupported/conditional`과 근거가 모두 기록돼도 AC는 통과한다. “불가 판정 없음”이라는 [D26](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:38>)만으로 대체 경로의 품질·보안은 검증되지 않는다. | S9는 CAP별 선택 경로를 정하는 결정 게이트로 남긴다. 미지원/조건부 항목은 UI 노출 전 별도 V1 구현·보안 AC를 필수화한다. |

### 신규 발견 (수정으로 생긴 불일치)

| ID | 심각도 | 문서·위치 | 문제 | 근거 | 권고 |
|---|---|---|---|---|---|
| R6C-05 | High | [AC-P02-6·3](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:43>) | 같은 Phase가 자동 권한 모드를 **허용하면서 기동 거부**한다. | `AC-P02-6`은 `acceptEdits/auto/bypass` 전달을 요구하고 바로 다음 `AC-P02-3`은 “bypass·acceptEdits 설정 시 어댑터 기동 거부”다. | 기본 모드의 무단 설정 거부와 사용자 옵트인 모드의 허용 조건을 분리한다. |
| R6C-06 | High | [P00 S7](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:60>), [AC-P00-6](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:19>) | S7 완료 조건이 양립하지 않는다. | Task는 “핵심 4쌍만 1회”, 나머지 4행은 “잠정 유지”인데 AC는 “충돌 쌍 8행 주도 스킬 확정”이다. | AC를 4행 실험 확정·4행 잠정 및 P07 재검증 조건으로 고친다. |
| R6C-07 | Medium | [제한표](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:25>), [TEST_STRATEGY §2.7](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:115>), [Phase/AC](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:66>) | 참조한 TEST-ID 일부가 정의되지 않았다. | `TEST-LIM-04`는 제한표에만 있다. `TEST-SE-06`·`TEST-SE-01~03`은 분할 뒤에도 P01/P10a/P04 및 AC에 남아 있지만 정의는 `SE-06a/b`, `SE-01a/b`다. | ID 참조를 전수 갱신하고 정의되지 않은 `LIM-04`를 추가한다. |
| R6C-08 | Medium | [Master Goal](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:11>), [Phase P06/P07](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:89>), [AC-P10a-1](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:33>) | 새 릴리스명과 권한 영역 수가 일부 문서에 반영되지 않았다. | Goal·제한표·시험 게이트는 Windows 단계를 `MVP`라 부르고 P06/P07 선행도 “MVP”다. 보안 매트릭스는 11개 원영역에 브라우저·컴퓨터 사용·외부 문서 전송을 더해 **14행**인데 P10a/P06과 AC는 “11영역”이다. | 명칭은 `MVP-Core`로, 정책 구현 범위는 원 11+CAP 3영역으로 명확히 고친다. |
| R6C-09 | Medium | [AC-P00-1](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:14>), [Master P00 게이트](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:128>) | 스파이크 산출물 수가 일치하지 않는다. | “S1~S9 보고서 **9건**”이지만 Task 목록은 `S1a/S1b/S1c`와 `S2~S9`로 **11개**이고 각 Task에 보고서가 지정돼 있다. Master의 S1a→S1b→S1c 표기와 Phase의 “S1a 통과가 S1b·S1c 선행”도 순서가 다르다. | 11개 보고서 또는 통합 보고서 묶음을 명시하고 S1b/S1c의 선후를 하나로 정한다. |
| R6C-10 | Medium | [복구 게이트](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:64>), [AC-P05-2](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:62>) | 새 Git dirty 시험이 MVP AC에 빠졌다. | 복구 게이트는 S20을 포함하지만 `AC-P05-2`는 `S01~S05, S07, S12, S13, S15, S16`만 적는다. | AC에 S20을 추가하고 추적표와 동일한 단일 게이트 목록을 사용한다. |
| R6C-11 | Medium | [SECURITY_MODEL §6](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:108>), [FINAL D19](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:31>) | Claude MCP 격리 기본값이 문서 간 다르다. | 보안 모델은 “Claude `--strict-mcp-config`”를 기본 통제로 쓰고 D19는 “격리 옵션에서만” 사용한다고 한다. | 기본 실행과 격리 옵션별 유효 MCP 목록·보장 수준을 한 정책으로 통일한다. |

### 사용자 결정 대기로 표시할 항목

- **U8 자동 권한 모드:** 현재 제안 (b)를 그대로 승인할 단계는 아니다. **격리가 실측된 조합만 자동 수정 허용**하는 제한형 (b)를 권고한다. Claude native Windows의 `bypassPermissions`는 사전 차단 보장이 없는 모드로 표시하고, 수정 자동화 대상에서는 제외한다. R20의 집행·시험 게이트가 먼저 구체화돼야 한다.
- **U9 `CODEX_HOME`:** 현재 공유 기본안 (a)보다 **프로젝트별 선택 (c), 분리 기본값**을 권고한다. 공유 시 `notify`, 기존 MCP 서버, 플러그인 실행 파일의 유효 설정을 S9로 확인하고 사용자에게 보여 준 뒤 허용해야 한다.
- **U1·U5 및 C9:** 인증 기본값과 Codex 스킬 설치는 기존 사용자 결정으로 남는다. OS 입력 제어 서버의 C9는 S9 기록뿐 아니라 CAP-07/08의 전용 실행·승인·시험 AC가 준비된 뒤 범위를 결정할 항목이다.
- **R19·R20과 R4C-01:** 사용자 선택으로 기술적 강제 부족이 해결되지는 않는다. 두 Critical 위험에 소유자와 출고 차단 시험을 먼저 배정해야 한다.

### UNVERIFIED

공급자 설치 버전의 `readOnly` 승인 요청 형태, 자동 권한 모드에서 `PreToolUse`·MCP 통제가 유지되는 범위, 공유 `CODEX_HOME`에서 `-c`가 기존 `mcp_servers`·`notify`를 어떻게 합성하는지, Desktop 플러그인의 헤드리스 노출은 **이번 문서 검토만으로 확인되지 않았다**. S1·S4·S9 실측 대상으로 남겨야 한다. `ENFORCED` 평가는 이 실측과 우회 시험이 통과하기 전까지 문서의 설계 주장으로만 취급했다.

## 8. R7 재검증 요청 범위 (독립 세션 B4, 호출 13)

1. §6.1 PARTIALLY/NOT/NEW_ISSUE 37건과 §6.2 ACCEPTED 35건이 **현재 디스크 문서**에서 실제로 해소됐는지(원문 인용).
2. R7 수정으로 새로 생긴 불일치(ID·릴리스명·TEST/AC 참조·S1a/b/c·CAP 판정 표기).
3. U8·U9 양측 입장 병기가 정확하고 "결정 전 기본 동작"이 보안 모델과 모순 없는지.
4. 잔존 Critical/High → 사용자 결정 대기 항목 지정.

## 9. B4 독립 재검증(호출 13, `codex/R7_reverify_1`) 판정과 R8 조치

| 항목 | 값 |
|---|---|
| thread | `<thread-id>` |
| 시각(UTC) | 13:58:21~14:07:02 |
| exit | 0 |
| 판정 집계(Codex) | {'INSUFFICIENT': 43, 'VERIFIED': 29} |
| 신규 | 12건 {'R7-01': 'High', 'R7-02': 'High', 'R7-03': 'High', 'R7-04': 'High', 'R7-05': 'High', 'R7-06': 'High', 'R7-07': 'High', 'R7-08': 'Medium', 'R7-09': 'Medium', 'R7-10': 'High', 'R7-11': 'High', 'R7-12': 'High'} |

### 9.1 재검증 72건 — Codex 판정과 R8 조치

| ID | B4 판정(Codex) | R8 조치(Claude) |
|---|---|---|
| R4A-02 | INSUFFICIENT | LIM §원칙 'P00·MVP' → MVP-Core(P04) |
| R4A-05 | INSUFFICIENT | PB P01 T2 Renderer 토큰 삭제 → IPC 릴레이 채널; FD 구 입장행 '재폐기' 표시 |
| R4A-09 | VERIFIED | 확인 — 추가 조치 없음 |
| R4A-10 | VERIFIED | 확인 — 추가 조치 없음 |
| R4A-14 | INSUFFICIENT | SEC §7 CSP 문자열을 유효한 단일 문자열로 재작성(base-uri·form-action·frame-src 포함), PB P08a T2는 참조만 |
| R4A-18 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-01 | INSUFFICIENT | MATRIX 52·110 '역할 대체 ≠ 보장' 명시 |
| R4B-03 | INSUFFICIENT | DB `capture_confidence` 기본값 `uncertain`·`complete` 승격 조건 |
| R4B-04 | INSUFFICIENT | AC-P01-7 신설(projections.md 존재·열 단위 재생 비교), RT 추적표 연결 |
| R4B-05 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-06 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-07 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-10 | INSUFFICIENT | MASTER S7 Step 5 시그니처 8종 초안·Codex 검토, AC-P00-6 증거 |
| R4B-13 | INSUFFICIENT | MASTER S2 Step 4 `forkSession` typings·실호출 추가 |
| R4B-14 | INSUFFICIENT | RT §3 판정표·LIM §6에 `capture_confidence=complete` 조건 |
| R4B-17 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-21 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-23 | INSUFFICIENT | MASTER S7 'SKILL.md만' → 폴더 전체 |
| R4B-24 | INSUFFICIENT | MASTER 증거 규칙을 `tasks.kind` enum으로 |
| R4C-01 | INSUFFICIENT | SEC §2.1 고위험 효과 엄격 셀: S1c·S4 실측 전 DETECTED, 실측 후 조건부 ENFORCED; SE-01a 사전조건에 S1c |
| R4C-02 | INSUFFICIENT | AC-P01-2 중복 → 격리 게이트는 AC-P01-6, PB T11 참조 갱신 |
| R4C-03 | INSUFFICIENT | §2.1 네트워크·브라우저 행 전 셀에 집행자·관찰·시험 기재, 브라우저·컴퓨터 사용 행을 정식 경로/우회 경로로 분리 |
| R4C-04 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-05 | INSUFFICIENT | RT S22 예상 결과 ①보류→②사용자 판정→③재개 순서 |
| R4C-06 | INSUFFICIENT | SEC §2 원격 Git 행에 DENY→ALWAYS_ASK(once)→DENY 전이 |
| R4C-07 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-09 | INSUFFICIENT | LIM 단계명 정정(R4A-02와 동일) |
| R4C-10 | INSUFFICIENT | PB P01 T12: 전송·수락은 `SkillInjectionAccepted`, 절차 관찰 시만 `SkillLoadObserved` |
| R4C-11 | INSUFFICIENT | PM `compare_blocked` 사유 추가; P10b 선행 'P09(T5b 제외)'로 순환 제거 |
| R4C-12 | INSUFFICIENT | PB S1a 요청 없음 경로 명시(AI §6·MASTER·AC와 동일) |
| R4C-14 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-16 | INSUFFICIENT | PB 12개 Phase 누락 항목 전부 기입(스크립트 집계 18/18), §2.1 표 실제 결과로 교체 |
| R4C-17 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-18 | INSUFFICIENT | CR §4.0·AC-P00-6 산술 정정(3행+1건 확정, 5행 잠정); AC-V1-8~10(CAP-04·05·06) 신설 |
| R4C-19 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-21 | INSUFFICIENT | SE-08 실패 기준을 관찰 범위 내/외로 분리 |
| R4C-22 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-02 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-03 | INSUFFICIENT | AI §7·PR §13A 판정 규칙에 내장 파일 도구 예외 명시 |
| R6A-04 | INSUFFICIENT | MASTER 범위 축소 규칙 '불가 판정 아님' → D26 판정 규칙 문구 |
| R6A-05 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-06 | INSUFFICIENT | AI §6·PB S1a 요청 없음 경로 통일 |
| R6A-07 | INSUFFICIENT | P10b 선행에서 T5b 제외 |
| R6A-08 | INSUFFICIENT | PB T2·FD 구 행 정리(R4A-05와 동일) |
| R6A-09 | INSUFFICIENT | MASTER Review Focus 4 → AC-P08b-2 |
| R6A-10 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-02 | INSUFFICIENT | **Claude 추가 확인**: 설치본 v2 스키마 enum = `untrusted/on-request/never/{granular}` → `onRequest` 표기를 `on-request`로 되돌림, `on-failure` 이력 문구 §6.3로 집약, evidence 발췌 저장 |
| R6B-03 | INSUFFICIENT | R6A-03과 동일 |
| R6B-04 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-05 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-06 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-09 | INSUFFICIENT | MASTER S9 타입·제목 CAP-01~09, PB S9 (g) 추가·산출 CAP-01~09 |
| R6B-10 | INSUFFICIENT | MASTER Architecture 문장을 '정식 경로 + 엄격 모드 조건부 보장'으로 |
| R6B-11 | INSUFFICIENT | DB `sessions.app_owned` 정본(agent_runs 열 제거), 외부 세션 표시 규칙 |
| R6B-12 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-13 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-14 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-15 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-16 | INSUFFICIENT | CR §2 디버깅 행 1회·§4.0 산술 정정 |
| R6B-17 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-18 | INSUFFICIENT | DB `pending_inputs.text_enc`(암호화 원문) + AI 복호 전달 규칙 |
| R6C-01 | INSUFFICIENT | SEC §2.1 앱 MCP 서버 경로/그 외 경로 분리, 자동 모드 적용값·§8 일치 |
| R6C-02 | INSUFFICIENT | 결정 전 기본 동작 = 분리 프로필을 FD·OI·CK·MASTER·PB·PR·AI·SEC에 동일 명시 |
| R6C-03 | INSUFFICIENT | 앱 MCP 서버 = 정식 경로(서버 측 ENFORCED), 셸 우회 = §2.1 열 값 — 구분 명시 |
| R6C-04 | INSUFFICIENT | AC-V1-8~10 신설 |
| R6C-05 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-06 | INSUFFICIENT | AC-P00-6·CR 산술 정정 |
| R6C-07 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-08 | INSUFFICIENT | LIM 단계명 |
| R6C-09 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-10 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-11 | INSUFFICIENT | SEC §6 Codex 기본을 분리 프로필로 D19와 통일 |

### 9.2 신규 R7-01~12

| ID | 심각도(Codex) | 판정 | R8 조치 |
|---|---|---|---|
| R7-01 | High | ACCEPTED | AC-P01-2 중복 해소(AC-P01-6) |
| R7-02 | High | ACCEPTED | U9 결정 전 기본 동작 단일화(분리) |
| R7-03 | High | ACCEPTED | S9 CAP-01~09 통일 |
| R7-04 | High | ACCEPTED | T5b 순환 제거 |
| R7-05 | High | ACCEPTED | RT·LIM confidence 전파 |
| R7-06 | High | ACCEPTED | pending_inputs 암호화 원문 |
| R7-07 | High | ACCEPTED | SEC 브라우저·컴퓨터 사용 2행 분리·자동 모드 문단 정정 |
| R7-08 | Medium | ACCEPTED | CSP 문자열 정정 |
| R7-09 | Medium | ACCEPTED | CR·AC 산술 정정 |
| R7-10 | High | ACCEPTED | sessions.app_owned |
| R7-11 | High | ACCEPTED | SEC §2.2 분류 계약 표 신설 |
| R7-12 | High | ACCEPTED | PB T12 등급 상한 정정 |

### 9.3 Codex UNVERIFIED 항목에 대한 Claude 1차 출처 확인

- Codex는 읽기 전용 샌드박스라 `generate-json-schema --out`을 실행하지 못해 v2 `approvalPolicy` 허용값을 UNVERIFIED로 남겼다. Claude가 scratchpad에 생성한 `codex_app_server_protocol.v2.schemas.json`(codex-cli 0.166.0)의 `definitions.AskForApproval`은 `{"enum": ["untrusted", "on-request", "never"]} | GranularAskForApproval{granular:{mcp_elicitations, rules, sandbox_approval, request_permissions?, skill_approval?}}`이고 `SandboxPolicy.type`은 `dangerFullAccess | readOnly | externalSandbox | workspaceWrite`(R8-08 보정: `externalSandbox` 포함 — 앱 기본 정책이 허용한다는 뜻은 아님)다(발췌: `evidence/codex_0.166.0_v2_schema_excerpt.json`). 따라서 (1) `on-failure` 부재는 확인, (2) R6에서 Codex가 제시한 `onRequest` 철자는 스키마와 불일치 → R7에서 바꾼 `onRequest`를 `on-request`로 되돌렸다. 이 정정은 Codex 의견을 1차 출처로 반증한 것이며 §6.3에 병기한다.
- `forkSession` 0.3.316 typings, SDK `--chrome` 상당 옵션, 공유 홈 `-c mcp_servers.*` 제거 효과, 플러그인 headless 기동, OS 샌드박스 실제 차단은 여전히 UNVERIFIED → P00 S1c·S2·S4·S9.

### 9.4 사용자 결정 대기(변경 없음)

- U8: Claude (b) vs Codex (b-제한); 결정 전 기본 (b-제한).
- U9: Claude (a) vs Codex (c); **결정 전 기본 동작을 R8에서 '분리 프로필'로 단일화**(B4 R7-02 지적 수용). 사용자가 (a)를 택하면 기본만 바뀌고 의무 절차는 동일.

## 10. B4 Codex 응답 원문 보존 (response.md 바이트 일치)

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

## 11. B5 독립 재검증(호출 14, `codex/R8_reverify_1`) 판정과 R9 조치

| 항목 | 값 |
|---|---|
| thread | `<thread-id>` |
| 시각(UTC) | 14:18:40~14:24:03 |
| exit | 0 |
| 판정 집계(Codex) | {'VERIFIED': 44, 'INSUFFICIENT': 11} |
| 신규 | 10건 {'R8-01': 'High', 'R8-02': 'Critical', 'R8-03': 'High', 'R8-04': 'High', 'R8-05': 'High', 'R8-06': 'High', 'R8-07': 'Medium', 'R8-08': 'Medium', 'R8-09': 'Medium', 'R8-10': 'Low'} |

### 11.1 55건 — B5 판정과 R9 조치

| ID | B5 판정(Codex) | R9 조치(Claude) |
|---|---|---|
| R4A-02 | VERIFIED | 확인 — 추가 조치 없음 |
| R4A-05 | VERIFIED | 확인 — 추가 조치 없음 |
| R4A-14 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-01 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-03 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-04 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-10 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-13 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-14 | VERIFIED | 확인 — 추가 조치 없음 |
| R4B-23 | INSUFFICIENT | CHECKLIST U5 선택지를 폴더 전체로 정정(R8-05) |
| R4B-24 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-01 | INSUFFICIENT | AC-P10a-5·SE-01a 사전조건에 S4 합격 추가(R8-03) |
| R4C-02 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-03 | INSUFFICIENT | SEC §2.1 28셀 전부 집행자/관찰/시험 또는 명시 UNVERIFIED·POLICY_ONLY, 자동 모드 도출표(R8-01) |
| R4C-05 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-06 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-09 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-10 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-11 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-12 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-16 | INSUFFICIENT | PB P01 중복 17 제거(기존 17에 병합) |
| R4C-18 | VERIFIED | 확인 — 추가 조치 없음 |
| R4C-21 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-03 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-04 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-06 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-07 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-08 | VERIFIED | 확인 — 추가 조치 없음 |
| R6A-09 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-02 | INSUFFICIENT | 원본 v2 스키마 파일·sha256·버전을 evidence/codex_schema_0.166.0/에 보존(R8-08) |
| R6B-03 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-09 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-10 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-11 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-16 | VERIFIED | 확인 — 추가 조치 없음 |
| R6B-18 | INSUFFICIENT | DB pending_inputs 백업 계약 정정(암호문 포함·항상 암호화·키 부재 시 폐기, R8-04) |
| R6C-01 | INSUFFICIENT | §2.1 자동 모드 재계산 규칙 + 도출표, TEST-SE-09 단언 대상 |
| R6C-02 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-03 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-04 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-06 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-08 | VERIFIED | 확인 — 추가 조치 없음 |
| R6C-11 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-01 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-02 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-03 | INSUFFICIENT | MASTER S9 Step 3 (g) 추가, AI §7 제목 CAP-01~09 |
| R7-04 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-05 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-06 | INSUFFICIENT | R6B-18과 동일 |
| R7-07 | INSUFFICIENT | §2.1 두 행 전 셀 명시 |
| R7-08 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-09 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-10 | VERIFIED | 확인 — 추가 조치 없음 |
| R7-11 | INSUFFICIENT | §2.2를 DB 이벤트 이름으로 재작성 + effects.kind 열, DB 이벤트 9종 추가(R8-02) |
| R7-12 | VERIFIED | 확인 — 추가 조치 없음 |

### 11.2 신규 R8-01~10

| ID | 심각도(Codex) | 판정 | R9 조치 |
|---|---|---|---|
| R8-01 | High | ACCEPTED | §2.1 전 셀 보완 + 자동 모드 도출표 |
| R8-02 | Critical | ACCEPTED | DB 이벤트 목록에 AuditSignal·ProcessObserved·McpCallObserved·ToolServerAction·HookToggled·SettingsFileChanged·InstructionFileChanged·SessionRegistered·ExternalSessionImported 추가, effects.kind에 db_migration·deploy 추가, §2.2 category→kind 열 |
| R8-03 | High | ACCEPTED | AC-P10a-5·SE-01a S4 사전조건 |
| R8-04 | High | ACCEPTED | DB §4 백업 항상 암호화, pending_inputs 복원 규칙 |
| R8-05 | High | ACCEPTED | CHECKLIST U5 정정 |
| R8-06 | High | ACCEPTED | AC-V1-8~10 재정의(unsupported=N/A+범위 변경 보고, 앱 MCP/플러그인 경로 분리), MASTER 범위 축소 규칙 |
| R8-07 | Medium | ACCEPTED | V1 게이트에 AC-P09-1~4, T5b P11b 전 완료 명시 |
| R8-08 | Medium | ACCEPTED | 원본 스키마 보존 + §9.3 externalSandbox 반영 |
| R8-09 | Medium | ACCEPTED | PB P01 중복 제거, SessionRegistered/ExternalSessionImported 생산 이벤트 |
| R8-10 | Low | ACCEPTED | PLANNING_STATUS 표기 예외 명시, LIM 이력 MVP-Core |

### 11.3 R9 이후 상태

- (R10으로 갱신: R9 수정분은 호출 15/15 B6에서 17 VERIFIED·4 INSUFFICIENT로 재검증됨 — §13.) R9는 Codex 호출 예산(15회) 중 14회 사용 시점의 재검증(B5) 결과를 반영한 수정 패스다. **R9 수정분 자체는 Codex가 재검증하지 않았다**(예비 1회는 구현 착수 전 사용자 요청 시 사용). 따라서 R9 변경(SEC §2.1 28셀·§2.2·DB 이벤트 9종·AC-V1-8~10 재정의·백업 계약)은 "Claude 반영, Codex 미검증" 상태로 표시하며 IMPLEMENTATION_APPROVAL_CHECKLIST A항에 그 사실을 둔다.
- B5 요약 의견(원문 §12): "U1·U5·U8·U9 결정이 내려져도 현재 문서로는 제품 구현 착수 게이트를 통과시키기 어렵다. P00의 검증 작업 범위는 별도로 진행 가능하다." — Claude도 동의: 구현 착수 승인은 **P00(스파이크)까지**를 우선 대상으로 하고, P01 이후는 P00 결과·R9 변경의 Codex 재검증 후 재승인하는 2단계 승인을 CHECKLIST에 반영했다.
- 잔존 사용자 결정: U1·U5(선택지 정정됨)·U8·U9. 합의 확인 항목 U2·U3·U4·U6·U7은 체크리스트 B에서 별도 표시.

## 12. B5 Codex 응답 원문 보존 (response.md 바이트 일치)

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

## 13. B6 독립 최종 검증(호출 15/15, `codex/R10_final_verify_1`) 판정과 R10 조치

- 세션: B6 신규(독립), thread `<thread-id>`, 2026-11-01 15:05~15:12Z, exit 0, 29,974B. 범위: Part A = R9 수정분 재검증, Part B = 사용자 결정(U1 b·U5 보류·U8 c·U9 a·C5·C7) 반영 일관성.
- 결과: Part A **VERIFIED 17 / INSUFFICIENT 4 / NOT_APPLIED 0**. Part B 신규 **R10-01~14**(High 9·Medium 4·Low 1): 모순 8·잔존 4·누락 2. Codex 의견: "P00은 별도 착수 요청과 첫 push 전 R22 점검을 전제로 준비할 수 있다." 사용자 결정 재검토 권고 없음.

### 13.1 Part A — INSUFFICIENT 4건과 R10 조치

| ID | B6 판정 요지 | 판정 | R10 조치 |
|---|---|---|---|
| R4C-03 / R6C-01 / R8-01 | §2.1 Codex MCP 셀이 `ENFORCED(allowlist)`와 "공유 홈이면 UNVERIFIED→S9"를 동시에 적고 §6은 기본 상속을 POLICY_ONLY라 함 — 기본 공유 홈(U9 a)의 보장값 불일치 | ACCEPTED(3건 동일 원인) | SECURITY §2.1 Codex 엄격·일반 MCP 셀을 **기본(공유) POLICY_ONLY / 격리 옵션 조건부 ENFORCED**로 분리, 자동 모드 도출표 MCP 행 동일 수정(= R10-09) |
| R8-06 | AC-V1-7·AC-V1-10에 `unsupported → N/A + 범위 변경 보고` 분기 없음; AC-P00-9가 `AC-V1-5~7`만 가리킴 | ACCEPTED | AC-V1-7·V1-10에 분기 추가, AC-P00-9 참조 `AC-V1-5~10` |

VERIFIED 17건(R4B-23, R4C-01, R4C-16, R6B-02, R6B-18, R7-03, R7-06, R7-07, R7-11, R8-02, R8-03, R8-04, R8-05, R8-07, R8-08, R8-09, R8-10)은 추가 조치 없음. B6는 보존 스키마 파일의 크기 808,222B·SHA-256 `f72bb03a…` 일치와 `AskForApproval = untrusted | on-request | never | granular`를 재확인했다.

### 13.2 Part B — R10-01~14 판정과 조치 (전부 ACCEPTED)

| ID | 결정 | 심각도 | 문제 | R10 조치 |
|---|---|---|---|---|
| R10-01 | U8 | High | PHASE P00 18항(진입 조건)이 여전히 "쓰기·무인 실행 비활성화 반영"을 요구, AC-P00-7b pass 조건 불명확 | P00 18항을 "S4 판정 기록 → 보장 하향 → `capabilities.isolation_warning` 등록"으로, AC-P00-7b를 조합 합격/불합격 + AC 통과 조건(판정 기록·표 갱신·등록, 조합 불합격 ≠ P00 실패)으로 재작성 |
| R10-02 | U8 | High | R14·R19 완화책이 이전 제한안("무인은 WSL2/VM", "격리 조합 한정 + S4 차단")을 현행처럼 기술 | R14·R19를 과거 권고(이력) + 현행(경고·1회 확인·보장값 표시·SE-08/09)로 구분, R19 Critical 유지 |
| R10-03 | U1 | High | TECH_STACK 결정표가 "MVP-Core 기본 API key"를 결정으로 표시 | 행을 CLI 로그인 재사용 기본·API key 선택으로 수정, §미결 항목에 결정 표기 |
| R10-04 | U1 | High | AGENT_INTEGRATION Claude 인증 행 기본값이 `ANTHROPIC_API_KEY` | Claude 행 기본 = CLI 로그인 재사용, API key 선택(R21) |
| R10-05 | U1·U9 | Medium | FINAL 메타 "미결(사용자 결정)", ADR-0007 결과, PRODUCT 모순 12가 결정 전 의미 | FINAL 메타를 결정 완료로, ADR 결과를 (b) 결과 + 과거 분석으로, PRODUCT 모순 12를 해소 표기 |
| R10-06 | U5 | High | MASTER S7 Step 2·USAGE §3·PHASE 담당이 Codex 측 skill 주입·LOAD_OBSERVED 실험을 수행하는 것으로 읽힘 | S7 Step 2를 Claude 측 주 실측 / Codex 측 `.system` 발견만으로 재작성, USAGE §3.3 조건부, PHASE 담당 "S7(스키마 diff; 스킬 증거는 Claude 측)" |
| R10-07 | U5 | High | Codex 구현 Task가 "주도 스킬 없으면 VERIFYING 불가·BLOCKED(skill_missing)" 규칙을 통과할 예외 없음 | MASTER 완료 규칙·ROUTING 실패 규칙·PRODUCT REQ-DEV-02에 **U5 보류 기간 Codex 예외**(`skill_unavailable(codex,U5)` 사유 + Claude 교차 리뷰 + 테스트 증거) 명시 |
| R10-08 | U5 | Medium | OPEN U5·CHECKLIST U5의 "현황: 52개 존재·정리 결정 필요"가 삭제 후속 기록과 불일치 | 두 칸을 이력(외부 생성 → 삭제 완료)로 갱신 |
| R10-09 | U9 | High | 기본 공유 홈 MCP 보장값 표 머리값 ENFORCED vs §6 POLICY_ONLY | 13.1 첫 행과 동일 조치 |
| R10-10 | C7·D1 | Medium | ROUTING이 개발 세션에도 적용되면서 push를 브로커 DENY 예시로 둠 — D1 개발 저장소 push 허용과 경계 불명 | ROUTING 해당 행에 제품 프로젝트 원격 Git(DENY) vs Agent Studio 개발 저장소(C7 push 허용, R22 점검)를 구분 |
| R10-11 | 승인 범위 | High | MASTER "체크리스트 전 항목 승인 이후"가 CHECKLIST의 1차 승인 범위(P00까지, C3·C9 후속)와 모순 | MASTER를 1차 승인(P00)·C3 별도·2차 승인(P01 이후)으로 수정 |
| R10-12 | U8 | Low | AC-P00-7b의 `isolation_warning` vs P01 T11·SEC의 `capabilities.isolation_warning` 이름 불일치 | AC-P00-7b·P00 18항에 정식 이름 `capabilities.isolation_warning` 사용 |
| R10-13 | U8 | High | 자동 모드 배지 문구가 "모든 변경·명령·전송을 사전 차단하지 않음"으로 단정 — §2.1 도출표의 Codex 샌드박스·앱 MCP 서버 ENFORCED와 불일치(TEST-SE-09 라벨 일치 요구) | UI·SECURITY §7·PRODUCT REQ-CAP-02 배지 문구를 "앱 승인 콜백에 의한 사전 차단 보장 없음 — 샌드박스·앱 MCP 서버 차단은 조합별 §2.1 표, 그 외는 사후 감사"로 정정(경고 강도 유지) |
| R10-14 | U8+U9 | High | 공유 `CODEX_HOME` × 자동 모드 × 사용자 MCP·Hook 존재 조합의 교차 시험 부재(R18·R20 동시 적용 공백) | TEST-SE-08 사전조건에 공유/격리 픽스처 축 추가, TEST-SE-09에 공유 홈 + 사용자 MCP·Hook 픽스처 조합 단언 추가 |

### 13.3 R10 이후 상태

- Codex 호출 예산 **15/15 소진**. R10 조치분(13.1·13.2)은 **Codex 미재검증** — 구현 착수(P00) 시 새 예산으로 재검증 대상. CHECKLIST A절 2단계 승인 문구에 반영.
- 사용자 결정 U1 (b)·U5 보류·U8 (c)·U9 (a)는 B6 검토에서 "결정 재검토 대상 아님"으로 처리됐고, B6는 R18·R20이 동시에 적용되는 조합(공유 홈 + 자동 모드)의 시험 공백만 기록되지 않은 위험으로 지적 → R10-14 조치로 흡수.
- B6 UNVERIFIED: 설치본 CLI 재실행 시 동일 스키마 생성 여부, S4·S9·SE-08/09 실측, `~/.codex/skills` 삭제·백업의 실제 상태(문서 기록만 확인), public 저장소 생성·CI·첫 push 점검(미수행).

## 14. B6 Codex 응답 원문 보존 (response.md 바이트 일치)

### 요약

- Part A: **21건 중 VERIFIED 17 / INSUFFICIENT 4 / NOT_APPLIED 0**. R9 수정은 대체로 반영됐으나, 기본 공유 `CODEX_HOME`의 MCP 보장 표기와 S9 `unsupported` 판정의 V1 AC 연결이 불완전합니다.
- Part B: **모순 8 / 잔존 문구 4 / 누락 2**. 아래 `R10-01`~`R10-14`는 서로 다른 수정 지점을 세었으며, 같은 원인을 여러 문서에서 발견한 경우 한 행으로 묶었습니다.
- 기존 **Critical 위험 R19·R20은 여전히 등록**돼 있고, 이번에 확인한 문서 불일치에는 **High가 남아 있습니다**. 이는 사용자 결정을 재검토하라는 판정이 아닙니다.
- **P00은 별도 착수 요청과 첫 push 전 R22 점검을 전제로 준비할 수 있습니다.** 다만 `MASTER`의 “체크리스트 전 항목 승인” 문구는 실제 1차 승인 범위와 먼저 맞춰야 합니다.
- 검증 대상은 **현재 디스크 문구와 보존된 스키마 파일**입니다. 실행 결과, 공급자 약관의 현행 해석, 외부 환경 상태를 실측한 판정은 아닙니다.

### Part A — R9 재검증

아래 판정은 [REVIEW_RESOLUTION §11](<D:/LLM/agent-studio/docs/planning/06_codesign/REVIEW_RESOLUTION.md:720>)의 “수정했다”는 기록이 아니라, 현재 문서의 문구를 기준으로 합니다. `INSUFFICIENT`는 수정 흔적은 있으나 계약 전체가 아직 맞지 않는 경우입니다.

| ID | 판정 (VERIFIED / INSUFFICIENT / NOT_APPLIED) | 현재 문서·위치 | 근거 인용 | 잔여 조치 |
|---|---|---|---|---|
| R4B-23 | VERIFIED | [CHECKLIST:27](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:27>) | 선택지에 “**스킬 폴더 전체**(SKILL.md·참조 문서·스크립트 …)”가 명시됐다. | R9의 선택지 범위 수정은 완료. 현재 설치 상태를 적은 같은 행의 낡은 문구는 Part B `R10-08`. |
| R4C-01 | VERIFIED | [AC:39](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:39>), [TEST:79](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:79>) | 엄격 모드 단언에 “**S1c에서 readOnly 명령 실행 경로 실측 + S4 해당 OS·공급자 조합 합격**”이 사전조건으로 들어갔다. | 엄격 모드의 조건부 시험으로는 타당하다. 이 조건을 제품 전체의 S4 진입 차단으로 해석하지 않도록 Part B `R10-01`을 고친다. |
| R4C-03 | **INSUFFICIENT** | [SEC:76–84](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:76>), [SEC:148](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:148>) | 7행×4열 **28셀은 모두 채워졌고** 집행자·관찰·시험 또는 불확실성 표기가 있다. 그러나 기본 공유 홈인 Codex MCP 두 셀의 머리값은 “**ENFORCED(allowlist)**”인 반면, 같은 셀은 “공유 홈이면 **UNVERIFIED → S9**”라고 하고 §6은 기본 상속 집행을 `POLICY_ONLY`라고 한다. | 셀 머리값을 기본 공유 홈과 격리 옵션으로 나눠 표기한다. 28셀의 존재만으로 기본 조합의 보장 등급까지 검증됐다고 볼 수 없다. |
| R4C-16 | VERIFIED | [PHASE:66](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:66>) | P01 문장은 “**17. 증거** … **18. 진입**”으로 끝난다. P01의 항목 번호 `1`~`18`은 각각 한 번씩 나타난다. | 없음. 18개 Phase 제목과 각 Phase의 `1`~`18` 항목도 현재 문서에서 확인했다. |
| R6B-02 | VERIFIED | [PROVENANCE](<D:/LLM/agent-studio/docs/planning/evidence/codex_schema_0.166.0/PROVENANCE.md:1>), [원본 스키마](<D:/LLM/agent-studio/docs/planning/evidence/codex_schema_0.166.0/codex_app_server_protocol.v2.schemas.json:1494>) | 보존 파일의 실제 크기는 **808222 bytes**, SHA-256은 기록된 `f72bb03a3f519cd19b37a030b42453128ff5b88abaad8c1264cf1ca197dbbed0`과 일치한다. `AskForApproval`은 문자열 `untrusted`, `on-request`, `never` 또는 **`granular` 객체**다. | 이 보존 증거에서 enum을 재현할 수 있다. 설치된 CLI를 재실행해 동일 파일이 생성되는지는 별도 실측 사항이다. |
| R6B-18 | VERIFIED | [DB:64](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:64>), [DB:91](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:91>) | `pending_inputs.text_enc`가 “원문 — 앱 키링 키로 AES-GCM 암호화”이고, 백업에는 암호문 열이 포함된다. 키가 없으면 행을 폐기하고 재입력을 요청한다. | 문서 계약상 원 지시 전달과 백업·복원 규칙이 연결됐다. |
| R6C-01 | **INSUFFICIENT** | [SEC:86–98](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:86>), [TEST:90](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:90>) | 승인 콜백을 제거하는 **자동 모드 재계산 규칙**과 도출표, TEST-SE-09의 UI 라벨 단언이 생겼다. 다만 도출표의 Codex MCP는 `ENFORCED(allowlist)`로 고정돼 기본 공유 홈의 `UNVERIFIED→POLICY_ONLY` 설명과 맞지 않는다. | 자동 도출표에도 **공유 기본 / 격리 옵션**을 별도 값으로 반영한다. |
| R7-03 | VERIFIED | [MASTER:122–125](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:122>), [AI:118](<D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:118>) | `CapabilityProbeResult`가 `CAP-01`~`CAP-09`이고 S9 Step 3에 “**(g) CAP-09 — 공유 vs 임시 분리 CODEX_HOME**” 비교가 있다. §7 제목도 `REQ-CAP-01~09`다. | 없음. |
| R7-06 | VERIFIED | [DB:64](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:64>) | R6B-18과 같은 `text_enc`·항상 암호화·키 부재 시 재입력 계약으로 해결됐다. | 없음. |
| R7-07 | VERIFIED | [SEC:83–84](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:83>), [SEC:98](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:98>) | “**앱 MCP 서버 정식 호출 경로**”와 “**그 외 OS 입력 경로**”가 별도 셀이다. 자동 모드 설명도 앱 MCP 경로를 예외로 명시한다. | 경로 분리 자체는 완료. 실제 감사 범위는 SE-10에서 실측해야 한다. |
| R7-11 | VERIFIED | [SEC:49–64](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:49>), [DB:42](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:42>), [DB:63](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:63>) | §2.2의 **14개 `category` 모두** 적어도 하나의 DB 이벤트 목록 이름으로 이어진다. 누락 이벤트 이름은 **0개**다. `db_migration`·`deploy`도 `effects.kind`에 있다. | 이름의 정합은 확인됐다. 실제 생산·저널 기록은 구현 시험 대상이다. |
| R8-01 | **INSUFFICIENT** | [SEC:76–98](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:76>) | 28셀과 자동 모드 표는 존재한다. 그러나 Codex MCP의 기본 공유 홈 셀은 `ENFORCED(allowlist)`와 “공유 홈이면 **UNVERIFIED → S9**”를 동시에 적는다. | R4C-03·R6C-01과 같은 보장값 불일치를 수정한다. 새 표의 존재는 검증했지만 기본값은 검증하지 못했다. |
| R8-02 | VERIFIED | [DB:42](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:42>), [DB:63](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:63>), [SEC:51–64](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:51>) | `SessionRegistered`, `ExternalSessionImported`와 요청된 감사 이벤트 7종이 DB 목록에 있다. `AuditSignal{kind}`에는 `unapproved_write`, `remote_ref_changed`, `lockfile_changed`, `external_call_detected`, `input_api_detected`가 정의됐다. | 요청된 이벤트 이름·효과 enum의 누락은 없다. |
| R8-03 | VERIFIED | [AC:39](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:39>), [TEST:79](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:79>) | SE-01a도 “**S4 해당 OS 합격**”을 요구하고, 미충족 시 SE-01a′로 대체한다. | 없음. 이는 엄격 모드의 강한 단언에만 필요한 조건이다. |
| R8-04 | VERIFIED | [DB:64](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:64>), [DB:87–91](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:87>) | “**백업 파일은 … 항상 암호화**”, `text_enc` 포함, 키 부재 시 `pending_inputs` 폐기 규칙이 연결됐다. | 없음. |
| R8-05 | VERIFIED | [CHECKLIST:27](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:27>) | U5 선택지의 복사 단위가 `SKILL.md` 단독이 아니라 **폴더 전체**로 고쳐졌다. 결정 칸에는 “**보류 — 설치 안 함**”이 있다. | 선택지 오류는 해결. 과거 “이미 존재·정리 승인 필요”가 현재 현황처럼 남은 점은 Part B. |
| R8-06 | **INSUFFICIENT** | [AC:23](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:23>), [AC:98–101](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:98>), [MASTER:55](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:55>) | AC-V1-8은 `unsupported → N/A + 범위 변경 보고`, AC-V1-9도 같은 처리를 적는다. **AC-V1-10과 AC-V1-7에는 그 분기가 없다.** AC-P00-9는 기능 실현을 아직 “`AC-V1-5~7`”로 가리키며 신설 `8~10`을 빠뜨린다. | S9에서 CAP-06·07/08 또는 앱 MCP 경로가 `unsupported`일 때의 AC 결과를 명시하고, AC-P00-9 참조를 갱신한다. 플러그인 경로와 앱 MCP 경로의 시험 분리는 이미 적혀 있다. |
| R8-07 | VERIFIED | [AC:83–89](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:83>), [AC:116](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:116>), [PHASE:95](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:95>) | V1 게이트가 `AC-P09-1~4`를 포함하고 P09 T5b를 “**P10b T1 이후, P11b 전 완료**”로 둔다. | 없음. |
| R8-08 | VERIFIED | [PROVENANCE](<D:/LLM/agent-studio/docs/planning/evidence/codex_schema_0.166.0/PROVENANCE.md:1>), [원본 스키마](<D:/LLM/agent-studio/docs/planning/evidence/codex_schema_0.166.0/codex_app_server_protocol.v2.schemas.json:19952>) | 생성 명령·버전·파일 크기·해시가 적혀 있고 보존 파일과 일치한다. `SandboxPolicy` 원본에는 `externalSandbox`가 있다. | 보존 파일로 **기록된 스키마 값**을 재현할 수 있다. 현재 설치본과의 동일성은 P00 S7 대조 대상이다. |
| R8-09 | VERIFIED | [PHASE:66](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:66>), [DB:42](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:42>) | P01의 중복 `17`이 사라졌고 `SessionRegistered`·`ExternalSessionImported`가 `sessions` 투영의 생산 이벤트로 적혔다. | 없음. |
| R8-10 | VERIFIED | [PLANNING_STATUS:8](<D:/LLM/agent-studio/docs/planning/PLANNING_STATUS.md:8>), [LIM:18](<D:/LLM/agent-studio/docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md:18>) | `on-failure`·`onRequest`·plain `MVP`는 “**당시 응답 요지 이력**”이라는 표기 예외가 있고, 현행 동시 수정값은 “**MVP-Core: 프로젝트당 1개**”다. | 활성 설계 문서에서 `onRequest`·`on-failure`를 설정값으로 사용한 곳은 찾지 못했다. |

추가로 [DATABASE_SCHEMA](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:57>)에는 `tasks.kind`의 닫힌 목록, `agent_runs.capture_confidence`의 기본값 `uncertain`, `sessions.app_owned`, `pending_inputs.text_enc`가 모두 현재 계약으로 적혀 있습니다. [RECOVERY_TEST_PLAN §4](<D:/LLM/agent-studio/docs/planning/04_security_test/RECOVERY_TEST_PLAN.md:63>)의 MVP-Core 시험 목록도 [AC-P05-2](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:64>)와 일치합니다. 이것은 **문서 간 계약 확인**이며, 데이터베이스나 복구 기능의 실행 검증을 뜻하지 않습니다.

### Part B — 결정 반영 일관성

표에서 **모순**은 동시에 활성 규칙일 수 없는 문구, **잔존**은 결정 전 제안·옛 현황이 현재 기록처럼 남은 문구, **누락**은 결정대로 실행·검증하기 위한 예외나 교차 시험이 빠진 경우입니다. 심각도는 사용자 선택의 옳고 그름이 아니라 **문서대로 구현할 때 생기는 혼선의 크기**입니다.

| ID | 결정 | 심각도 | 문서·위치 | 문제(모순/잔존/누락) | 근거 인용 | 권고 |
|---|---|---|---|---|---|---|
| R10-01 | U8 (c) | **High** | [PHASE P00:57·63](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:57>), [AC-P00-7b](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:21>) | **모순.** S4를 “차단 게이트가 아닌 경고 데이터”라고 바꿨으나 같은 P00의 P01 진입 조건은 여전히 쓰기·무인 실행 비활성화를 요구한다. AC의 `pass` 문구도 경고 등록 시 P00 전체가 통과하는지 불명확하다. | “**S4 격리 게이트 통과 또는 불합격 조합의 쓰기·무인 실행 비활성화 반영**”; 반면 AC-P01-6은 `isolation_warning` + 1회 확인이다. | P00 항목 18과 AC-P00-7b의 통과 조건을 **S4 판정 기록 → 보장 등급 하향 → 경고·확인 등록**으로 통일한다. 엄격 모드 SE-01a의 S4 사전조건은 유지한다. |
| R10-02 | U8 (c) | **High** | [OPEN R14·R19](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:54>) | **잔존.** 결정 행과 R20은 모든 조합의 옵트인을 허용하지만, 두 위험 행의 완화책은 이전 제한안을 현재 대책처럼 쓴다. | R14: “**무인은 WSL2/VM**”; R19: “**무인 실행은 격리 가능 조합 …으로 한정, S4 격리 게이트 + P01 T11 capability 차단**.” | 두 행을 과거 권고 또는 기본 안전 모드의 설명으로 명확히 표시하고, 현행 완화책은 U8의 경고·확인·보장값 표시와 시험으로 연결한다. R19의 **Critical** 등록은 그대로 둔다. |
| R10-03 | U1 (b) | **High** | [TECH_STACK:25](<D:/LLM/agent-studio/docs/planning/01_architecture/TECH_STACK_DECISIONS.md:25>) | **모순.** 활성 기술 결정표가 선택되지 않은 인증 기본값을 결정으로 표시한다. | “**인증 모드 \| 공급자별 1급 설정, MVP-Core 기본 API key**”와 같은 행의 “사용자 결정”. | 결정 열을 **설치된 CLI 로그인 재사용 기본**, API key는 공급자별 선택·전환 경로로 고친다. |
| R10-04 | U1 (b) | **High** | [AGENT_INTEGRATION:61](<D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:61>), [같은 문서:78](<D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:78>) | **모순.** Claude 인증 행은 API key 기본, Codex 인증 행은 CLI 로그인 기본이다. 공급자별 선택지라는 결정과 별개로 **기본값**이 갈라져 있다. | Claude: “`ANTHROPIC_API_KEY`(**기본**, ADR-0007) 또는 사용자 결정에 따른 CLI 기존 인증”; Codex: “**로컬 CLI 로그인 재사용(기본 — U1 (b))**”. | Claude 행의 기본값과 ADR 참조를 현재 U1 (b)에 맞춘다. API key 불일치 시험인 MASTER Review Focus 5는 **선택적으로 API key를 설정했을 때**의 시험이므로 유지할 수 있다. |
| R10-05 | U1·U9 및 결정 상태 | **Medium** | [FINAL 메타:7](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:7>), [ADR-0007:18–19](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0007-인증-모드를-공급자별-1급-설정으로,-MVP-기본-API-key.md:18>), [PRODUCT:240](<D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:240>) | **잔존.** 세부 결정은 반영됐지만 상위 상태와 결과 설명에는 결정 전 의미가 남았다. ADR 제목과 README 제목은 메타에서 “원 제안 이력”이라고 설명돼 있으므로 그 자체를 현행 결정으로 세지는 않았다. | FINAL: “**미결(사용자 결정) \| U1 … U8 … U9**”; ADR 결과: “**구독 사용자의 기대와 어긋남, API 과금**”; PRODUCT 모순 12: “**MVP-Core 기본 API key**”. | FINAL 메타를 결정 완료로 바꾸고 ADR 결과·PRODUCT 모순 행을 **U1 (b)의 현재 결과와 과거 분석**으로 구분한다. |
| R10-06 | U5 보류 | **High** | [MASTER S7 Step 2](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:113>), [USAGE §3:59](<D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:59>), [PHASE P00:63](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:63>) | **모순.** 각 문서의 단서에는 Codex 측을 `.system` 발견까지만 하거나 V1 이후 재결정한다고 적지만, 선행 단계와 담당 표기는 여전히 Codex의 skill 입력·`LOAD_OBSERVED` 실험을 수행하는 작업으로 읽힌다. | MASTER Step 2: “`skills/list` → `{type:"skill"}` 입력 수락 → … `LOAD_OBSERVED` **각 1회**” 뒤에 “**Claude 측만 실측, Codex 측은 `.system` … 발견만**”; USAGE §3: “**P00 S7에서 skill 입력 주입 실측 … LOAD_OBSERVED**.” | S7의 3등급 실측 주체를 문장 첫머리부터 **Claude**로 지정한다. Codex는 `.system` 발견 목록만 기록하고, Codex 주도 스킬 주입·로드 실험은 U5 재결정 뒤의 조건부 절차로 옮긴다. PHASE의 “S7(스킬) Codex 구현”도 그 범위에 맞게 좁힌다. |
| R10-07 | U5 보류 | **High** | [ROUTING:15·58](<D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:15>), [MASTER:27](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:27>), [PRODUCT REQ-DEV-02](<D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:188>) | **누락.** Codex 세션은 설치 보류로 “스킬 없이 수행 + 사유 기록”이 기본인데, 공통 완료 규칙은 모든 Task의 주도 스킬 호출·`LOAD_OBSERVED` 이상을 요구하고, 미설치는 `BLOCKED(skill_missing)`으로 처리한다. Codex 구현 Task가 통과할 문서상 예외가 없다. | ROUTING 5: “**Codex 세션은 ‘스킬 없이 수행 + 사유 기록’이 기본**”; 실패 규칙: “**스킬 미설치 … `BLOCKED(skill_missing)`**”; MASTER: “**모든 Task·단계는 주도 스킬 1개 명시 호출 … 없으면 VERIFYING 통과 불가**.” | U5 보류 기간의 **Codex 구현·리뷰 Task 완료 규칙**을 명시한다. 사유 기록·교차 리뷰·테스트 증거로 어떤 게이트를 대체하는지, 제품의 선택적 스킬 기능과 개발 세션 규칙을 각각 지정해야 한다. |
| R10-08 | U5 보류 | **Medium** | [OPEN U5:17](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:17>), [CHECKLIST U5:27](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:27>), [PLANNING_STATUS:131](<D:/LLM/agent-studio/docs/planning/PLANNING_STATUS.md:131>) | **잔존.** 선택·삭제 완료를 같은 문서의 다른 칸에서 말하면서, 앞 칸은 52개가 현재 존재해 정리 결정을 기다린다고 표현한다. 이는 PLANNING_STATUS의 후속 기록과 맞지 않는다. | OPEN: “**52개 폴더가 이미 생성돼 있음 … 사용자가 설치본 유지/정리 여부를 함께 결정해야 함**”; CHECKLIST: “**현황: … 이미 존재 … 사용자 확인 필요**”; 후속 기록: “**14:57Z … 52개 폴더 삭제**.” | 앞 칸을 **결정 전 시점의 이력**이라고 표시하거나 현재 현황으로 갱신한다. 백업 보존 기록은 유지한다. |
| R10-09 | U9 (a) | **High** | [SEC §2.1:82](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:82>), [SEC §6:148](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:148>) | **모순.** 기본 공유 홈의 MCP 보장 수준을 표 머리값은 `ENFORCED`, §6은 `POLICY_ONLY`로 읽히게 한다. 공유 홈에서 `-c`가 기존 MCP 항목을 제거하는지도 S9 전에는 미확인이다. | §2.1: “**ENFORCED(allowlist)** — 집행자: 분리 프로필 + `-c mcp_servers` (**공유 홈이면 UNVERIFIED → S9**)”; §6: “**기본 실행 = 사용자 설정 상속 … 브로커 DENY(집행은 POLICY_ONLY)**.” | Codex 엄격·일반 MCP 두 셀을 **기본 공유 홈: `POLICY_ONLY`/제거 효과 `UNVERIFIED`**, **프로젝트 격리 옵션: 조건부 `ENFORCED`**로 분리한다. D19의 공유 기본값은 유지한다. |
| R10-10 | C7·D1 | **Medium** | [ROUTING:6·60](<D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md:6>), [CHECKLIST D1:47](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:47>) | **모순.** 라우팅 정책은 개발 세션에도 적용된다고 하면서 `push`를 스킬이 요구할 때 Broker `DENY` 대상으로 예시한다. D1은 개발 public 저장소에 커밋마다 push를 허용한다. 실제 주체가 다르면 문서에서 경계를 밝혀야 한다. | ROUTING: “**적용 대상 … Agent Studio를 개발하는 Claude Code·Codex 세션**”, “**스킬이 금지 동작 요구(전역 설치, push 등) … 브로커가 DENY**”; D1: “**push는 C7 결정에 따라 … 커밋마다 허용(개발 저장소 한정)**.” | 개발 저장소의 C7 push 절차와 **제품 ApprovalBroker가 통제하는 프로젝트 원격 Git**을 라우팅 규칙에서도 명시적으로 구분한다. 첫 push 전 민감 정보 점검은 [C7](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:41>), [R22](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:62>), [PHASE P00 선행](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:50>)에 구체적으로 기재돼 있다. |
| R10-11 | E 기록·1차 승인 범위 | **High** | [MASTER Global Constraints:21](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:21>), [CHECKLIST:5·37·43](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:5>), [PLANNING_STATUS:125](<D:/LLM/agent-studio/docs/planning/PLANNING_STATUS.md:125>) | **모순.** CHECKLIST·PLANNING_STATUS는 1차 승인을 P00으로 한정하고 C3·C9를 후속 승인으로 두는데 MASTER는 “전 항목 승인 이후”에만 구현 착수한다고 한다. | MASTER: “**IMPLEMENTATION_APPROVAL_CHECKLIST.md 전 항목 승인 이후**”; CHECKLIST: “**1차 승인 범위 = P00까지**”, C3·C9는 `[ ]`; PLANNING_STATUS: “**1차 범위 P00**”. | MASTER를 **P00 1차 승인, C3 필요 시 별도 승인, P01 이후 2차 승인**이라는 체크리스트의 범위에 맞춘다. E의 사용자 결정 기록 자체는 CHECKLIST·OPEN·PLANNING_STATUS에서 일치한다. |
| R10-12 | U8 (c) | **Low** | [AC-P00-7b](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:21>), [PHASE P01 T11](<D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:66>) | **잔존.** 이전 `write_disabled`·`unattended_disabled` 활성 참조는 찾지 못했으나, capability 이름이 AC-P00-7b에서는 짧은 `isolation_warning`, P01 T11·SEC에서는 `capabilities.isolation_warning`으로 적힌다. | AC: “**`isolation_warning` 등록**”; PHASE: “**`capabilities.isolation_warning`으로 등록**.” | 같은 필드를 가리킨다면 AC와 보고서 계약에 정식 이름 `capabilities.isolation_warning`을 쓴다. |
| R10-13 | U8 (c) | **High** | [UI:108](<D:/LLM/agent-studio/docs/planning/00_product/UI_UX_SPECIFICATION.md:108>), [SEC:90–96](<D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:90>), [TEST-SE-09](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:90>) | **모순.** 자동 모드 배지 문구가 모든 파일 변경·명령·전송을 사전에 차단하지 않는다고 단정한다. §2.1 도출표는 Codex 샌드박스의 외부 파일·네트워크와 앱 MCP 정식 경로에 조건부 또는 지속 `ENFORCED`를 부여한다. TEST-SE-09는 UI 라벨과 표의 일치를 요구한다. | UI: “**파일 변경·명령 실행·외부 전송을 사전에 차단하지 않습니다. 변경은 사후 감사로만 표시**”; SEC: 자동 모드의 네트워크는 “**ENFORCED(S4)**”, 앱 MCP 서버는 “**ENFORCED**”. | 배지를 **앱 승인 콜백을 통한 사전 차단 보장은 없고, 샌드박스·앱 서버의 차단은 조합별 표를 따른다**는 문구로 정확히 연결한다. 경고 강도를 낮추라는 뜻은 아니다. |
| R10-14 | U8 (c) + U9 (a) | **High** | [TEST-SE-08·09](<D:/LLM/agent-studio/docs/planning/04_security_test/TEST_STRATEGY.md:89>), [AGENT_INTEGRATION:77](<D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:77>) | **누락.** 자동 모드 시험은 모드별이고, 공유 홈 시험은 설정 상속별이다. **사용자 MCP·Hook이 상속된 공유 홈에서 자동 모드를 켠 조합**을 독립된 시험 전제·예상 보장값·감사 신호로 지정하지 않았다. | SE-08 전제: “**모드별(엄격/일반/자동)**”; SE-09 전제: “**신뢰 프로젝트, 사용자가 자동 모드 옵트인**”; 공유 기본 행: “**Desktop … MCP 상속**”. | SE-08/09에 `공유 CODEX_HOME × 자동 모드 × 사용자 MCP·Hook 존재` 픽스처를 추가하고 §2.1의 공유 기본 보장값과 UI 배지를 함께 단언한다. |

**일치한 결정도 분명합니다.** U8의 모든 조합 옵트인과 안전 기본값은 [FINAL D11·D13](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:23>), [PRODUCT REQ-CAP-02](<D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:213>), [AC-P01-6·AC-P02-6](<D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:31>)에 반영돼 있습니다. U9의 공유 기본과 `sessions.app_owned` 필터는 [FINAL D19](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:31>), [AGENT_INTEGRATION 세션 행](<D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:74>), [DB](<D:/LLM/agent-studio/docs/planning/02_agents_state/DATABASE_SCHEMA.md:60>)에서 연결됩니다. U1은 [ADR-0007 결정문](<D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0007-인증-모드를-공급자별-1급-설정으로,-MVP-기본-API-key.md:12>)과 [FINAL D20](<D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:32>)에 반영돼 있습니다. C5는 [CHECKLIST:39](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:39>)와 [MASTER P00 보고:129](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:129>)에서 모두 **상한 없음·보고만**입니다. D5의 **개발 세션 비자동 모드**도 [CHECKLIST:51](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:51>)과 [MASTER:24](<D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:24>)에서 일치하며, 제품 사용자의 U8 옵트인을 취소하는 문구로 읽을 필요는 없습니다.

### 기록되지 않은 위험 (결정을 뒤집지 않는 범위)

R18은 공유 홈의 사용자 MCP·Hook 노출을, R20은 자동 모드에서 승인 계층이 사라지는 위험을 **각각** 기록합니다. 현재 문서에는 두 결정이 **동시에 적용될 때**의 시험 조건이 명시되지 않았습니다. 공유 `CODEX_HOME`을 기본으로 사용하면서 자동 모드를 켠 프로젝트에서, 이미 설치된 MCP·Hook이 어떤 도구를 실행하고 어떤 `McpCallObserved`·`AuditSignal`을 남기는지가 그 조건입니다. `R10-14`의 교차 시험과 `R10-09`의 기본 보장값 수정이 이 공백을 메웁니다. 이는 U8·U9 선택을 되돌리는 제안이 아닙니다.

C7의 공개 저장소 결정에 대해서는 **첫 push 전 점검 대상이 구체적으로 기록**돼 있습니다. [CHECKLIST C7](<D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:41>)은 홈 경로·사용자명, 지시서 전문, Codex 원문·thread id, settings 키 목록을 열거하고, [R22](<D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:62>)는 비밀 0건 스캔과 필요 시 마스킹 커밋을 요구합니다. 이번 검토에서 확인한 결함은 점검의 부재가 아니라 **개발 push 허용 규칙과 라우팅 문구의 경계**(`R10-10`)입니다.

### UNVERIFIED

- [PROVENANCE](<D:/LLM/agent-studio/docs/planning/evidence/codex_schema_0.166.0/PROVENANCE.md:1>)의 **보존 파일·크기·해시·JSON 값**은 이 검토에서 확인했습니다. `codex-cli 0.166.0`을 현재 설치 환경에서 재실행해 같은 파일을 생성하는지, 이후 버전에서 값이 같은지는 확인하지 않았습니다.
- S4의 실제 OS·공급자별 파일·네트워크 차단, S9의 플러그인·스킬·MCP 상속, `-c mcp_servers`가 공유 홈의 기존 항목을 제거하는 효과, SE-08/09의 실제 감사 포착률은 **계획된 시험**이며 이번 읽기 전용 검토의 실측 결과가 아닙니다.
- `~/.codex/skills`의 52개 폴더 삭제와 백업 보존, 현재 `config.toml` 상태는 [PLANNING_STATUS 후속 기록](<D:/LLM/agent-studio/docs/planning/PLANNING_STATUS.md:131>)으로만 확인했습니다. 외부 홈 디렉터리의 현재 상태는 직접 확인하지 않았으므로 **UNVERIFIED**입니다.
- 사용자 결정과 승인 범위의 **문서상 기록**은 확인했습니다. 실제 public 저장소 생성, CI 설치, 첫 push 전 민감 정보 검사, C3·C9의 후속 승인, P00 착수는 이 문서 검토로 수행되거나 검증되지 않았습니다.
