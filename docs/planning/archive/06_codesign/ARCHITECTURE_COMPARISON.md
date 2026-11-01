# ARCHITECTURE_COMPARISON — 대안 A/B/C 비교

| 메타 | 값 |
|---|---|
| 상태 | FINAL (STEP 11, 2026-11-01) — Codex 검증 경로 R4→R6→B4→B5(확인 44·불충분 11 → R9 반영, Codex 미재검증); 잔존 UNVERIFIED는 OPEN_ISSUES §3, 사용자 결정은 CHECKLIST B |
| 입력 | `CLAUDE_INITIAL_PROPOSAL.md` §3, `CODEX_INITIAL_PROPOSAL.md` §3(독립 작성), `RESEARCH_DESKTOP_STACK.md` §2.5 |
| 결론 | **양측 독립적으로 C(Hybrid)를 추천**. 점수 Claude 51/60, Codex 47/60. B의 정의가 양측에서 달랐음(아래) |
| UNVERIFIED | 성능·구현 비용 점수는 실측 아님(설계 비교) |

## 1. 대안 정의

| 대안 | 정의(지시서) | Claude 해석 | Codex 해석 |
|---|---|---|---|
| A | Python Orchestrator 중심 | Electron UI ⇄ HTTP/WS ⇄ Python(FastAPI) 사이드카 ⇄ Claude Py SDK / Codex app-server 클라이언트 자작 | 동일 |
| B | 네이티브 Desktop Backend 중심 | **Electron main 프로세스에 오케스트레이터 통합**(단일 프로세스) | **Tauri UI ⇄ Rust backend**(네이티브) |
| C | Desktop + 독립 Orchestrator Hybrid | Electron Shell + 독립 Node 데몬(detached), localhost WS JSON-RPC | Electron main(창·IPC) + 별도 Node 오케스트레이터(Gateway·큐·DB), 인증된 로컬 IPC |

B는 **B1(Electron main 통합, Claude 해석)**과 **B2(Tauri/Rust, Codex 해석)**로 분리해 읽어야 한다(R4A-17). 점수 합계만으로 "영향 없음"을 주장하지 않는다. C 선택의 1차 근거는 점수가 아니라 **필수 조건 충족 여부**다: (1) 앱 종료 후 백그라운드 지속(REQ-GOAL-06) — B1·B2 모두 창 프로세스 수명에 묶임, (2) 공식 SDK 사용(Claude TS SDK) — B2는 SDK 없음·프로토콜 자작, (3) 현 PC 툴체인 — B2는 Rust 설치 선행. 세 조건을 모두 만족하는 안은 A와 C이고, A는 언어 2개·IPC 2홉으로 C에 밀린다. 성능·구현 비용 점수는 실측값이 아닌 설계 추정이다.

## 2. 프로세스 다이어그램

### A — Python Orchestrator
```
[Electron Renderer(React)] ⇄ IPC ⇄ [Electron main] ⇄ HTTP/WS ⇄ [Python FastAPI 사이드카]
                                                                  ├─ claude-agent-sdk(Py) → claude CLI
                                                                  ├─ app-server JSON-RPC 클라이언트(자작) → codex
                                                                  └─ SQLite
```
### B — 네이티브 Desktop Backend (두 해석)
```
B-Claude: [Renderer] ⇄ IPC ⇄ [Electron main = Orchestrator + Gateway + SQLite] → claude / codex
B-Codex : [Tauri WebView] ⇄ commands/channels ⇄ [Rust backend = Orchestrator + SQLite] → claude / codex (SDK 없음, 프로토콜 자작)
```
### C — Hybrid (권장)
```
[Renderer(React)] ⇄ contextBridge ⇄ [Electron main: 창·트레이·업데이트·데몬 기동/접속]
        │ WS JSON-RPC(localhost, 토큰)
        ▼
[Orchestrator 데몬(Node, detached)] ─ Scheduler/StateMachine/Lease ─ ApprovalBroker ─ SkillRegistry ─ SessionIndex ─ SQLite(WAL, 단일 writer)
        ├─ ClaudeSdkAdapter(@anthropic-ai/claude-agent-sdk → 사용자 설치 claude CLI)
        └─ CodexAppServerAdapter(codex app-server, stdio JSON-RPC)
```

