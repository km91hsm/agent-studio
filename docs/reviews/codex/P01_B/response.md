검토 범위는 `bff7f5e..4fc3e11`과 리뷰 A 반영 커밋 `bff7f5e`입니다. **읽기 전용 정적 검토**를 했으며 테스트는 실행하지 않았습니다. 작업 트리의 파일은 수정하지 않았습니다.

| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |
|---|---|---|---|---|
| 1 | High | [rpc-client.ts:104](D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:104), [rpc-client.ts:116](D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:116) | 클라이언트는 `challenge`를 받거나 서버 증명을 검증하지 않아도 `welcome`만 오면 접속을 수락합니다. 위조 락의 포트에 있는 서버가 락의 공개 `pid`·`nonce`를 넣어 응답하면 `ensureDaemon`도 이를 정상 데몬으로 판정할 수 있습니다. 잘못된 JSON 프레임은 `JSON.parse` 예외도 그대로 발생시킵니다. | 클라이언트에 `hello → challenge 검증 → auth → welcome` 상태 기계를 두고, 순서·중복·welcome의 신원·버전·역할을 검증하며 파싱 오류를 접속 실패로 처리하세요. |
| 2 | High | [main.ts:36](D:/LLM/agent-studio/apps/daemon/src/main.ts:36), [rpc-server.ts:184](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:184), [approval-broker.ts:91](D:/LLM/agent-studio/packages/core/src/approval-broker.ts:91) | `policy.set`은 `PolicyGate`의 정책만 바꿉니다. Broker는 생성 시 받은 `DEFAULT_POLICY`를 계속 사용하므로 이후 승인 판정에는 사용자 정책 변경이 반영되지 않습니다. | Broker가 현재 프로젝트 정책을 조회하거나 `ProjectPolicyChanged`를 구독하게 하고, 정책 변경 전후 같은 요청의 verdict가 달라지는 통합 테스트를 추가하세요. |
| 3 | Medium | [rpc-client.ts:68](D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:68), [rpc-client.ts:149](D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:149), [rpc-server.ts:107](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:107) | 초기 구독의 백로그가 100건 이상이면 서버가 `events.subscribe` 응답 전에 배치를 보냅니다. 그 배치에서 갭이 나면 클라이언트가 대기 중인 구독 호출을 거부해 최초 `DaemonClient.connect()` 자체가 실패합니다. 자동 재접속이 진행돼도 호출자는 클라이언트를 받지 못합니다. | 초기 구독 완료와 갭 복구를 하나의 접속 절차로 합치고, 100건 이상 백로그의 첫 배치에 갭을 주입해 검증하세요. |
| 4 | Medium | [rpc-client.ts:157](D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:157), [rpc-client.ts:190](D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:190) | 갭 후 자동 재접속이 한 번 실패하면 오류를 삼키고 `connected=false`로 남습니다. 이후 재시도나 실패 통지가 없어 Shell이 재구독을 계속 기다릴 수 있습니다. | 제한된 재시도와 실패 통지 또는 호출자가 복구를 재개할 명시적 상태·API를 제공하세요. |
| 5 | Medium | [rpc-server.ts:256](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:256) | `hello`를 받자마자 3초 타이머를 해제하고 `auth` 단계의 타임아웃은 설정하지 않습니다. `hello`만 보내는 연결은 인증되지 않은 채 무기한 열릴 수 있습니다. | `auth` 완료까지 타임아웃을 유지하거나 단계별 타이머를 두세요. |
| 6 | Medium | [launcher.ts:28](D:/LLM/agent-studio/packages/core/src/daemon/launcher.ts:28), [lock.ts:54](D:/LLM/agent-studio/packages/core/src/daemon/lock.ts:54) | `tokenStoreFor`는 검증되지 않은 락의 `tokenRef`만 보고 파일 저장소를 선택합니다. 제품 설정이 키링이어도 조작된 `file:` 참조가 저장소 선택을 바꿉니다. | 설정된 저장소 모드를 기준으로 선택하고 락의 참조가 그 모드·예상 항목과 일치하는지 확인하세요. |
| 7 | Medium | [rpc-server.ts:169](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:169), [rpc-server.ts:184](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:184) | `policy.get`·`policy.set`의 `projectId`를 검증하거나 Gate 선택에 사용하지 않습니다. 다른 프로젝트 ID로 요청해도 기본 프로젝트의 정책을 읽거나 변경합니다. | 현재 단일 프로젝트만 지원한다면 다른 ID를 거부하고, 다중 프로젝트 지원 시 ID별 Gate를 선택하세요. |
| 8 | Medium | [approval-coordinator.ts:56](D:/LLM/agent-studio/packages/core/src/approval-coordinator.ts:56), [approval-coordinator.ts:57](D:/LLM/agent-studio/packages/core/src/approval-coordinator.ts:57) | 리뷰 A #3의 `check()`는 선행 실패를 막지만, `ApprovalRequested` append와 `TaskTransition` append는 여전히 분리됩니다. 첫 append의 구독자 재진입이나 두 번째 append 실패 시 보류 승인과 Task 상태가 갈라질 수 있습니다. | 요청·전이를 한 트랜잭션으로 확정하거나, 미완료 요청을 재생 시 식별해 완료·취소하는 복구 규칙을 두세요. |
| 9 | Medium | [isolation.ts:117](D:/LLM/agent-studio/packages/core/src/isolation.ts:117), [isolation.ts:121](D:/LLM/agent-studio/packages/core/src/isolation.ts:121) | 리뷰 A #4는 공급자 이름 대조까지 개선됐지만 조합 값은 여전히 호출자가 고릅니다. 실제 경고 대상 실행 조합 대신 같은 공급자의 경고 없는 조합을 넣으면 확인 없이 자동 모드가 적용됩니다. | 실행 어댑터가 확인한 조합에서 키를 만들거나, 서버가 실행 환경과 요청 조합의 일치를 검증하세요. |
| 10 | Medium | [isolation.ts:94](D:/LLM/agent-studio/packages/core/src/isolation.ts:94), [isolation.ts:186](D:/LLM/agent-studio/packages/core/src/isolation.ts:186) | 리뷰 A #9의 `recover()`는 단순 중단 사례를 복구합니다. 다만 확인 요청 당시의 `next_policy`를 보관하므로, 답변 뒤 다른 정책 변경이 기록된 경우 재시작 복구가 그 뒤 변경을 오래된 정책으로 덮을 수 있습니다. | 재생 순서에서 후속 정책 변경을 판정하고, 확인 대상 변경만 현재 정책에 병합하거나 충돌을 명시적으로 처리하세요. |
| 11 | Low | [rpc.test.ts:166](D:/LLM/agent-studio/packages/core/src/daemon/rpc.test.ts:166), [rpc.test.ts:167](D:/LLM/agent-studio/packages/core/src/daemon/rpc.test.ts:167) | E4 테스트는 `received.length >= 25`를 기다린 뒤 종료합니다. 배치로 26건 이상 받은 뒤 종료될 수 있어 “25번째 수신 직후” 경계와 재접속 중 append를 정확히 증명하지 않습니다. | `onEvent`의 25번째 호출에서 종료시키고, 재접속 진행 중에도 append하는 사례를 추가하세요. |
| 12 | Low | [token-store.ts:35](D:/LLM/agent-studio/packages/core/src/token-store.ts:35), [token-store.ts:37](D:/LLM/agent-studio/packages/core/src/token-store.ts:37) | 임시 파일 쓰기에 실패하면 `closeSync`만 실행되고 rename의 정리 구간에 도달하지 않아 `token.*.tmp`가 남습니다. | 쓰기·닫기·rename 전체를 감싸 실패 시 임시 파일을 정리하세요. |
| 13 | Low | [lock.ts:98](D:/LLM/agent-studio/packages/core/src/daemon/lock.ts:98), [lock.ts:116](D:/LLM/agent-studio/packages/core/src/daemon/lock.ts:116) | **추정:** POSIX `ps ... comm=` 값에 공백이 있거나 날짜 파싱 형식이 다르면 해당 프로세스를 누락합니다. 자기 기동 시각만 대체값을 쓰고 launcher 조회는 실패하면 정상 데몬의 락을 stale로 볼 수 있습니다. | 해당 OS의 출력 사례로 파서를 검증하고, 조회 실패와 확인된 PID 부재를 구분하세요. |

