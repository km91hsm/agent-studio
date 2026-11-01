# Agent Studio Implementation Plan (MASTER_IMPLEMENTATION_PLAN)

> 최상위 구현 계획. 실제 구현은 **사용자 승인(IMPLEMENTATION_APPROVAL_CHECKLIST) 이후**에만 시작한다. 실행 방식은 Agent Studio 협업 프로토콜(Claude 계획 → Codex 구현 → Claude 리뷰, Task별 주도 스킬 자율 선택 + 증거)을 따르며, `executing-plans`(인라인) 또는 `subagent-driven-development`(Claude 전용 독립 Task)로 수행한다. Step은 체크박스(`- [ ]`)로 추적한다.

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 상세 Phase | `PHASE_BREAKDOWN.md`(18 Phase × 18항목), 수용 기준 `ACCEPTANCE_CRITERIA.md` |
| 남은 승인·위험 | `IMPLEMENTATION_APPROVAL_CHECKLIST.md`, `OPEN_ISSUES_AND_RISKS.md` |

**Goal:** 사용자가 프로젝트와 작업을 등록하면 Claude Code와 Codex가 스킬을 선택·분담해 설계·구현·리뷰·검증하고, 종료·재부팅 후에도 세션·Phase를 안전하게 복원하는 Windows/macOS/Linux 데스크톱 앱을 MVP-Core(Windows 내부 검증판) → V1(3-OS·협업 = 제품 MVP) → V2(고도화) 순으로 구축한다.

**Architecture:** Electron Shell(창·트레이·업데이트) + 독립 Node 오케스트레이터 데몬(SQLite WAL 이벤트 저널 단일 writer, Scheduler·ApprovalBroker·AgentGateway·SkillRegistry·RecoveryManager) + React 렌더러(외부 store 구독). Claude는 Agent SDK(`canUseTool`·`PreToolUse`), Codex는 app-server JSON-RPC(`requestApproval`·`turn/steer`·`thread/fork`)로 구동한다. 고위험 효과의 **정식 경로**는 앱 전용 실행기이며, "그 경로만 통과"하는 보장은 엄격 모드 조건부에서만 성립한다(SECURITY_MODEL §2.1).

**Tech Stack:** TypeScript / Node 24 LTS / Electron 45 / React 19 / Monaco 0.57(지연 로드) / xterm.js 6 + node-pty / better-sqlite3 13 / `@anthropic-ai/claude-agent-sdk` 0.3.x / `codex app-server`(CLI 0.166.x) / `@napi-rs/keyring` / electron-builder v26 + electron-updater / Vitest + Playwright.

**Spec:** `PRODUCT_REQUIREMENTS.md`, `SYSTEM_ARCHITECTURE.md`, `AGENT_INTEGRATION_DESIGN.md`, `DATABASE_SCHEMA.md`, `PHASE_MANAGEMENT_DESIGN.md`, `SESSION_RECOVERY_DESIGN.md`, `COLLABORATION_PROTOCOL.md`, `SECURITY_MODEL.md`, `EXECUTION_LIMITS_POLICY.md`, `UI_UX_SPECIFICATION.md`, `03_skills/*`.

## Global Constraints

