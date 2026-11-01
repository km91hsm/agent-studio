# EXECUTION_LIMITS_POLICY — 실행 제한·비용 정책

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 요구사항 | REQ-LIM-01~04, REQ-OPS-02·03, REQ-CE-06 |
| 원칙 | 아래 수치는 **제품 정책·실측 전 임시값**이며 공급자(Anthropic/OpenAI) 기본 제한이 아니다. P00·MVP-Core(P04 운영 데이터) 실측 후 §1.1 조정 규칙으로 갱신 |
| 범위 | 제품(Agent Studio가 실행하는 Task)의 한도. Agent Studio **개발 중 P00 스파이크 실호출에는 상한이 없다**(C5 — 사용량은 보고만) |

## 1. 제한값

| 항목 | 값 | 근거 | 조정 범위 | 예외 | 검증 테스트 |
|---|---|---|---|---|---|
| 작업 최대 활성 실행 시간 | **120분** | 한 Task가 2시간 넘게 자율 실행되면 사용자 검토 없는 변경 누적이 되돌리기 비용을 넘는다; 긴 작업은 Phase 분할 | 프로젝트별 30~240분 | WAITING_APPROVAL·BLOCKED·PAUSED 구간 제외(`wait_ms`) | TEST-LIM-01~03 |
| 에이전트 호출(턴) 한도 | **20분** | **설계 가설(실측 전)**: 20분 넘게 출력 없는 스트림은 멈춤·루프일 가능성이 높다; P04 운영 데이터(§1.1 턴 상한 도달률)로 갱신. 긴 빌드·테스트는 앱 실행기로 분리 | 작업 시작 전 사전 설정 시 최대 30분 | 무출력 5분 경고 | 멈춘 스트림·테스트 종료 → interrupt 이벤트 |
| 리뷰·수정 반복 | **3회** | 3회 이상 반복은 요구사항·설계 결함 신호 | 1~5회 | Diff·테스트 변화 없는 반복 2회면 조기 FAILED | TEST-CO-02·03 |
| 인프라 오류 재시도 | **2회** | **설계 가설(실측 전)**: 일시 오류는 2회 내 복구되지 않으면 장애로 보는 것이 중복 효과 위험보다 낫다; P04 재시도 성공률로 갱신 | 0~3회 | 네트워크·일시 서버 오류만. **인증·한도·불확실 효과·4xx 0회** | TEST-RC-S06·S07 |
| 동시 수정 작업(U6) | **MVP-Core: 프로젝트당 1개** | Git↔SQLite 원자성 없음, 충돌 판정 비용 | V1: 독립 worktree당 1개 + 프로젝트 최대치 | 읽기 전용 리뷰·조사는 병렬 허용 | 같은 프로젝트·다른 worktree 경합 |
| 자동 Push/Merge/Deploy | **DENY** | 비가역 외부 효과 | 명시 작업에서만 ALWAYS_ASK로 전환 | 승인에 대상·artifact·만료 고정, 포괄 승인 금지 | TEST-SE-01a·01b·08 |
| 인증 실패 | **즉시 BLOCKED(auth)** | 반복 시도는 계정 잠금 위험 | 고정 | 재인증 후 수동 재개 | TEST-AG-06 |
| 사용 한도 초과 | **즉시 BLOCKED(quota)** | 재시도는 한도 소모만 | 고정 | 다음 한도 기간에 수동 재개; `account/rateLimits`는 ChatGPT 로그인 모드 사전 경고 전용 | TEST-AG-07 |
| 불확실한 복구 상태 | **자동 재실행 금지** | 중복 외부 효과 | 고정 | 효과 대조로 안전이 입증된 순수 읽기 작업만 자동 재개 | TEST-RC-S05·S13 |
| 실시간 승인 대기 | **15분** 후 거절 응답 + 턴 중단 → `BLOCKED(approval_expired)` | 공급자 요청 수명·연결 보장 없음 | 5~60분 | 승인 카드는 이력; 복귀 시 §6 재개 절차(새 run·새 요청) | TEST-BG-05, RF-02 |
| Lease TTL / heartbeat | **90s / 20s** | Windows 절전·GC 오탐 여유 | 측정 후 조정 | 승인 대기 중 영구 연장 금지 | TEST-RC-S15 |
| 토큰 한도(임시 기본값) | 작업 **3M**(입력+출력), 일 **30M**, 프로젝트 월 **300M** | **설계 가설**: 비용 미제공 환경 대안(§5); 자릿수 근거는 대형 문서 검토 호출 1회 입력 ≈1.4~2.4M 토큰(캐시 포함, `archive/codex/*/meta.json`). P04 실측 후 갱신 | 프로젝트별 | 초과 시 턴 경계 중단 → BLOCKED(budget) | TEST-LIM-04(TEST_STRATEGY §2.7) |

