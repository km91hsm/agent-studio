# DATABASE_SCHEMA — SQLite(WAL) 이벤트 저널 + 투영

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 요구사항 | REQ-STATE-01~04, REQ-SM-06·07, REQ-SK-06, REQ-OPS-05, REQ-SEC-03 |
| 참고 | sqlite.org/wal("one writer at a time", WAL 동일 호스트), ADR-0005 |
| 접근 규칙 | **Orchestrator 데몬만** 연결. Renderer·어댑터·에이전트는 RPC 경유. `PRAGMA journal_mode=WAL; synchronous=NORMAL(기본)/FULL(옵션); busy_timeout=5000; foreign_keys=ON` |
| UNVERIFIED | better-sqlite3 Electron 내장 Node ABI 리빌드 절차(Phase 00) |

## 1. 원칙

1. **저널이 원본**: `events`는 append-only. 삭제·갱신 금지(보존 기간 만료 시 아카이브 파일로 이동만).
2. **투영은 파생**: `tasks`, `agent_runs`, `sessions`, `skill_evidence` 등은 저널에서 재구성 가능해야 한다(`projection_cursor`로 마지막 반영 seq 추적).
3. **단일 writer**: 데몬 내부에서도 쓰기는 하나의 큐(직렬)로 모은다. 읽기는 별 연결 허용.
4. **비밀 금지**: 토큰·API 키·자격증명은 저장하지 않는다. OS 키링 참조 ID만 저장. 저널 payload는 저장 전 마스킹 필터 통과.
5. **대화 원문 미저장**: 에이전트 메시지 본문은 세션 참조(네이티브 ID)로 공식 API에서 읽는다. 저널은 요약·해시·아이템 ID만(선택: 디버그용 원문 저장 옵션, 기본 off).

## 2. 테이블

### 2.1 저널

```sql
CREATE TABLE events (
  seq            INTEGER PRIMARY KEY,          -- 단조 증가(AUTOINCREMENT 불필요: 삭제 없음)
  event_id       TEXT NOT NULL UNIQUE,         -- ULID
  ts             TEXT NOT NULL,                -- ISO-8601 UTC
  type           TEXT NOT NULL,                -- TaskTransition, ApprovalRequested, ...
  workspace_id   TEXT, project_id TEXT, phase_id TEXT, task_id TEXT,
  agent_run_id   TEXT, session_ref TEXT,
  correlation_id TEXT,                         -- 요청/승인 묶음
  causation_seq  INTEGER,                      -- 원인 이벤트
  fencing_token  INTEGER,                      -- 쓰기 당시 lease 토큰(검증용)
  payload        TEXT NOT NULL CHECK (json_valid(payload)),
  redacted       INTEGER NOT NULL DEFAULT 0    -- 마스킹 적용 여부
);
CREATE INDEX ix_events_task ON events(task_id, seq);
CREATE INDEX ix_events_run  ON events(agent_run_id, seq);
CREATE INDEX ix_events_type ON events(type, seq);
```