- 구현 착수는 `IMPLEMENTATION_APPROVAL_CHECKLIST.md`의 1차 승인(P00까지) 뒤 사용자의 별도 요청으로 시작한다. C3(빌드 도구)·C9(MCP 도구 서버 범위)는 별도 승인, P01 이후는 P00 보고서 11건 검토 후 2차 승인. 사용자 `~/.claude`, `~/.codex/config.toml`, 설치 스킬 폴더는 수정하지 않는다. Codex용 주도 스킬 8종 설치(U5)는 C4 승인 후 P00 S7 전에만 수행한다.
- 개발 저장소: public GitHub + 커밋마다 push + CI(C7). 첫 push 전 민감 정보 점검(R22, CHECKLIST §2). P00 스파이크 실호출에는 상한이 없고 사용량은 보고서에 기록한다(C5).
- 언어·런타임: TypeScript만, Node 24 LTS(`>=24.0.0 <25`). Rust/.NET/Go 금지(V1까지, ADR-0001).
- Electron `webPreferences` 필수값: `contextIsolation:true, sandbox:true, nodeIntegration:false, nodeIntegrationInSubFrames:false, webviewTag:false, webSecurity:true, allowRunningInsecureContent:false, experimentalFeatures:false`. CSP `connect-src 'none'`(SECURITY_MODEL §7).
- 권한 모드: 두 어댑터는 런타임이 제공하는 권한 모드 **전부**를 프로젝트별 설정으로 노출한다(Claude `plan/default/acceptEdits/auto/bypassPermissions/dontAsk`, Codex `approvalPolicy untrusted/on-request/never/{granular}` — 설치본 0.166.0 v2 생성 스키마 값(`archive/evidence/codex_0.166.0_v2_schema_excerpt.json`) + `sandboxPolicy.type readOnly/workspaceWrite`). **기본값은 안전 모드**(Claude `default`, Codex `on-request`+`workspaceWrite`). 자동 모드는 프로젝트별 명시 옵트인 + 상시 경고 배지("사전 차단 보장 없음") + 앱 전용 실행기 정식 경로·사후 diff 감사 유지이며, 모든 공급자·OS·격리 조합에서 옵트인 가능하고 격리 미확인 조합은 경고 배지 + 활성 시 1회 확인을 거친다(U8). `dangerFullAccess`·`--dangerously-bypass-*`는 어떤 모드에서도 금지. `PreToolUse` hook은 모든 모드에서 필수(관찰). **Agent Studio 자체 개발 세션은 기본 모드만 사용**(CHECKLIST §3 D5).
- 실행 제한 기본값: 작업 120분(활성), 턴 20분(사전 설정 시 30), 리뷰·수정 3회(무변화 2회 조기), 인프라 재시도 2회(인증·한도 0), MVP-Core 동시 수정 프로젝트당 1, 승인 대기 15분 → `BLOCKED(approval_expired)`, lease 90s/heartbeat 20s.
- 저널 append-only, 대화 원문 미저장, 비밀 미저장(키링 참조), 저장 전·전송 전 마스킹, 백업 암호화.
- 모든 Task·단계는 에이전트가 자율 선택한 주도 스킬 1개(U10; 사용자 명시 호출 우선, 기대 스킬 미선택 시 REWORK 명시 호출) + 증거 등급 `APPLIED_VERIFIED`(`tasks.kind ∈ {plan, research, prototype, review}`는 `LOAD_OBSERVED` + 시그니처 마지막 단계 산출물 — EVIDENCE_SPEC §5·DATABASE_SCHEMA enum과 동일) 없으면 `VERIFYING` 통과 불가. **Codex 구현 Task 예외(U5 설치 전)**: Codex 측 주도 스킬 설치본이 없는 동안 `skill_unavailable(codex,U5)` 사유 기록 + Claude 교차 리뷰 + 테스트 증거로 `VERIFYING` 통과(`BLOCKED(skill_missing)`은 Claude 측 미설치에만 적용). **P07(Verifier) 이전 Phase는 수동 증거 프로토콜**(AC-P10a-6: `SkillSelected` 저널 + Skill 도구 블록 인용 + 산출물 경로, 리뷰어 체크리스트). 구현 에이전트 ≠ 리뷰 에이전트, REWORK는 동일 구현자, `implementer_agent/reviewer_agent` 기록.
- Codex `CODEX_HOME`: 사용자 것 공유가 기본(U9), 앱 전용 분리 프로필은 프로젝트별 격리 옵션(공유 시 유효 설정 스냅숏·앱 소유 스레드 필터 의무). `config.toml`은 어느 쪽에서도 수정하지 않고 `-c` 오버라이드만 사용.
- 릴리스 명명: **MVP-Core** = Windows 내부 단독 에이전트 검증판, **V1** = 지시서 핵심 사용자 경험 완성(제품 MVP), V2 = 고도화.
- 공개 배포물은 서명 필수. 내부 dev 빌드만 unsigned.
- Codex app-server 스키마는 `generate-json-schema` 산출물을 `packages/protocol`에 고정하고 CI에서 diff.

## Review Focus

각 항목은 `TEST_STRATEGY.md` §2.8의 TEST-RF ID와 ACCEPTANCE AC에 내려가 있다.

