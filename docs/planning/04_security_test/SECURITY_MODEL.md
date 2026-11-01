# SECURITY_MODEL — 권한·격리·비밀·공급망·승인

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) · §2.1 보장 수준 표 P00 실측 갱신 (2026-11-02, `docs/spikes/P00_GATE.md` §3) |
| 요구사항 | REQ-SEC-01~06, REQ-PM-08, REQ-SK-07, REQ-OPS-05 |
| 공식 조사 | `archive/evidence/research/RESEARCH_DESKTOP_STACK.md`(Electron 보안·샌드박스), 공급자 문서(code.claude.com sandboxing, learn.chatgpt.com windows-sandbox) |
| 핵심 결론 | 승인 요청(`requestApproval`/`canUseTool`)은 **정책이 요구할 때만** 발생하므로 "모든 부작용의 관문"이 아니다. 고위험 효과(원격 Git·DB·설치·배포·외부 서비스)의 **정식 경로는 앱 전용 실행기**이며, 그 경로만 통과한다는 보장은 **엄격 모드에서만**(§2.1 `ENFORCED`) 성립한다. 일반·자동 모드에서는 승인 경계 + 공급자 샌드박스 + 사후 감사(`DETECTED`) 또는 정책 판정만(`POLICY_ONLY`)이다 |
| UNVERIFIED | **P00 실측으로 해소(2026-11-02)**: Codex Windows `sandbox="elevated"` 실제 차단(S4 — 외부 경로·외부 호스트 ENFORCED, TEMP 상위·loopback 통과), `readOnly`에서 명령 실행이 승인 요청으로만 가능한지(S1c — **부정**: 읽기 명령은 무승인 실행), `-c mcp_servers` 제거 여부(S9 — 추가만). **잔존**: 설치 버전(0.166.0 / 2.1.316)과 최신 문서 일치는 실측 시점 기준(추적은 P05), CLI 자체 세션 로그 통제(V32), Claude WSL2 sandbox(S4 미실측), 고위험 효과 우회 경로(MCP·Hook·설치 스크립트) 시험 — 해소 Task는 OPEN_ISSUES_AND_RISKS §2 |

## 1. 위협 모델

| # | 위협 | 경로 | 1차 통제 |
|---|---|---|---|
| T1 | 프롬프트 인젝션: 프로젝트 지침 파일(CLAUDE.md/AGENTS.md/README)·웹 페이지·도구 출력·MCP 응답이 권한 판단 오염 | 에이전트 입력 | 지침 파일 untrusted, 정책은 앱 DB에서만(§4) |
| T2 | 악성 Skills/Hook/MCP의 설치·실행 중 임의 코드 | 공급망 | 해시·커밋 고정, 보류 분류, 격리 시험(§6) |
| T3 | 프로젝트 외부 파일·비밀 접근(경로·심볼릭 링크·인자 난독화) | 에이전트 도구 | 쓰기 루트=worktree, 경로 정규화, 공급자 샌드박스, 앱 실행기(§2·§3) |
| T4 | 렌더러 침해 → main 권한 상승 | Electron | 격리 설정·CSP·좁은 preload(§7) |
| T5 | 중단·재부팅 후 중복 실행으로 비가역 효과 반복 | 복구 | idempotency·효과 outbox·Recovery Manager |
| T6 | 로그·저널·백업·CLI 자체 로그의 비밀 유출 | 저장 | 마스킹, 키링 참조만, 암호화 백업(§5) |
| T7 | 로컬 다른 프로세스의 데몬 RPC 접근 | IPC | 127.0.0.1 + 1회성 토큰 + 요청별 권한(§7) |
| T8 | 사용자 터미널·편집기 동작 가로채기·오귀속 | IDE | PTY·환경 분리, actor 태깅 |

## 2. 권한 정책 매트릭스 (14행 = 기본 11영역 + CAP 3영역)

`ALWAYS_ASK` = 반복해도 승인 재사용 없음. `ASK` = 표시한 경로·명령·호스트·도구·만료를 벗어나면 재요청. 프로젝트 신뢰 전환이 다른 행의 `DENY`를 풀지 않는다. 이 매트릭스는 앱 정책이며 CLI 기본 정책과 동일하다고 주장하지 않는다.