### 1.1 조정 규칙(규모별)

| 신호(측정 항목) | 조건 | 조정 |
|---|---|---|
| 턴 상한 도달률 | 최근 20 Task 중 >20%가 20분 상한에서 interrupt | 사용자에게 30분 사전 설정 제안, 긴 빌드는 앱 실행기 분리 제안 |
| 작업 활성 시간 중앙값 | >60분 | Phase 분할 제안(재계획 Task) |
| 리뷰 반복 평균 | >2.0 | 계획 단계 교차 검토 강화(PlanReview 필수) |
| 토큰 한도 도달 | 일 한도 80% | 경고 배지, 새 Task 시작 확인 |
| 표시 동작 | 상한 초과 | Task 카드에 사유 코드·남은 한도·재설정 경로 표시 |

## 2. 재시도 vs 리뷰 반복 구분 (REQ-LIM-02)

| 카운터 | 증가 조건 | 상한 | 초과 시 |
|---|---|---|---|
| `retry_count`(인프라) | 네트워크·일시 서버 오류 후 동일 요청 재전송 | 2 | BLOCKED(network) |
| `iteration`(리뷰·수정) | REVIEWING→REWORK 전이 | 3 | FAILED |
| `rework_no_change` | REWORK 후 diff·테스트 결과 동일 | 2 | FAILED(조기) |
| `approval_wait` | 개별 승인 요청 대기 | 15분 | BLOCKED(approval_expired) |

## 3. 오류 분류 (REQ-LIM-03)

| 클래스 | Claude 신호 | Codex 신호 | 재시도 | 상태 |
|---|---|---|---|---|
| auth | `result`/`error` payload의 인증 오류, 401 | 인증 오류, `codex login` 요구 | 0 | BLOCKED(auth) |
| quota | `SDKRateLimitEvent rejected`, 429 | `UsageLimitExceeded` | 0 | BLOCKED(quota) |
| transport | `system/api_retry{overloaded,server_error}` | `HttpConnectionFailed`(연결 실패), `ResponseStreamDisconnected` | ≤2(지수 백오프+지터) | 재시도 → BLOCKED(network) |
| upstream_http | 5xx | `HttpConnectionFailed`의 5xx | 1 | 재시도 → BLOCKED(network) |
| client_http | 4xx(401·429 제외) | 4xx | 0 | BLOCKED(protocol) |
| overload | — | `-32001`(WebSocket ingress 큐 포화; stdio 전송에서는 발생하지 않음) | 대기 후 1 | BLOCKED(network) |
| tool | 도구 실행 오류(테스트 실패 등) | `commandExecution` exit≠0 | 0(에이전트가 처리) | 작업 계속/REWORK |
| protocol | 스키마 불일치, 예상 밖 이벤트 | 동일 | 0 | BLOCKED(protocol) + 버그 리포트 |
| effect_uncertain | 효과 요청 후 응답 유실 | 동일 | 0 | WAITING_APPROVAL(효과 대조) |
| internal | 데몬 예외 | — | — | BLOCKED(internal) |

## 4. 시간 계산 규칙