### 리뷰 A 재검증표

| A# | 판정(닫힘/부분/미해결) | 근거 |
|---|---|---|
| 1 | 닫힘 | `acquireLease`가 다른 Task의 활성 lease로 슬롯을 검사하고 전이 검사도 자기 lease를 제외합니다. [scheduler.ts:226](D:/LLM/agent-studio/packages/core/src/scheduler.ts:226), [scheduler.ts:335](D:/LLM/agent-studio/packages/core/src/scheduler.ts:335) |
| 2 | 닫힘 | 결정·만료의 `taskId`가 원 요청과 같을 때만 결과를 반영합니다. [scheduler.ts:162](D:/LLM/agent-studio/packages/core/src/scheduler.ts:162) |
| 3 | 부분 | 선행 `check()`는 추가됐으나 두 기록 사이의 실패·구독자 재진입은 원자적으로 처리되지 않습니다. 위 #8. |
| 4 | 부분 | 공급자별 필수 조합과 `autoModeConfirmed` 호출자 입력 무시는 구현됐습니다. 실제 실행 조합의 출처는 검증하지 않습니다. 위 #9. |
| 5 | 닫힘 | `WAITING_APPROVAL`의 heartbeat가 `LeaseSuspended`를 던지고 lease를 연장하지 않습니다. [scheduler.ts:237](D:/LLM/agent-studio/packages/core/src/scheduler.ts:237) |
| 6 | 부분 | 취소 전이 구독에서 pending을 decline합니다. 다만 저널 publish 중 Broker append가 재진입하며, 취소 기록과 decline 기록의 원자성·실패 복구는 없습니다. [approval-coordinator.ts:40](D:/LLM/agent-studio/packages/core/src/approval-coordinator.ts:40) |
| 7 | 닫힘 | `request(req, token, event)`가 네 대기 사유를 연결하고 테스트도 추가됐습니다. [approval-coordinator.ts:16](D:/LLM/agent-studio/packages/core/src/approval-coordinator.ts:16), [approval-coordinator.test.ts:130](D:/LLM/agent-studio/packages/core/src/approval-coordinator.test.ts:130) |
| 8 | 닫힘 | `gitOperation:'fetch'`에 ASK 예외와 대표 입력 테스트가 추가됐습니다. [policy.ts:79](D:/LLM/agent-studio/packages/protocol/src/policy.ts:79), [policy.test.ts:56](D:/LLM/agent-studio/packages/protocol/src/policy.test.ts:56) |
| 9 | 부분 | 답변 후 정책 기록이 빠진 단순 사례는 복구합니다. 후속 정책 변경과 교차한 재생 순서는 안전하지 않습니다. 위 #10. |
| 10 | 부분 | `mentioned`·`discovered` 근거를 기록하지만 둘이 `false`여도 `SkillInjectionAccepted`를 발행합니다. 이 이벤트만 집계하는 소비자의 과대평가 가능성은 남습니다. [observer.ts:74](D:/LLM/agent-studio/packages/core/src/skills/observer.ts:74) |
| 11 | 부분 | 빈 Map 정리와 `forgetRun` API는 추가됐습니다. 현재 비테스트 실행 경로에서 `forgetRun`을 호출하는 곳은 확인되지 않았습니다. [observer.ts:29](D:/LLM/agent-studio/packages/core/src/skills/observer.ts:29) |
| 12 | 닫힘 | append 반환·read·실시간 emit에서 저장 객체와 별도 복사본을 사용합니다. [memory-store.ts:10](D:/LLM/agent-studio/packages/core/src/journal/memory-store.ts:10) |

