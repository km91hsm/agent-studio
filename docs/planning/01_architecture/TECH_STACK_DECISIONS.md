# TECH_STACK_DECISIONS — 구조 선택과 기술 스택

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 공식 조사 | `archive/evidence/research/RESEARCH_DESKTOP_STACK.md`, `archive/evidence/research/RESEARCH_AGENT_GATEWAY.md` |
| ADR | `adr/ADR-0001`~`0008` |
| UNVERIFIED | 데몬 런타임 방식(동봉 Node vs Electron runAsNode, P00 S6), Monaco worker+CSP 설치물 호환(S6), 설치 크기·메모리(S6·P11a·P11b) |

## 1. 구조 대안 비교 — C Hybrid 채택 (D3, ADR-0003)

| 대안 | 정의 | 앱 종료 후 백그라운드 지속(REQ-GOAL-06) | 공식 SDK 사용 | 현 툴체인(Node 24만) | 판정 |
|---|---|---|---|---|---|
| A | Electron UI ⇄ HTTP/WS ⇄ Python(FastAPI) 사이드카 ⇄ Claude Py SDK / Codex app-server 클라이언트 자작 | 가능 | Claude만(Codex 클라이언트 자작) | 언어 2개 | 기각 — 언어 2개·IPC 2홉 |
| B1 | Electron main 프로세스에 오케스트레이터 통합(단일 프로세스) | 불가(창 프로세스 수명에 묶임) | 가능 | 가능 | 기각 — 필수 조건 1 미충족 |
| B2 | Tauri WebView ⇄ Rust backend | 불가 | 없음(프로토콜 자작) | Rust 설치 선행 | 기각 — 필수 조건 1·2·3 미충족 |
| **C** | Electron Shell + 독립 Node 데몬(detached), localhost WS JSON-RPC + 토큰 | 가능 | 가능(TS SDK, app-server) | 가능 | **채택** |

채택한 C는 Electron Shell과 독립 Node 데몬으로 앱 종료 뒤 지속 실행, 장애 분리, SQLite 단일 writer를 충족한다. 실제 연결은 Renderer → main IPC → 데몬 WS이며(SYSTEM_ARCHITECTURE §1), 데몬 생존·재접속은 P00 S5와 설치물 시험(TEST-BG)에서 검증한다. C의 최대 위험은 데몬 생명주기(Windows detached·좀비·재접속)다.

구조 C 검증 실험(P00 S5·S6에 포함):

| # | 실험 | 성공 기준 |
|---|---|---|
| E1 | Windows: Electron main에서 Node 데몬 `spawn({detached:true, stdio:'ignore'}).unref()` → 창 종료 → 데몬 생존 → 재기동 시 포트/락 파일로 재접속 | 실행 중 Codex 턴이 끊기지 않고 재접속 후 이벤트 seq 이어받음 |
| E2 | 데몬 종료 시 자식(`claude`, `codex app-server`) 프로세스 트리 정리 | 좀비 0, Job Object 또는 명시 kill 확인 |
| E3 | 데몬 런타임 2방식(동봉 Node / Electron `runAsNode`) **각각** better-sqlite3·node-pty `.node` 로드 + WAL 쓰기 | 두 방식 모두 결과 기록; `electron-rebuild`는 `runAsNode` 경로에만 적용, 동봉 Node는 Node ABI prebuilt 사용. 재빌드 필요성은 결과로 결정 |
| E4 | WS JSON-RPC 재접속 후 저널 seq 기반 재구독 | 누락·중복 이벤트 0 |
| E5 | 트레이 상주 + 창 닫기 억제 | `window-all-closed` 처리로 앱 유지 |

## 2. 결정표