| 영역 | 기본 | 승인 범위 | 분류 신호(Codex) | 분류 신호(Claude) | 강제 경로 |
|---|---|---|---|---|---|
| 프로젝트 신뢰 | ASK | project; 경로·remote·지침 파일 해시 변경 시 만료 | 앱 이벤트 | 앱 이벤트 | 앱 |
| 파일 시스템 | worktree 내 AUTO / 외부 DENY | project; 외부는 once 예외 | `fileChange` 경로, `commandExecution.cwd`, `sandboxPolicy.writableRoots` | `Write/Edit/Read/Bash` 입력 경로 | 공급자 샌드박스 + 브로커 + 사후 diff |
| 실행 명령 | ASK; 검증된 읽기 전용만 AUTO | once; 반복은 짧은 until-expiry | `commandExecution.command`, `commandActions` | `Bash` 입력 | 브로커(문자열 분류는 보조) |
| 네트워크 | ASK; 미등록 호스트 DENY | 호스트·프로토콜·포트 once | `networkApprovalContext`, `permissions/requestApproval` | `WebFetch`, `Bash`, MCP | 공급자 네트워크 차단 + 브로커 |
| 원격 Git | push·force·remote 변경 DENY — 사용자가 push 액션을 **명시 선택**하면 그 작업 1회에 한해 `ALWAYS_ASK(once)`로 전이 후 DENY 복귀(SE-01b) / fetch ASK | once | **Git 전용 앱 실행기** | 동일 | 앱 실행기만 |
| DB 변경 | ALWAYS_ASK | once; 대상 DB·migration 해시 | 앱 DB/migration 실행기 | 동일 | 앱 실행기만(셸 SQL 추정으로 허용 금지) |
| 의존성 설치 | ALWAYS_ASK | once; lockfile·패키지 목록 | 앱 설치 실행기 | 동일 | 앱 실행기만 |
| Hook 활성화 | DENY; 사용자가 켤 때 ALWAYS_ASK | project; Hook 해시 변경 시 만료 | 앱 Hook API | 동일 | 앱 |
| MCP 실행 | ASK; 읽기 전용 감사 도구만 AUTO | 도구·서버별 once/until-expiry | `mcpToolCall`, 승인 요청 | `mcp__*` 입력 | 프로젝트 allowlist + 브로커 |
| 외부 서비스 변경 | DENY; 명시 작업 시 ALWAYS_ASK | once; 대상·작업·요청 | 앱 외부 서비스 실행기 | 동일 | 앱 실행기만 |
| 배포·릴리스 | DENY; 명시 작업 시 ALWAYS_ASK | once; 환경·artifact 해시 | 앱 배포 실행기 | 동일 | 앱 실행기만 |
| **브라우저 조작**(CAP-06) | ASK; 읽기 전용 열람 AUTO(신뢰 프로젝트) | 호스트·탭 once | `browser@openai-bundled` 도구 호출, 앱 MCP 도구 | `--chrome` 도구, 앱 MCP 도구 | 브로커 + 앱 MCP 서버 정책 |
| **컴퓨터 사용**(CAP-07) | ALWAYS_ASK(자동 모드에서도); 캡처와 입력(click/type)은 **분리 승인** | 동작 단위 once(동작 ID·대상 창 기록) | `computer-use@openai-bundled` 호출 | 앱 MCP 도구(`screen.capture`/`input.*`) | 앱 MCP 서버 **전용 capability**(3단 스크립트로 OS 입력 제어 금지). 셸이 허용된 모드에서 스크립트 우회는 `DETECTED`(프로세스·입력 API 감사) — 화면 캡처 결과는 마스킹 대상·보존 기간 단축 |
| **외부 문서 서비스 전송**(google-workspace 등) | DENY; 명시 작업 시 ALWAYS_ASK | 대상 문서 once | MCP 호출 | `mcp__*`·synced 스킬 | 브로커 + 외부 서비스 실행기 |

### 2.2 분류 계약 — 14행 × 발생원 → `category` → `effects.kind` → 집행 경로 → 감사 이벤트

감사 이벤트 이름은 **DATABASE_SCHEMA 이벤트 목록이 단일 출처**이며 아래는 그 이름만 쓴다. `category`는 정책 JSON·`ApprovalRequested.category`의 enum, `effects.kind`는 효과 원장 enum이고 둘의 대응은 이 표가 정본(P10a T1 산출물 `packages/core/policy/categories.ts`로 고정).

