# 투영 대응표 — 투영 열 ↔ 생산 이벤트·필드 (P01 T3, AC-P01-7)

DATABASE_SCHEMA §2.1 "재생 불변식"이 가리키는 표. **모든 투영 열은 아래 이벤트·필드에서만 채워진다**(투영에만 존재하는 상태 금지).
`packages/core/src/journal/projections.test.ts` 가 이 표의 `테이블.열` 집합을 실제 스키마(`PRAGMA table_info`)와 양방향으로 대조하고,
각 행의 생산 이벤트가 테스트 저널에 존재하며 적힌 필드가 실제로 생산됨을 단언한다(RC-S16). 필드 표기: `payload.<key>` / `envelope.<field>` / `derived`.

P01 범위의 투영은 5개 테이블(+`projection_cursor`)이다. 나머지 DATABASE_SCHEMA §2.2 테이블(`phases`, `agent_runs`, `sessions`, `effects`, `skills`, …)은 소유 Phase 가 추가하면서 이 표에 행을 더한다.

## 1. 열 대응표

| 투영.열 | 생산 이벤트 | 필드 | 비고 |
|---|---|---|---|
| `projects.id` | ProjectRegistered | payload.id | 없으면 envelope.projectId |
| `projects.path` | ProjectRegistered | payload.path | |
| `projects.policy_json` | ProjectPolicyChanged | payload.after | JSON 문자열; envelope.projectId 로 행 선택 |
| `tasks.id` | TaskCreated | envelope.taskId | |
| `tasks.phase_id` | TaskCreated | payload.phase_id | 없으면 envelope.phaseId |
| `tasks.title` | TaskCreated | payload.title | |
| `tasks.kind` | TaskCreated | payload.kind | `plan/research/prototype/impl/review/verify/replan` |
| `tasks.status` | TaskTransition | payload.to | 생성 직후는 NULL, 첫 전이(`→QUEUED`)로 채움 |
| `tasks.paused` | Paused, ResumeRequested | payload.paused | `Paused`→1, `ResumeRequested`→0 (PauseRequested 는 열을 바꾸지 않음) |
| `tasks.iteration` | TaskTransition | payload.iteration | 없으면 유지 |
| `tasks.implementer_agent` | TaskTransition | payload.implementer_agent | 없으면 유지 |
| `tasks.reviewer_agent` | TaskTransition | payload.reviewer_agent | 없으면 유지 |
| `tasks.created_seq` | TaskCreated | envelope.seq | |
| `tasks.updated_seq` | TaskTransition | envelope.seq | 마지막 전이의 seq |
| `leases.task_id` | LeaseAcquired | envelope.taskId | 활성 lease 만(LeaseExpired 로 행 삭제) |
| `leases.run_id` | LeaseAcquired | payload.run_id | 없으면 envelope.agentRunId |
| `leases.fencing_token` | LeaseAcquired | payload.token | |
| `leases.expires_at` | LeaseAcquired, LeaseRenewed | payload.expires_at | |
| `leases.heartbeat_at` | LeaseRenewed | payload.heartbeat_at | |
| `approvals.request_id` | ApprovalRequested | payload.request_id | |
| `approvals.task_id` | ApprovalRequested | envelope.taskId | |
| `approvals.run_id` | ApprovalRequested | envelope.agentRunId | |
| `approvals.kind` | ApprovalRequested | payload.kind | `approval/user_input/mcp_elicitation` |
| `approvals.category` | ApprovalRequested | payload.category | SECURITY_MODEL §2.2 enum |
| `approvals.request_json` | ApprovalRequested | payload.request | JSON 문자열(마스킹된 요청 원문) |
| `approvals.decision` | ApprovalDecided, ApprovalExpired | payload.decision, derived | 만료는 `'expired'` |
| `approvals.scope` | ApprovalDecided | payload.scope | |
| `approvals.decided_by` | ApprovalDecided, ApprovalExpired | payload.by, derived | 만료는 `'daemon'` |
| `approvals.decided_at` | ApprovalDecided, ApprovalExpired | payload.decided_at, envelope.ts | 만료는 이벤트 ts |
| `approvals.requested_at` | ApprovalRequested | payload.requested_at | 없으면 envelope.ts |
| `approvals.expires_at` | ApprovalRequested | payload.expires_at | 15분 TTL(브로커가 계산) |
| `capabilities.key` | WorkspaceSettingsChanged | payload.capabilities | `capabilities` 객체의 각 키(예: `isolation_warning`) |
| `capabilities.value_json` | WorkspaceSettingsChanged | payload.capabilities | 키별 값의 JSON |
| `projection_cursor.name` | — | derived | projector 테이블 이름 |
| `projection_cursor.last_seq` | — | envelope.seq | 마지막으로 적용한 이벤트 seq(재구성 뒤 == lastSeq) |