데이터 흐름(C): 지시 → RPC `task.submit` → 저널 → Scheduler lease → Gateway `startRun` → 어댑터 이벤트(델타·아이템·승인·usage) → 저널 append → 투영 → RPC 구독(seq 배치) → Renderer. 승인: 어댑터 콜백 → ApprovalBroker 정책 → 자동 응답 또는 `WAITING_APPROVAL` → 사용자 → 콜백 resolve.

## 3. 12개 기준 점수 (5점 만점)

| 기준 | A (Claude/Codex) | B1 Electron main 통합(Claude) / B2 Tauri+Rust(Codex) | C (Claude/Codex) | 비고 |
|---|---|---|---|---|
| 성능 | 3 / 3 | 4 / 5 | 4 / 4 | B-Codex(Rust)가 최고지만 SDK 부재 |
| IPC | 3 / 2 | 5 / 5 | 4 / 3 | C는 WS 1홉, 인증·버전 필요 |
| 실시간 이벤트 | 3 / 4 | 5 / 4 | 4 / 5 | C는 저널 seq 재구독으로 재접속 안정 |
| 다중 에이전트 제어 | 3 / 4 | 4 / 3 | 5 / 5 | 양측 C 최고 |
| SQLite 상태 관리 | 4 / 4 | 3 / 4 | 5 / 5 | 단일 writer 데몬 |
| 앱 종료 후 백그라운드 | 4 / 4 | 1 / 2 | 5 / 5 | 결정적 차이 |
| OS별 서비스 관리 | 3 / 2 | 1 / 3 | 4 / 2 | Codex는 서비스 설치·제거 난이도를 더 무겁게 봄 |
| 장애 복구 | 4 / 4 | 2 / 3 | 5 / 5 | |
| 권한 격리 | 4 / 3 | 2 / 3 | 4 / 4 | |
| 패키징 | 2 / 2 | 5 / 3 | 4 / 2 | Codex는 독립 서비스 패키징 비용을 더 봄 |
| 구현 비용 | 2 / 3 | 5 / 2 | 3 / 3 | |
| 장기 유지보수 | 2 / 3 | 3 / 3 | 4 / 4 | |
| **합계** | **37 / 38** | **40 / 40** | **51 / 47** | |

## 4. 합의와 잔여 쟁점

| 항목 | 상태 |
|---|---|
| C 채택 | **합의** (양측 독립 추천) |
| 단일 언어 TypeScript | **합의** |
| 데몬 생명주기(Windows detached, 재접속, 좀비 정리) | **최대 위험 공통 인식** → Phase 00 스파이크 |
| MVP-Core에서 백그라운드 지속을 필수로 할지 | **쟁점** → R2-3에서 결정(Claude: MVP-Core 포함, Codex: 스파이크 실패 시 "안전 중단·재개"로 축소) |
| OS 서비스 등록 시점 | 양측 V1~V2 → R2-3 |
| 패키징 도구(Forge vs electron-builder) | **쟁점** → R2-1 |

## 5. 검증 실험 (Phase 00)

| # | 실험 | 성공 기준 |
|---|---|---|
| E1 | Windows: Electron main에서 Node 데몬 `spawn({detached:true, stdio:'ignore'}).unref()` → 창 종료 → 데몬 생존 → 재기동 시 포트/락 파일로 재접속 | 실행 중 Codex 턴이 끊기지 않고 재접속 후 이벤트 seq 이어받음 |
| E2 | 데몬 종료 시 자식(`claude`, `codex app-server`) 프로세스 트리 정리 | 좀비 0, Job Object 또는 명시 kill 확인 |
| E3 | 데몬 런타임 2방식(동봉 Node / Electron `runAsNode`) **각각** better-sqlite3·node-pty `.node` 로드 + WAL 쓰기 | 두 방식 모두 결과 기록; `electron-rebuild`는 `runAsNode` 경로에만 적용, 동봉 Node는 Node ABI prebuilt 사용(R4A-15). 재빌드 필요성은 결과로 결정 |
| E4 | WS JSON-RPC 재접속 후 저널 seq 기반 재구독 | 누락·중복 이벤트 0 |
| E5 | 트레이 상주 + 창 닫기 억제 | `window-all-closed` 처리로 앱 유지 |