| 행 | 발생원 | `category` | `effects.kind` | 집행 경로 | 감사 이벤트(DB 목록) |
|---|---|---|---|---|---|
| 프로젝트 신뢰 | 앱 UI(신뢰 전환), 지침 파일 해시 변경 감지 | `project_trust` | — | 앱 설정(브로커 판정) | `ProjectTrustChanged`, `InstructionFileChanged{path,hash}` |
| 파일 시스템 | Codex `fileChange`/`commandExecution.cwd`, Claude `Write/Edit/Bash` 입력, 사후 diff | `fs_write` | `file_patch` | 샌드박스 + 브로커 + 사후 diff | `ApprovalDecided`, `EffectCommitted{kind:file_patch}`, `AuditSignal{unapproved_write}` |
| 실행 명령 | Codex `commandExecution`, Claude `Bash` | `exec` | — (효과는 결과 종류로 기록) | 브로커(승인 요청 발생 시) + 프로세스 감사 | `ApprovalDecided`, `GitCommandRun`, `ProcessObserved` |
| 네트워크 | Codex `networkApprovalContext`/`permissions`, Claude `WebFetch`·`Bash`·MCP, 로컬 수신 로그 | `network` | `net` | 샌드박스 + 브로커 | `ApprovalDecided`, `AuditSignal{external_call_detected}` |
| 원격 Git | 앱 Git 실행기 요청(정식) / 셸 `git push` 관찰(우회) | `git_remote` | `git_push` | 앱 실행기 + `ls-remote` 대조 | `EffectIntent/EffectCommitted{kind:git_push}`, `AuditSignal{remote_ref_changed}` |
| DB 변경 | 앱 DB/migration 실행기 요청 / 셸 SQL 관찰 | `db_change` | `db_migration` | 앱 실행기 + 감사(부분) | `EffectIntent/EffectCommitted{kind:db_migration}`, `ProcessObserved` |
| 의존성 설치 | 앱 설치 실행기 요청(3단 스크립트 설치 포함) / lockfile 변경 관찰 | `dep_install` | `pkg_install` | 앱 실행기 + lockfile 대조 | `EffectIntent/EffectCommitted{kind:pkg_install}`, `AuditSignal{lockfile_changed}` |
| Hook 활성화 | 앱 Hook API(사용자) / 설정 파일 변경 감지 | `hook_enable` | — | 앱 | `HookToggled{hook_id,enabled,by}`, `SettingsFileChanged{path,hash}` |
| MCP 실행 | Codex `mcpToolCall`, Claude `mcp__*` | `mcp_call` | `mcp` | allowlist + 브로커(격리 옵션에서 ENFORCED) | `ApprovalDecided`, `McpCallObserved{server,tool,allowed}` |
| 외부 서비스 변경 | 앱 외부 서비스 실행기 / MCP elicitation | `external_service` | `external_service` | 앱 실행기 | `EffectIntent/EffectCommitted{kind:external_service}`, `McpElicitation-requested/Answered` |
| 배포·릴리스 | 앱 배포 실행기 | `deploy` | `deploy` | 앱 실행기 | `EffectIntent/EffectCommitted{kind:deploy}` |
| 브라우저 조작 | 앱 MCP 도구 서버 `browser.*` / 번들 플러그인 도구 호출 | `browser` | — | 앱 MCP 서버(서버 측 집행) + 브로커 | `ToolServerAction{category:browser}`, `AgentEvent{kind:mcpToolCall}`(플러그인 경로) |
| 컴퓨터 사용 | 앱 MCP 도구 서버 `screen.capture`·`input.*` / 셸 입력 API 관찰 | `computer_use` | — | 앱 MCP 서버(서버 측 집행), 우회는 감사 | `ToolServerAction{category:computer_use}`, `AuditSignal{input_api_detected}` |
| 외부 문서 서비스 전송 | MCP 호출(google-workspace 등) | `doc_export` | `external_service` | 브로커 + 외부 서비스 실행기 | `EffectIntent/EffectCommitted{kind:external_service}`, `McpCallObserved` |

앱 자체 사건(신뢰 전환·Hook 전환·실행기 요청)은 공급자 이벤트가 아니라 앱 이벤트로 발생하며 같은 enum으로 분류된다. R19·R20 출고 시험(SE-08·09·10)은 UI 라벨뿐 아니라 **이 표의 감사 이벤트가 실제로 저널에 기록됨**을 단언한다.

보증 범위 표시: 셸 우회가 가능한 모드(Codex `workspaceWrite` 일반 모드, Claude native)에서는 "원격 Git·DB·설치·배포가 반드시 승인된다"고 UI에 표시하지 않는다. 그 보증이 필요한 작업은 **엄격 모드**(Codex `readOnly` → 패치 → 앱 적용기, Claude는 신뢰 프로젝트·사용자 참석)에서만 실행.

### 2.1 보장 수준 표 (공급자 × OS × 실행 모드)

`ENFORCED` = 실행 전 차단 가능, `DETECTED` = 실행 후 감사로 탐지·표시만, `POLICY_ONLY` = 브로커 판정만 있고 우회 시 집행자 없음. `POLICY_ONLY` 조합에서는 해당 영역 기본값을 `DENY` 또는 사용자 참석·변경 검토로 좁힌다.

각 셀은 **집행자(메커니즘) / 관찰 이벤트 / 우회 시험**을 적는다. 메커니즘을 명명할 수 없는 셀은 `POLICY_ONLY` 또는 `UNVERIFIED`로 둔다. 자동 모드는 별도 열이 아니라 **각 공급자×OS 열의 값에서 "승인 콜백" 집행자를 뺀 값**이다.

**갱신 이력**: 2026-11-02 P00 종료 게이트 — S1c(V30)·S2(plan 정책)·S4(V29, 격리 게이트)·S9(V31) 실측 반영. 이 표에 `UNVERIFIED` 셀은 남아 있지 않다. 실측 범위 밖(WSL2, `unelevated` 변형, API key 모드, 우회 경로 시험)은 셀 안에 "미실측"으로 표시한다. 근거: `docs/spikes/S1c.md` §2, `S2.md` §2, `S4.md` §2, `S9.md` §2, `P00_GATE.md` §3.

