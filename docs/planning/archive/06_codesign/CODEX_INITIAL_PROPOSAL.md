# CODEX_INITIAL_PROPOSAL — OpenAI Codex 독립 아키텍처 제안 (Round 1)

| 메타 | 값 |
|---|---|
| 상태 | FINAL(Round 1 보존본, 원문 수정 금지) |
| 작성 | OpenAI Codex (codex-cli 0.166.0, model gpt-6-sol, reasoning effort high override) |
| 호출 | 2026-11-01 11:48:08Z ~ 11:54:02Z, thread `<thread-id>`, exit 0 |
| 원본 | `codex/R1_proposal/{prompt.md,response.md,events.jsonl,meta.json}` |
| usage | input 1,879,682(cached 1,758,592) / output 12,197 / reasoning 1,832 tokens |
| 독립성 | Codex에는 Claude 제안을 전달하지 않았다(프롬프트 참조). 아래 §"원문"은 `response.md`와 바이트 단위 동일 |
| Claude 주석 | §"Claude 검토 메모"에만 기록. 원문에는 손대지 않음 |

## 원문 (response.md 전문)

### 1. 핵심 설계 판단 (5~8줄)

Agent Studio에는 **Electron UI와 독립 실행형 TypeScript 오케스트레이터**를 추천한다. UI를 닫아도 작업을 이어가려면 실행과 상태 관리의 소유자가 창 프로세스 밖에 있어야 한다.  
Claude Code는 TypeScript Agent SDK, Codex는 App Server를 대화형 기본 경로로 삼고, 일회성 검증에는 각 CLI의 비대화형 실행 경로를 쓴다.  
SQLite는 작업 상태의 단일 기록 원천으로 두되, 대화 원문과 작업 상태를 같은 것으로 취급하지 않는다. 이는 `REQ-STATE-01~04`, `REQ-SM-13`의 핵심이다.  
승인은 모델의 약속이 아니라 **실행 직전의 권한 판정과 OS 격리**로 강제해야 한다.  
현재 PC에는 Node 24가 있고 Rust·Go 개발 도구가 없다. 초기 구현은 TypeScript 중심이 비용상 유리하지만, Electron의 배포 크기와 독립 백엔드 패키징 비용을 감수해야 한다.  
가장 먼저 검증할 것은 UI가 아니라 **두 에이전트의 승인·중단·재개가 실제 설치 버전에서 끝까지 동작하는지**다.

이 제안은 [사용자 지시서](D:/LLM/agent-studio/docs/planning/evidence/USER_DIRECTIVE.md), [요구사항](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md), [환경 조사](D:/LLM/agent-studio/docs/planning/evidence/ENVIRONMENT_SURVEY.md)를 기준으로 했다. 로컬에서 `claude --help`와 설치 경로의 `codex.exe --help` 계열을 읽었다. 확인된 버전은 Claude Code `2.1.316`, Codex CLI `0.166.0`, Node `24.21.0`, Python `3.14.7`이다. `codex`는 이 실행 환경의 `PATH`에 없어 조사 문서에 적힌 절대 경로로 도움말을 확인했다. **어떤 에이전트 실행이나 파일 변경도 하지 않았다.**

### 2. 기술 스택 제안

