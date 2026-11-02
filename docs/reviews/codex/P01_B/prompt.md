# 구현 검토 요청: P01 묶음 B — 데몬 엔트리·락/토큰 저장소·WS JSON-RPC 서버/클라이언트(T2) + 리뷰 A 반영 재검증

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 검토해 주세요. 파일을 수정하지 마세요. `node_modules`, `packages/protocol/codex-schema/**`, `spikes/fixtures/**/*.jsonl`, `docs/reviews/codex/**/events.jsonl` 은 통째로 읽지 말고 필요한 줄만 grep 하세요.

## 대상

1. **Task 9(T2)** 커밋 `4fc3e11`(범위 `bff7f5e..4fc3e11`):
   - `packages/protocol/src/rpc.ts`(+ `rpc.test.ts`): `RPC_METHODS` read/write/control, `RPC_PARAMS_SCHEMA`, 오류 코드, `validateParams`
   - `packages/core/src/token-store.ts`(+ test): `KeyringTokenStore`(기본, 닫힌 실패) / `FileTokenStore`(`AGENT_STUDIO_TOKEN_STORE=file` 명시 시만, `ref()` `file:` 접두, wx+rename) / `selectTokenStore` / `ensureToken`
   - `packages/core/src/daemon/protocol.ts`(S5 HMAC 상호 인증 + `role`), `lock.ts`(락 판정·원자 쓰기·프로세스 조회), `launcher.ts`(detached spawn·ensureDaemon), `rpc-server.ts`(핸드셰이크 → JSON-RPC, `events.subscribe` 배치, 메서드 디스패치, 오류 매핑, `daemon.shutdown`), `rpc-client.ts`(`DaemonClient`: lastSeq/dropped/gaps, 갭 → 자동 reconnect)
   - `packages/core/src/daemon/{lock,rpc}.test.ts`: (a) SE-06a 인증 실패 4001/4003·저널 불변 (b) 메서드 노출·-32601/-32602·사용자 전이 (c) E4 25번째 수신 뒤 강제 종료 → 10건 append → reconnect → `[1..N]` (d) 재전송 → dropped (d2) 건너뜀 → gaps 1 + 자동 재구독 (e) -32005/-32006/-32602/-32001 (f) REC-04(재접속이 승인 타이머를 연장하지 않음) (g) shutdown
   - `apps/daemon/src/main.ts`(+ `main.test.ts`): `startDaemon`, `--self-test`, LIVE win32 detached 생명주기
   - `.github/workflows/ci.yml`: `daemon self-test` 단계(windows+ubuntu), `packages/core/src/index.ts`·`packages/protocol/src/index.ts` export