1. **에이전트가 승인 요청 없이 수행하는 쓰기**(Codex `workspaceWrite` 내부, Claude 자동 허용 도구·자동 모드): 사용자는 "승인 없이 바뀐 파일"을 Diff에서 즉시 보고 되돌릴 수 있어야 한다 → **TEST-RF-01**(P02 T6 계약 테스트 + P08a T3 귀속 테스트: 승인 이벤트 없는 fileChange가 `unapproved_write` 배지로 표시; AC-P02-2, AC-P08a-1).
2. **승인 대기 중 사용자 부재 15분 초과 후 복귀**: 과거 승인 버튼이 활성화되면 안 되고, 재개는 새 run·새 승인 요청으로만 → **TEST-RF-02**(P04 T5: 만료된 requestId로 decide 호출 시 거부; AC-P04-2).
3. **데몬이 살아 있는데 앱이 재설치·업데이트되는 경우**: 프로토콜·DB 스키마 버전 불일치 시 접속 거부·안내, 실행 중 작업 있으면 업데이트 연기 → **TEST-RF-03**(P11a T2, P10b T7: `protocol_mismatch` 오류와 안전 종료 제안; AC-P11a-3, AC-V1-2).
4. **같은 파일을 사용자(Monaco Save)와 에이전트가 동시에 수정**: 해시 비교로 충돌 노출, 어느 쪽도 조용히 덮어쓰지 않음 → **TEST-RF-04**(P08b T1: base 해시 불일치 Save 거부; AC-P08b-2).
5. **인증 모드가 API key인데 사용자가 CLI에 구독 로그인만 한 상태로 작업 시작**: 즉시 `BLOCKED(auth)`와 설정 안내, 조용한 fallback 금지 → **TEST-RF-05**(P02 T4: 인증 모드 불일치 → auth fault 분류; AC-P02-1).

---

## 릴리스 정의

| 릴리스 | 범위 | 완료 조건 |
|---|---|---|
| **MVP-Core (Windows 내부, 단독 에이전트 검증판)** | P00, P01, P10a, P02, P04, P03, P05, P08a, P11a | ACCEPTANCE_CRITERIA §1 P11a + §2 MVP-Core 행: Claude/Codex 단독 모드(플랜·기본·자동 권한 모드 선택), 승인·취소·추가 지시, 저널·복구(RECOVERY MVP-Core 게이트), Diff 검토·턴 단위 되돌리기, NSIS 설치물에서 **TEST-BG-01~05** 통과, SE-01a·02·03·04·06a·08 통과, 인증 모드 설정 반영. **지시서의 핵심 사용자 경험(Phase 생성·Skills 선택·협업)은 포함하지 않는다** |
| **V1 (3-OS 공개 = 제품 MVP, 핵심 사용자 경험 완성)** | +P06, P07, P09, P08b, P10b, P11b | Auto/Manual 협업·교차 리뷰, Phase Manager, Skills Router·증거 게이트(4등급), 편집기·터미널·첨부·선별 되돌리기, worktree 병렬, 공급망 격리, **Agent Studio MCP 도구 서버(REQ-CAP-08)·문서 생성·이미지 생성 라우팅·브라우저 연계**, 서명·notarization·updater, TEST-BG-06~10, RECOVERY 전체 3-OS |
| **V2** | +P12, P08c, P11c | 컨텍스트 압축, 동적 역할, 브라우저 미리보기(`WebContentsView`/외부 연동 결정), 다중 창, 금액 추정, 배포 채널 |

## 선행 검증 작업 (불확실성 높은 항목 → Phase 00)

PHASE_BREAKDOWN P00의 S1a/b/c·S2~S9. 실패 시 범위 축소 규칙: S5 실패 → MVP-Core를 "안전 중단·재개"로 **명시 축소**(백그라운드 MVP-Core 완료라 부르지 않음, 사용자 재결정 — U2); S6 Monaco 실패 → CodeMirror 재평가 ADR; S1c 승인 보류 실패 → 15분보다 짧은 TTL; S3 약관 불허 → API key 전용(ADR-0007 재검토 조건); **S4 격리 불합격 조합 → 경고 배지 + 자동 모드 활성 시 1회 확인**(차단·비활성화 아님); S9 `unsupported` 판정 항목 → 1단 경로 폐기, REQ-CAP 해당 행을 2단(앱 MCP 도구 서버) 또는 3단(LLM 스크립트)으로 이동(D26 판정 규칙; 2·3단도 불가면 `unsupported`로 기록 → 해당 AC-V1-8~10은 N/A, REQ-CAP 행을 V1 범위에서 제외하는 **범위 변경을 사용자에게 보고**).

