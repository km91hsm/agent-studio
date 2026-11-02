# 구현 검토 요청: P01 묶음 C — Renderer store(T7)·Electron Shell/IPC 릴레이(T6)·보안 스냅숏(T8) + 리뷰 B 반영 재검증

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 검토해 주세요. 파일을 수정하지 마세요. `node_modules`, `packages/protocol/codex-schema/**`, `spikes/fixtures/**/*.jsonl`, `docs/reviews/codex/**/events.jsonl`, `apps/*/dist/**` 은 통째로 읽지 말고 필요한 줄만 grep 하세요.

## 대상

1. **Task 10(T7 Renderer)** 커밋 `52190bd`(범위 `4fc3e11..52190bd`): `apps/renderer/{index.html,vite.config.ts,tsconfig.json}`, `apps/renderer/src/{store.ts,App.tsx,main.tsx,agent-studio.d.ts,app.css,store.test.ts}` — 외부 store(`createStore`: `applyBatch` seq ≤ lastAppliedSeq 폐기·갭 `GapError`·배치당 listener 1회·스냅숏 참조 안정), `main.tsx` 의 GapError → 재구독, index.html meta CSP, vite 빌드(인라인 스크립트 0).
2. **리뷰 B 반영** 커밋 `e16e39f`: 당신의 `docs/reviews/codex/P01_B/response.md` 13건 중 #1·#2·#3·#4·#5·#6·#7·#10 반영(#8·#9 는 P02 로 보류 Ruling, #11·#12·#13 minor 보류). 각 반영이 지적을 닫는지, 새 회귀가 없는지:
   - #1 `rpc-client.ts` 핸드셰이크 상태 기계(challenge→welcome 순서·신원/버전/역할 검증·JSON 아닌 프레임 실패) / #2 `approval-broker.ts` `policy: ProjectPolicy | (() => ProjectPolicy)` + `apps/daemon/src/main.ts` 가 `() => gate.policy()` 주입 / #3 `open()` 이 구독 중 갭을 재시도(`opening`·`gapDuringOpen`) / #4 `autoReconnect()` 3회 제한 후 `onDisconnect` / #5 `rpc-server.ts` 핸드셰이크 전체 타임아웃(`handshakeTimeoutMs`) / #6 `launcher.ts` `tokenStoreFor(stateDir, mode, lock)` 설정 모드 기준·불일치 throw / #7 `requireProject(projectId)` / #10 `isolation.ts` `ProjectPolicyChanged` 가 `answered` 전체 삭제
   - 테스트: `packages/core/src/daemon/rpc.test.ts` (h)(i)(j), `launcher.test.ts`, `isolation.test.ts` (i)
3. **Task 11(T6 Shell)** 커밋 `5afbd99`: `apps/shell/src/{security.ts,ipc-guard.ts,relay.ts,preload.ts,main.ts}`, `apps/shell/vite.config.ts`(main.cjs 와 preload.cjs 를 **별도 빌드**, external electron·better-sqlite3·@napi-rs/keyring·Node 내장, `moduleSideEffects` 로 외부 부수효과 import 제거), `apps/shell/package.json`, 루트 `package.json` `shell:build`, `.github/workflows/ci.yml` 빌드 단계. 부수 변경: `packages/protocol/src/{transitions,policy}.ts`·`packages/core/src/isolation.ts` 의 JSON 로드를 `import … with { type: "json" }` 정적 import 로 전환, `packages/core/src/daemon/launcher.ts` `LaunchOptions.nodePath/cwd`(Shell 은 시스템 `node` 로 데몬 spawn).
   - 테스트: `ipc-guard.test.ts`(sender→메서드→params→호출 0회), `relay.test.ts`(백로그+실시간, 중복 0, 배치 연속), `shell.live.test.ts`(LIVE win32 `electron apps/shell --smoke`).
4. **Task 12(T8 보안 스냅숏)** 커밋 `e2aba9d`: `apps/shell/src/{security.test.ts,security.live.test.ts,smoke-security.ts}`, `main.ts` `--security-probe`.

## 근거 문서