| 항목 | 선택 | 근거(공식 근거 포함) | 대안과 기각 사유 | 위험 |
|---|---|---|---|---|
| 개발 언어(UI / 백엔드·오케스트레이터 / 프로세스 제어 / 테스트) | TypeScript / TypeScript / Node.js·OS별 작은 어댑터 / TypeScript | 현재 Node 24가 설치돼 있고, Claude의 [TypeScript Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)와 Codex의 [App Server](https://developers.openai.com/codex/app-server)를 같은 언어에서 연결할 수 있다. | Python은 빠른 오케스트레이션에 좋지만 웹 UI와 언어·배포 경계가 추가된다. Rust·Go·C#은 도구 설치부터 필요하다. 설치는 가능하나 초기 비용으로 잡아야 한다. | 단일 언어가 OS 프로세스 격리까지 해결해 주지는 않는다. |
| 데스크톱 프레임워크 | Electron | [프로세스 모델](https://www.electronjs.org/docs/latest/tutorial/process-model), [보안 지침](https://www.electronjs.org/docs/latest/tutorial/security), [Forge 패키징](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)이 공개돼 있다. | Tauri는 배포 크기에 매력이 있지만 [Rust 및 Windows C++ Build Tools가 개발 전제](https://tauri.app/start/prerequisites/)이고 현재 없다. Qt/PySide6는 [공식 Python 바인딩](https://doc.qt.io/qtforpython-6/)이 있으나 웹 기반 IDE 부품을 합치는 비용이 크다. .NET MAUI는 [공식 대상에 Linux 데스크톱이 없다](https://learn.microsoft.com/en-us/dotnet/maui/what-is-maui). | Chromium 포함에 따른 크기·메모리, 서명·업데이트 운영 부담. |
| 프런트엔드 프레임워크 | React + TypeScript | 채팅·트리·Diff·설정 화면을 독립 컴포넌트로 만들고, 이벤트를 투영한 상태를 표시하기 쉽다는 **설계 판단**이다. | Vue·Svelte도 가능하다. 현재 요구사항만으로 성능상 승자를 입증할 수 없어 팀 숙련도로 재평가할 수 있다. | 고빈도 토큰 이벤트를 그대로 React 상태에 넣으면 렌더가 밀린다. 배치·가상화가 필요하다. |
| 코드 편집기 컴포넌트 | Monaco, MVP에서는 읽기·Diff 우선 | [Monaco 공식 소개](https://microsoft.github.io/monaco-editor/)는 브라우저 코드 편집 기능을 명시한다. `REQ-WS-04~05`에 맞는다. | CodeMirror는 경량 대안이다. 여기서는 VS Code와 가까운 편집 경험을 우선했다. | 대용량 파일, 언어 서비스와 번들 크기는 측정해야 한다. |
| 터미널 컴포넌트 | xterm.js + 백엔드 PTY 어댑터 | [공식 사이트](https://xtermjs.org/)가 브라우저 터미널 표시 API를 제공한다. xterm.js 자체는 셸 프로세스가 아니다. | 단순 로그 뷰는 입력·크기 변경을 지원하지 못해 `REQ-WS-06`을 충족하지 못한다. | Windows ConPTY 및 Unix PTY의 동작 차이, 입력 권한. |
| 백엔드 구조 | Electron main은 창·IPC만 담당, 별도 Node 오케스트레이터가 Gateway·큐·DB 소유 | Electron main은 [앱 생명주기](https://www.electronjs.org/docs/latest/tutorial/process-model)를 소유한다. 독립 서비스로 작업 수명과 창 수명을 분리하는 것은 설계 판단이다. | Electron main 또는 `utilityProcess`만으로 운영하면 창을 닫은 뒤 지속 실행 요구를 별도로 풀어야 한다. Python 서비스는 언어·런타임이 하나 더 든다. | 서비스 시작·재접속·설치·제거의 OS별 구현이 가장 어렵다. |
| 데이터 저장소 | 로컬 SQLite WAL + append-only 이벤트 저널 + 버전 있는 스키마 | [SQLite WAL 문서](https://www.sqlite.org/wal.html)는 동시 읽기와 단일 쓰기 제약을 명시한다. 단일 사용자, 단일 상태 작성자에 적합하다. | PostgreSQL은 서버 운영 부담이 크다. 순수 JSON 파일은 전이·중복 실행·복구의 원자성을 만들기 어렵다. | WAL 백업 시 DB 파일만 복사하면 안 된다. Node 내장 `node:sqlite`는 [Node 24 문서상 release candidate](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)이므로 드라이버 선정·패키징 검증이 필요하다. |
| 자격증명 저장 | OS 자격증명 저장소, 앱 DB에는 참조 ID만 | `REQ-SEC-03`의 최소 권한 설계다. Codex 로그인 파일과 Claude 인증 자료를 앱 DB로 복사하지 않는다. | 평문 환경변수·SQLite 저장은 로그와 백업으로 노출되기 쉽다. | OS별 저장소 연동과 잠금 해제 UX는 Phase 00 검증 대상이다. |
| 패키징·자동 업데이트 | Electron Forge; 서명된 OS별 설치물과 업데이트 채널 | [Forge 공식 가이드](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging), [Electron 업데이트 가이드](https://www.electronjs.org/docs/latest/tutorial/updates). | 별도 자체 업데이터는 공급망 위험과 유지비가 크다. | Electron 내장 `autoUpdater`는 [Linux 지원이 없어](https://www.electronjs.org/docs/latest/api/auto-updater/) 배포판 패키지 관리 등 별도 정책이 필요하다. 오케스트레이터 교체 중 실행 작업 보존도 설계해야 한다. |

TypeScript 단일 언어의 이득은 Gateway 이벤트형, UI 이벤트형, 상태 전이형을 공유하는 데 있다. 다만 “단일 언어”와 “단일 프로세스”는 다르다. 프로세스·권한·장애 경계는 유지해야 한다. Rust 도입은 Tauri 전환 또는 격리 헬퍼가 실제 측정에서 필요한 경우에 한정한다.

### 3. 아키텍처 대안 A/B/C 평가와 추천

**A — Python 오케스트레이터 중심**

```text
Electron UI ⇄ IPC/localhost ⇄ Python 서비스 ⇄ Claude/Codex
                                └─ SQLite
```

UI 요청을 Python 서비스가 큐에 기록하고 에이전트를 구동한다. Python의 비동기·프로세스 제어는 자연스럽지만, TypeScript UI와 Python 서비스 사이의 계약·패키징을 모두 관리해야 한다.

**B — 네이티브 Desktop Backend 중심**

```text
Tauri UI ⇄ Rust backend ⇄ Claude/Codex
                    └─ SQLite
```

창, 프로세스 제어, 상태를 Rust 백엔드가 한 앱에서 다룬다. 경계가 적고 성능 여지가 크다. 반면 앱 종료 후 계속 실행하려면 결국 독립 서비스가 필요하며, 현재 PC에 Rust와 Windows C++ 개발 도구 설치 비용이 발생한다. Tauri의 실제 개발 전제는 [공식 prerequisites](https://tauri.app/start/prerequisites/)로 확인했다.

**C — Desktop + 독립 오케스트레이터**

```text
React renderer ⇄ Electron main ⇄ local authenticated IPC
                                      ⇄ Node orchestrator ⇄ Claude SDK
                                                          ⇄ Codex App Server
                                      └─ SQLite + event journal
```

오케스트레이터가 요청을 큐에 기록한 뒤 에이전트별 어댑터로 보낸다. 이벤트는 저널에 먼저 확정하고 UI에 투영한다. 창을 다시 열면 현재 상태와 마지막 이벤트 번호부터 재구독한다. 로컬 IPC는 외부 네트워크에 노출하지 않고 연결 인증·요청 ID·프로토콜 버전을 둔다.

아래 점수는 **5점이 유리**하다. 성능과 구현 비용 등은 실측이 아닌 설계 비교 점수다.

| PART C §10 기준 | A Python | B Native | C Hybrid |
|---|---:|---:|---:|
| 성능 | 3 | 5 | 4 |
| IPC 통신의 단순성 | 2 | 5 | 3 |
| 실시간 이벤트 | 4 | 4 | 5 |
| 다중 에이전트 제어 | 4 | 3 | 5 |
| SQLite 상태 관리 | 4 | 4 | 5 |
| 앱 종료 후 백그라운드 실행 | 4 | 2 | 5 |
| OS별 서비스 관리의 단순성 | 2 | 3 | 2 |
| 장애 복구 | 4 | 3 | 5 |
| 권한 격리 | 3 | 3 | 4 |
| 패키징의 단순성 | 2 | 3 | 2 |
| 구현 비용의 낮음 | 3 | 2 | 3 |
| 장기 유지보수성 | 3 | 3 | 4 |
| **합계 / 60** | **38** | **40** | **47** |

**C를 추천한다.** `REQ-GOAL-06`, `REQ-CE-11`, `REQ-SM-11`을 앱 창의 수명과 분리해 구현할 수 있기 때문이다. 가장 큰 위험은 **Windows·macOS·Linux에서 독립 서비스의 설치, 재시작, 제거, 업데이트를 일관되게 만드는 일**이다. Phase 00에서 설치형 프로토타입으로 검증하고, 실패하면 MVP는 “창 종료 시 안전 중단·재개”로 범위를 명시한 뒤 백그라운드 지속을 V1로 미룬다.

### 4. Agent Gateway 설계

공통 인터페이스는 `start`, `stream`, `list/read`, `resume`, `fork`, `steer`, `approve`, `interrupt`, `usage`, `recover`를 제공하되 **지원하지 않는 기능을 흉내 내어 성공으로 표시하지 않는다**. Codex 기본값은 App Server다. 공식 문서가 thread/turn 관리와 서버 주도 승인 요청을 설명하며, 설치된 CLI의 `app-server --help`도 이를 실험적 명령으로 표시한다. `codex exec --json`은 도움말상 JSONL 이벤트를 출력하므로 일회성 작업·호환성 대체 경로다. Claude는 [Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)를 기본값, `claude -p --output-format stream-json`을 CLI 대체 경로로 둔다. 후자의 플래그는 설치된 `claude --help`에서 확인했다.

| PART C §9.6 기능 | Codex 경로 | Claude 경로 |
|---|---|---|
| 대화 시작 | App Server `thread/start` → `turn/start` | SDK `query()`의 새 세션 |
| 스트리밍 | `item/agentMessage/delta`, `item/started`, `item/completed` | SDK 메시지·부분 스트림; CLI 대체 `--output-format stream-json --include-partial-messages` |
| 세션 조회 | `thread/list`, `thread/read`, `thread/turns/list`, `thread/items/list` | SDK `listSessions()`, `getSessionMessages()` |
| 세션 재개 | `thread/resume` → `turn/start`; CLI 대체 `codex exec resume` | SDK `resume`; CLI `--resume` |
| 세션 분기 | `thread/fork`; CLI `codex exec fork` | SDK `resume` + `forkSession: true`; CLI `--fork-session --resume` |
| 실행 중 추가 지시 | `turn/steer`와 `expectedTurnId` | SDK streaming input으로 추가 메시지. **활성 도구 실행 도중 즉시 반영되는 시점은 UNVERIFIED** |
| 도구 호출 관찰 | `item/*`의 `commandExecution`, `fileChange`, `mcpToolCall` 등 | SDK assistant의 tool-use 블록·도구 결과; CLI JSON 스트림 |
| 승인 요청 수신·응답 | `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`에 정책 판정 후 응답 | SDK `canUseTool` 및 권한 설정. 이미 자동 허용된 도구에는 콜백이 오지 않으므로 도구 목록·권한 모드도 잠근다 |
| 실행 취소 | `turn/interrupt`; 완료 상태 `interrupted` 확인 | SDK `interrupt()`; CLI 배경 작업은 `claude stop` |
| 사용량 조회 | `thread/tokenUsage/updated`; CLI `--json`의 완료 이벤트 사용량 | SDK 결과의 `usage`, `modelUsage`, `total_cost_usd` |
| 오류 복구 | `error.codexErrorInfo`와 `turn/completed.status` 판정 후 thread 재개·작업 대조 | SDK 오류 결과·세션 ID 확인 후 `resume`; 파일 상태는 별도 대조 |
| 버전 호환성 | 시작 시 `codex --version`, App Server 초기화·메서드·이벤트 스모크 테스트. **설치된 0.166.0과 현재 문서의 모든 필드 일치는 UNVERIFIED** | `claude --version`, SDK/CLI 지원 기능 검사, 결과 스키마 계약 테스트 |

Codex의 정상 완료 기준은 마지막 텍스트 수신이 아니라 `turn/completed`의 `status: completed`다. `failed`와 `interrupted`를 별도로 저장한다. App Server의 아이템 최종 상태는 `item/completed`를 권위 있는 값으로 사용한다. 승인 요청에는 `threadId`·`turnId`가 있으므로 승인 UI를 해당 실행에 묶을 수 있다. 네트워크 승인에는 목적지 정보가 별도 제공될 수 있으며, 일반 셸 명령 승인과 같은 화면으로 뭉개지 않는다. 이 프로토콜, 이벤트형, 오류형의 근거는 [Codex App Server 공식 문서](https://developers.openai.com/codex/app-server)다. Claude SDK의 세션·승인·중단·사용량 근거는 [세션](https://code.claude.com/docs/en/agent-sdk/sessions), [승인](https://code.claude.com/docs/en/agent-sdk/user-input), [TypeScript API](https://code.claude.com/docs/en/agent-sdk/typescript), [사용량](https://code.claude.com/docs/en/agent-sdk/cost-tracking) 문서다.

`codex exec --json`의 `thread.started`, `turn.started`, `item.started/completed`, `turn.completed.usage` 예시는 환경 조사에 기록돼 있다. 다만 `exec`는 한 작업의 자동화에 알맞고, 제품의 대화·승인·중단 수명 관리는 App Server가 더 직접적이다. [OpenAI의 통합 계층 설명](https://developers.openai.com/blog/codex-as-a-platform)도 이 구분을 명시한다.

### 5. 상태·복구 설계 요지

`Workspace 1:N Project 1:N Phase 1:N Task 1:N AgentRun`을 기본으로 한다. `Session`은 `AgentRun`의 자식으로 고정하지 않는다. **`AgentRun ↔ Session` 연결 테이블**을 두어 하나의 세션을 여러 작업에서 재사용하거나 분기 계보를 기록한다. Phase는 계획 단위, Task는 수행 단위, AgentRun은 특정 호출 시도, Session은 공급자 대화 이력이다. 이 분리가 `REQ-SM-07`, `REQ-SM-13`, `REQ-STATE-01`을 만족시킨다.

Task 상태는 `QUEUED → PLANNING → IMPLEMENTING → REVIEWING → VERIFYING → COMPLETED`이고 `REWORK`, `WAITING_APPROVAL`, `BLOCKED`, `FAILED`, `CANCELLED`를 명시적으로 둔다. 각 전이는 현재 상태·작업 버전·권한·제한 시간을 확인한 **오케스트레이터 한 곳**만 기록한다. `COMPLETED`는 모델의 완료 문장으로 진입할 수 없다. Diff, 테스트 결과, 수용 기준, 승인 범위의 확인 결과가 필요하다(`REQ-PH-08`, `REQ-WS-13`).

| 장치 | 채택 방식과 이유 |
|---|---|
| Lease + Heartbeat | 실행 소유자와 만료를 기록한다. 프로세스가 사라지면 작업을 곧바로 재실행하지 않고 조사 대상으로 표시한다. |
| Fencing Token | lease를 다시 얻을 때 단조 증가시켜 오래된 worker의 DB 결과 기록을 거부한다. 외부 Git·파일 변경까지 되돌리는 장치는 아니다. |
| Idempotency Key | 작업·시도·효과 종류별 키로 큐 중복과 결과 중복을 막는다. 외부 서비스가 키를 받지 않으면 자동 재시도 금지다. |
| Event Journal | 전이, 승인, 도구 결과, 프로세스 종료를 순서와 상관 ID로 남겨 UI 재생·감사에 쓴다. |
| Checkpoint | Git 기준점, 변경 파일 목록·해시, 세션 ID, 테스트 상태, 마지막 확정 이벤트 번호를 묶는다. 세션 저장과 파일 스냅샷은 별개다. |
| Recovery Manager | 부팅·재접속 시 DB, 프로세스, Git 상태를 대조해 재개·대기·차단 중 하나를 결정한다. |

14개 시나리오의 처리는 다음과 같다. **① Claude 정상 종료·② Codex 정상 종료**는 결과 이벤트와 실제 변경·테스트 증거를 대조해 다음 상태로 전이한다. **③ 에이전트 비정상 종료·④ 앱 강제 종료·⑤ OS 재부팅**은 heartbeat 만료와 프로세스 부재를 확인하고, 마지막 체크포인트 이후의 파일·외부 효과를 조사한다. UI만 죽고 독립 서비스가 살아 있으면 UI는 이벤트 번호로 재접속한다. **⑥ 네트워크 단절**은 지수 지연 재연결을 제한 횟수 안에서만 수행하며, 요청 접수 여부가 불명확하면 동일 변경을 재전송하지 않는다. **⑦ 인증 만료·⑧ 사용 한도 초과**는 즉시 `BLOCKED`로 둔다. **⑨ 스킬 실패·⑩ 테스트 중단**은 부분 산출물을 보존하고 원인과 재시도 가능성을 분리한다. **⑪ Git 충돌**은 자동 덮어쓰기 없이 `WAITING_APPROVAL`로 둔다. **⑫ 세션 ID 복원 실패**는 체크포인트에서 새 세션으로 *Context Handoff*를 제안하고 이를 “native resume”으로 표시하지 않는다. **⑬ 부분 완료**는 Diff·테스트·외부 효과를 재검증한 뒤 남은 단계만 계획한다. **⑭ 승인 범위 밖 재시작**은 이전 승인을 무효화하고 다시 요청한다. 이는 `REQ-REC-01~15`에 대응한다.

### 6. 보안·승인·실행 제한 의견

위협 모델은 다음 다섯 가지다.

- 저장소 파일·웹 페이지·도구 출력의 프롬프트 인젝션이 에이전트의 권한 판단을 오염시킨다.
- 악성 Skills, Hook, MCP가 설치 과정이나 실행 중 임의 코드를 구동한다.
- 잘못된 작업 경로, 심볼릭 링크, 명령 인자가 프로젝트 밖 파일이나 비밀을 건드린다.
- UI 렌더러 침해가 Electron main의 파일·프로세스 권한으로 상승한다.
- 중단·재부팅 뒤의 중복 실행이 Push, 배포, DB 변경 등 되돌리기 어려운 효과를 반복한다.

`CLAUDE.md`와 `AGENTS.md`는 작업 지침으로만 취급한다. 실행 계층은 프로젝트별 허용 경로·명령·네트워크·원격 Git·MCP·배포 정책을 저장하고, **도구 실행 직전** 실제 인자·정규화된 경로·승인 유효기간을 판정한다. Codex App Server 승인 요청에는 `decline`을 응답할 수 있고, Claude SDK에는 `canUseTool`이 있다. 다만 Claude는 선행 규칙이 자동 허용하면 콜백을 건너뛴다고 [공식 문서](https://code.claude.com/docs/en/agent-sdk/user-input)가 명시한다. 따라서 콜백 하나를 보안 경계로 삼지 않고, 도구 허용 목록·권한 모드·샌드박스·OS 권한을 함께 구성한다. Electron 렌더러는 Node 연동을 끄고 context isolation·sandbox를 적용하며 좁은 preload API만 노출한다([Electron 보안 지침](https://www.electronjs.org/docs/latest/tutorial/security)). Worktree는 충돌 격리 수단이지 보안 샌드박스가 아니다.

| PART D §12 초기값 | 의견 | 근거·예외·검증 |
|---|---|---|
| 작업 최대 120분 | **유지**, 기본 범위 30~240분 | 승인 대기 시간은 제외한 활성 실행 시간. 경계 직전·재부팅 후 누적 시간 테스트. |
| 에이전트 호출 최대 20분 | **기본 30분으로 변경**, 5~60분 조정 | 큰 테스트·리뷰의 조기 중단을 줄인다. 무출력 5분은 별도 경고; 호출 상한 도달 시 중단 이벤트 확인. |
| 리뷰·수정 3회 | **유지** | 같은 실패를 되풀이하면 `BLOCKED`. 각 회차의 Diff·테스트 변화가 없으면 3회 전에도 중단. |
| 인프라 오류 재시도 2회 | **유지** | 네트워크·일시적 서버 오류에만 적용. 인증·권한·효과 불명확 상태는 제외. |
| 프로젝트별 동시 수정 작업 1개 | **유지** | 프로젝트의 동일 작업 트리당 1개로 시작한다. 독립 worktree 병렬 수정은 V1에서 충돌률을 측정한 뒤 허용. |
| 자동 Push/Merge/Deploy 기본 금지 | **유지** | 별도, 단일 효과·대상·만료 시간이 있는 승인 필요. 세 작업을 묶어 포괄 승인하지 않는다. |
| 인증 실패 자동 중단 | **유지** | 재로그인 이후 명시적 재개. 반복 로그인 시도 금지. |
| 사용 한도 초과 자동 중단 | **유지** | 공급자 한도와 앱 자체 토큰·호출·시간 한도를 구분 기록. |
| 불확실한 복구 상태 자동 재실행 금지 | **유지** | 이미 일어난 외부 효과를 입증할 수 없으면 `WAITING_APPROVAL` 또는 `BLOCKED`. |

Codex는 App Server `thread/tokenUsage/updated`와 `exec --json` 완료 이벤트의 토큰 수를 모은다. Claude는 SDK 결과의 `usage`·`modelUsage`를 사용하고, `total_cost_usd`는 **SDK가 제공하는 추정값**으로 표시한다. Claude 문서는 하위 에이전트 사용량과 재개 세션 누적값을 합산할 때 주의할 점도 설명한다([공식 사용량 문서](https://code.claude.com/docs/en/agent-sdk/cost-tracking)). ChatGPT 구독 로그인으로 실행한 Codex에서 통화 금액을 받지 못하면 **금액을 0원으로 표시하지 않는다**. “금액 정보 없음”으로 표시하고 토큰·호출 수·활성 시간·반복 횟수로 제한한다(`REQ-OPS-02`, `REQ-LIM-01~04`).

### 7. Skills 통합 관점 (Codex 측)

Codex의 최소 스킬은 폴더 안의 `SKILL.md`와 YAML frontmatter `name`, `description`, 본문 지침이다. `references/`, `scripts/`, `assets/`는 필요할 때 둔다. `agents/openai.yaml`은 표시 정보·호출 정책·도구 의존성용 선택 파일이다. `policy.allow_implicit_invocation: false`이면 설명 매칭에 따른 자동 호출을 막고 명시적 `$skill` 호출은 허용한다. 기본값은 `true`다. 이 형식과 동작은 [Codex 공식 Skills 문서](https://developers.openai.com/codex/skills)에 있다. `$CODEX_HOME/skills`는 현재 설치본에서 시스템 스킬과 installer가 쓰는 경로이며, [OpenAI 저장소의 installer](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-installer/SKILL.md)도 이를 명시한다. 최신 문서는 사용자·저장소 범위의 `.agents/skills`도 안내하므로, Agent Studio는 경로를 하나로 하드코딩하지 말고 App Server `skills/list` 결과를 기준으로 표시해야 한다.

38개 후보가 Claude 쪽에 설치돼 있다는 환경 조사 결과만으로 Codex 호환을 선언할 수 없다. 복사 시 특히 `disable-model-invocation`, Claude의 `Skill` tool 호출, Claude 전용 Hook·subagent 정의·플러그인 경로·권한 모드·MCP 이름, Bash 전제 스크립트를 검사한다. Claude의 “사용자 전용” 9개는 Codex에서 `allow_implicit_invocation: false`로 의도를 옮길 후보지만, **양쪽 메타데이터가 완전히 동등하다는 주장은 하지 않는다**. 원본 커밋·해시를 보존한 별도 호환본을 만들고, 깨진 의존성을 표기한다(`REQ-SK-01~02`, `REQ-SK-07`, `REQ-SK-11`).

검증 단계는 세 가지다. 첫째 `skills/list(forceReload)`로 **발견·활성화**를 확인한다. 둘째 `turn/start`에 `$name` 텍스트와 공식 문서가 권장하는 `type: "skill"` 입력 항목을 함께 보내 **해당 스킬 경로를 요청했다는 기록**을 남긴다. 셋째 작업 이벤트, 실제 도구 호출, 스킬의 고유 절차·산출물 검사를 결합해 **사용 결과**를 판정한다. `skills/list`에 보인 사실이나 프롬프트에 이름이 들어간 사실만으로 “로드되어 사용됨”이라고 보고하지 않는다. Codex App Server의 [스킬 입력·조회 프로토콜](https://developers.openai.com/codex/app-server)과 OpenAI의 [스킬 평가 예시](https://developers.openai.com/blog/eval-skills)가 이 구분을 뒷받침한다. **별도의 확정적 `skill-loaded`/`skill-used` 이벤트가 설치된 0.166.0에 있는지는 UNVERIFIED**다. 따라서 `REQ-SK-06`, `REQ-SK-12`, `REQ-DEV-02`의 완료 증거 기준은 Phase 00에서 실험으로 확정한다.

### 8. Phase 순서 제안

| 제안 순서 | 원래 Phase | 조정 이유 |
|---|---|---|
| 00 | 00 일부 + 02·05·10·11의 선행 실험 | 승인, 중단, 재개, 스킬 증거, 백그라운드 실행, 설치물 검증이 나머지 설계의 전제다. |
| 01 | 10의 보안·상태 핵심 | 권한 정책·전이·저널·한도 계약을 Gateway보다 먼저 정한다. |
| 02 | 01 | 최소 Desktop Shell과 인증된 IPC만 만든다. |
| 03 | 04 | 단일 작성자 SQLite, 영속 큐, lease와 이벤트 투영을 만든다. |
| 04 | 02 | 두 Gateway를 한 번에 완성하려 하지 말고 공통 계약 후 공급자별 계약 테스트를 통과시킨다. |
| 05 | 03 | 스트리밍 Chat·실행 타임라인·승인 UI로 첫 사용 흐름을 완성한다. |
| 06 | 05 | 세션 목록·재개·분기·체크포인트·복구를 별개 동작으로 구현한다. |
| 07 | 06 | 수동 Project/Phase/Task부터 만들고 자동 분해는 뒤에 둔다. |
| 08 | 07 | Registry·호환성·증거 수집을 먼저, 자동 라우터와 MCP 실행은 뒤에 둔다. |
| 09 | 08 분할 | Diff·읽기 뷰어를 먼저; 편집기·터미널·Preview는 권한 경계 검증 뒤 추가한다. |
| 10 | 09 | 단일 에이전트 복구가 안정된 뒤 수동 handoff와 자동 협업을 구현한다. |
| 11 | 10 잔여 + 11 | 장애 주입·CI·서명·OS별 패키지·업데이트를 릴리스 게이트로 묶는다. |
| 12 | 12 | 장기 기억·동적 역할 배분은 실제 사용 데이터가 생긴 뒤 평가한다. |

**Phase 00의 필수 spike**는 설치된 Codex `0.166.0` App Server의 초기화→대화→승인→steer→interrupt→resume→fork→usage 왕복, Claude SDK의 같은 시나리오, 두 공급자의 세션 조회, 앱 창 종료 후 독립 서비스 존속, Windows 프로세스 트리 정리, SQLite WAL 백업·복원, 스킬 실제 로드 증거, OS별 설치물과 자격증명 저장소 검증이다. 실패한 spike에는 요구사항 축소 또는 대체 인터페이스를 명시해야 한다.

**MVP**

- Windows에서 Claude·Codex 단독 채팅, 승인·취소, 실시간 이벤트, 프로젝트 등록, Diff와 작업 이력을 제공한다(`REQ-MODE-01~02`, `REQ-WS-01~02`, `REQ-PM-01~02`).
- 큐·저널·세션 재개·체크포인트로 비정상 종료 후 안전하게 작업 상태를 복원한다(`REQ-CE-11`, `REQ-SM-10~11`, `REQ-REC-01~05`).
- 설치형 환경에서 백그라운드 지속이 검증되지 않으면 종료 시 안전 중단과 재개를 명확히 표시한다.

**V1**

- macOS·Linux 배포, 독립 서비스 지속 실행, 전체 복구 시나리오와 OS별 업데이트 정책을 갖춘다.
- 수동·자동 협업, Phase DAG, 독립 리뷰·재검증, Skills 라우팅과 MCP 관리를 제공한다(`REQ-MODE-03~05`, `REQ-PH-01~06`).
- 코드 편집·터미널·테스트 로그와 공급자별 사용량을 통합하되 실행 권한을 작업별로 통제한다.

**V2**

- 장기 컨텍스트, 변경 영향 재계획, 동적 역할 분배를 실제 실행 기록으로 평가한다.
- 브라우저 미리보기·자동화와 다중 창을 보안 경계 안에서 추가한다(`REQ-WS-08`, `REQ-WS-11`).
- 스킬 업데이트·롤백과 협업 최적화는 재현 가능한 품질 지표가 있을 때만 자동화한다.

### 9. UNVERIFIED 목록과 Claude에게 묻고 싶은 질문

**UNVERIFIED**

1. 현재 공식 App Server 문서에 실린 모든 요청·응답 필드와 설치된 Codex `0.166.0`의 실제 프로토콜이 일치하는지. 도움말과 문서는 확인했지만 연결을 열어 실행하지 않았다.
2. Claude streaming input으로 보낸 추가 지시가 이미 진행 중인 도구 호출에 영향을 주는 정확한 시점. 메시지 대기열 지원은 공식 문서에 있으나, 즉시 개입 의미는 별도 검증이 필요하다.
3. Codex `0.166.0`이 스킬 본문을 실제 주입·사용했음을 단독으로 입증하는 전용 이벤트가 있는지. 공식 문서에서 발견·명시 호출 경로는 확인했지만 그 이벤트는 확인하지 못했다.
4. 세 OS에서 동일한 독립 서비스 설치·업데이트·프로세스 종료 절차가 계획대로 동작할지. 이는 기술 제안이며 설치형 실험 전에는 제품 보장이 아니다.

**Claude에게 묻고 싶은 질문**

1. Claude Agent SDK의 승인 콜백을 우회할 수 있는 자동 허용 설정을 Agent Studio가 어떻게 차단하고 검증할 것인가?
2. 창을 닫아도 실행을 계속하는 요구를 MVP의 필수 완료 조건으로 볼지, 안전 중단·재개를 MVP로 허용할지?
3. 수동 Phase 편집과 자동 재계획이 충돌하면 어떤 변경이 권위를 가지며, 사용자에게 어떤 Diff를 보여줄 것인가?
4. Claude 세션 분기·재개가 성공했더라도 파일 시스템 상태가 달라졌을 때 어떤 조건으로 자동 수행을 멈출 것인가?
5. Skills “발견”, “본문 로드”, “절차 수행”, “결과 검증”의 증거 등급을 양쪽 에이전트에 공통으로 어떻게 표시할 것인가?
---

## Claude 검토 메모 (원문 아님, Round 2 토론 입력)

1. **수렴점**: Electron + TypeScript 단일 언어, 독립 Node 오케스트레이터(C), Codex는 App Server·Claude는 Agent SDK, SQLite WAL + append-only 저널, 승인은 실행 계층, Phase 00 스파이크 우선 — Claude 제안과 일치.
2. **차이점(R2 쟁점)**: ① Codex는 보안·상태 핵심(원 Phase 10 일부)을 Gateway보다 먼저 두자고 함 ② 에이전트 호출 상한 30분(Claude 20분 유지) ③ Codex는 패키징을 Electron Forge, Claude는 electron-builder ④ Codex는 "백그라운드 지속이 검증 안 되면 MVP를 안전 중단·재개로 축소" 제안 ⑤ Codex는 `.agents/skills` 경로와 App Server `skills/list`, `type: "skill"` 입력 항목을 언급(Claude 조사에 없음 → 스키마로 검증 필요) ⑥ Claude가 제기한 **이용 약관 위험**(Agent SDK 제3자 claude.ai 로그인 금지, App Server 제3자 사용)을 Codex는 다루지 않음.
3. **Codex의 질문 5개**는 R2에서 Claude가 답한다.
4. 검증 필요 주장: Electron `autoUpdater` Linux 미지원(공식 문서 링크 제시됨), .NET MAUI Linux 데스크톱 미지원, OpenAI 블로그 "codex-as-a-platform"·"eval-skills" 링크 실재 여부 → UNVERIFIED로 두고 R2에서 확인.