---

## Phase 00 — 환경·기술 검증 (첫 실행 계획, Task 단위)

> 각 **스파이크 Task(S1a/b/c·S2~S9)**는 `spikes/<id>/`에 독립 실행 가능한 스크립트와 `docs/spikes/<id>.md` 보고서를 산출한다. S0는 스파이크가 아닌 선행 운영 Task로, 점검 결과·CI 설정을 커밋한 뒤 첫 push를 수행한다. 테스트 러너는 Vitest. 모든 스파이크는 테스트 프로젝트 `spikes/fixtures/sample-node-repo`(소형 Node 저장소, git 초기화)에서만 동작한다. **첫 Task(S0 저장소 개설, C7)**: (1) 비밀 스캔(토큰·키·`auth.json` 0건)과 CHECKLIST §2 점검 결과를 `docs/spikes/S0.md`에 기록 → (2) 필요 시 마스킹 커밋 → (3) `gh repo create`(public) → (4) 최소 CI(lint·테스트 placeholder) 추가·로컬 검증 → (5) 점검 결과·CI 설정 커밋 → (6) 첫 push → (7) CI 통과 확인 → (8) 첫 push SHA·CI 실행 링크·최종 결과를 `docs/spikes/S0.md`에 추가하고 커밋·push. `S0.md`는 스파이크 보고서 11건과 별도의 선행 운영 증거.

### Task S1a: Codex app-server 기본 왕복 스파이크 (S1a → S1b ∥ S1c)
**Files:** Create `spikes/s1-codex-app-server/client.ts`, `spikes/s1-codex-app-server/s1a.test.ts`, `docs/spikes/S1a.md`
**Interfaces:** Produces `AppServerClient { initialize(); threadStart(cwd); turnStart(threadId, input, {approvalPolicy:'on-request', sandboxPolicy}); onServerRequest(cb); respond(requestId, decision); turnSteer(threadId, expectedTurnId, text); turnInterrupt(threadId, turnId); threadResume(id); threadFork(id, lastTurnId); skillsList(cwds, forceReload) }` — P02 CodexAppServerAdapter의 초안 인터페이스.
**담당/스킬:** Codex 구현, Claude 리뷰 / `prototype`, `systematic-debugging`, `verification-before-completion`
- [ ] Step 1: 실패 테스트 작성 — `s1a.test.ts`: (a) `sandboxPolicy:{type:'readOnly'}`+`approvalPolicy:'on-request'`로 "현재 디렉터리의 README.md에 한 줄 추가" 지시 → **필수 단언: 작업 트리 무단 변경 0**(blob 해시 동일); 승인 요청(`item/fileChange/requestApproval`·`item/commandExecution/requestApproval`) 수신 여부·횟수는 **관찰값으로 기록**(공급자가 요청 없이 거부해도 안전한 결과); 요청이 왔으면 `decline` 응답 후 `turn/completed.turn.status`가 `completed|interrupted` 중 하나임을 단언. (b) 별도 테스트: `workspaceWrite` 모드에서 같은 지시 → 승인 요청 유무·파일 변경 여부를 2×2 표로 기록하고, **변경이 발생했으면 사후 diff 감사가 그 파일을 `unapproved_write`로 포착함을 단언**(AC-P00-2와 일치). (c) `thread/tokenUsage/updated` 수신 1회 이상 단언(`turn/completed`에는 usage 없음).
- [ ] Step 2: 실행해 실패 확인 — `npx vitest run spikes/s1-codex-app-server/s1a.test.ts` → FAIL(클라이언트 미구현).
- [ ] Step 3: `client.ts` 구현(stdio JSONL, 요청 ID 매핑, 서버 요청 콜백). 바이너리 경로는 `archive/evidence/ENVIRONMENT_SURVEY.md`의 절대 경로를 환경변수 `CODEX_BIN`으로 주입.
- [ ] Step 4: 테스트 통과 확인 → PASS. 추가 기록: 승인 요청 3종(`requestApproval`/`requestUserInput`/`elicitation`)의 응답 구조 차이.
- [ ] Step 5: 이벤트 전체를 `spikes/fixtures/codex-0.166.0/*.jsonl`로 녹화(마스킹 후), `docs/spikes/S1a.md`에 pass/fail 판정표·UNVERIFIED 해소 여부 기록.
- [ ] Step 6: 커밋 `spike(s1a): codex app-server basic round trip`.

