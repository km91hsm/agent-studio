# RECOVERY_TEST_PLAN — 세션·상태 복구 테스트 계획

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 요구사항 | REQ-REC-01~15, REQ-SM-10~13, REQ-CE-07, REQ-GOAL-06 |
| 설계 | `SESSION_RECOVERY_DESIGN.md` §3 판정표·§4 시나리오, `DATABASE_SCHEMA.md` §3 |
| 공통 환경 | Windows 11(MVP-Core), 테스트 프로젝트 = 소형 Node 저장소(git 초기화, 테스트 1개). 실 CLI 또는 녹화 어댑터. 데몬·Shell 분리 실행 |
| 공통 증거 | 저널 이벤트 seq 범위, `leases`/`effects`/`agent_runs` 투영 스냅숏, `git status`/`git log` 출력, 어댑터 세션 ref |

## 1. 장애 주입 도구

| 주입 | 방법 |
|---|---|
| 에이전트 비정상 종료 | 자식 프로세스(`claude`/`codex`) PID kill |
| 앱 강제 종료 | Shell 프로세스 kill(데몬 유지) |
| 데몬 비정상 종료 | 데몬 PID kill(자식 트리 정리 확인) |
| 재부팅 모의 | 데몬·자식 전부 kill + 락/포트 파일 유지 상태로 재기동 |
| 네트워크 단절 | 테스트 어댑터에서 `HttpConnectionFailed`/`system/api_retry` 이벤트 재생, 또는 방화벽 규칙(선택) |
| 인증 만료 | 녹화된 인증 오류 이벤트 재생 |
| 한도 초과 | 녹화된 `UsageLimitExceeded`/`SDKRateLimitEvent rejected` 재생 |
| Git 충돌 | 테스트 전 다른 브랜치에서 같은 파일 변경 후 머지 시도 |
| 세션 ID 손상 | 저널의 `session_ref`를 존재하지 않는 값으로 변조(테스트 DB 사본) |

## 2. 시나리오별 계획