## 2. 투영 payload 계약(P01 생산 측)

| 이벤트 | payload | 비고 |
|---|---|---|
| `TaskCreated` | `{title, kind, phase_id?}` | envelope `taskId` 필수 |
| `TaskTransition` | `{from, to, reason?, implementer_agent?, reviewer_agent?, iteration?}` | DATABASE_SCHEMA 최소 필드 + `iteration` |
| `LeaseAcquired` | `{run_id, token, ttl, expires_at}` | `ttl` 은 ms(DATABASE_SCHEMA 필드명 유지) |
| `LeaseRenewed` | `{run_id, token, heartbeat_at, expires_at?}` | |
| `LeaseExpired` | `{run_id, token}` | |
| `ApprovalRequested` | `{request_id, kind, category, request, requested_at, expires_at}` | envelope `correlationId = request_id` |
| `ApprovalDecided` | `{request_id, decision, scope, by, decided_at}` | |
| `ApprovalExpired` | `{request_id}` | |
| `ProjectRegistered` | `{id, path}` | |
| `ProjectPolicyChanged` | `{before, after}` | |
| `WorkspaceSettingsChanged` | `{capabilities?: {isolation_warning: IsolationWarning[]}}` | T11 입력 |
| `Paused` / `ResumeRequested` | `{paused: boolean}` | |

## 3. precondition 집행 수준 (P01 최소 검사 ↔ 소유 Phase)

`task-transitions.json` 의 모든 precondition ID 는 `Scheduler` 에 검사기가 등록돼 있다(미등록 ID 가 표에 나타나면 생성 시 `PreconditionUnenforced`). P01 검사는 "저널에 근거 이벤트가 있는가 / payload 에 필수 값이 있는가" 수준이며, 내용 검증은 소유 Phase 가 같은 ID 의 검사기를 교체한다.

| ID | 쓰이는 전이 | P01 검사 | 완전 검사(소유 Phase) |
|---|---|---|---|
| `deps_completed` | QUEUED→PLANNING | 항상 true(P01 Task 는 의존성 없음) | Phase DAG 의존 Task 전부 COMPLETED (P03) |
| `slot_available` | QUEUED→PLANNING | `maxSlots` 미설정이면 true, 설정 시 활성 lease 수 < maxSlots | worktree 동시 수정 슬롯 (P05) |
| `lease_valid` | 모든 LEASE 이벤트 | `auth.kind='lease'` 이고 토큰 == 현재 활성 lease 토큰(불일치는 `StaleWriterRejected`) | 동일 |
| `plan_artifact` | PLANNING→IMPLEMENTING | 저널에 이 Task 의 `PlanArtifact` 존재 | 산출물 해시·경로 검증 (P04) |
| `skill_selected` | PLANNING→IMPLEMENTING | 저널에 `SkillSelected` 존재 | 기대 주도 스킬 대조 (P07) |
| `run_artifacts` | IMPLEMENTING→REVIEWING | 저널에 `RunArtifacts` 존재 | 변경 파일·테스트 결과 검증 (P04) |
| `review_skip_policy` | IMPLEMENTING→VERIFYING | payload `policy` 문자열 존재 | COLLABORATION §5 5번 조건 집행 (P04) |
| `reviewer_distinct` | REVIEWING→VERIFYING | payload `reviewer_agent` ≠ 저널 `implementer_agent`(둘 다 있어야 함) | 세션 단위 동일성·리뷰 산출물 존재 (P04) |
| `evidence_present` | VERIFYING→COMPLETED | payload `evidenceIds` 비어 있지 않음 | 스킬 증거 등급·AC·범위·diff 대조 (P07·P10a) |
| `iteration_lt_max` / `iteration_ge_max` | review_failed·evidence_missing·rework_started / iteration_exhausted | `iteration < 3` / `≥ 3`(REWORK 진입 시 +1) | Diff·테스트 변화 없는 반복 2회 감지 (P04) |
| `user_actor` | cancel·unblocked·user_abandon | `auth.kind='user'` | IPC 발신 검증과 결합 (T6·P10a) |
| `approval_decided` | approved·denied_terminal·approval_expired | `auth.kind='daemon'` + 저널 `ApprovalDecided`/`ApprovalExpired{request_id}` 의 task 와 결과가 이벤트에 맞고 `pendingRequestId` 와 같음 | 승인 스냅숏 범위 이탈 검사 (P10a) |
