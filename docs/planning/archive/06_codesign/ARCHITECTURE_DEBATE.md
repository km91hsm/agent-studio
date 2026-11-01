# ARCHITECTURE_DEBATE — Round 2 기술 비교·토론 기록

| 메타 | 값 |
|---|---|
| 상태 | FINAL (R2-1·R2-2·R2-3 전부 반영; R4 리뷰는 `CODEX_PLAN_REVIEW.md`, 판정은 `REVIEW_RESOLUTION.md`) |
| 참여 | Claude Code(Fable 5.1) · OpenAI Codex(gpt-6-sol, effort high, thread A `01a196f0…`) |
| 원문 | `codex/R2_debate_{1,2,3}/response.md` (Codex 발언은 원문 인용·요약, 창작 없음) |
| 형식 | 쟁점 | Claude 의견 | Codex 의견 | 공식 근거 | 대안 비교 | 위험 | 최종 권장안 | 합의 여부 |

## 0. Round 1 수렴 (토론 없이 확인)

| 항목 | Claude R1 | Codex R1 | 상태 |
|---|---|---|---|
| 언어 | TypeScript 단일 | TypeScript 단일 | 합의 |
| 데스크톱 | Electron | Electron | 합의 |
| 프런트 | React 19 | React | 합의 |
| 편집기·터미널 | Monaco, xterm.js | Monaco(MVP 읽기·Diff), xterm.js | 합의(로딩 시점 R2-1) |
| 구조 | C Hybrid(Shell+Node 데몬) | C Hybrid | 합의 |
| 저장소 | SQLite WAL + 저널 | SQLite WAL + 저널 + 버전 스키마 | 합의 |
| Gateway | Claude SDK / Codex app-server | 동일(+CLI는 일회성 대체) | 합의 |
| 자격증명 | OS 키링(앱 비밀만) | OS 키링, DB에는 참조만 | 합의 |

## 1. Round 2-1 — 언어·데스크톱·프런트·백엔드·DB·패키징·약관 (2026-11-01 12:00~12:05Z)

