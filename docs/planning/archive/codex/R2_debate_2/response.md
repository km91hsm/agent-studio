### 쟁점 1 — Gateway 공통 이벤트 스키마

**당신의 입장:** 공통 이벤트는 `message_delta`, `item_started`, `item_updated`, `item_finished`, `approval_requested`, `usage_updated`, `turn_finished`, `fault`로 제한한다. Claude 안의 `tool_call`은 별도 최상위 이벤트보다 `item_started`의 `kind=tool`로 표현하는 편이 낫다. 한 도구 호출의 시작·진행·종료를 같은 `itemKey`로 묶을 수 있기 때문이다. 모든 이벤트에는 `runId`, 저널 `seq`, 수신 시각, `agent`, 원본 이벤트 참조를 넣는다. `sessionId`, `turnKey`, `itemKey`는 가능한 경우에만 채우고, 원본 payload는 버전과 함께 별도 보존한다.

Codex의 `agentMessage`와 그 delta는 `message_delta` 및 메시지 item으로, `commandExecution`, `fileChange`, `mcpToolCall`, `dynamicToolCall`, `collabToolCall`, `webSearch`는 각기 다른 `kind`의 item으로 매핑한다. `plan`, `reasoning`, `contextCompaction`, review-mode 전환도 item으로 남기되 UI가 도구 호출로 오인하지 않게 한다. `turn/diff/updated`는 진행 중 미리보기이고, 최종 파일 변경 판정은 `item/completed`와 실제 Git diff를 대조한다. Codex `threadId`·`turnId`·`itemId`, Claude `parent_tool_use_id`·`permission_denials`는 공통 필드로 억지 변환하지 않고 `native`에 둔다. **Claude 안:** 이벤트 정규화 방향에는 동의하지만 `tool_call`을 중복 이벤트로 만들면 소비자가 이중 집계할 위험이 있다. **근거:** [Codex App Server의 item·event 정의](https://learn.chatgpt.com/docs/app-server), [Claude Agent SDK 권한 응답](https://code.claude.com/docs/en/agent-sdk/user-input). **위험:** 원본 스키마가 바뀌면 분류가 틀릴 수 있다. **합의 여부: 조건부 합의.**

### 쟁점 2 — 승인 브로커의 정합성

**당신의 입장:** “모든 부작용이 반드시 `ApprovalBroker`에 도달한다”는 현행 내장 도구만으로 보장할 수 없다. Codex에는 `approvalPolicy="on-request"`와 제한된 `sandboxPolicy`를 턴마다 명시하고, `--approve-for-me` 및 우회 옵션을 사용하지 않는다. `acceptForSession`이나 넓은 권한 부여도 기본 UI에서 제외한다. 하지만 `workspaceWrite` 범위 안에서 이미 허용된 쓰기는 승인 요청 없이 실행될 수 있다. `requestApproval`은 **정책이 승인을 요구할 때의 요청**이지 모든 쓰기의 사전 통지는 아니다. 이 요구를 절대 조건으로 삼는 작업에는 Codex를 `readOnly`로 실행하고, 산출한 패치를 앱 소유 적용기에서 승인·검증 후 적용하는 별도 경로가 필요하다. 일반 편집 모드에서는 승인 경계와 사후 diff 감사를 명확히 구분해야 한다.

Claude는 SDK `permissionMode:"default"`, 명시적 `canUseTool`, 필요한 도구만 노출, 부작용 도구에 대한 자동 allow 규칙 제거, `acceptEdits`·`auto`·`bypassPermissions` 금지를 기본으로 한다. 그래도 `canUseTool`은 자동 승인 호출을 보지 못하므로, 모든 호출에 적용할 차단 검사는 `PreToolUse` hook에 둔다. CLI fallback에는 `--permission-mode default --permission-prompts host`를 설정하고 승인 MCP tool을 연결한다. 기존 사용자·프로젝트 설정의 allow 규칙과 hook이 어떻게 합성되는지도 격리 실행에서 확인해야 한다. **Claude 안:** 승인 경로 선택에는 동의하나 “모든 외부 효과가 승인 요청 경로를 통과”한다는 문장은 수정해야 한다. **근거:** [Codex 승인 동작](https://learn.chatgpt.com/docs/app-server), [Codex `approval_policy` 설정](https://learn.chatgpt.com/docs/config-file/config-reference), [Claude 권한 평가 순서](https://code.claude.com/docs/en/agent-sdk/permissions), 로컬 `claude --help`의 `--permission-prompts`. **위험:** 승인 UI를 보안 경계로 과신하는 것. **합의 여부: 불일치.**

### 쟁점 3 — 승인 보류 시간

**당신의 입장:** Codex `requestApproval`을 몇 시간 미응답 상태로 둘 수 있다는 보장은 **UNVERIFIED**다. 문서의 30분은 마지막 구독자가 떠난 뒤 *구독자도 활동도 없는* thread의 메모리 해제 조건이다. 활성 연결에서 보류 중인 승인에 대한 최대 수명이나 재연결 후 같은 요청에 응답하는 절차를 보증하지 않는다. 따라서 데몬이 app-server 연결과 구독을 유지하되, 이를 장시간 승인의 지속성 계약으로 취급하지 않는다.

승인 요청이 오면 저널에 원본 요청 ID, 범위, 만료 시각을 기록하고 UI에 `WAITING_APPROVAL`로 표시한다. 제품 정책상 짧은 시간(제안: 15분)이 지나면 **거절 응답을 보낸 뒤** 턴을 중단하고 작업 상태를 보류한다. 사용자가 나중에 돌아오면 세션과 diff를 재확인하고 새 승인 요청이 발생하는 실행으로 재개한다. 연결이 먼저 끊어졌다면 과거 승인 버튼을 활성화하지 않는다. `turn/interrupt`가 미응답 승인과 경합할 때의 순서는 Phase 00에서 실측해야 한다 (**UNVERIFIED**). **Claude 안:** SDK 콜백이 무기한 대기 가능하다는 서술도 운영 정책으로 채택하면 안 된다. **근거:** [Codex `thread/unsubscribe`의 30분 조건](https://learn.chatgpt.com/docs/app-server). **위험:** 대기 중 프로세스 종료와 뒤늦은 승인. **합의 여부: 조건부 합의.**

### 쟁점 4 — Session Manager의 다섯 동작

**당신의 입장:** UI와 저장소에서 다음을 별개의 명령으로 취급한다.

| 동작 | Codex 경로 | 의미 |
|---|---|---|
| Native Resume | `thread/resume` 후 새 `turn/start` | 같은 thread의 대화 맥락을 계속 사용 |
| Context Handoff | 이전 세션을 `thread/read`, `thread/turns/list`, `thread/items/list`로 읽고 요약을 **새** `thread/start`에 입력 | 맥락을 요약해 전달; 원래 세션과 동일하지 않음 |
| Session Fork | `thread/fork {threadId,lastTurnId,excludeTurns:true}` | 지정 턴까지 **포함**하여 새 thread 생성 |
| Checkpoint Restore | 앱의 Git ref·파일 해시·저널 seq를 검증하고 필요하면 새 thread 생성 | 파일 상태와 작업 근거를 복원; 대화 복원과 별개 |
| Read-only Replay | `thread/read`와 목록 API, 앱 이벤트 저널 | 에이전트를 실행하지 않는 이력 조회 |

`ephemeral:true` fork는 메모리 전용이며 저장된 thread 목록에 추가되지 않으므로 복구가 필요한 작업에는 금지한다. 진행 중인 `lastTurnId`는 거절된다. Codex가 보관하는 세션 로그·메타데이터와 앱이 보관할 작업 상태·승인·효과 기록은 서로 다른 원본이다. `~/.codex/sessions`의 내부 형식에 의존하지 않는다. **Claude 안:** 세션과 체크포인트를 구분한 방향에 동의한다. 다만 “Checkpoint Restore”를 native resume처럼 표시하면 안 된다. **근거:** [Codex fork·ephemeral·read 및 페이지네이션](https://learn.chatgpt.com/docs/app-server), [Claude 세션은 파일시스템을 복원하지 않는다는 설명](https://code.claude.com/docs/en/agent-sdk/sessions). **위험:** 요약 handoff에서 맥락 누락. **합의 여부: 합의.**

### 쟁점 5 — 세션 목록·검색

**당신의 입장:** 앱 소유 `SessionIndex` 투영을 `agent + nativeSessionId`로 유지한다. 여기에 project/worktree, 작업 ID, 마지막 관찰 시각, 상태, fork 부모, 체크포인트와 저널 범위를 넣는다. 시작·종료 이벤트를 우선 반영하고, 기동·정기 동기화 때 Codex `thread/list`와 Claude `listSessions()`로 대조한다. 검색 UI는 앱 인덱스를 사용하되, 세션을 열 때 native API로 존재와 상태를 재검증한다.

Codex `thread/list`의 `cwd`, `archived`, `sortKey`, cursor는 유용하지만 프로젝트의 작업 관계를 표현하지 않는다. 특히 공식 문서상 `sourceKinds`를 생략하면 기본값이 `cli`·`vscode`이므로 앱이 만든 `appServer` 세션이 검색에서 빠질 수 있다. `sourceKinds`를 명시하고 archived 목록을 별도로 조회해야 한다. Claude의 `listSessions()`도 앱의 task·phase 관계를 대체하지 못한다. **Claude 안:** `SessionIndex` 캐시에 동의하며, 이를 단순 성능 캐시보다 복구용 투영으로 정의하자. **근거:** [Codex `thread/list` 필터와 기본 source](https://learn.chatgpt.com/docs/app-server), [Claude `listSessions()`](https://code.claude.com/docs/en/agent-sdk/sessions). **위험:** 외부 CLI에서 변경된 세션과 인덱스의 일시적 불일치. **합의 여부: 합의.**

### 쟁점 6 — Orchestrator 동시성과 재실행

**당신의 입장:** 단일 SQLite writer, 저널 seq, worktree별 동시 수정 1개를 유지한다. Lease는 제안상 TTL 90초·heartbeat 20초로 시작하되 측정 후 조정한다. Claude의 60초·15초도 논리상 가능하지만 Windows 절전·긴 GC·디스크 정체 시 오탐을 줄일 여유가 필요하다. 승인 대기 중에는 작업 실행 lease를 계속 연장하며 영구 점유하지 말고, 제한 시간 후 안전하게 중단해 복구 상태로 넘긴다. Fencing token은 SQLite 상태 전이의 늦은 writer를 막지만 **파일시스템이나 Git에는 자동으로 적용되지 않는다**. 만료 worker 프로세스를 종료·확인하기 전 새 worker에게 같은 worktree를 주지 않는다.

`fileChange`의 `itemId`를 idempotency key로 간주하지 않는다. 적용 전에 base blob 해시·대상 경로·패치 해시를 기록하고, 복구 때 현재 blob이 목표 blob과 같으면 완료 처리, base와 같으면 새 승인 아래 적용, 둘 다 아니면 충돌로 보류한다. Git commit은 `taskId/effectId`, 예상 parent·tree, 생성된 commit SHA를 outbox에 기록한다. 크래시 후 SHA나 commit metadata를 조회해 이미 만들어졌다면 재커밋하지 않는다. Git과 SQLite 사이에 원자 트랜잭션이 없으므로 불확실 상태는 자동 재실행하지 않는다. **Claude 안:** Lease·Fencing·Idempotency 채택에 동의하지만 `EffectCommitted` 기록만으로 중복 적용이 사라지는 것은 아니다. **근거:** 로컬 [Claude 제안 §5](D:/LLM/agent-studio/docs/planning/06_codesign/CLAUDE_INITIAL_PROPOSAL.md:117), [Codex `fileChange` item 정의](https://learn.chatgpt.com/docs/app-server). **위험:** SQLite에 기록되기 전에 효과만 성공한 경우. **합의 여부: 조건부 합의.**

### 쟁점 7 — Skills의 Codex 실행 증거

**당신의 입장:** `skills/list`는 cwd별 `skills`와 `errors`를 돌려준다. 공식 예시에서 skill에는 `name`, `description`, `enabled`, 선택적인 `interface`, `dependencies`가 보인다. 경로와 SHA256은 앱의 SkillRegistry가 별도로 관리한다. `forceReload:true`로 목록을 갱신하고 `skills/changed`를 무효화 신호로 사용한다. 공식 문서는 `$name` 텍스트와 `{type:"skill",name,path}` 입력을 함께 보내면 전체 지침을 주입한다고 설명한다. 그러나 **Codex 0.166.0에서 실제로 해당 SKILL.md 본문을 읽고 적용했는지**는 입력 전송만으로 증명되지 않는다 (**UNVERIFIED**).

별도 “skill used” 알림은 확인한 공식 이벤트 목록에 없다. 따라서 `skills/list` 존재 + 앱이 보낸 `skill` 입력은 `LOADED_ONLY`의 상한으로 삼고, 관련 도구 사용·산출물·테스트·파일 해시까지 이어져야 `VERIFIED`로 올린다. `SKILL.md` 읽기 `commandExecution` 이벤트만 기다리는 Claude 안은 명시적 skill 입력에서 서버가 내부 주입할 경우 증거를 놓칠 수 있다. 반대로 산출물의 일치만으로 그 스킬이 원인이라고 단정하지 않는다. 현재 이 PC의 0.166.0이 `~/.codex/skills`와 `.agents/skills`를 각각 읽는지 실측은 **UNVERIFIED**이며, `skills/list`를 두 위치에서 시험해야 한다. **Claude 안:** 증거 등급에는 동의하되 관찰 기준을 수정한다. **근거:** [Codex skill 입력과 목록](https://learn.chatgpt.com/docs/app-server), 로컬 [실행 증거 규격](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:38), [호환성 매트릭스](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:1), [충돌 결정](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md:10). **위험:** 실행 근거와 인과관계를 혼동하는 것. **합의 여부: 조건부 합의.**

### 쟁점 8 — 프로젝트별 MCP 관리

**당신의 입장:** MCP 목록은 앱 DB에서 프로젝트별 allowlist로 관리하고, 에이전트 worker를 시작할 때만 해당 목록을 구성한다. Claude CLI는 `--mcp-config`와 `--strict-mcp-config`를 함께 사용한다. SDK는 `options.mcpServers`로 등록할 수 있지만, 기존 사용자 설정의 MCP를 완전히 배제하는 SDK 옵션 조합은 **UNVERIFIED**이므로 격리 시험 전에는 SDK 경로의 엄격한 allowlist를 보증하지 않는다. 토글은 가능한 한 새 worker·새 턴 경계에서 적용하고, `system/init.tools` 또는 도구 목록으로 실제 노출을 확인한다.

Codex는 `mcp_servers.<id>` 설정에 `enabled`, `enabled_tools`, 도구별 `approval_mode` 등이 있다. 사용자 전역 `config.toml`을 수정하는 `config/value/write` 방식은 피한다. 앱 소유의 별도 `CODEX_HOME` 프로필과 자격증명 연결을 설계하고, 프로젝트별 프로세스 설정을 넘긴다. 사용자 기존 로그인·skills와 별도 홈의 연계 방법은 **UNVERIFIED**다. `-c`만으로 기존 전역 MCP가 모두 제거된다고 주장하지 않는다. 현재 공식 문서의 `config/mcpServer/reload`는 설정 재읽기이지 프로젝트별 격리 수단이 아니다. **Claude 안:** 프로젝트별 설정이라는 방향에 동의한다. **근거:** 로컬 `claude --help`의 두 MCP 옵션, [Claude SDK `mcpServers`](https://code.claude.com/docs/en/agent-sdk/mcp), [Codex MCP 설정](https://learn.chatgpt.com/docs/config-file/config-reference), [Codex reload](https://learn.chatgpt.com/docs/app-server). **위험:** 상속된 전역 MCP가 프로젝트 경계를 넘는 것. **합의 여부: 조건부 합의.**

### 쟁점 9 — 편집기·터미널 권한 경계

**당신의 입장:** Monaco에서 사용자가 누른 Save와 xterm.js에 사용자가 직접 입력한 명령은 `ApprovalBroker`의 **에이전트 승인 요청**이 아니다. 다만 권한 검증과 기록은 필요하다. Save API는 프로젝트 경로와 현재 파일 해시를 검증하고 `actor=user`, editor 세션 ID, 이전·새 blob 해시를 저널에 남긴다. 사용자 터미널은 별도 PTY·프로세스·환경으로 생성하고 에이전트 worker에게 PTY 핸들, 입력 IPC, 자격증명 환경 변수를 전달하지 않는다. 에이전트 출력 패널은 사용자 PTY에 키 입력을 주입할 수 없게 한다.

Diff 뷰는 에이전트의 `fileChange` item만으로 작성자를 확정하지 않는다. 에이전트 작업에는 별도 worktree 또는 변경 전후 스냅숏을 붙이고, editor Save는 명시적으로 user로 태깅한다. 파일 watcher만 관찰한 변경은 `external/unknown`으로 둔다. 동일 파일을 양쪽이 수정하면 낙관적 해시 비교로 충돌을 드러낸다. **Claude 안:** IDE를 합치는 데 동의하지만 “터미널에서 일어난 일”을 자동으로 agent run에 귀속해서는 안 된다. **근거:** [Codex `fileChange` item 및 `turn/diff/updated`](https://learn.chatgpt.com/docs/app-server); 권한·귀속 규칙은 제품 설계 판단이다. **위험:** 사용자 명령을 에이전트 실행으로 오기록하거나 반대 경우를 놓치는 것. **합의 여부: 합의.**

### 쟁점 10 — Fallback 경로 평가

**당신의 입장:** Codex `exec --json` + `approval_policy=never`는 **위험하지만 제한 모드로 현실적**이다. 읽기 전용 조사·요약처럼 실행 정책상 승인이 필요 없는 작업에 한정한다. `workspace-write`와 `never`의 조합을 “승인 없는 안전한 편집”으로 판매해서는 안 된다. 승인 요청 응답 채널이 없고 JSONL의 텍스트 스트리밍도 app-server보다 거칠다. 변경이 필요한 fallback은 앞서 제안한 `readOnly` 패치 제안 → 앱 적용기로만 처리한다.

Claude CLI `-p --input-format stream-json --output-format stream-json --permission-prompt-tool mcp__agentstudio__approve`는 **조건부로 현실적**이다. 로컬 CLI 도움말과 연구 문서가 플래그를 확인하지만, SDK와 동등한 장시간 스트리밍·중단·재연결 의미론까지 가정하면 위험하다. `--permission-prompts host`, `--strict-mcp-config`를 포함하고, 필수 승인 MCP 서버의 등록·실제 호출·거절·프로세스 종료를 Phase 00에서 검증한다. 이것은 기능 동등 대체가 아니라 축소된 CLI adapter다. **Claude 안:** 두 fallback을 두는 데 동의하나 둘 다 명시적 기능 축소가 필요하다. **근거:** 로컬 `claude --help`, [Codex App Server 승인 경로](https://learn.chatgpt.com/docs/app-server), 로컬 [Gateway 연구 매트릭스](D:/LLM/agent-studio/docs/planning/evidence/research/RESEARCH_AGENT_GATEWAY.md:38). **위험:** fallback이 주 경로의 안전·복구 계약을 조용히 약화하는 것. **합의 여부: 조건부 합의.**

### 합의 요약 표

| 쟁점 | 합의 상태 | 최종 권장 | 남은 검증 |
|---|---|---|---|
| 1 이벤트 | 조건부 합의 | 작은 공통 envelope + 원본 보존 | 0.166.0 item 변형 실측 |
| 2 승인 | 불일치 | 승인 경계 명시; 모든 쓰기 사전 승인이면 읽기 전용·앱 적용기 | 내장 도구별 자동 허용 범위 |
| 3 장시간 대기 | 조건부 합의 | 유한 대기 후 거절·중단·재개 | 승인 중 interrupt 경합 |
| 4 세션 동작 | 합의 | Resume/Fork/Handoff/Restore/Replay 분리 | 구버전 페이지네이션 지원 |
| 5 세션 검색 | 합의 | 앱 `SessionIndex` + native 재검증 | 외부 변경 동기화 |
| 6 동시성 | 조건부 합의 | worktree 단일 writer와 효과 대조 복구 | Windows 절전 시 lease |
| 7 Skill 증거 | 조건부 합의 | 목록·입력은 `LOADED_ONLY`, 산출물 검증 후 `VERIFIED` | 실제 주입과 검색 경로 |
| 8 MCP | 조건부 합의 | 프로젝트 worker별 allowlist·격리 프로필 | 인증·전역 설정 상속 |
| 9 IDE 권한 | 합의 | user/agent/external 귀속 분리 | 동시 수정 충돌 UX |
| 10 Fallback | 조건부 합의 | 축소 기능을 표시한 제한 모드 | Claude CLI 승인 왕복 |

### UNVERIFIED

1. Codex 0.166.0에서 승인 요청을 수 시간 보류할 수 있는지, 연결 재수립 후 같은 요청에 답할 수 있는지.
2. 미응답 `requestApproval`에 거절 응답과 `turn/interrupt`가 동시에 오면 어떤 상태로 끝나는지.
3. Codex 0.166.0에서 `{type:"skill",name,path}`를 보냈을 때 SKILL.md 본문 주입이 실제 성공했는지. 공식 문서는 이 동작을 설명하지만 해당 설치본의 실행은 시험하지 않았다.
4. Codex 0.166.0의 `~/.codex/skills`와 `.agents/skills` 검색 범위 및 우선순위.
5. Claude SDK `mcpServers` 사용 시 기존 사용자·프로젝트 MCP를 완전히 배제하는 설정 조합.
6. 별도 `CODEX_HOME`에서 기존 사용자 로그인과 skills를 안전하게 연결하는 구체적 절차.
7. Codex 0.166.0이 현재 공식 문서의 모든 `thread/items/list` 페이지네이션 및 MCP 세부 설정을 동일하게 지원하는지.
8. Claude CLI 승인 MCP fallback의 장시간 대기, 재연결, 중단 동작이 SDK 경로와 얼마나 같은지.