2. **리뷰 A 반영 재검증** 커밋 `bff7f5e`: 당신의 `docs/reviews/codex/P01_A/response.md` 13건 중 12건을 반영했습니다(#13 은 보류). 각 반영이 지적을 실제로 닫는지, 새 회귀가 없는지 보세요:
   - #1 `scheduler.ts` `acquireLease` 슬롯 검사 + `liveLeaseCount(except)` / #2 `applyEvent` 결정·만료 Task 대조 / #3 `Scheduler.check()` + `ApprovalCoordinator.request/decide` 선행 검증 / #4 `isolation.ts` `setPolicy(next, combos:{claude?,codex?}, actor)` 공급자별 조합·`autoModeConfirmed` 호출자 입력 무시 / #5 `heartbeat` → `LeaseSuspended` / #6 Coordinator 가 `TaskTransition{from:WAITING_APPROVAL, reason:cancel}` 구독으로 보류 승인 decline / #7 `request(req, token, event)` / #8 `Signals.gitOperation` + git_remote fetch ASK / #9 `PolicyGate.recover()`·`answered` 복구 / #10 observer `mentioned`·`discovered` / #11 `forgetRun`·빈 Map 정리 / #12 `MemoryEventStore` structuredClone

## 근거 문서

- `docs/plans/P01.md` Task 9 Interfaces·Step(특히 E4·SE-06a·REC-04 단언), Task 5·6·7 Interfaces(리뷰 A 반영으로 바뀐 서명: `setPermissionMode(next, combos, actor)`, `request(req, token, event?)`, `check()`)
- `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P01-3(E4 재구독 누락·중복 0), AC-P01-5(토큰 핸드셰이크·Renderer 접속 불가 — Shell 부분은 묶음 C), AC-P01-1·6
- `docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md` §1(RPC 접속 계약: 127.0.0.1·락·토큰·seq 재구독)·§5·§6, `docs/planning/04_security_test/SECURITY_MODEL.md` §5(데몬 인증)·§8, `docs/planning/02_agents_state/SESSION_RECOVERY_DESIGN.md`(REC-04), `docs/spikes/S5.md`(핸드셰이크·락 판정 근거)

## 관점

1. **인증 우회**: 핸드셰이크 상태 기계(hello→challenge→auth→welcome)에서 순서 뒤섞기·중복 메시지·빈 clientNonce·role 위조로 인증 없이 RPC 를 처리시킬 수 있는 경로. `authFailures` 집계와 close code 가 SE-06a 와 맞는지. 토큰이 어떤 경로로도 네트워크·로그·저널·`daemon.status` 응답에 나가지 않는지(`tokenRef` 만 허용).
2. **seq 재구독 누락·중복**: `rpc-client.ts` `handleBatch` 의 갭 처리(옛 소켓 메시지 무시·pending 거부·reconnect 합치기)와 서버 `events.subscribe` 배치(코얼레싱·≤100·재구독 시 큐 초기화)에서 E4 "누락·중복 0" 이 깨지는 경우(재접속 중 도착하는 배치, `subscribe` 재호출 중 `store.subscribe` 재생과 실시간 append 의 경계, `fromSeq` 0/1 처리, 서버 쪽 `unsub` 누락).
3. **토큰 저장소**: `FileTokenStore.set` 원자성(Windows rename 덮어쓰기·tmp 잔존), `KeyringTokenStore` 생성 시점 실패가 정말 throw 로 끝나는지(`createRequire` 로드 실패·`Entry` 생성), `selectTokenStore` 가 `file` 이외 값에서 조용히 키링으로 가지 않는지, `launcher.tokenStoreFor` 가 락의 `tokenRef` 를 믿는 것이 위조 락 공격면이 되는지.
4. **control 메서드·오류 매핑**: `daemon.shutdown` 이 main 역할만, `-32001` 경로 전에 params 검증이 먼저 가지 않는지(정보 노출), SchedulerError → RPC 코드 매핑(-32602/-32003/-32004/-32005/-32006)이 Shell 이 구분해야 할 상황을 뭉개지 않는지, `policy.set` 이 `validatePolicy` + `PolicyGate.setPolicy` 두 단계로 스키마를 나눈 선택.
5. **REC-04·타이머**: 재접속이 승인 TTL·lease TTL 을 연장하지 않는지(테스트 (f) 가 실제로 그것을 증명하는지), `main.ts` tick 5초가 `coordinator.tick`/`expireLeases` 를 호출하는 순서, 셧다운 중 tick 경쟁.
6. **데몬 생명주기**: `main.ts` 의 `daemon.shutdown` → `onShutdown` → `shutdown()` → 프로세스 종료 경로가 실제로 종료되는지(이벤트 루프 핸들 잔존), `--self-test` 가 CI 에서 증명하는 범위, launcher `ensureDaemon` 의 stale/forged/unauthorized 분기가 S5 결정을 보존하는지, POSIX `ps lstart` 파싱 가정.
7. **리뷰 A 재검증**: 위 12건 각각 "닫힘/부분/미해결" 판정과 근거. 특히 #3(선행 검증 뒤 기록 사이의 경쟁), #4(조합 키 `;` 결합과 부분 집합 확인), #6(저널 구독에서 Broker 를 호출하는 재진입), #9(`answered` 복구가 재생 순서에 안전한지).

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |`. 그 뒤 "리뷰 A 재검증표" `| A# | 판정(닫힘/부분/미해결) | 근거 |`(12행). 그 뒤 "계약 동의표" `| 계약 | 구현 값 | 동의(OK/수정) | 근거 |`(최소: RPC_METHODS 분류, RPC_PARAMS_SCHEMA, 오류 코드, 핸드셰이크 메시지·close code, LockFile, TokenStore 서명·선택 규칙, DaemonClient 서명·갭 규칙, startRpcServer 서명). 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 와 한 문단 근거. 추정은 "추정:"으로 표시해 주세요.