| ID | 시나리오 | 사전 조건 | 입력(주입) | 예상 결과 | 실패 처리(예상 외 동작 시) | 검증 증거 | 자동화 |
|---|---|---|---|---|---|---|---|
| TEST-RC-S01 | Claude 정상 종료 | Task IMPLEMENTING, Claude run 진행 | 턴 정상 완료 | `result success` → `RunArtifacts` → REVIEWING, 세션 ref·usage 저장 | 전이 누락이면 Scheduler 버그 | 이벤트 `AgentRunCompleted`, `agent_runs.status=completed` | E2E |
| TEST-RC-S02 | Codex 정상 종료 | 동일(Codex) | `turn/completed completed` | 동일 | 동일 | 동일 | E2E |
| TEST-RC-S03 | 에이전트 비정상 종료(**TEST-RC-02 합격 기준**) | 턴 진행 중, 파일 쓰기 도중 | 자식 PID kill | **실행 차단 → 프로세스 종료 확정 → §3 평가(blob·효과·git) → 판정표**. 어댑터 재접속은 관찰 전용. 평가 전 새 턴 0 | 평가 전 재기동·자동 재실행 → **실패** | `RecoveryAssessment` 이벤트가 어떤 `AgentRunStarted`보다 먼저, 효과 중복 0 | E2E |
| TEST-RC-S04 | 앱(Shell) 강제 종료 | 턴 진행 중, 데몬 detached | Shell kill → 재시작 | 데몬·턴 계속, 재접속 후 `lastAppliedSeq` 이후 이벤트 수신, 누락·중복 0 | 데몬도 죽으면 S05로 분류 | WS 재접속 로그, seq 연속성 | E2E |
| TEST-RC-S05 | OS 재부팅 | 턴 진행 중, 효과 1건 `intended` | 모의: 전부 kill + 재기동(부트 ID 변조). 실제: Windows 재부팅 1회(수동, 릴리스마다) | lease 만료 여부와 무관하게 모든 미종결 run 차단 → Assessment: 세션 present·intended 있음 → `WAITING_APPROVAL`(효과 대조 결과 제시) | 자동 재실행 시 실패 | 부트 ID 변경 로그, `RecoveryAssessment{verdict}` | E2E + 수동 1회 |
| TEST-RC-S06 | 네트워크 단절 | 턴 진행 중 | (a) `HttpConnectionFailed` 연결 실패 (b) `-32001` (c) 4xx | (a) transport 재시도 ≤2 → `BLOCKED(network)` (b) overload 분류, 대기 후 1회 (c) 재시도 0 | 분류 오류·재시도 3회 이상이면 실패 | `fault.class`, 재시도 카운트 | 재생 |
| TEST-RC-S07 | 인증 만료 | 작업 시작 | 인증 오류 | 즉시 `BLOCKED(auth)`, 재시도 0, 안내 문구(`codex login`/Claude 로그인 지시) | 재시도 발생 시 실패 | 이벤트 | 재생 |
| TEST-RC-S08 | 사용 한도 초과 | 작업 중 | 한도 이벤트 | `BLOCKED(quota)`, 재시도 금지, 재개 시각 표시(제공 시) | — | 이벤트 | 재생 |
| TEST-RC-S09 | 스킬 실행 실패 | 필수 스킬 Task | 스킬 경로 제거(테스트 사본) | 앱 평가 `DISCOVERED` 미달 → 이전 run 부작용 평가 → REWORK 1회 → `BLOCKED(skill_missing)` | 완료 처리되면 실패 | `skill_evidence.verification_status` | E2E |
| TEST-RC-S10 | 테스트 중단 | 앱 테스트 실행기로 테스트 실행 중 | 테스트 프로세스 kill/타임아웃 | 부분 로그 저장; 테스트가 파일을 변경했으면 WAITING_APPROVAL, 아니면 REWORK 입력 | 변경 파일 미탐지 시 실패 | `RunArtifacts.tests=interrupted`, blob 대조 | E2E |
| TEST-RC-S11 | Git 충돌 | 충돌 유발 브랜치 | 머지 시도 | 자동 해결 없음, `WAITING_APPROVAL(git_conflict)` + 충돌 파일 목록 | 자동 해결·force 시 실패 | `git status` 충돌 마커 | E2E |
| TEST-RC-S12 | 세션 ID 복원 불가 | 종료된 Task 재개 | (a) session_ref 변조(absent) (b) 인증 만료 모의(inaccessible) (c) 일시 오류 주입(transient) | (a) `BLOCKED(session_lost)` → Checkpoint Restore **제안**(자동 실행 없음, 대화 미복원 경고) (b)(c) `BLOCKED(session_unavailable)`, 새 세션 미생성 | (b)(c)에서 새 세션 생성·"재개" 표시면 실패 | 분류 결과, UI 문구 | E2E |
| TEST-RC-S13 | 부분 완료 | 효과 3건: file_patch committed(blob=target), git_commit committed(SHA 존재), net `unverifiable` | 데몬 kill 후 재기동 | 대조로 확정된 2건 건너뜀, `unverifiable` 1건은 사용자 대조 요구(자동 건너뛰기·재시도 없음) | 2건 재실행 또는 3번째 자동 처리 시 실패 | `effects` 상태, 대조 결과 | E2E |
| TEST-RC-S14 | 승인 범위 이탈 재시작 | 승인 스냅숏(경로 A) | 재시작 후 경로 B 쓰기 요청 | 이전 승인 무효, 재승인 요청 | 자동 허용 시 실패 | `ApprovalRequested{reason:scope_changed}` | E2E |
| TEST-RC-S15 | 중복 실행 방지(fencing) | 같은 Task에 stale worker | 만료 lease 토큰으로 쓰기 시도 | 거부 + `StaleWriterRejected` | 쓰기 성공 시 실패 | 이벤트 | 단위+통합 |
| TEST-RC-S16 | 투영 재구성 | 투영 테이블 삭제(테스트 DB) | 기동 | 저널에서 투영 100% 재구성, 해시 일치 | — | 재구성 전후 비교 | 단위 |
| TEST-RC-S17 | 백업·복원 | 운영 DB | 온라인 백업 → 새 위치 복원 → 기동 | 모든 투영·저널 일치, WAL 단독 복사 경로는 거부 | — | 체크섬 | 통합 |
| TEST-RC-S18 | 전원 손실 모의(synchronous=NORMAL) | 쓰기 중 | 프로세스 강제 종료(디스크 캐시 손실은 모의 불가 → 문서화) | 마지막 트랜잭션 롤백 가능성 허용, DB 무결성 OK | 무결성 오류면 실패 | `PRAGMA integrity_check` | 통합 |
| TEST-RC-S19 | 아카이브 포함 전체 재생 | 180일 경과 저널 일부 아카이브 | 빈 DB + 활성 저널 + 아카이브로 재생 | 모든 투영 체크섬 일치 | 불일치 시 실패 | 체크섬 | 단위 |
| TEST-RC-S20 | 비충돌 dirty Git | 사용자 미커밋 변경 존재, 충돌 마커 없음 | 재기동 | `WAITING_APPROVAL`(diff) — 충돌로 분류하지 않음, 자동 되돌림 없음 | 되돌림·충돌 오분류 시 실패 | `git status`, `ls-files -u` 비어 있음 | E2E |
| TEST-RC-S21 | Phase DAG 미충족 | A→B, A IN_PROGRESS | B 실행 요청, 사이클 추가 요청 | B QUEUED 유지, 사이클 저장 거부 | B 실행 시 실패 | 전이 로그 | 단위+통합 |
| TEST-RC-S22 | `approval_expired` 복귀 시 완료 효과 건너뛰기 | 3단계 Task 중 1단계 효과 `committed`, 2단계 승인 요청 15분 만료 → BLOCKED; 추가로 미기록 공급자 효과 모의(원장 밖 파일 변경 1건) | 사용자 복귀 → 재개 | ① 원장 밖 변경 발견 → `WAITING_APPROVAL(recovery_review)` 보류, 자동 재개 금지 ② 사용자 판정(수용/되돌리기) ③ 1단계 재실행 0, 2단계부터 **새 run·새 승인 요청** | 1단계 중복 실행 또는 만료 requestId 재사용 → 실패 | `effects` 상태, 새 run ID, 승인 요청 ID 비교 | E2E |