| 영역 | Codex 엄격(readOnly + 앱 적용기) | Codex 일반(workspaceWrite, Win sandbox) | Claude native Windows | Claude WSL2/Linux/macOS(sandbox) |
|---|---|---|---|---|
| 파일 시스템(외부 경로) | ENFORCED — 집행자: `readOnly` 샌드박스(쓰기 자체 없음) / 관찰: `fileChange` 0·사후 diff `AuditSignal{unapproved_write}` / 시험: S4·SE-06b | ENFORCED(**S4 합격** 2026-11-02, `sandbox="elevated"`: 작업 공간·TEMP 밖 쓰기 `blocked`, on-request는 `approval_requested`) — 집행자: Windows sandbox `writableRoots` / 관찰: 사후 diff `AuditSignal{unapproved_write}` / 시험: S4·SE-06b. **예외(S4 불합격 경계)**: TEMP 상위(`%TEMP%`)는 기본 쓰기 허용 루트라 `bypassed` → DETECTED + `isolation_warning{fs_tmp_parent}`; 앱 기본값 `excludeTmpdirEnvVar`·`excludeSlashTmp`=true로 ENFORCED(S4 재실측 1행 `blocked`). `unelevated` 변형은 적용 미검증 | POLICY_ONLY(**S4 실측 확정**: allow-all → `fs_outside` `bypassed`, deny → 효과 0; `isolation_warning{fs_outside}`) — 집행자 없음(`canUseTool` deny는 자동 허용 도구 미경유). `permissionMode:'plan'`은 경계가 아니라 정책(S2): 앱이 `ExitPlanMode`를 `canUseTool`에서 거부해야 유지되고, 홈 `~/.claude/plans/` 계획 파일 `Write`는 `canUseTool` 미경유(허용 예외로 기록) / 관찰: 사후 diff `AuditSignal{unapproved_write}` / 시험: S2·S4·SE-06b | ENFORCED(Bash — sandbox FS) + POLICY_ONLY(파일 도구는 `canUseTool` 판정만) / 관찰: 사후 diff / 시험: S4(WSL2 **미실측** — claude 미설치, V1 게이트로 이월)·SE-06b |
| 실행 명령 | DETECTED(**S1c 실측**, V30): `readOnly`에서 읽기 전용 명령은 **승인 없이 실행**되고, 파일 쓰기·외부 네트워크 명령만 샌드박스 차단 → 승인 요청. 따라서 "명령 실행이 승인 요청으로만 가능"은 성립하지 않으며 명령 실행 자체의 집행자는 없다(효과는 파일 시스템·네트워크 행이 ENFORCED) / 관찰: `ProcessObserved`·`GitCommandRun` / 시험: S1c·SE-08 | DETECTED — 집행자: 브로커(승인 요청이 발생한 명령만 ENFORCED) / 관찰: `ProcessObserved`·`GitCommandRun` / 시험: SE-02·SE-08 | POLICY_ONLY — 집행자: `canUseTool`(Bash 요청이 올 때만) / 관찰: `ProcessObserved` / 시험: SE-08 | ENFORCED(sandbox 범위: FS·네트워크; 명령 실행 자체는 허용) / 관찰: `ProcessObserved` / 시험: S4(WSL2)·SE-08 |
| 네트워크 | ENFORCED(**S4 합격**: 외부 호스트 `blocked`, `curl` → 000) — 집행자: Windows sandbox 네트워크 차단 / 관찰: 로컬 수신 서버 로그 0건·`AuditSignal{external_call_detected}` / 시험: S4·SE-07. **예외**: loopback(127.0.0.1)은 `bypassed` → DETECTED + `isolation_warning{network_loopback}`(앱 데몬 WS·로컬 MCP·개발 서버가 에이전트 셸에서 접근 가능 → 데몬 인증 토큰 필수, S5) | ENFORCED(S4 합격, 외부 호스트) / loopback DETECTED — 동일 집행자·관찰·시험·예외 | POLICY_ONLY(**S4 실측 확정**: loopback allow-all → `bypassed`; `isolation_warning{network_loopback}`) — 집행자 없음 / 관찰: 수신 서버 로그·`AuditSignal{external_call_detected}` / 시험: S4·SE-07(DETECTED 조합) | ENFORCED(Bash — sandbox 네트워크 차단) / 관찰: 동일 / 시험: S4(WSL2 미실측)·SE-07 |
| 원격 Git·DB·설치·배포·외부 서비스 | **DETECTED(S1c·S4 실측 후 유지)** — S1c는 "명령 실행이 승인 요청 없이는 불가"를 **부정**했고(읽기 명령 무승인 실행), 관찰은 `.git/index.lock` 쓰기 차단 1경로 + 외부 네트워크 차단 1경로뿐. ENFORCED 조건부로 올리는 조건(재정의): 파일 쓰기·외부 네트워크 ENFORCED(S4 ✓) + 앱 실행기 정식 경로 + 사용자 설정 MCP·Hook 제외(분리 `CODEX_HOME`, S9) + 우회 경로(MCP·Hook·설치 스크립트·loopback) 시험(**미실측**) — 전부 충족 전까지 DETECTED / 관찰: `AuditSignal{remote_ref_changed, lockfile_changed, external_call_detected}` / 시험: SE-01a·SE-08 | DETECTED — 집행자 없음(앱 실행기는 정식 경로) / 관찰: `AuditSignal{remote_ref_changed, lockfile_changed, external_call_detected}`(설치·DB·외부 전송은 신호 범위가 좁아 **부분**) / 시험: SE-01a'·SE-08 | DETECTED(부분) — 집행자 없음 / 관찰: 동일 `AuditSignal` / 시험: SE-01a'·SE-08 | DETECTED(부분) — 네트워크 차단 시 외부 전송만 ENFORCED / 관찰: 동일 / 시험: SE-08 |
| MCP | **기본(공유 `CODEX_HOME`, U9): POLICY_ONLY** — 집행자: 브로커 판정(allowlist 밖 DENY). **S9 실측(V31)**: `-c mcp_servers.<name>=…`는 **추가만** 하고 `config.toml` `[mcp_servers.*]` 항목을 제거하지 않으므로 공유 홈에서는 allowlist 집행자가 없다(POLICY_ONLY 확정) / 관찰: `McpCallObserved{allowed}` / 시험: S9·SE-08(MCP 경로, 공유 홈 픽스처). **격리 옵션(분리 프로필): 조건부 ENFORCED(allowlist)** — 집행자: **분리 `CODEX_HOME`**(S9: 플러그인 0·MCP 0·스킬은 system 5만) + `-c mcp_servers`(앱 서버 추가); 조건 = 분리 홈의 로그인 재구성(미실측, P02 T2) | 기본(공유) POLICY_ONLY / 격리 옵션 조건부 ENFORCED — 집행자·관찰·시험 엄격 모드와 동일 | 격리 옵션 ENFORCED — 집행자: `--strict-mcp-config`+`mcpServers`(S2 V13: strict에서 사용자 MCP 0 관찰) 또는 `settingSources:[]`(S9: 플러그인 MCP 8→0, 스킬 89→19); **기본 상속 실행은 POLICY_ONLY**(§6) / 관찰: `McpCallObserved` / 시험: S2·S9·SE-08(MCP 경로) | 격리 옵션 ENFORCED / 기본 상속 POLICY_ONLY — 집행자·관찰·시험 Claude native와 동일 |
| 브라우저·컴퓨터 사용 — **앱 MCP 서버 정식 호출 경로** | ENFORCED — 집행자: 앱 MCP 서버가 승인 없이 동작하지 않음(서버 측, 모드 무관) / 관찰: `ToolServerAction{action_id,target,decision}` / 시험: SE-10 | ENFORCED — 집행자·관찰·시험 동일(서버 측 집행은 공급자 무관) | ENFORCED — 동일 | ENFORCED — 동일 |
| 브라우저·컴퓨터 사용 — **그 외 OS 입력 경로**(셸 스크립트·번들 플러그인) | DETECTED(**S1c 실측**: readOnly에서 읽기 명령이 승인 없이 실행되므로 "명령 불가" 전제가 성립하지 않음 — 파일·네트워크 효과가 없는 입력 API 스크립트는 샌드박스가 막지 않음. S9: Codex 번들 computer-use는 Desktop 앱 실행 중에만 `cua_repl` 노출, 앱 미실행 재실측 필요) / 관찰: `ProcessObserved`·`AuditSignal{input_api_detected}` / 시험: S1c·SE-10 | DETECTED — 집행자 없음 / 관찰: 번들 플러그인 호출 `AgentEvent{kind:mcpToolCall}`·`ProcessObserved`·`AuditSignal{input_api_detected}` / 시험: SE-10 | POLICY_ONLY(셸 스크립트) + DETECTED(입력 API 감사) / 관찰: `AuditSignal{input_api_detected}` / 시험: SE-10 | ENFORCED(sandbox Bash) / 번들 플러그인 DETECTED / 관찰: 동일 / 시험: SE-10 |