### Task S1b: Codex 제어·세션 스파이크 (S1a 통과 후)
**Files:** Create `spikes/s1-codex-app-server/s1b.test.ts`, `docs/spikes/S1b.md`
- [ ] Step 1: 실패 테스트 — `turn/steer` 수락(`expectedTurnId` 일치), `turn/interrupt`→`turn.status==='interrupted'`, `thread/resume`로 이전 아이템 재수신, `thread/fork{lastTurnId}` 새 thread ID, stdio 재시작 후 `thread/resume` 재구독, `thread/queue/add`가 `experimentalApi` 미설정 시 거부됨(오류 코드 기록).
- [ ] Step 2: FAIL. Step 3: S1a 클라이언트 확장. Step 4: PASS. Step 5: 보고서·픽스처. Step 6: 커밋 `spike(s1b): codex steer/interrupt/resume/fork`.

### Task S1c: Codex 쓰기 범위·승인 보류 스파이크 (S1a 통과 후)
**Files:** Create `spikes/s1-codex-app-server/s1c.test.ts`, `docs/spikes/S1c.md`
- [ ] Step 1: 실패 테스트 — `workspaceWrite{writableRoots:[sample]}`에서 지시 5종(파일 쓰기·셸 명령·`git commit`·네트워크·외부 경로)의 "승인 요청 발생 여부 × 실제 효과 발생 여부" 2×2 표가 생성됨을 단언(값 자체는 기록). `readOnly`에서 `commandExecution`이 승인 요청 없이 가능한지 기록(SECURITY_MODEL §2.1 실행 명령 셀 입력). 승인 요청을 `CODEX_SPIKE_APPROVAL_TTL_MS`(기본 900000, 단축 허용) 동안 미응답 → turn 상태·서버 동작 기록, 이후 `decline` 응답 가능 여부 단언.
- [ ] Step 2: FAIL. Step 3: 구현. Step 4: PASS. Step 5: 보고서("자동 쓰기 범위" 표 → SECURITY_MODEL §2.1 보장 수준 표 갱신 입력). Step 6: 커밋 `spike(s1c): codex write scope and approval hold`.

### Task S2: Claude Agent SDK 왕복 스파이크
**Files:** Create `spikes/s2-claude-sdk/run.ts`, `spikes/s2-claude-sdk/s2.test.ts`, `docs/spikes/S2.md`
**Interfaces:** Produces `ClaudeRun { start(prompt$: AsyncIterable, opts); onCanUseTool(cb); interrupt(); listSessions(dir) }`.
**담당/스킬:** Claude 구현, Codex 리뷰 / `prototype`, `test-driven-development`
- [ ] Step 1: 실패 테스트 — streaming input으로 "README에 한 줄 추가" 요청 시 `canUseTool('Edit'|'Write', input)`가 호출되고 `{behavior:'deny'}` 반환 시 파일이 변경되지 않음을 단언. `PreToolUse` hook이 모든 도구 호출(Read 포함)을 관찰함을 단언. 별도 테스트: `permissionMode:'plan'`에서 쓰기 도구가 호출되지 않음, `permissionMode:'acceptEdits'`에서 `canUseTool` 없이 변경되는 도구 목록을 **기록**(REQ-CAP-01·02 입력).
- [ ] Step 2: 실행 → FAIL. Step 3: `run.ts` 구현(`pathToClaudeCodeExecutable`=감지된 CLI, `permissionMode:'default'`, `includePartialMessages`).
- [ ] Step 4: PASS 확인. 추가: `interrupt()` receipt, `listSessions()` 결과에 방금 세션 포함, **`forkSession(sessionId,{upToMessageId})`가 0.3.316 typings에 존재하는지 `tsc` 타입 검사 + 실호출 1회(미지원 시 `RunSpec.forkAt` UI 제한 기록)**, `mcpServers` 지정 시 사용자 MCP 노출 여부(`system/init.tools`), 인증 모드(API key env vs CLI 로그인)별 기동 결과.
- [ ] Step 5: 녹화 `spikes/fixtures/claude-2.1.316/`, 보고서. Step 6: 커밋.