### 계약 동의표

| 계약 | 구현 값 | 동의(OK/수정) | 근거 |
|---|---|---|---|
| `RPC_METHODS` 분류 | read 7·write 7·control `daemon.shutdown`; `task.transition` 비노출 | OK | [rpc.ts:15](D:/LLM/agent-studio/packages/protocol/src/rpc.ts:15)가 P01 Task 9 분류와 일치합니다. |
| `RPC_PARAMS_SCHEMA` | 메서드별 폐쇄형 params; `policy.set.policy`는 객체 형태만 확인 | 수정 | P01의 공통 스키마는 정책 내용까지 참조하도록 명시합니다. 현재 내용 검증은 서버의 별도 `validatePolicy`에만 있습니다. [rpc.ts:78](D:/LLM/agent-studio/packages/protocol/src/rpc.ts:78) |
| 오류 코드 | `-32601/-32602/-32001/-32003/-32004/-32005/-32006` | OK | 선언과 주요 매핑은 일치하고, control 권한 검사가 params 검증보다 먼저 실행됩니다. [rpc.ts:26](D:/LLM/agent-studio/packages/protocol/src/rpc.ts:26), [rpc-server.ts:228](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:228) |
| 핸드셰이크 메시지·close code | hello/challenge/auth/welcome; 4001/4002/4003 | 수정 | 서버 순서·코드는 대체로 맞고 토큰 원문을 전송·상태 응답·저널에 넣는 경로는 확인되지 않았습니다. 클라이언트의 무검증 `welcome` 수락과 auth 단계 무기한 대기는 위 #1·5입니다. |
| `LockFile` | `pid, startedAt, nonce, port, protocolVersion, tokenRef` | OK | 구조와 원자 교체는 계약대로입니다. `tokenRef`를 저장소 선택의 신뢰 근거로 쓰는 문제는 위 #6입니다. [lock.ts:10](D:/LLM/agent-studio/packages/core/src/daemon/lock.ts:10) |
| `TokenStore` 서명·선택 규칙 | `get/set/ref`; 기본 키링, 명시적 `file`, 그 외 오류 | 수정 | `selectTokenStore` 자체는 닫힌 실패를 따릅니다. launcher가 락 참조로 이 선택 규칙을 우회하고, 쓰기 실패 시 임시 파일 정리가 빠집니다. [token-store.ts:87](D:/LLM/agent-studio/packages/core/src/token-store.ts:87) |
| `DaemonClient` 서명·갭 규칙 | `connect/call/reconnect/close`, `lastSeq/dropped/gaps`; 갭 시 자동 재접속 | 수정 | 연속 seq 전달과 중복 폐기는 구현됐습니다. 최초 구독 중 갭과 재접속 실패 경로는 위 #3·4입니다. [rpc-client.ts:136](D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:136) |
| `startRpcServer` 서명 | 계획의 필수 옵션·반환값에 `tokenRef/now/onShutdown/hooks` 추가 | OK | 필수 인터페이스와 ≤100건 배치·재구독 큐 초기화·unsubscribe를 구현합니다. `store.subscribe`의 동기 재생과 실시간 등록 경계도 현재 어댑터 계약과 맞습니다. [rpc-server.ts:21](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:21), [rpc-server.ts:154](D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:154) |
| 데몬 종료·REC-04 | 5초 tick에서 lease 만료 후 승인 만료; RPC 종료 후 서버·저널 닫기 | OK | 재접속이 타이머 시각을 갱신하는 경로는 없고, 종료 시 tick을 해제합니다. 다만 CI `--self-test`는 detached 부모 종료 생존을 증명하지 않으며, LIVE 테스트도 launcher를 별도 프로세스로 종료시키지 않습니다. [main.ts:45](D:/LLM/agent-studio/apps/daemon/src/main.ts:45), [main.test.ts:39](D:/LLM/agent-studio/apps/daemon/src/main.test.ts:39) |

**판정: 수정 후 수용.** 서버의 토큰 미전송, 주된 RPC 분류, seq 배치와 REC-04 타이머 경로는 계약에 가깝습니다. 그러나 클라이언트가 인증되지 않은 `welcome`을 수락하는 문제와 변경된 정책이 승인 Broker에 적용되지 않는 문제는 수용 전에 고쳐야 합니다. 초기 백로그 갭 복구와 리뷰 A의 부분 반영 사항도 함께 재검증이 필요합니다.