| 영역 | 결정 | 버전(2026-11-01 기준) | 라이선스 | ADR | 선정 이유 요약 | 기각 대안 |
|---|---|---|---|---|---|---|
| 언어 | TypeScript 단일 | Node 24 LTS(EOL 2028-04) | MIT | 0001 | 두 공식 SDK 모두 TS, 현 PC 툴체인, 타입 공유 | Python, Rust, Go, C# |
| 데스크톱 | Electron | 45.2.1 | MIT | 0002 | Chromium 일관, 자식 프로세스 완전 제어, 런타임 1개 | Tauri v2, Avalonia, Qt/PySide6 |
| 구조 | C Hybrid(Shell + Node 데몬) | — | — | 0003 | 백그라운드 지속·장애 분리·단일 writer(§1) | A, B1, B2 |
| 프런트 | React | 19.3.1 | MIT | 0004 | 래퍼 생태계, 후보 스킬(vercel-react-*) 적용 | Vue, Svelte |
| 상태 | 외부 store + `useSyncExternalStore`, 저널 seq 배치 | — | — | 0004 | 고빈도 이벤트 분리 | Zustand 즉시 확정(필요성 확인 후 결정) |
| 편집기 | Monaco(지연 로드, MVP-Core 읽기·Diff) | 0.57.0 | MIT | — | VS Code 동일 엔진, 접근성 가이드 | CodeMirror 6 |
| 터미널 | xterm.js + node-pty | 6.0.0 | MIT | — | 의존성 0, 스크린리더 모드. **node-pty는 Windows C++ 컴파일러·SDK 전제** → P00 S6에서 툴체인 존재·prebuilt 로드 확인, 미비 시 C3 승인 | 로그 뷰어(기각: 입력·크기 변경 불가) |
| DB | SQLite WAL + better-sqlite3, 저널 원본 | 13.0.3 | MIT | 0005 | 단일 writer, 동기 API | node:sqlite(RC), PostgreSQL |
| Gateway(Claude) | `@anthropic-ai/claude-agent-sdk` + 사용자 설치 CLI | 0.3.316 ↔ CLI 2.1.316 | **Anthropic Commercial Terms**(SDK LICENSE.md; MIT 아님) — 배포 방식별 사용·재배포 조건은 ADR-0007 결정 게이트 | 0006 | `canUseTool`, streaming input, `interrupt()`, `listSessions()` | CLI stream-json(fallback) |
| Gateway(Codex) | `codex app-server` stdio JSON-RPC | CLI 0.166.0(experimental) | Apache-2.0(openai/codex docs/license.md) | 0006 | 승인 요청 수신 유일 경로, steer/interrupt/fork/skills | `codex exec --json`(읽기 전용 일회성만), SDK |
| 자격증명 | `@napi-rs/keyring`(앱 비밀만) | 2.1.2 | MIT | — | keytar archived | keytar, tauri-stronghold |
| 인증 모드 | 공급자별 1급 설정, **기본 = 설치된 CLI 로그인 재사용**(U1; 약관 책임은 사용자), API key는 공급자별 선택·전환 경로 | — | — | 0007 | 기능 상속·추가 과금 없음 | API key 기본, 단일 토글 |
| 패키징 | electron-builder + electron-updater | v26 | MIT | 0008 | Linux updater 채널, 네이티브 모듈 처리 | Forge, update.electronjs.org |
| 배포 포맷 | Win NSIS / mac DMG / Linux AppImage+deb | — | — | 0008 | 호스트 제약 반영 | MSI(기업 요구 시) |
| 서명 | Win: Azure Artifact Signing 우선, 없으면 OV/EV; mac: Developer ID + notarization | — | — | 0008 | 공식 안내 | — |
| 테스트 | Vitest + Playwright(Electron) + 3-OS CI | — | MIT | — | 단일 언어 | — |
| Rust/Tauri | V1까지 범위 밖 | — | — | 0001 | 측정 가능한 재검토 문턱 | — |

## 3. 평가 기준 대비 (15개)

| 기준 | 평가 |
|---|---|
| 실제 구현 가능성 | 현 PC(Node 24)로 TS 개발 가능. **네이티브 모듈(node-pty·better-sqlite3) 빌드 전제는 미확인**(PATH에 `cl`·`msbuild` 없음, prebuilt 가용성 P00 S6) |
| 공식 SDK·CLI 지원 | Claude SDK(TS) 공식, Codex app-server 공식(experimental 라벨) |
| 유지보수 상태 | 모든 선택 컴포넌트 2025~2026 활성 릴리스(keytar 제외) |
| 3-OS 호환 | Electron·React·Monaco·xterm·better-sqlite3 prebuilt. 빌드는 OS별 호스트 |
| 보안·권한 통제 | Electron 격리 설정 필수, 승인은 Gateway 브로커, Codex sandboxPolicy |
| 성능·메모리 | 설치 크기·메모리 수치 UNVERIFIED → Phase 00/11 측정 |
| 실시간 이벤트 | 저널 seq 배치 + rAF |
| 세션 복구 | 공식 resume/fork API 양측 존재 |
| 배포·업데이트 | electron-builder/updater, Linux 채널 분리 |
| 테스트 편의 | 단일 언어, 어댑터 심에서 계약 테스트 |
| 생산성 | TS 단일 |
| 확장성 | 어댑터 심에 제3 에이전트 추가 가능 |
| 장기 비용 | Electron 크기·Node 네이티브 모듈 리빌드 |
| 라이선스 | 프레임워크·UI 라이브러리는 MIT 계열. **Claude Agent SDK는 Anthropic Commercial Terms**, Codex는 Apache-2.0 → 공개 배포 전 SDK 사용·재배포 조건 확인 게이트(ADR-0007) |
| 복잡도 | 프로세스 3개(Shell·Renderer·데몬) + 에이전트 자식 |

## 4. 기각 대안·되돌릴 조건

| 결정 | 기각 대안 | 기각 이유 | 되돌릴 조건 |
|---|---|---|---|
| Monaco | CodeMirror 6 | VS Code 동일 엔진·Diff 뷰 내장·접근성 가이드; 번들 크기는 지연 로드로 완화 | P00 S6에서 설치물 worker·CSP 실패 또는 Diff 렌더 p95 > 200ms |
| node-pty | 로그 뷰어, Web PTY 서비스 | 입력·크기 변경·사용자 전용 환경 필요 | Windows prebuilt 부재 + 빌드 툴체인 승인 거부 시 V1에서 "외부 터미널 열기"로 축소 |
| `@napi-rs/keyring` | keytar(archived), 자체 DPAPI 래퍼 | 유지보수 상태·3-OS 백엔드 | OS 백엔드 범위 UNVERIFIED 해소 실패 시 OS별 래퍼 |
| Vitest+Playwright | Jest, WebdriverIO | 단일 언어·Electron 지원 | Playwright Electron 드라이버 회귀 시 WebdriverIO |
| NSIS/DMG/AppImage+deb | MSI, pkg, snap/flatpak | 호스트 제약·updater 채널 | 기업 배포 요구 시 MSI 추가 |
| Azure Artifact Signing→OV | EV 토큰 | 비용·운영 | SmartScreen 평판 문제 지속 시 EV |

## 5. P00 결과로 확정하는 항목

- **데몬 런타임**(D5): 동봉 Node 런타임 vs Electron `runAsNode`(fuse 보안 고려) — P00 S6 실측(E3) 후 결정.