### Task S3: 인증·약관 확인
**Files:** Create `docs/spikes/S3.md`; Modify `01_architecture/adr/ADR-0007-*.md`(재검토 조건 발동 시)
- [ ] Step 1: Anthropic legal-and-compliance, OpenAI app-server auth·SIWC 문서를 날짜와 함께 재인용. Step 2: ADR-0007(설치된 CLI 로그인 재사용 기본) 기준으로 재사용 경로를 실측 — 차단·약관 불허 시 재검토 조건 발동을 기록(R21). Step 3: 각 인증 모드로 S1·S2를 1회씩 실행한 결과를 기록. Step 4: 커밋.

### Task S4: 격리 시험
**Files:** Create `spikes/s4-isolation/*.test.ts`, `docs/spikes/S4.md`
- [ ] Step 1: 실패 테스트 — Codex `workspaceWrite{writableRoots:[sample]}`에서 `../outside.txt` 쓰기와 `curl https://example.com` 요청 각각의 결과를 `blocked | approval_requested | bypassed` 판정값으로 기록하고, 모든 조합에 판정값이 존재함을 단언(값 자체는 단언하지 않음 — AC-P00-7b); `bypassed` 조합은 `isolation_warning` 등록 입력과 보장 수준 하향 입력으로 산출됨을 단언. Step 2: FAIL 확인. Step 3: S1 클라이언트 재사용. Step 4: PASS/부분 결과 기록(Windows `sandbox="elevated"` 영향). Step 5: Claude native와 WSL2에서 동일 시도 결과를 비교해 기록(native는 "정책만" 라벨, WSL2는 차단 여부 실측). Step 6: 커밋.

### Task S5: detached 데몬 생명주기
**Files:** Create `spikes/s5-daemon/daemon.ts`, `spikes/s5-daemon/launcher.ts`, `spikes/s5-daemon/s5.test.ts`, `docs/spikes/S5.md`
**Interfaces:** Produces `DaemonHandle { pid; startedAt; nonce; port; tokenRef }`, 락 파일 포맷 `{pid, startedAt, nonce, port}`.
- [ ] Step 1: 실패 테스트 — launcher가 `spawn(node, [daemon.js], {detached:true, stdio:'ignore', windowsHide:true}).unref()` 후 종료되어도(실제 Electron 창 닫기·앱 종료 시나리오 포함) 5초 뒤 데몬 WS에 접속되고 seq가 증가함을 단언; 두 번째 launcher가 락 파일의 pid·startedAt·nonce를 검증해 재접속함을 단언; 데몬 종료 시 자식(더미 `codex`/`claude` 대신 `node sleep`) 프로세스가 0개임을 단언.
- [ ] Step 2: FAIL. Step 3: 구현(콘솔 창 미생성 확인, 프로세스 트리 정리는 1차 명시 kill, 실패 시 Job Object 필요성 기록). Step 4: PASS. Step 5: 수동 재부팅 시나리오(락 파일 stale 판정) 기록. Step 6: 커밋.

### Task S6: 설치물 스파이크 (Electron + better-sqlite3 + node-pty + Monaco/CSP)
**Files:** Create `spikes/s6-installer/` (최소 Electron 앱, electron-builder NSIS 설정), `docs/spikes/S6.md`
- [ ] Step 1: 설치물 테스트 스크립트 — 설치→실행→데몬(S5) 기동→`better-sqlite3` WAL 쓰기→node-pty 셸 spawn→Monaco Diff 렌더(worker 로드)→제거, 각 단계 로그 단언. Step 2: FAIL. Step 3: 데몬 런타임 두 방식(동봉 Node / Electron `runAsNode`) 모두 빌드해 비교표 작성. Step 4: PASS 또는 부분, CSP 완화 필요 항목 기록. Step 5: ADR-0005 D5 결정 확정. Step 6: 커밋.