**자동 모드(옵트인, U8) 재계산 규칙(시험 가능)**: 셀의 집행자가 (1) 브로커·승인 콜백(`canUseTool`·`requestApproval`)이면 → 관찰 신호가 있는 셀은 `DETECTED`, 없는 셀은 `POLICY_ONLY` (2) 샌드박스·앱 MCP 서버면 → 그대로 유지. 도출 결과:

| 영역 | Codex 엄격 | Codex 일반 | Claude native Windows | Claude sandbox |
|---|---|---|---|---|
| 파일 시스템(외부) | ENFORCED | ENFORCED(외부 경로, S4 합격) / DETECTED(TEMP 상위 — 옵션으로 ENFORCED) | DETECTED(사후 diff; S4 확정) | ENFORCED(Bash)+DETECTED(파일 도구) — WSL2 미실측 |
| 실행 명령 | DETECTED(S1c: 읽기 명령 무승인 실행) | DETECTED | DETECTED(`ProcessObserved`) | ENFORCED(sandbox 범위) |
| 네트워크 | ENFORCED(외부 호스트, S4) / DETECTED(loopback) | 동일 | DETECTED(수신 로그; S4 확정) | ENFORCED — WSL2 미실측 |
| 고위험 효과 | DETECTED(조건부 ENFORCED는 자동 모드에서 소멸 — 앱 적용기 승인 콜백이 집행자였음) | DETECTED(부분) | DETECTED(부분) | DETECTED(부분) |
| MCP | 기본(공유 홈) POLICY_ONLY / 격리 옵션 조건부 ENFORCED | 동일 | 격리 옵션 ENFORCED / 기본 POLICY_ONLY | 동일 |
| 앱 MCP 서버 정식 경로 | ENFORCED | ENFORCED | ENFORCED | ENFORCED |
| 그 외 OS 입력 경로 | DETECTED(S1c) | DETECTED | DETECTED(입력 API) / 셸 POLICY_ONLY | ENFORCED(Bash)/DETECTED |

