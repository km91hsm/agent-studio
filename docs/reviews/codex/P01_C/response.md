읽기 전용 검토 결과, **Renderer가 Shell의 데몬 이벤트 구독을 교체할 수 있는 문제**가 가장 큰 수정 사항입니다. 파일은 수정하지 않았습니다. 테스트를 새로 실행하지 않았고, 코드·테스트·계약 문서와 현재 번들만 대조했습니다. `git diff --check 4fc3e11..e2aba9d`는 통과했습니다.

| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |
|---|---|---|---|---|
| 1 | High | [ipc-guard.ts:26](/D:/LLM/agent-studio/apps/shell/src/ipc-guard.ts:26), [rpc-server.ts:161](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:161) | Renderer가 `rpc.read("events.subscribe", {fromSeq: 큰 값})`를 호출할 수 있습니다. 서버는 같은 데몬 연결의 기존 구독을 해지하고 새 seq로 교체하므로 Shell의 이벤트 수신이 멈춥니다. | Renderer의 read 허용 목록에서 `events.subscribe`를 제외하고 Shell 내부 호출로만 유지하세요. |
| 2 | Medium | [ipc-guard.ts:42](/D:/LLM/agent-studio/apps/shell/src/ipc-guard.ts:42), [rpc-server.ts:159](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:159) | `daemon.status`와 `capabilities.get` 응답이 `tokenRef`를 그대로 Renderer에 전달합니다. file 모드에서는 실제 토큰 파일 경로(`file:${stateDir}/token`)여서 경로 미노출 계약에 어긋납니다. | Renderer 전용 응답에서 `tokenRef`와 불필요한 내부 식별자를 제거하세요. |
| 3 | Medium | [isolation.ts:89](/D:/LLM/agent-studio/packages/core/src/isolation.ts:89), [isolation.ts:169](/D:/LLM/agent-studio/packages/core/src/isolation.ts:169) | 확인 답변이 기록된 요청이 둘 이상일 때 `recover()`가 첫 요청을 적용하면 `answered.clear()`가 나머지도 지웁니다. 뒤에 확인한 요청의 복구가 사라질 수 있습니다. 현재 테스트는 답변 1건만 다룹니다. | 여러 확인 요청의 우선순위를 정하고, 적용된 요청 또는 명시적으로 대체된 요청만 제거하는 테스트를 추가하세요. |
| 4 | Medium | [rpc-client.ts:205](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:205), [rpc-client.ts:229](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:229) | 자동 재접속의 재시도 대기 중 수동 `reconnect()`가 성공해도 다음 자동 시도가 정상 소켓을 다시 끊을 수 있습니다. | 자동 재시도마다 현재 연결·재접속 세대를 확인하고, 수동 성공 뒤 남은 시도를 취소하세요. |
| 5 | Medium | [preload.ts:18](/D:/LLM/agent-studio/apps/shell/src/preload.ts:18), [main.ts:97](/D:/LLM/agent-studio/apps/shell/src/main.ts:97) | `events.subscribe()`의 해지 함수는 preload 리스너만 제거합니다. main의 릴레이 구독은 다음 구독이나 webContents 파괴까지 남아 배치를 계속 보냅니다. | 구독 해지를 main에 전달해 해당 릴레이의 `off()`를 호출하세요. |
| 6 | Medium | [relay.ts:27](/D:/LLM/agent-studio/apps/shell/src/relay.ts:27), [main.tsx:18](/D:/LLM/agent-studio/apps/renderer/src/main.tsx:18) | 릴레이에 seq 1, 3이 들어오면 Renderer의 `fromSeq=2` 재구독에도 3만 재생되어 `GapError`가 반복됩니다. **추정:** 정상 `DaemonClient` 경로에서는 연속 seq가 보장되므로 상위 불변식이 깨졌을 때 드러나는 문제입니다. | 릴레이에서 갭을 감지해 권위 있는 백로그로 복구하고, Renderer 재구독에는 실패 상한을 두세요. |
| 7 | Low | [launcher.ts:37](/D:/LLM/agent-studio/packages/core/src/daemon/launcher.ts:37) | keyring 모드에서는 `KeyringTokenStore`가 네이티브 모듈을 먼저 로드합니다. 로드 실패 시 잘못된 `tokenRef`보다 모듈 오류가 먼저 보여 불일치 진단이 흐려집니다. 닫힌 실패 자체는 유지됩니다. | 설정 모드에서 기대하는 참조를 먼저 비교한 뒤 저장소를 생성하세요. |
| 8 | Low | [security.ts:34](/D:/LLM/agent-studio/apps/shell/src/security.ts:34), [main.ts:59](/D:/LLM/agent-studio/apps/shell/src/main.ts:59) | `resolveInside`는 문자열 경계만 확인합니다. dist 내부 심볼릭 링크가 외부 파일을 가리키면 `net.fetch`가 그 대상을 읽을 수 있습니다. | 실제 경로를 확인해 dist 루트 내부인지 검증하세요. |

### 리뷰 B 재검증표