| # | 쟁점 | Claude 의견 | Codex 의견(원문 요지) | 공식 근거 | 대안 비교 | 위험 | 최종 권장안 | 합의 |
|---|---|---|---|---|---|---|---|---|
| 1 | 패키징 도구 | electron-builder + electron-updater; Linux는 AppImage | **Forge 추천 철회 → electron-builder v26 + electron-updater 동의.** "DEB가 업데이트 대상이라는 사실과 제품이 자체 업데이트를 해야 한다는 판단은 다르다" → deb는 패키지 관리자, AppImage는 updater 채널 | electron.build/v26 auto-update·appimage; electronjs autoUpdater(Linux 미지원); Forge auto-update(공개 GitHub 전제) | Forge: 공식이나 updater 범위 좁음. update.electronjs.org: 공개 저장소 조건 | 업데이트 중 데몬 교체로 작업 중단 → 실행 중 작업 있으면 적용 연기 | **electron-builder v26 + electron-updater. Windows NSIS, macOS DMG, Linux AppImage(updater)+deb(패키지 관리자)** | **합의** |
| 2 | SQLite 드라이버 | better-sqlite3(MVP), Electron 내장 Node로 데몬 실행 | better-sqlite3 고정 버전 동의. **단 "Electron 내장 Node로 데몬 실행"은 `runAsNode` fuse 보안 의미 때문에 보류, 별도 동봉 Node 런타임을 먼저 비교.** 전환 조건: node:sqlite Stability 2 + 트랜잭션·동시 읽기·백업·전원 손실 테스트 통과 + 네이티브 모듈 제거 이득 확인 | nodejs sqlite(RC 1.2), better-sqlite3 README, electronjs fuses | node:sqlite: 코어지만 RC. | 네이티브 바이너리 배포 실패 | **better-sqlite3 + 드라이버 인터페이스 뒤에 격리. 데몬 런타임은 Phase 00에서 '동봉 Node' vs 'Electron runAsNode' 비교** | **조건부 합의** |
| 3 | Monaco vs CodeMirror | Monaco, lazy load, 커스텀 프로토콜 | Monaco 유지, **MVP 기본 화면에 전체 편집기 즉시 로드 금지**, Diff 열 때 지연 로드. unpacked size는 번들 크기 아님. 에디터 2개 병행 금지 | monaco README(file:// worker), electronjs security(custom protocol), protocol API | CodeMirror 6: 모듈식, Diff·언어 조립 비용 | 설치물에서 worker·CSP 깨짐 | **Monaco 목표, MVP 읽기·Diff 지연 로드, 설치물 worker 검증** | **조건부 합의** |
| 4 | React 상태·고빈도 이벤트 | Zustand 또는 동급, seq 배치, rAF | **Zustand 전역 필수 확정 반대.** `useSyncExternalStore`로 읽기 전용 외부 store 구독, 저널 seq·`lastAppliedSeq` 재접속, rAF당 1회 불변 스냅샷, 카드 단위 가상화. 목표 1,000 delta/s에서 p95 100ms 미만(목표값) | react.dev useSyncExternalStore | — | 델타와 승인·오류 이벤트 혼합 손실 | **외부 store + useSyncExternalStore, seq 배치, rAF 코얼레싱. 상태 라이브러리는 화면 복잡도 확인 후** | **조건부 합의** |
| 5 | 이용 약관·인증 | SDK 제3자 claude.ai 로그인 금지 → 사용자 결정 항목 | **"Round 1에서 놓쳤다." 인증 모드를 공급자별 1급 설정으로.** Anthropic legal: 제3자 앱의 Claude.ai 로그인·구독 대리 라우팅 불허(수정 없는 바이너리 직접 로그인 단서는 UNVERIFIED). Codex app-server: 기존 로컬/오픈소스 앱 인증 지속 허용·SIWC 권장, 상업·호스팅 불허. **MVP는 두 에이전트 API key 경로로 완성 가능하게 설계** | code.claude.com legal-and-compliance; developers.openai.com app-server(auth), siwc/token-sharing-open-source, SIWC terms; learn.chatgpt.com auth | 구독 재사용 토글 하나로 묶기(기각) | 구독 인증 사용자 경험 범위 축소 | **인증 모드 = 1급 설정(API key / 공급자 허용 계정 연결 / 로컬 CLI 기존 인증). MVP 기본 API key. Codex 구독은 SIWC 조건 확인 후, Claude 구독은 허용 범위 확인 전 미제공. → 사용자 결정 항목** | **조건부 합의** |
| 6 | Rust 도입 조건 | 전면 제외 | **V1까지 범위 밖.** 재검토 문턱: 배치·worker·프로파일링 후에도 Node CPU 포화로 p95 목표 초과, 또는 OS 격리 요구를 기존 경로로 못 채운 침투 테스트 결과 | tauri prerequisites | — | 조기 도입 = 툴체인 표면 증가 | **V1까지 TypeScript만. 측정 가능한 재검토 문턱 기록** | **합의** |
| 7 | Electron 보안 기본값 | — (질의) | webPreferences: `contextIsolation:true, sandbox:true, nodeIntegration:false, nodeIntegrationInSubFrames:false, webviewTag:false, webSecurity:true, allowRunningInsecureContent:false, experimentalFeatures:false, devTools:isDev`, 앱 전용 scheme(`standard`,`secure`, bypassCSP 금지), CSP `default-src 'self'; connect-src 'none'; …`, `will-navigate` 거부, `setWindowOpenHandler` deny, `shell.openExternal`은 main에서 사용자 동작 후만, IPC 발신 frame 검증, 좁은 preload | electronjs security, protocol | — | Monaco worker·strict style-src 호환 UNVERIFIED | **위 설정을 필수 완료 기준으로 채택** | **조건부 합의** |
| 8 | 3-OS 빌드·서명 | 멀티 호스트 CI, Win OV/EV, mac Developer ID | windows/macos/ubuntu 3호스트, 각 호스트에서 빌드→설치→실행→데몬 재접속→네이티브 로드→제거. PR은 unsigned, 릴리스만 서명. Windows NSIS 기본(MSI는 기업 요구 시). Azure Artifact Signing 우선 검토 → OV/EV. 공개 MVP는 서명 필수, 내부 dev 빌드는 unsigned 허용(자동 업데이트 금지) | electron.build multi-platform·code-signing; electronforge dmg; Apple notarization | — | 서명 자격 CI 노출, notarization 실패 | **채택** | **합의** |

### Codex가 Claude 질문에 답한 내용 (요지)

1. app-server 장기 안정성: 실측 전. 지원 CLI 버전 고정 + 시작 시 필수 메서드 스모크 + CI 스키마 비교 필요. `exec --json -s read-only`는 **읽기 전용 일회성 분석** 대체만(쓰기 작업 대체 아님).
2. 승인 수 시간 보류: 보장 시간 **UNVERIFIED** → 앱 자체 승인 TTL, 만료 시 거부·중단·BLOCKED 기록.
3. `thread/fork {lastTurnId}`: 그 턴까지 포함해 새 thread, 진행 중 턴 지정은 거부, `ephemeral: true`는 메모리 분기(목록 미추가) → 복구용 분기에 사용 금지.
4. 스킬 로드: `skills/list{cwds, forceReload, perCwdExtraUserRoots?}` = 발견 증거, `turn/start.input`에 `{type:"text","$name …"}` + `{type:"skill", name, path}` = 주입 요청 증거. 전용 사용 완료 이벤트는 UNVERIFIED.
5. TS·Electron·C 이견: 구조 없음. Electron 내장 Node 데몬만 보류.
6. 토큰만 있는 비용: 금액 0 금지, 토큰 원본 보관, 총 토큰·호출·활성 시간·재시도·리뷰 상한, 누적 usage는 **증분**으로 집계.

### R2-1 UNVERIFIED (Codex 제시 9건)
기존 Codex CLI ChatGPT 로그인 재사용 허용 범위 / Claude SDK가 "수정 없는 바이너리 직접 로그인" 단서에 해당하는지 / SIWC 신청 가능성 / app-server 장시간 안정성·재구독·스키마 일치 / 승인 보류 보장 시간 / 스킬 사용 전용 이벤트 / Electron Node 모드 데몬의 3-OS 동작·동봉 Node 비용 / Monaco worker+CSP 설치물 호환·LSP 비용 / UI 지연 목표값 적절성.

## 2. Round 2-2 — Gateway·세션·오케스트레이터·Skills/MCP·편집기/터미널 (12:08~12:13Z)

| # | 쟁점 | Claude 의견 | Codex 의견(원문 요지) | 공식 근거 | 위험 | 최종 권장안 | 합의 |
|---|---|---|---|---|---|---|---|
| 1 | 공통 이벤트 스키마 | `text_delta, item_started, item_completed, tool_call, approval_requested, usage, error, turn_completed` | `tool_call`을 별도 이벤트로 두면 이중 집계 위험 → `item_started{kind=tool}`로. 최소 집합 `message_delta, item_started, item_updated, item_finished, approval_requested, usage_updated, turn_finished, fault`. 모든 이벤트에 `runId, seq, ts, agent, 원본 참조`; `sessionId/turnKey/itemKey`는 가능할 때만; Codex `threadId/turnId/itemId`, Claude `parent_tool_use_id/permission_denials`는 `native`에 보존. `turn/diff/updated`는 미리보기, 최종은 `item/completed`+git diff | app-server item 정의, Claude user-input | 원본 스키마 변경 | **Codex 집합 채택 + `native` 필드** | 조건부 합의 |
| 2 | 승인 브로커 정합성 | "모든 외부 효과가 승인 경로 통과" | **보장 불가.** Codex `workspaceWrite` 안의 허용된 쓰기는 `requestApproval` 없이 실행; Claude 자동 허용 도구는 `canUseTool` 미도달. 처방: Codex `approvalPolicy=on-request` + 제한 `sandboxPolicy` 턴마다 명시, `--approve-for-me`·우회 금지, `acceptForSession` 기본 UI 제외; Claude `permissionMode:"default"`, 부작용 도구 자동 allow 규칙 제거, `acceptEdits/auto/bypass` 금지, **차단 검사는 `PreToolUse` hook**; CLI fallback `--permission-mode default --permission-prompts host`. 모든 쓰기 사전 승인이 필수인 작업은 **Codex `readOnly` → 패치 산출 → 앱 소유 적용기에서 승인·검증 후 적용** | app-server 승인, config-reference approval_policy, Claude permissions 평가 순서, `claude --help` | 승인 UI를 보안 경계로 과신 | **Claude 문장 수정(ACCEPTED). "승인 경계 + 사후 diff 감사"를 일반 모드, "readOnly+앱 적용기"를 엄격 모드로 이원화** | **불일치 → Claude 수용으로 해소** |
| 3 | 승인 보류 시간 | 앱 TTL 24h 후 BLOCKED | 수 시간 보류 보장 UNVERIFIED(30분은 구독자·활동 없는 thread 해제 조건). 제안: 에이전트 측은 **15분 후 거절 응답 + 턴 중단**, 앱은 Task를 보류 유지, 사용자 복귀 시 diff 재확인 후 새 승인 요청으로 재개. SDK 콜백 "무기한 대기"도 운영 정책으로 삼지 않음 | app-server unsubscribe | 대기 중 프로세스 종료·늦은 승인 | **2단계: 에이전트 보류 15분 → 거절·중단·세션 보존; 앱 WAITING_APPROVAL 최대 24h → BLOCKED** | 조건부 합의 |
| 4 | 세션 5동작 | 표 제시 | 동일 표 확정: Resume=`thread/resume`+`turn/start`, Handoff=`thread/read`·`turns/list`·`items/list` 요약 → 새 thread, Fork=`thread/fork{lastTurnId, excludeTurns:true}`(지정 턴 포함, 진행 중 턴 거절), Restore=git ref·해시·seq 검증 후 새 thread, Replay=read API+저널. `ephemeral` 복구용 금지 | app-server fork/read, Claude sessions | 요약 handoff 누락 | 채택 | **합의** |
| 5 | 세션 목록 | SessionIndex 캐시 | 앱 소유 `SessionIndex`(agent+nativeSessionId, project/worktree, task, fork 부모, checkpoint, seq 범위)를 **복구용 투영**으로 정의. 열 때 native 재검증. `thread/list`는 `sourceKinds` 생략 시 `cli`·`vscode` 기본 → `appServer` 명시 | app-server thread/list | 외부 CLI 변경 불일치 | 채택 | **합의** |
| 6 | 동시성 | TTL 60s/HB 15s, EffectCommitted | TTL 90s/HB 20s(절전·GC 여유). 승인 대기 중 lease 영구 연장 금지. Fencing은 SQLite만 보호(FS·git 미적용) → 만료 worker 종료 확인 전 같은 worktree 재배정 금지. fileChange `itemId`는 idempotency key 아님 → base/목표 blob 해시·패치 해시 기록, 복구 판정 3분기. git commit은 outbox(parent·tree·SHA) | Claude 제안 §5, fileChange item | SQLite 기록 전 효과만 성공 | **Codex 안 채택(DATABASE_SCHEMA 반영)** | 조건부 합의 |
| 7 | Skills Codex 증거 | SKILL.md 읽기 명령 관찰 | `skills/list`→`name, description, enabled, interface?, dependencies?`+`errors`. `$name` 텍스트+`{type:"skill",name,path}`가 전체 지침 주입(공식). 실제 주입 성공 UNVERIFIED. **읽기 명령 관찰은 서버 내부 주입 시 놓침** → `skills/list` 존재+skill 입력 = `LOADED_ONLY` 상한, 산출물·테스트·해시 연결 시 `VERIFIED`. `~/.codex/skills` vs `.agents/skills` 범위 UNVERIFIED | app-server skills | 근거와 인과 혼동 | **채택(SPEC 반영)** | 조건부 합의 |
| 8 | MCP 관리 | 프로젝트별 설정 | 앱 DB allowlist, worker 시작 시 구성. Claude CLI `--mcp-config --strict-mcp-config`; SDK `mcpServers`로 기존 MCP 완전 배제 조합은 UNVERIFIED. Codex는 전역 `config.toml` 쓰기(`config/value/write`) 회피, **앱 소유 별도 `CODEX_HOME` 프로필** 설계(로그인·skills 연계 UNVERIFIED). `-c`만으로 전역 MCP 제거 주장 금지 | `claude --help`, SDK mcp, Codex config | 전역 MCP 상속 | **채택, Phase 00 실험 항목 추가** | 조건부 합의 |
| 9 | 편집기·터미널 권한 | 사용자 동작은 브로커 비경유 | 동의. Save는 경로·해시 검증 + `actor=user`·editor 세션·blob 전후 해시 저널. 사용자 PTY는 별도 프로세스·환경, 에이전트에 핸들·IPC·자격증명 env 미전달. Diff 작성자: agent(worktree/스냅숏), user(Save), external/unknown(watcher). 동시 수정은 해시 비교로 충돌 노출 | fileChange, 제품 판단 | 오귀속 | 채택 | **합의** |
| 10 | Fallback | exec 제한 모드, CLI stream-json | exec+`never`: **읽기 전용 조사·요약 한정이면 현실적**, `workspace-write`+`never`를 "승인 없는 안전 편집"으로 쓰지 말 것. Claude CLI fallback: 조건부 현실적, `--permission-prompts host --strict-mcp-config` 포함, 축소된 어댑터로 표시 | `claude --help`, app-server | fallback이 안전 계약 약화 | **둘 다 "기능 축소 표시" 조건으로 채택** | 조건부 합의 |

### R2-2 UNVERIFIED (8건)
승인 수 시간 보류·재연결 후 응답 / 미응답 승인 거절과 `turn/interrupt` 경합 / skill 입력의 SKILL.md 실제 주입 / `~/.codex/skills` vs `.agents/skills` 범위 / Claude SDK `mcpServers`로 기존 MCP 완전 배제 / 별도 `CODEX_HOME`과 로그인·skills 연계 / `thread/items/list` 페이지네이션·MCP 세부 설정 버전 일치 / Claude CLI 승인 MCP fallback의 장시간·재연결·중단 동작.

## 3. Round 2-3 — 보안·실행 제한·백그라운드·배포·Phase 순서 (12:14~12:18Z)

| # | 쟁점 | Claude 의견 | Codex 의견(원문 요지) | 공식 근거 | 위험 | 최종 권장안 | 합의 |
|---|---|---|---|---|---|---|---|
| 1 | 승인 정책 매트릭스 | 11영역 초안(파일 쓰기 trusted AUTO 등) | 11영역 기본값 표 제시(프로젝트 신뢰 ASK, FS worktree 내 AUTO·외부 DENY, 명령 ASK·검증된 읽기 전용만 AUTO, 네트워크 ASK·미등록 DENY, 원격 Git push DENY·fetch ASK, DB ALWAYS_ASK, 설치 ALWAYS_ASK, Hook DENY, MCP ASK, 외부 서비스 DENY→명시 시 ALWAYS_ASK, 배포 동일). **문자열 분류기를 모든 부작용의 관문으로 취급 불가** → DB·설치·원격 Git·배포는 앱 전용 실행기/제한 도구 표면 경유 | app-server 승인, Claude permissions | 명령 난독화·자동 허용 | **Codex 표 채택(SECURITY_MODEL §2) + 고위험 효과는 앱 실행기** | 조건부 합의 |
| 2 | OS 격리 | Claude Windows 샌드박스 UNVERIFIED | **확인**: Claude Code Bash sandbox는 macOS·Linux·WSL2만, 네이티브 Windows는 샌드박스 없음; 지원 OS에서도 파일 도구·MCP·Hook은 sandbox 밖. Codex는 Windows native sandbox 제공(`elevated` 설정은 실제 차단 시험으로 검증). Windows MVP: Codex `workspaceWrite`+worktree+네트워크 차단; Claude native는 신뢰 프로젝트·사용자 참석·변경 검토 모드 한정, 무인 격리 필요 시 WSL2/컨테이너/VM | code.claude.com sandboxing, learn.chatgpt.com windows-sandbox | "지원 OS=모든 도구 격리" 오해 | **채택, UI에 Claude native 한계 명시** | **합의** |
| 3 | 프롬프트 인젝션 | 지침 파일 untrusted | 동의. 등록 시 지침 파일 경로·SHA256·git 상태 표시, 권한 확대 문장 경고, 변경 시 신뢰 재검토, URL 일괄 삭제 대신 표시·검토·네트워크 통제. 신뢰하지 않는 저장소는 읽기 전용으로 열고 쓰기·네트워크·MCP 해제에 별도 승인 | Codex AGENTS.md, Claude memory·security | 읽기 작업 답변 오염 | 채택 | **합의** |
| 4 | 비밀·암호화 | 마스킹, at-rest 기본 비활성 | 저장 전 마스킹 + 렌더러 전송 전 재검사; 패턴: Authorization/Cookie, Bearer, PEM, URL userinfo, `*_KEY/*_TOKEN/*_SECRET`, 공급자 키 형식. 승인 원문은 메모리만. SQLite 전체 암호화는 MVP 비요구(OS ACL·디스크 암호화 전제), **백업은 항상 암호화**(키는 키링/사용자 암호). CLI 자체 세션 로그는 앱 정책 밖 → 별도 점검 | sqlite backup, Claude sandboxing | CLI 로그·임시 파일·백업 누출 | **채택(백업 암호화 추가)** | 조건부 합의 |
| 5 | 실행 제한 최종 | 호출 20분, worktree당 1개, 승인 24h | **호출 20분**(Codex 30분 철회, 사전 설정 시 30분까지), 승인 **15분 후 거절 → BLOCKED(approval_expired)**(24h 보류는 연결 보장 없어 기각), **MVP 프로젝트당 1개**(V1 worktree당), 나머지 유지 | agent-approvals-security | 큰 작업 20분 초과 | **Codex 표 채택(EXECUTION_LIMITS §1)** | 조건부 합의 |
| 6 | 백그라운드 MVP | detached 데몬 MVP 포함 | **독립 데몬 지속을 Windows MVP 출시 기준으로 확정**(스파이크 실패 시 "안전 중단·재개"를 MVP 완료로 부르지 않음). 수용 시험 5개: 창·Electron 종료 후 데몬·턴 생존·seq 증가 / 재접속 동일 run·승인·seq / 트레이 종료=새 턴 차단·승인 거절·자식 종료 확인 / 재부팅 후 Recovery Manager 재개 제안 또는 BLOCKED / 자손 프로세스 0. `windowsHide:true`, PID+시작 시각+nonce 검증, Job Object는 Node 표준 API 보증 UNVERIFIED | Node child_process, Electron app, Win Job Objects | 콘솔 창·고아·재연결 위조 | **채택(Claude 입장 + Codex 수용 기준)** | **합의** |
| 7 | OS별 배포 | Windows MVP, 서명 | MVP: Windows x64 내부 시험 설치물(unsigned), 공개는 서명 게이트(Azure Artifact Signing → OV). V1: 서명 Windows+업데이트 채널, mac DMG 서명·notarization, Linux AppImage·deb 시험 빌드, electron-updater(AppImage 실측 후). V2: 안정 채널·단계 배포·배포판 저장소 | MS code-signing-options, Apple Developer ID, electron.build auto-update | 키 관리, 업데이트 중 데몬·스키마 불일치 | 채택 | **합의** |
| 8 | Phase 순서 | 00→01→02→04→03→05→06→07→09→08→10→11→12 | 00→01(+상태·보안 계약)→**10a 보안·신뢰성 핵심**→02→04→03→05→**08a Diff·Git 읽기**→**11a Windows 패키징=MVP**→06→07→09→08b 편집기·터미널→10b·11b=V1→12·08c·11c=V2. Phase 00 스파이크 8개 통합 | USER_DIRECTIVE §16, PRODUCT_REQUIREMENTS §15 | 00 장기화 < 후반 가정 붕괴 비용 | **Codex 순서 채택(PHASE_BREAKDOWN)** | 조건부 합의 |
| 9 | 최대 위험 3 | — | ① 승인 요청만으로 모든 부작용 통제 믿음(00 우회 재현, 10a 정책 고정) ② Windows Claude native+분리 데몬을 "격리된 무인 실행"으로 취급(00·01·11a) ③ 세션 재개가 파일·Git·효과까지 복원한다는 가정(00·04·05). + 인증 약관 게이트(MVP API key) | legal-and-compliance | 완성 후 배포 경로 변경 | OPEN_ISSUES 반영 | **합의** |

### R2-3 UNVERIFIED (5건)
Claude 구독 로그인 호출의 제품 형태별 허용 여부 / 설치 버전 승인·sandbox 동작과 최신 문서 일치 / Node 표준 API만으로 Job Object 연동 / `detached`+`windowsHide` 설치본에서 콘솔 없는 지속·재연결·정리 / Claude·Codex 자체 세션·진단 로그의 보존·마스킹 통제.

## 4. Round 2 종합

| 구분 | 수 |
|---|---|
| 쟁점 총수 | 27 (R2-1 8, R2-2 10, R2-3 9) |
| 합의 | 13 |
| 조건부 합의 | 13 |
| 불일치 | 1 (R2-2 쟁점 2) → Claude가 Codex 안 수용(ACCEPTED)으로 해소 |
| 입장 변경 | Codex: Forge→electron-builder, 호출 30→20분. Claude: Electron 내장 Node 데몬 보류, 승인 24h→15분 BLOCKED, worktree당→MVP 프로젝트당, "모든 효과 승인 경로 통과" 문장 철회, tool_call 이벤트 제거, lease 60/15→90/20 |
| 사용자 결정 잔여 | 인증 모드(ADR-0007) |