- `docs/plans/P01.md` Task 10·11·12 Interfaces·Step, Review Focus; `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P01-3(seq 재구독)·AC-P01-4(webPreferences/CSP 바이트 일치)·AC-P01-5(토큰 핸드셰이크·Renderer 가 데몬에 접속 불가)
- `docs/planning/04_security_test/SECURITY_MODEL.md` §7(Electron·IPC: webPreferences·app 스킴·**CSP 유일한 정본**·좁은 IPC)·§5·§8, `docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md` §1·§5(Shell↔데몬·Renderer 경계), `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` P01 절(Global Constraints 8개 webPreferences)

## 관점

1. **Renderer 경계**: preload 가 노출하는 표면(`events.subscribe`, `rpc.read`, `rpc.write`) 외에 렌더러가 main·데몬·파일시스템에 닿을 경로. `ipcMain.handle` 의 sender 검증(`senderFrame.url` `app://bundle/`·최상위 frame·같은 webContents)이 우회되는 경우(iframe·`about:blank`·`senderFrame` null·창 교체). `events.subscribe` 가 webContents 당 하나로 묶이는지, 구독 해지 누락·destroyed 뒤 `send`.
2. **IPC 가드 순서·분류**: read/write 분류와 `RPC_METHODS` 의 불일치, `control` 메서드가 어떤 채널로도 렌더러에서 호출될 수 없는지, params 스키마가 Task 9 서버 스키마와 같은 함수인지(이중 정의 금지), 오류 메시지로 토큰·포트·경로가 렌더러로 새는지.
3. **seq 전달(릴레이+store)**: `EventRelay` 백로그(`relay.buffered`)와 실시간 push 의 경계(중복·누락·순서), `flushMs` 코얼레싱 중 구독 해지, 렌더러 `createStore.applyBatch` 의 갭 → `GapError` → `main.tsx` 재구독(`lastAppliedSeq+1`) 경로가 실제로 수렴하는지(무한 재구독·백로그 없는 relay), main 의 `DaemonClient` 가 `lastSeq 0` 으로 전체를 받는 설계의 한계(P02 입력).
4. **보안 설정 바이트 일치**: `security.test.ts` (a) 의 §7 추출 규칙("유일한 정본" 줄·§7 범위·문서 전체 default-src 블록 1개)이 문서 변경을 놓치는 경우, `CSP` 를 응답 헤더(protocol.handle)와 meta 두 곳에 두는 선택, `app://` 스킴 privileges(`standard, secure, supportFetchAPI, corsEnabled:false, bypassCSP:false`), `resolveInside` 경로 탈출(URL 인코딩·`..`·드라이브·UNC·NUL·대소문자·심볼릭 링크), `will-navigate`/`setWindowOpenHandler`/`setPermissionRequestHandler`.
5. **LIVE 프로브의 증명력**: `--security-probe` 가 "CSP 차단"과 "connection refused" 를 구별하는지(`securitypolicyviolation.violatedDirective`), `c1 == c0` 가 렌더러 접속 0건을 증명하는지(main 자신의 연결·데몬 self-test 잔존), 창 숨김(`show:false`) 상태에서의 결과 타당성, `--smoke` 의 `rendererSeq` 를 DOM(`data-testid="last-seq"`) 으로 읽는 선택.
6. **번들·런타임**: Electron main 번들에 `better-sqlite3`(NAN, Electron ABI 불일치) 가 `require` 되지 않는지(현재 `treeshake.moduleSideEffects` 로 제거 — 깨지기 쉬운가), preload.cjs 가 `electron` 외 require 없이 단일 파일인지, 정적 JSON import 전환이 `schema:diff`·tsx 실행·vitest 에 영향 없는지, Shell 이 시스템 `node`(PATH) 로 데몬을 띄우는 결정의 위험(node 없음·버전 불일치), `tokenStoreFor(mode)` 가 Shell 설정과 데몬 `--token-store` 를 같은 env 로 묶는지.
7. **리뷰 B 재검증**: 위 8건 각각 "닫힘/부분/미해결" 판정과 근거. 특히 #3(opening 중 갭 재시도 상한·`gapDuringOpen` 과 pending 거부의 순서), #4(autoReconnect 와 수동 `reconnect()` 동시 호출), #6(`KeyringTokenStore()` 생성이 ref 비교보다 먼저 일어나 키링 로드 실패가 다른 오류로 보이는지), #10(`answered.clear()` 가 지나치게 넓은지 — 다른 요청의 정당한 복구를 지우는 경우).

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |`. 그 뒤 "리뷰 B 재검증표" `| B# | 판정(닫힘/부분/미해결) | 근거 |`(8행: #1·#2·#3·#4·#5·#6·#7·#10). 그 뒤 "계약 동의표" `| 계약 | 구현 값 | 동의(OK/수정) | 근거 |`(최소: preload 노출 표면, IPC 채널 4개, ipc-guard 순서, EventRelay 서명, createStore 서명·갭 규칙, WEB_PREFERENCES 8키, CSP 정본 추출 규칙, app 스킴 privileges, LaunchOptions). 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 와 한 문단 근거. 추정은 "추정:"으로 표시해 주세요.