TEST-SE-09는 자동 모드 UI 라벨이 **이 도출표**와 일치함을 단언한다. 따라서 **Claude native Windows 자동 모드는 앱 MCP 서버 경로를 제외한 모든 영역이 DETECTED 또는 POLICY_ONLY**다. 자동 모드는 모든 공급자·OS·격리 조합에서 옵트인 가능하며(U8), 이 도출표의 DETECTED/POLICY_ONLY 값이 그대로 UI에 표시되고 격리 미확인 조합은 경고 배지 + 활성 시 1회 확인을 받는다.

**AC 표현 규칙**: `ENFORCED`가 아닌 조합에 대해 "실행 불가"를 단언하는 수용 기준을 두지 않는다. 엄격 모드의 `ENFORCED 조건부` 셀은 조건(사용자 MCP·Hook 제외 확인)이 AC의 사전조건으로 명시될 때만 "실행 불가" 단언을 허용한다. 일반 모드 AC는 "우회 가능성 표시 + 탐지(TEST-SE-08)"로 쓴다.

## 3. 격리

| 수단 | 사실(공식) | 보장 | UI 표시 |
|---|---|---|---|
| Codex 샌드박스 | `readOnly / workspaceWrite{writableRoots} / dangerFullAccess(금지)`. **Windows native sandbox 제공**(learn.chatgpt.com windows-sandbox); 이 PC `[windows] sandbox="elevated"` — 실제 외부 쓰기·네트워크 차단은 P00 S4 시험으로 검증 | 가장 강함 | "샌드박스: Codex workspace-write" |
| Claude Code 샌드박스 | Bash sandbox는 **macOS·Linux·WSL2만**; 네이티브 Windows는 샌드박스 없음; 지원 OS에서도 파일 도구·MCP·Hook은 Bash sandbox 밖(code.claude.com sandboxing) | Windows: 정책만 | **"Claude native: OS 격리 없음 — 신뢰 프로젝트·사용자 참석·변경 검토 모드"** |
| 무인 Claude 수정 | OS 격리가 필요하면 WSL2·컨테이너·VM으로 Claude 프로세스 전체를 감싸야 함 | V1 이후 선택 | — |
| Git worktree | 충돌 격리만 | 보안 아님 | "작업 격리(보안 아님)" |
| 경로 allow-list·cwd·watcher·사후 diff | 정책·관리 수단 | 보안 아님 | — |
| 엄격 모드 | Codex readOnly → 패치 → 앱 적용기 승인·검증 | 파일 적용은 앱 승인 경유; 그 외 고위험 효과의 사전 차단은 §2.1의 실측·설정 조건(S1c·S4, MCP·Hook 제외)을 충족할 때만 | "엄격 모드" |
| 프로세스 권한 | 데몬·자식은 사용자 권한, 관리자 요구 금지, 자격증명 env 미전달 | — | — |

Windows MVP-Core 기본: Codex `workspaceWrite` + 지정 worktree + 네트워크 기본 차단; Claude native는 신뢰 프로젝트·참석·검토 모드 한정.

**격리 게이트**: P00 S4는 경로(worktree 외부 쓰기)·네트워크(미등록 호스트)별 **합격 기준**을 가진다 — 차단 또는 승인 요청으로 나타나면 합격. 불합격한 공급자·모드 조합은 P01 진입 시 `capabilities.isolation_warning`으로 등록되어 **경고 배지 + 자동 모드 활성 시 1회 확인 대화**를 거치고(쓰기·무인 실행 비활성화가 아님) 보장 수준 표를 `DETECTED`/`POLICY_ONLY`로 내린다. "신뢰하지 않는 저장소는 읽기 전용"의 강제 수단: Codex `readOnly` 샌드박스, Claude는 `permissionMode:plan`+`PreToolUse` 거부(정책만) — UI에 보장 수준 표시. **P00 S4 결과(2026-11-02)**: 합격 = Codex `elevated` 외부 경로·외부 호스트. 불합격 경계 6건이 `isolation_warning` 등록 입력(P01 T11)이다 — codex/windows/workspaceWrite/elevated `fs_tmp_parent`·`network_loopback`, codex/windows/workspaceWrite/unelevated 동일 2건(변형 적용 미검증), claude/windows/native/default `fs_outside`·`network_loopback`. 목록·`bypassedPolicies`는 `docs/spikes/S4.md` §2, 보장 수준 하향 4건은 같은 절. Claude WSL2 sandbox는 미실측(claude 미설치).

## 4. 프롬프트 인젝션 대응