| B# | 판정(닫힘/부분/미해결) | 근거 |
|---|---|---|
| #1 | 닫힘 | [rpc-client.ts:105](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:105)의 상태 기계가 challenge→welcome 순서, proof·pid·nonce와 welcome의 버전·역할을 확인하고 비 JSON 핸드셰이크 프레임을 거부합니다. |
| #2 | 닫힘 | Broker가 판정 때마다 `policySource()`를 읽고, 데몬은 `() => gate.policy()`를 주입합니다. [approval-broker.ts:56](/D:/LLM/agent-studio/packages/core/src/approval-broker.ts:56) |
| #3 | 닫힘 | 구독 중 갭은 pending 호출을 거부한 뒤 `gapDuringOpen`을 세우고 최대 3회 재시도합니다. [rpc-client.ts:76](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:76), [rpc-client.ts:180](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-client.ts:180) |
| #4 | 부분 | 실패 3회 뒤 `onDisconnect`는 구현·테스트됐지만 수동 재접속과 자동 재시도 간 경쟁이 남습니다. 위 #4. |
| #5 | 닫힘 | `handshakeTimeoutMs`가 hello부터 auth 완료까지 적용되고 완료·종료 때 해제됩니다. [rpc-server.ts:249](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:249) |
| #6 | 부분 | 저장소 선택은 설정 모드를 따르고 참조 불일치는 거부합니다. 다만 keyring 로드가 참조 비교보다 먼저입니다. 위 #7. |
| #7 | 닫힘 | `policy.get/set`이 다른 `projectId`를 거부하며 변경 전 검증합니다. [rpc-server.ts:152](/D:/LLM/agent-studio/packages/core/src/daemon/rpc-server.ts:152) |
| #10 | 부분 | 뒤따른 정책 변경이 오래된 답변을 무효화하는 사례는 해결됐지만, 답변 여러 건의 복구까지 `answered.clear()`가 지웁니다. 위 #3. |

### 계약 동의표

| 계약 | 구현 값 | 동의(OK/수정) | 근거 |
|---|---|---|---|
| preload 노출 표면 | `events.subscribe`, `rpc.read`, `rpc.write` | 수정 | 표면은 일치하나 read 응답으로 토큰 파일 경로가 전달됩니다. |
| IPC 채널 4개 | `events.subscribe`, `events.batch`, `rpc.read`, `rpc.write` | OK | [preload.ts:16](/D:/LLM/agent-studio/apps/shell/src/preload.ts:16), [main.ts:98](/D:/LLM/agent-studio/apps/shell/src/main.ts:98) |
| ipc-guard 순서 | sender → read/write 분류 → 공용 params 스키마 → 호출 | 수정 | 순서는 맞지만 read 분류가 데몬 연결 자체를 바꾸는 `events.subscribe`를 허용합니다. |
| EventRelay 서명 | `push(e)`, `subscribe(fromSeq,sink,backlog): off`, `flushMs=16` | 수정 | 서명은 일치합니다. 결손 seq를 복구할 백로그가 없으면 재구독이 수렴하지 않습니다. |
| createStore 서명·갭 규칙 | `getSnapshot/subscribe/applyBatch/lastAppliedSeq`; 이전 seq 폐기, 갭 예외, 배치당 통지 1회 | OK | [store.ts:24](/D:/LLM/agent-studio/apps/renderer/src/store.ts:24), [store.ts:90](/D:/LLM/agent-studio/apps/renderer/src/store.ts:90) |
| WEB_PREFERENCES 8키 | 명세의 8키·값 그대로 | OK | [security.ts:14](/D:/LLM/agent-studio/apps/shell/src/security.ts:14) |
| CSP 정본 추출 규칙 | §7의 “유일한 정본” 뒤 첫 백틱, 문서 전체 `default-src` 블록 1건, 바이트 비교 | OK | [security.test.ts:17](/D:/LLM/agent-studio/apps/shell/src/security.test.ts:17) |
| app 스킴 privileges | `standard/secure/supportFetchAPI=true`, `corsEnabled/bypassCSP=false` | OK | [security.ts:29](/D:/LLM/agent-studio/apps/shell/src/security.ts:29) |
| LaunchOptions | `tokenStore`, `entry`, `nodePath`, `cwd` | OK | [launcher.ts:18](/D:/LLM/agent-studio/packages/core/src/daemon/launcher.ts:18). Shell은 PATH의 `node`와 소스 트리의 `tsx`에 의존하므로 배포 런타임에서는 별도 보장이 필요합니다. |

현재 번들에서 `preload.cjs`의 외부 `require`는 `electron` 한 건이고, `main.cjs`에는 실행되는 `better-sqlite3` `require`가 보이지 않습니다. 정적 JSON import 전환에 따른 `schema:diff`·tsx·Vitest 회귀는 이번 읽기 전용 검토에서 실행 검증하지 못했습니다. LIVE 보안 테스트는 `connect-src` 위반과 두 blocked URI를 확인해 단순 연결 거부와 구별합니다. `c1 == c0`은 순간적으로 열렸다 닫힌 연결까지 단독으로 배제하지는 못합니다.

**판정: 수정 후 수용.** Renderer의 `rpc.read`가 Shell의 유일한 데몬 이벤트 구독을 교체하는 문제와 토큰 파일 경로 노출을 먼저 닫아야 합니다. 리뷰 B의 #4·#6·#10도 부분 반영 상태이며, 구독 해지와 갭 복구 경로는 추가 검증이 필요합니다.