- 세 시계를 분리 저장: `active_ms`(작업 상한 대상), `wait_ms`(승인·일시정지 wall-clock), `turn_ms`(턴 상한 대상). **역할 분리**: 실행 중 구간 측정은 프로세스 단조 시계, 저널에는 각 경계의 wall-clock 시각(UTC)을 함께 기록하며, 재기동 후 재계산은 저널 wall-clock만 사용한다.
- **활성 구간** = 턴 구간(`turn.started→turn.completed` / 첫 스트림→`result`) **에서 그 턴 안의 승인 대기 구간을 뺀 것**. 승인 대기 구간 = `ApprovalRequested.requested_at → ApprovalDecided.decided_at | ApprovalExpired.at`(모두 저널에 영속). 턴 안에서 10분 대기 후 승인되면 `active_ms`에는 포함되지 않는다.
- 턴 상한(20분)은 `turn_ms`(승인 대기 포함 wall-clock)와 활성 턴 시간 중 **활성 턴 시간**에 적용; 승인 대기 중에는 턴 타이머가 정지하고 15분 승인 만료 타이머만 진행.
- 재기동 복원: 저널의 턴·승인 이벤트 시각으로 `active_ms`·`wait_ms`를 재계산(TEST-LIM-02). **활성 중 재기동**(TEST-LIM-05): 마지막 이벤트 이후 재기동 시각까지의 구간은 **보수적으로 `active_ms`에 가산**(상한에 불리한 방향)하고 `time_uncertain=1`을 Task에 표시; 상한 초과 판정이 바뀌면 재개 전 사용자 확인. 승인 대기 중 재기동은 해당 구간을 `wait_ms`로만 가산.
- 예: 턴 시작 10:00, 승인 요청 10:05, 승인 10:12, 턴 종료 10:20 → `turn_ms`=20분, `wait_ms`=7분, `active_ms`=13분. 재기동이 10:15에 있었다면 10:12~10:15는 활성 중 재기동이므로 3분을 `active_ms`에 보수적으로 가산하고 `time_uncertain=1`.

## 5. 비용·사용량 (REQ-OPS-02)

| 항목 | 설계 |
|---|---|
| 수집 | Claude `usage`·`modelUsage`·`total_cost_usd`(클라이언트 추정, "Do not bill end users" 경고 표기); Codex `thread/tokenUsage/updated` 5종(`input/cached_input/cache_write_input/output/reasoning_output`, 턴 ID 상관; 누적/증분 의미 P00 실측) — `turn/completed`에는 usage 필드 없음 |
| 1차 한도 | 토큰(입력·출력 합)·호출 수·활성 시간·재시도·리뷰 횟수 — 프로젝트/일/작업 단위. 임시 기본값은 §1 토큰 행 |
| 금액 | Claude 추정치 표시; Codex는 **"금액 정보 없음"**(0원 표기 금지), 사용자가 단가표를 입력한 API key 모드에서만 추정 |
| 사전 경고 | Codex `account/rateLimits/read`, Claude `SDKRateLimitEvent allowed_warning` |
| 한도 초과 | 작업 시작 거부 또는 턴 경계에서 중단 → BLOCKED(budget) |

## 6. 재부팅·외부 변경·중복 (REQ-LIM-04)

- 재부팅 후 실행 중 작업: Recovery Manager 판정표(SESSION_RECOVERY_DESIGN §3). 자동 재개는 "세션 present·미확정 효과·아이템 없음·실행기 원장 비어 있음·git 변화 없음 **그리고 run의 `capture_confidence=complete`**"일 때만(기본값 `uncertain` → `WAITING_APPROVAL(recovery_review)`).
- `BLOCKED(approval_expired)` 재개: 만료된 네이티브 요청·턴 재사용 금지 → 효과별 상태 대조 → 완료 확정 단계 건너뛰기 → 남은 단계 재계획 → 새 run·새 승인 요청. 미기록 효과 의심 시 자동 재개 금지.
- 외부 변경이 이미 일어난 작업(push·설치·외부 API): `effects` 상태 대조 후 사용자 판단. 키를 받지 않는 외부 서비스는 자동 재시도 금지.
- 무한 루프·중복: Task당 lease 1개, fencing token(SQLite만 보호 — FS·git은 효과 대조로 보완), `rework_no_change` 조기 종료, 동일 idempotency key 재실행 거부.