1. 지침 파일(CLAUDE.md/AGENTS.md/README)·주석·MCP 응답은 작업 자료일 뿐 권한 근거가 아니다. "이 지침이 승인했다"는 에이전트 설명은 브로커 권한 근거 불가.
2. 프로젝트 등록 시 지침 파일 **경로·SHA256·git 상태** 표시; 외부 URL 호출·비밀 읽기·승인 우회·Hook/MCP 설치·배포 요구 문장을 경고 표시. 지침 변경 시 프로젝트 신뢰 재검토(§2 만료).
3. URL 일괄 삭제 대신 표시·검토·네트워크 통제.
4. 신뢰하지 않는 저장소는 **읽기 전용**으로 열고, 쓰기·네트워크·MCP 해제는 별도 승인.
5. 네이티브 보조: Codex는 AGENTS.md 로드와 샌드박스·승인 정책을 분리 적용; Claude는 CLAUDE.md를 맥락으로 취급, 모든 도구 호출 검사는 `PreToolUse` hook. 자동 로드된 지침을 프롬프트만으로 "완전 불신화"했다고 보증하지 않음.
6. 원격 지시를 fetch하는 스킬(web-design-guidelines)은 사본 고정.

## 5. 인증·비밀·저장

| 항목 | 설계 |
|---|---|
| 인증 모드 | 공급자별 1급 설정(ADR-0007). API key는 OS 키링(`@napi-rs/keyring`), DB에는 참조 ID만 |
| CLI 자격증명 | `~/.claude`, `~/.codex/auth.json`은 앱이 읽거나 복사하지 않음. 앱·브로커는 CLI 자격증명을 읽거나 복사·전달하지 않으며, 설치된 CLI 프로세스가 자체 인증을 사용한다(ADR-0007). API key 모드의 키는 키링 참조로만 전달 |
| 마스킹(저장 전 + 렌더러 전송 전) | `Authorization`·`Cookie` 헤더, `Bearer` 값, PEM 개인키 블록, URL userinfo, `*_KEY/*_TOKEN/*_SECRET` 환경변수, 공급자 키 형식(`sk-…` 등), 사용자 등록 비밀. `redacted` 플래그. 승인 화면 원문은 메모리에서만·만료 |
| 저널 내용 | 구조화 정보 + 제한된 출력만; 대화 원문 미저장 |
| SQLite at-rest 암호화 | MVP-Core 비요구(OS ACL·디스크 암호화 전제, 비밀 미저장). V1 조직 저장소 지원 시 암호화 DB/볼륨 옵션 |
| 백업 | **항상 암호화**(키는 키링 또는 사용자 암호), SQLite 온라인 백업 API, "저널·경로 정보 포함" UI 고지 |
| CLI 자체 세션·진단 로그 | 앱 마스킹 범위 밖 → 보존·접근 정책 별도 점검(UNVERIFIED) |
| 인증 만료 | `BLOCKED(auth)`, 재시도 0 |

"마스킹했으니 모든 로그가 안전하다"는 표현은 금지.

## 6. Skills·MCP 공급망 (REQ-SEC-04)

- 공식 저장소·커밋 고정과 설치본 집계 해시 검증(기준: `archive/evidence/SKILL_INVENTORY.md`), 불일치 시 라우팅 제외.
- 스크립트·Hook 검토 결과(SKILL_COMPATIBILITY_MATRIX §F): 바이너리 다운로드(impeccable, agent-browser), 원격 지시(web-design-guidelines), 외부 전송(design-mobile-apps, caveman-compress, diagnosing-superpowers 이슈), 설정 쓰기(git-guardrails, impeccable hooks) → 보류·격리.
- 자동 업데이트 금지: 최신 커밋 비교만 표시, 적용은 승인.
- 격리 시험: 테스트 프로젝트·read-only 샌드박스에서 실행 후 네트워크·파일 쓰기 기록 검토(P07 T7).
- MCP: 전역 config 미수정. **기본 실행** = 사용자 설정 상속(Claude 사용자 `settings` MCP; Codex는 사용자 `CODEX_HOME` 공유가 기본(U9)이라 상속됨 — 프로젝트별 격리 옵션 선택 시 제외) + 기동 시 유효 MCP 목록 스냅숏·표시 + 프로젝트 allowlist 밖 도구 호출은 브로커 DENY(집행은 `POLICY_ONLY`). **격리 옵션** = Claude `--strict-mcp-config`+`mcpServers`, Codex 분리 `CODEX_HOME`(`ENFORCED`). FINAL D19와 동일.
- 롤백: 설치본 백업 + 해시 복원.

## 7. Electron·IPC

- `webPreferences`: `contextIsolation:true, sandbox:true, nodeIntegration:false, nodeIntegrationInSubFrames:false, webviewTag:false, webSecurity:true, allowRunningInsecureContent:false, experimentalFeatures:false, devTools:isDev`.
- 앱 전용 scheme(`standard`,`secure`, `bypassCSP` 금지). **CSP 단일 정의 — 이 문자열이 유일한 정본이며 SYSTEM_ARCHITECTURE·PHASE_BREAKDOWN·AC-P01-4는 참조만 한다**: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'`. `app:` scheme 자원은 `'self'` origin으로 서빙되도록 설계(별도 `app:` directive 추가 금지, `'unsafe-eval'` 금지). 설치물에서 같은 origin의 Monaco worker가 이 CSP로 동작함은 AC-P00-5·AC-P08a-2가 검증(P00 S6 결과로 조정 시 이 줄만 수정).
- `will-navigate` 거부, `setWindowOpenHandler` deny, `shell.openExternal`은 main·사용자 동작·https allowlist.
- IPC: 발신 frame origin·창 ID·스키마 검증, preload는 좁은 함수만. 데몬 토큰·포트·경로 미노출.
- 데몬 RPC: 127.0.0.1, 1회성 토큰(키링), 프로토콜 버전, 요청별 권한. PID 파일만 신뢰하지 않고 PID·시작 시각·nonce 검증.