### Task S7: 스키마 고정 + 스킬 로드 증거 + 충돌 실험
**Files:** Create `spikes/s7-schema/codex-schema/` (생성 산출물), `spikes/s7-schema/diff.sh`, `docs/spikes/S7.md`, `docs/spikes/skill_conflict_experiments/*.md`
- [ ] Step 1: `codex app-server generate-json-schema --out spikes/s7-schema/codex-schema --experimental` 산출물 커밋 + 재생성 diff 스크립트(`spikes/s7-schema/diff.sh`)가 변경 시 비0으로 종료함을 단언(**`packages/protocol`·`.github/workflows`는 P01 T10에서 생성**). Step 2: 스킬 증거 — **Claude 측(주 실측)**: Agent SDK 세션에서 주도 스킬을 명시 호출해 Skill 도구 블록으로 `DISCOVERED→INJECTION_ACCEPTED→LOAD_OBSERVED` 3등급을 각 1회 기록. **Codex 측(U5, C4 승인·설치 후)**: S1a 클라이언트로 `skills/list{forceReload}`가 설치한 주도 스킬을 반환(`DISCOVERED`) → `{type:"skill"}` 주입 수락(`INJECTION_ACCEPTED`) → 고유 절차 단계 관찰(`LOAD_OBSERVED`) 각 1회 기록; 설치 미승인 시 `.system` 발견만 기록하고 나머지는 `UNVERIFIED` 유지. **자동 선택 재현(U10)**: 스킬 이름이 없는 프롬프트 2종("Fix this bug" 류, "Plan this feature" 류)으로 양 에이전트가 스스로 고른 스킬을 각 1회 기록 → "자동 선택 정확도 표"(ROUTING_POLICY §2 기대 주도 스킬 대비). Step 3: 충돌 실험 — **4실험 각 1회** = SKILL_CONFLICT_RESOLUTION §2의 TDD·디버깅·코드 리뷰 3행 + 같은 문서 §3 횡단 충돌(using-superpowers 노출 vs mattpocock 트리거) 1건, 증거 인용은 Claude = Skill 도구 호출 블록, Codex = `skills/list`·선택 관찰·고유 절차 이벤트; §2 나머지 5행(요구사항 심문·계획·구현·스킬 제작·UI 디자인)은 SKILL.md 비교로 잠정 유지. Step 4: `SKILL_CONFLICT_RESOLUTION.md` v2(3행+1건 확정, 5행 잠정 표시) 작성. Step 5: 주도 스킬 9개(Codex 설치 8개 + brainstorming) 시그니처 초안 `docs/agent-studio/skill-signatures/<skill>.json`(EVIDENCE_SPEC 스키마) 작성 → Codex 검토 → AC-P00-6 증거. Step 6: 커밋.

### Task S8: 중복 적용 방지 스파이크
**Files:** Create `spikes/s8-idempotency/effects.ts`, `spikes/s8-idempotency/s8.test.ts`, `docs/spikes/S8.md`
**Interfaces:** Produces `EffectLedger { intend(key, {path, baseBlob, targetBlob, patchHash}); commit(key); assess(key, currentBlob) → 'done'|'reapply_with_approval'|'conflict' }`.
- [ ] Step 1: 실패 테스트 — 패치 적용 후 `commit` 전에 프로세스 kill → 재시작 `assess`가 현재 blob=target이면 `done`, =base면 `reapply_with_approval`, 그 외 `conflict`를 반환함을 단언; git commit outbox에 SHA가 있으면 재커밋하지 않음을 단언. Step 2: FAIL. Step 3: 구현. Step 4: PASS. Step 5: 커밋.