이벤트 타입(최소; **이 목록이 단일 출처**): `WorkspaceCreated, WorkspaceSettingsChanged, ProjectRegistered, ProjectPolicyChanged{before,after}, ProjectSettingsChanged, ProjectTrustChanged, RequirementAdded/Changed/Removed{req_id,before,after,source}, RequirementLinked/Unlinked{req_id,phase_id|task_id}, PhaseProposed, PhaseAccepted, PhaseEdited(user), PhaseDepAdded/Removed, TaskCreated, TaskTransition{from,to,reason,implementer_agent?,reviewer_agent?}, PauseRequested, Paused, ResumeRequested, LeaseAcquired{run_id,token,ttl}, LeaseRenewed, LeaseExpired, StaleWriterRejected, AgentRunStarted{agent,session_ref,adapter_mode,permission_mode,app_owned}, AgentEvent{kind,item_id,summary}, **CaptureConfidenceChanged{run_id,level:'complete'|'uncertain',cause}**(셸·스킬 스크립트·외부 MCP·자동 허용 도구 사용 관찰 시 `uncertain`), PendingInputQueued{text_masked,hash}, **PlanArtifact{task_id,path,hash}, PlanReview{task_id,verdict,path}, ReviewReport{task_id,verdict,path}, ReworkResponse{task_id,path}**(COLLABORATION §3 산출물), ApprovalRequested{category,request,requested_at}, ApprovalDecided{decision,scope,by,decided_at}, ApprovalExpired{request_id}, **SessionRegistered{ref,agent,origin,app_owned}, ExternalSessionImported{ref,by}**(`sessions` 투영의 생산 이벤트), **AuditSignal{kind:'unapproved_write'|'remote_ref_changed'|'lockfile_changed'|'external_call_detected'|'input_api_detected', run_id, evidence}, ProcessObserved{run_id,argv_digest,cwd}, McpCallObserved{run_id,server,tool,allowed}, ToolServerAction{category:'browser'|'computer_use', action_id, target, decision}, HookToggled{hook_id,enabled,by}, SettingsFileChanged{path,hash}, InstructionFileChanged{path,hash}**(SECURITY_MODEL §2.2 감사 계약의 생산 이벤트), UserInputRequested/Answered, McpElicitation-requested/Answered, EffectIntent{idempotency_key,kind,target,intent_payload(종류별 §3)}, EffectCommitted{idempotency_key,result,external_ref}, EffectFailed, EffectUnverifiable, GitCommandRun{argv,exit_code,stderr_digest}, RunArtifacts{files[],tests}, SkillSelected{skill_id, selection_reason, invocation_mode, expected_lead}, SkillInjectionAccepted, SkillLoadObserved, SkillApplicationVerified, SkillSelectionReviewed, SkillRegistryChanged, ProjectSkillToggled, McpServerChanged, ReviewSkipped{policy}, CheckpointCreated, RecoveryAssessment{verdict}, UsageReported{agent,tokens,cost_estimate,turn_key}, ErrorRaised{class}`.

**재생 불변식**: 투영 열 ↔ 생산 이벤트·필드 대응표는 P01 T3 산출물 `packages/protocol/projections.md`로 고정하고 재생 테스트(RC-S16·S19)가 이 표를 기준으로 열 단위 검증한다(열별 payload 계약은 구현 산출물). 모든 투영 열은 위 생성·수정·삭제 이벤트와 버전별 payload(`v`)에서만 채워진다. 투영에만 존재하는 상태는 금지. 검증: 빈 DB + 활성 저널 + 아카이브(`archive/events-*.sqlite`)만으로 전체 투영을 재생해 체크섬이 일치하는 테스트(TEST-RC-S19)를 둔다.

### 2.2 투영(요약)