## 3. 판정표 검증 (SESSION_RECOVERY_DESIGN §3)

| 세션 | 미확정 효과·아이템 | git 변화 | 기대 판정 | 테스트 |
|---|---|---|---|---|
| present + `capture_confidence=complete` | 없음 | 없음 | 자동 재개 허용(알림) | RC-S03 변형(마지막 아이템 확정 상태에서 kill, 파일 도구만 사용) |
| present + `capture_confidence=uncertain`(기본값; 셸·스킬 스크립트·외부 MCP·자동 허용 도구 관찰) | 임의 | 임의 | WAITING_APPROVAL(recovery_review) | RC-S03 변형 2 |
| present | 없음 | 있음 | WAITING_APPROVAL(diff) | RC-S05 변형, S20 |
| present | 있음 | 임의 | WAITING_APPROVAL(효과 대조) | RC-S05, S13 |
| transient/inaccessible | 임의 | 임의 | BLOCKED(session_unavailable) | RC-S12(b)(c) |
| absent | 임의 | 임의 | BLOCKED(session_lost) → Checkpoint Restore 제안 | RC-S12(a) |

## 4. 수용 기준

- MVP-Core 게이트(AC-P05-2와 동일 목록): S01~S05, S07, S12, S13, S15, S16, S20, S22 통과(Windows).
- V1 게이트: 전부 통과 + macOS/Linux에서 S03~S05 반복.
- 어떤 시나리오에서도 **승인 없는 외부 효과 중복 실행 0건**(push·설치·외부 서비스).

## 5. 단일 추적표 (요구 시나리오 → 상세 시험 → Phase → AC)

| 지시서 §20 | TEST-RC | 상세 | Phase | AC |
|---|---|---|---|---|
| 앱 종료 후 재개 | RC-01 | S04 | 04 | AC-P04-3 |
| 비정상 종료 후 복구 | RC-02 | S03(합격 기준), S05 | 05 | AC-P05-2 |
| 재부팅 후 복원 | RC-03 | S05(모의+실제 1회) | 05 | AC-P05-2 |
| 중복 실행 방지 | RC-04 | S15, S13 | 04 | AC-P10a-3 |
| 불확실한 복구 차단 | RC-05 | S05, S13 | 05 | AC-P05-2 |
| Git 상태 검증 | RC-06 | S11(충돌), S20(dirty) | 05 | AC-P05-2 |
| Phase 의존성 처리 | RC-07 | S21 | 06 | AC-P06-2 |
| (정상 종료·오류 분류) | — | S01·S02·S06~S10·S12·S14 | 02·04·05 | AC-P02-1, AC-P04-3 |
| (저널·백업) | — | S16~S19 | 01·10a | AC-P01-2, AC-P01-7, AC-P10a-4 |