### Task S9: 기능 상속 탐침 (REQ-CAP-01~09)
**Files:** Create `spikes/s9-capabilities/s9.test.ts`, `spikes/s9-capabilities/probe.ts`, `docs/spikes/S9.md`
**Interfaces:** Produces `CapabilityProbeResult { cap: 'CAP-01'..'CAP-09'; agent: 'claude'|'codex'; status: 'supported'|'unsupported'|'conditional'; reached: 'discovered'|'started'|'executed'|'artifact'; condition?: string; evidence: string }[]` → AGENT_INTEGRATION §7 판정표.
**담당/스킬:** (a)(b)(f) Claude 구현/Codex 리뷰, (c)(d)(e)(g) Codex 구현/Claude 리뷰 / `research`(조사 단계) → `prototype`(탐침) → `verification-before-completion`
**실행 조건:** 사용자 `CODEX_HOME`은 읽기 전용(`config.toml` 미수정, `-c` 오버라이드만). Desktop 앱 미실행 상태에서 computer-use 플러그인 기동을 시도한다.
- [ ] Step 1: 실패 테스트 — 9행(CAP-01~09)×2에이전트 결과 배열이 비어 있지 않고 모든 행에 `status∈{supported,conditional,unsupported}`·`reached∈{discovered,started,executed,artifact}`·`evidence`(이벤트 인용 또는 명령 출력)가 있음을 단언. 상태 값 자체는 단언하지 않는다 — **S9는 CAP별 경로를 결정하는 게이트**이며 기능 실현 게이트는 V1 AC. 시간 상한 1주(출고 위험 실험 2주와 별도).
- [ ] Step 2: FAIL. Step 3: 탐침 구현 — (a) S2 러너로 `system/init`의 skills/tools 목록에서 `synced/*` 스킬·`Skill` 도구 노출 확인 + `settingSources` 설정별 노출 차이 기록 (b) SDK 옵션 타입에서 `--chrome` 상당 필드 검색 + 실제 기동 (c) S1a 클라이언트 `skills/list{cwds}`·`initialize` 응답에서 Desktop 번들 플러그인 노출 — 사용자 `CODEX_HOME` 공유 vs 임시 분리 프로필 두 조건 (d) `OPENAI_API_KEY` 모드에서 `image_gen` 도구 가용성 (e) computer-use 플러그인 기동(Desktop 앱 미실행) (f) `permissionMode:'plan'`·`acceptEdits` 동작(S2 결과 재사용) (g) CAP-09 — 공유 vs 임시 분리 `CODEX_HOME`에서 `initialize`·`skills/list`·`mcp` 목록·`notify` 설정 상속 비교표; `-c mcp_servers` 오버라이드가 기존 항목을 제거하는지 기록(SECURITY_MODEL §2.1 MCP 셀 입력).
- [ ] Step 4: PASS. Step 5: `docs/spikes/S9.md` 실측표 + AGENT_INTEGRATION §7·PRODUCT_REQUIREMENTS §13A 갱신(미지원 행은 2단/3단 경로로 이동). Step 6: 커밋 `spike(s9): capability inheritance probe`.

### P00 종료 게이트
- [ ] 보고서 **11건**(S1a·S1b·S1c·S2~S9, pass/fail 판정표 포함) + ACCEPTANCE AC-P00-1~9 체크. S1a → (S1b ∥ S1c) 순서. S4 격리 게이트(AC-P00-7b) 결과를 SECURITY_MODEL §2.1 보장 수준 표에 반영하고 불합격 조합을 P01 T11 `isolation_warning` 목록에 기록(차단 아님). 보고서에 공급자별 실호출 횟수·토큰을 기록(C5 상한 없음). S9 미완은 P01 진입을 막지 않음 — 단 `docs/spikes/S9.md`를 상태 보고서(미완 사유·CAP별 현재 판정·남은 실험)로 제출해 11건을 채우고, 미완 CAP은 conditional 유지 + 결정 게이트(AC-P00-9)·2차 승인 예외를 사용자에게 명시. 실패 항목은 "범위 축소 제안"으로 사용자에게 보고(자동 진행 금지).

## Phase 01 이후

P01~P12는 `PHASE_BREAKDOWN.md` §2의 Task 목록을 기준으로, **각 Phase 시작 시 Claude가 이 형식(Files·Interfaces·Step·테스트·커밋)의 Phase 계획을 작성하고 Codex가 검토**한다(지시서 §19 절차 1~2). P01의 Interfaces는 SYSTEM_ARCHITECTURE §2 모듈 인터페이스를, 테스트는 TEST_STRATEGY·RECOVERY_TEST_PLAN의 ID를 그대로 사용한다. S1a `AppServerClient`·S5 `DaemonHandle`·S8 `EffectLedger`·S9 `CapabilityProbeResult`는 AGENT_INTEGRATION_DESIGN·SYSTEM_ARCHITECTURE·DATABASE_SCHEMA의 용어를 따르고, Gateway 서명은 `packages/protocol/gateway.ts`가 단일 출처다.
