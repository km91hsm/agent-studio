# 구현 검토 요청: P01 묶음 A — 계약 패키지·저널·Scheduler·Broker·격리 게이트·스킬 관찰자

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 검토해 주세요. 파일을 수정하지 마세요. `node_modules`, `packages/protocol/codex-schema/**`(스키마 번들 469개 파일, 이동만 됨), `spikes/fixtures/**/*.jsonl`(녹화 원문)은 통째로 읽지 말고 필요한 줄만 grep 하세요.

## 대상

`docs/plans/P01.md`의 Task 1~8(= PHASE_BREAKDOWN T1·T10·T9·T3·T4·T5·T11·T12) 구현. 커밋 범위 `a7f43cd..cd9e8e1`(main). 계획 말미 "Codex 계획 검토 반영" 판단표(당신의 P01_PLAN 리뷰 17건 반영 결과)도 대조 대상입니다.

변경 파일(스키마 번들·녹화 제외):

- 워크스페이스: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.github/workflows/ci.yml`(job `codex-schema-diff`), `packages/{protocol,core}/package.json`, `apps/{daemon,shell,renderer}/package.json`, `apps/renderer/tsconfig.json`
- 계약(`packages/protocol/src/`): `index.ts`, `gateway.ts`(AgentGateway·GatewayEvent 10종), `events.ts`(EVENT_TYPES 68·JournalEvent·NewEvent), `events.test.ts`(DATABASE_SCHEMA 문단 자동 대조), `ulid.ts`, `task-transitions.json` + `transitions.ts` + `transitions.test.ts`(PHASE_MANAGEMENT mermaid 자동 대조), `policy.ts` + `policy.schema.json` + `default-policy.json` + `policy.test.ts`, `../projections.md`(투영 열 대응·payload 계약·precondition 집행 수준), `../codex-schema.test.ts`, `scripts/gen-transitions.ts`
- 코어(`packages/core/src/`): `gateway/{fixtures,fake-gateway}.ts`, `journal/{event-store,memory-store,sqlite-store,projections}.ts`(+ tests), `scheduler.ts`(+ test), `approval-broker.ts`, `approval-coordinator.ts`(+ tests), `isolation.ts` + `../isolation-warnings.json`(+ test), `skills/observer.ts`(+ test), `workspace.test.ts`

## 근거 문서

- `docs/plans/P01.md` Task 1~8 Interfaces·Step·"Codex 계획 검토 반영" 표
- `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P01-1(전이 단일 경로·fencing), AC-P01-2(저널 재생·투영), AC-P01-6(격리 경고 확인), AC-P10a-6(수동 스킬 증거)
- `docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md` §2(모듈 인터페이스), `docs/planning/02_agents_state/DATABASE_SCHEMA.md`(이벤트 목록·투영·append-only·재생 불변식), `docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md` §2(전이 규칙표·precondition·불변식), `docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md` §1, `docs/planning/04_security_test/SECURITY_MODEL.md` §2(14행 매트릭스·2.2 분류 계약)·§2.1, `docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md` §3·§4

## 관점

1. **계약 누락**: `packages/protocol` export 가 SYSTEM_ARCHITECTURE §2 표·AGENT_INTEGRATION §1 코드 블록과 어긋나는 곳. GatewayEvent 10종 필드, JournalEvent envelope 필드, EventStore 서명(`append→JournalEvent`, `subscribe(fromSeq, cb)`), Scheduler/ApprovalBroker/PolicyGate 공개 메서드가 계획 Interfaces 와 동일한지. P01 에서 의도적으로 뺀 것(RPC·token-store·Shell 은 묶음 B/C)은 제외.
2. **전이표 문서 불일치**: `task-transitions.json`·`transitions.ts`(USER/DAEMON/LEASE 이벤트 분류, precondition 13종)·`scheduler.ts`의 실제 동작이 PHASE_MANAGEMENT §2 표·다이어그램과 다른 곳. 특히 (a) 테스트의 mermaid 파서가 놓칠 수 있는 간선(`DIAGRAM_OMITS` 로 제외한 compare_blocked 4간선의 타당성, alias `iteration>=max`), (b) REWORK 진입 iteration+1·BLOCKED/QUEUED/종결 진입 시 lease 해제 규칙이 문서와 같은지, (c) `approved → $resume` 복귀 대상(`resumeFrom`)이 모든 approval_needed 출발 상태를 덮는지, (d) `PRECONDITION_IDS` 중 P01 미집행 항목이 `PreconditionUnenforced` throw 로 끝나는 것이 AC-P01-1 과 양립하는지.
3. **fencing 우회**: `Scheduler.transition(taskId, event, auth, …)` 에서 `auth.kind` 와 이벤트 분류 대조·`StaleWriterError`·lease 만료·heartbeat 경로에 토큰 없이 상태를 바꿀 수 있는 구멍. `ApprovalCoordinator.request/decide/tick` 가 daemon 전이를 부르는 유일 경로라는 주장이 코드에서 성립하는지(다른 모듈이 `transition(…, {kind:'daemon'})` 를 직접 호출하지 않는지). `PolicyGate.confirm` 이 저널 복원 후에도 재사용(replay) 공격에 안전한지(같은 request_id 재확인).
4. **정책 기본값이 SECURITY §2 와 다른 곳**: `DEFAULT_POLICY` 14행(default verdict·scope·exceptions·separateApproval)을 SECURITY_MODEL §2 표 행별로 대조. `evaluateRule`/`matchException` 의 첫 일치 규칙이 표의 조건 순서와 맞는지. `isAutoMode` 의 자동 모드 집합(`acceptEdits|auto|bypassPermissions|dontAsk`, codex `approvalPolicy=never`)이 U8·SECURITY §2.1 정의와 같은지.
5. **저널 불변식**: `sqlite-store.ts` append-only 트리거·`schema_version`·투영 재구축(기동 시 cursor 뒤처짐 → rebuild)·`projectionChecksum` 이 DATABASE_SCHEMA 재생 불변식을 만족하는지; `projections.md` 열 대응표(36행)가 DATABASE_SCHEMA 투영 테이블 열과 빠짐없이 일치하는지; `MemoryEventStore` 와 `SqliteEventStore` 의 `subscribe` 전달 순서·`lastSeq` 일관성.
6. **스킬 관찰자**: `skills/observer.ts` 가 EVIDENCE_SPEC §3 Claude 행(Skill tool_use + 성공 result → LOAD_OBSERVED)·Codex 행((a)+(b) = INJECTION_ACCEPTED 상한)을 넘어서는 판정을 하지 않는지, run 별 pending 상태가 메모리 누수·run 간 혼선을 일으키지 않는지.
7. **테스트가 증명하는 것**: 각 AC(AC-P01-1·2·6)를 닫는 테스트의 단언이 AC 문구를 실제로 증명하는지. 문서 자동 대조 테스트(events.test·transitions.test·projections.test)가 문서 변경에 취약한 정규식에 의존하는 곳.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |`. 그 뒤 "계약 동의표" `| 계약 | 구현 값 | 동의(OK/수정) | 근거 |`(최소: EventStore 서명, Scheduler.transition 서명·USER/DAEMON/LEASE 분류, ApprovalBroker·ApprovalCoordinator 서명, DEFAULT_POLICY 14행, PolicyGate 서명, GatewayEvent 10종, task-transitions.json 구조·precondition 13종, observer 서명). 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 와 한 문단 근거. 추정은 "추정:"으로 표시해 주세요.