| 테이블 | 핵심 열 | 비고 |
|---|---|---|
| `workspaces` | id, name, settings_json | 단일 행 |
| `projects` | id, workspace_id, path, git_root, stack_json, policy_json, trust_level | REQ-PM |
| `phases` | id, project_id, title, goal, acceptance_json, status(투영), user_edited, proposal_of | |
| `phase_deps` | phase_id, depends_on | DAG, 사이클 검사 |
| `requirements` | id(REQ-*), project_id, text, status | 변경 이력은 저널 |
| `requirement_changes` | req_id, before, after, source, at, seq | `RequirementChanged` 투영(PHASE_MANAGEMENT §4) |
| `requirement_links` | req_id, phase_id/task_id | 영향 분석 |
| `tasks` | id, phase_id, title, kind(plan/research/prototype/impl/review/verify/replan — 허용 목록과 동일 enum), status, **paused**, assignee_agent, **implementer_agent, reviewer_agent**(시도별), lead_skill, iteration, worktree_path, **active_ms, wait_ms, turn_ms, time_uncertain**(LIM-05), created_seq, updated_seq | 상태 머신 |
| `leases` | task_id PK, run_id, fencing_token, expires_at, heartbeat_at | 활성 lease만 |
| `agent_runs` | id, task_id, agent, adapter_mode(sdk/app-server/exec-restricted), started_at, ended_at, status(completed/failed/interrupted), turns, usage_json, **capture_confidence**('complete'|'uncertain'; **기본값 `uncertain`**(run 시작 시), run 종료 시 관찰된 도구 집합이 파일 도구(Claude Read/Edit/Write, Codex `fileChange`)뿐이면 `complete`로 승격 — 셸·스킬 스크립트·외부 MCP·자동 허용 도구 1회라도 관찰되면 유지) | |
| `sessions` | ref PK(`claude:<uuid>` / `codex:<thread_id>`), agent, project_id, created_at, last_seen_at, title, origin(native/forked_from/handoff), **app_owned**(앱이 생성한 세션=1 — run 생성 시 설정; `thread/list` 결과 중 이 표에 없는 ref는 "외부 세션"으로 표시·기본 목록 제외) | 본문 없음 |
| `agent_run_sessions` | run_id, session_ref, role(primary/forked_from/handoff_target) | N:M |
| `approvals` | request_id, task_id, run_id, **kind(approval/user_input/mcp_elicitation)**, category, request_json, decision, scope, decided_by, requested_at, decided_at, expires_at | 인박스 |
| `effects` | idempotency_key PK, task_id, run_id, kind(file_patch/git_commit/git_push/net/pkg_install/db_migration/deploy/mcp/external_service — SECURITY §2.2 `category`와의 대응은 그 표의 열 참조), target, state(intended/committed/failed/**unverifiable**), **base_blob, target_blob, patch_hash, file_mode**(file_patch 필수), **external_ref**(외부 효과: 제공자 idempotency key 또는 조회 가능한 결과 ID), **verify_json**(확인 절차·결과), result_json | 중복 실행 방지. 종류별 필수 필드는 §3 |
| `pending_inputs` | task_id, run_id, **text_enc**(원문 — 앱 키링 키로 AES-GCM 암호화, 다음 `turn/start` 전달 시 복호, 적용 또는 Task 종료 시 행 삭제), text_masked(표시용·마스킹), text_hash(저널 대조), queued_seq, applied_seq, expires_at | `PendingInputQueued{hash}` 투영(steer 실패 대체). 사용자 지시문은 "대화 원문"이 아닌 **앱 입력**으로 분류: 원문은 `text_enc`(암호문)에만 있고 저널 이벤트에는 해시만. **백업**은 DB 전체이므로 암호문 열이 포함되며 백업 파일은 항상 암호화(§4); 복원 시 키링 키가 없으면 `pending_inputs` 행은 폐기하고 Task는 `WAITING_APPROVAL`로 재입력 요청 |
| `checkpoints` | id, scope, phase_id/task_id, git_ref, journal_seq, sessions_json, files_json, tests_json, approvals_json | |
| `skills` | id, name, repo, commit, path, hash, claude_ok, codex_ok, user_only, classification, enabled_global | Registry |
| `project_skills` | project_id, skill_id, enabled, lead_for_task_kinds_json | 프로젝트별 |
| `skill_evidence` | id, task_id, run_id, skill_id, selection_reason, invocation_mode, load_evidence_json, artifacts_json, test_json, verification_status | EVIDENCE_SPEC §2 필드와 동일, `SkillSelected`에서 재생(implicit/explicit/거부 구별) |
| `mcp_servers` | id, project_id, agent, name, config_ref, enabled, status | 비밀은 키링 참조 |
| `usage_daily` | date, agent, model, input_tokens, cached_tokens, output_tokens, reasoning_tokens, cost_estimate_usd | 집계 |
| `projection_cursor` | name PK, last_seq | 재구성 |
| `schema_version` | version, applied_at | 마이그레이션 |

## 3. 동시성·복구 장치 매핑

| 장치 | 구현 |
|---|---|
| Lease | `leases` 행 + `LeaseAcquired` 이벤트. TTL 90s·heartbeat 20s(Windows 절전·GC 오탐 여유). 승인 대기 중에는 lease를 영구 연장하지 않고 제한 시간 후 안전 중단→복구 상태 |
| Fencing Token | `leases.fencing_token` 단조 증가. 모든 쓰기 트랜잭션은 `WHERE fencing_token = ?` 검증 후 실패 시 거부·`StaleWriterRejected` 기록 |
| Idempotency Key | `effects` PK. 효과 실행 전 `EffectIntent`(종류별 intent_payload 필수), 완료 후 `EffectCommitted`. **종류별 필수 필드**: `file_patch` = 경로·`base_blob`·`target_blob`·`patch_hash`·`file_mode` → 복구 시 현재 blob=target이면 완료, =base면 재승인 후 적용, 둘 다 아니면 충돌 보류; `git_commit` = 예상 parent·tree·생성 SHA(outbox), 재기동 시 SHA 존재하면 재커밋 금지; `git_push` = 원격·ref·예상 old/new SHA, `git ls-remote`로 대조; `pkg_install` = 매니저·패키지·버전·lockfile 해시, 설치 후 lockfile 대조; `net`/`mcp`/`external_service` = **제공자 idempotency key 또는 조회 가능한 결과 ID**(`external_ref`) 없으면 `unverifiable`. **확인 불가(`unverifiable`) 효과는 자동 건너뛰기와 자동 재시도를 모두 금지**하고 사용자 대조로만 해소. Git↔SQLite 원자성 없음 → 불확실 상태 자동 재실행 금지. **앱이 포착하지 못한 효과**(에이전트 샌드박스 내 자동 쓰기, 스킬 스크립트, 외부 MCP)는 원장에 없으므로 복구 판정은 원장+git+파일 해시 대조를 함께 쓴다 |
| Heartbeat | 데몬 내부 타이머가 lease 갱신; 어댑터 이벤트 수신도 갱신 신호 |
| Event Journal | `events` |
| Checkpoint | `checkpoints` + `CheckpointCreated` |
| Recovery Manager | 기동 시: **모든 미종결 run 실행 차단**(lease 만료 여부와 무관) → `projection_cursor` 검증 → lease 회수 → `agent_runs.status IS NULL`인 run마다 `RecoveryAssessment`(프로세스 종료 확정, 세션 존재 분류, `effects.intended/unverifiable` 유무, 마지막 확정 도구 아이템, git dirty·충돌 마커, 파일 blob 대조) → 전이 제안. 자동 재개는 SESSION_RECOVERY §3 조건 전부 충족 시에만 |
| 시계 | `tasks.active_ms`(활성 턴 누적, 작업 상한 120분 대상), `tasks.wait_ms`(승인·일시정지 wall-clock, 상한 미차감), `turn_ms`(턴 상한 20분), `leases.expires_at`(TTL 90s). 승인 요청·결정·만료는 `ApprovalRequested/Decided/Expired` 시각으로 영속화되어 재기동 후 대기 구간을 복원 |

## 4. 백업·보존

- 백업은 SQLite 온라인 백업 API(또는 `VACUUM INTO`)로 수행. WAL 파일만 복사 금지.
- 보존: 저널 기본 180일, 만료분은 `archive/events-YYYYMM.sqlite`로 이동. 투영은 재구성 가능하므로 보존 대상 아님.
- 백업 파일은 사용자 지정 경로. **항상 암호화**(SECURITY_MODEL §5 "백업" 행과 동일): 키는 키링 또는 사용자 암호, `pending_inputs.text_enc` 암호문·경로 정보가 포함됨을 UI에 고지. 복원 시 키 부재 → 암호문 열 폐기 규칙은 `pending_inputs` 행 참조.

## 5. 마이그레이션

`schema_version` 기반 전진 전용 마이그레이션. 저널 payload 스키마는 이벤트 타입별 `v` 필드로 버전 관리, 구버전 payload는 읽기 시 업캐스트.