## 8. 승인 운영 (REQ-SEC-05·06)

- 강제 지점: 어댑터 승인 콜백 + 공급자 샌드박스 + 앱 전용 실행기 + 사후 diff 감사. CLAUDE.md/AGENTS.md는 강제 수단 아님.
- **기본값** — Codex: `approvalPolicy=on-request`(app-server v2), 제한 `sandboxPolicy` 턴마다 명시, `dangerFullAccess` 금지, `acceptForSession`·포괄 승인 기본 UI 제외. Claude: `permissionMode:"default"`, 부작용 도구 자동 allow 제거, `PreToolUse` hook, `--permission-prompts host`.
- **자동 권한 모드(CAP-02, U8 옵트인)**: 프로젝트별로 사용자가 Claude `acceptEdits/auto/bypassPermissions/dontAsk`, Codex `approvalPolicy=never`를 선택할 수 있다. 모든 공급자·OS·격리 조합에서 옵트인 가능하며 격리 미확인 조합은 경고 + 활성 시 1회 확인. 조건: 신뢰 프로젝트, 경고 배지 상시 표시(문구는 **"사전 차단 보장 없음(앱 승인 콜백) — 샌드박스·앱 MCP 서버의 차단은 조합별 §2.1 표를 따르고, 그 외 변경·명령·전송은 사후 감사로만 표시"**), 앱 전용 실행기는 **정식 경로로 유지되지만 자동 모드에서는 우회를 사전 차단하지 못함**(§2.1 자동 모드 적용값), 브라우저/컴퓨터 사용은 **앱 MCP 서버 정식 호출 경로에서만** ALWAYS_ASK가 서버 측에서 집행되고 셸·번들 플러그인 우회는 §2.1 열 값(POLICY_ONLY/DETECTED)을 따름, `dangerFullAccess`·`--dangerously-bypass-*`는 어떤 모드에서도 금지. 플랜 모드(CAP-01): Claude `plan`, Codex `readOnly`.
- 유형 AUTO/ASK/ALWAYS_ASK/DENY, 범위·만료 저장, 승인 스냅숏 대비 범위 이탈 시 재요청.
- 부재: 15분 후 거절·턴 중단·세션 보존 → `BLOCKED(approval_expired)`. 복귀 시 재개 절차: 만료된 네이티브 요청·턴은 재사용하지 않음 → `effects`·파일 blob·외부 `external_ref` 대조 → 완료 확정 단계 건너뛰기 → 남은 단계 재계획 → **새 run이 새 승인 요청** 발행. 공급자 도구의 미기록 효과가 의심되면 자동 재개 금지(TEST-RC-S22).

## 9. 상위 위험 3건 → 검증 Phase

| 위험 | 완화 | Phase |
|---|---|---|
| 승인 요청만으로 모든 부작용 통제 믿음 | 보증 범위 문서화, 고위험 효과는 앱 실행기/엄격 모드 | P00 우회 재현, P10a 정책 고정 |
| Windows Claude native + 분리 데몬 = "격리된 무인 실행" 오인 | native 한계 명시, 무인 격리는 WSL2/VM, 프로세스 트리 정리 시험 | P00·P01·P11a |
| 세션 재개 = 파일·Git·효과 복원 가정 | 저널·git ref·blob 해시·효과 ID 분리 저장, 불확실 효과 자동 재실행 금지 | P00·P04·P05 |

## 10. Critical 위험 등록

| 위험 | 등급 | 출고 차단 조건 |
|---|---|---|
| 강제 불가능한 조합(`POLICY_ONLY`/`DETECTED`)에서 "승인됨·차단됨" 보장을 UI·AC가 표시(R19) | **Critical** | 소유: P10a T1·T7, P02 T6. 보장 수준 표와 UI 라벨 불일치 1건이라도 있으면 릴리스 금지(TEST-SE-08) |
| 자동 권한 모드 옵트인 시 사전 승인 계층 소실(R20) | **Critical** | 소유: P02 T6(모드 전달·배지), P10a T1(모드별 정책 축소), P10b T3(장애 주입). 게이트: TEST-SE-09·SE-10 통과 + §2.1 자동 모드 적용값과 UI 문구 일치. Claude native Windows 자동 모드도 **노출**(U8; 경고 배지 + 활성 시 1회 확인) |
| 실행 중 업데이트로 데몬·프로토콜·DB 스키마 불일치 | High | 버전 협상 실패 시 접속 거부·안전 종료 제안이 없으면 릴리스 금지(TEST-RF-03, DT-08) |
| Desktop 앱 전용 기능(computer-use·문서 플러그인)이 헤드리스에서 조용히 사라짐 | Medium | S9 결과를 지원 매트릭스에 반영하지 않은 기능은 UI에 노출 금지 |
