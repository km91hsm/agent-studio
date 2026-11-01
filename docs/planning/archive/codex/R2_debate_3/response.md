### 쟁점 1 — 승인 정책 매트릭스

**당신의 입장:** 아래 값은 프로젝트를 처음 등록했을 때의 기본 정책이다. `ALWAYS_ASK`는 같은 작업을 반복해도 승인을 재사용하지 않는다는 뜻이다. `ASK`도 승인 화면에 표시한 경로·명령·호스트·도구와 만료 시각을 벗어나면 다시 묻는다. 프로젝트를 “신뢰”하더라도 다른 행의 `DENY`가 자동으로 풀리지는 않는다. 이 정책은 [REQ-SEC-01·05·06](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:155)을 구현하는 앱 정책이며, 각 CLI의 기본 승인 정책과 동일하다고 주장하지 않는다.

| 권한 영역 | 기본 | 승인 범위 | Broker의 분류 신호 |
|---|---|---|---|
| 프로젝트 신뢰 | ASK | project; 경로·Git remote·지침 파일 해시가 바뀌면 만료 | 앱의 프로젝트 등록·변경 이벤트 |
| 파일 시스템 범위 | AUTO: 지정 worktree 내부 / DENY: 외부 | project / 외부 접근은 별도 once 예외 | Codex `fileChange`의 경로·`commandExecution.cwd`; Claude `Write/Edit/Read/Bash` 입력의 경로 |
| 실행 명령 | ASK; 검증된 읽기 전용 명령만 AUTO | once; 같은 명령 반복 허용은 짧은 until-expiry | Codex `commandExecution.command`, `commandActions`; Claude `Bash` 입력 |
| 네트워크 | ASK; 미등록 호스트 DENY | 호스트·프로토콜·포트별 once | Codex `networkApprovalContext`; Claude `WebFetch`·`Bash`·MCP 입력 |
| 원격 Git | DENY: push·force·remote 변경 / ASK: fetch | once | Git 전용 실행기의 동작·remote; 셸 문자열은 보조 신호 |
| DB 변경 | ALWAYS_ASK | once; 대상 DB·migration 해시 지정 | 앱 DB/migration 실행기; 일반 셸 SQL 추정만으로 허용하지 않음 |
| 의존성 설치 | ALWAYS_ASK | once; lockfile·패키지 목록 지정 | 앱 설치 실행기; 패키지 관리자 명령·변경 파일 |
| Hook 활성화 | DENY; 사용자가 기능을 켤 때 ALWAYS_ASK | project; Hook 해시가 바뀌면 만료 | 앱의 Hook 등록·활성화 API |
| MCP 실행 | ASK; 읽기 전용으로 감사한 도구만 AUTO | 도구·서버별 once 또는 짧은 until-expiry | Codex `mcpToolCall`/승인 요청, Claude `mcp__*` tool 입력 |
| 외부 서비스 변경 | DENY; 명시 작업일 때 ALWAYS_ASK | once; 대상·작업·요청 내용 지정 | 앱이 제공하는 외부 서비스 실행기 |
| 배포·릴리스 | DENY; 명시 작업일 때 ALWAYS_ASK | once; 대상 환경·artifact 해시 지정 | 앱 배포 실행기 |

**Claude 안에 대한 동의·반박:** 승인 항목을 프로젝트 정책으로 둔 데 동의한다. 다만 Round 2-2에서 확인했듯 Codex의 `requestApproval`은 **정책상 승인이 필요한 행위에만** 발생한다. Claude의 `canUseTool`도 자동 승인 도구에는 호출되지 않는다. 따라서 문자열 분류기를 “모든 부작용의 강제 관문”으로 취급할 수 없다. DB·설치·원격 Git·배포처럼 반드시 사전 승인이 필요한 동작은 앱 전용 실행기 또는 제한된 도구 표면으로 통과시켜야 한다. 셸을 통한 우회가 가능한 모드에는 이 매트릭스를 보증할 수 없다고 표시한다. **근거:** [Codex 승인 요청](https://learn.chatgpt.com/docs/app-server), [Claude의 권한 평가 순서](https://code.claude.com/docs/en/agent-sdk/permissions). **위험:** 명령 문자열 난독화나 내장 도구의 자동 허용. **합의 여부: 조건부 합의.**

### 쟁점 2 — OS별 격리의 실제 범위

**당신의 입장:** Claude의 “Windows에는 자체 OS sandbox가 없다”는 주장은 공식 문서로 **확인**된다. Claude Code의 Bash sandbox는 macOS·Linux·WSL2에서 동작하고, 네이티브 Windows에서는 명령이 sandbox 없이 실행된다. 더구나 지원 OS에서도 Claude의 파일 도구·MCP 서버·Hook은 그 **Bash sandbox 밖**에서 동작한다. Codex는 Windows native sandbox를 제공하며 이 PC는 조사 당시 `[windows] sandbox = "elevated"`로 설정되어 있다. 이 설정 자체보다 실제 실행에서 외부 파일 쓰기·네트워크 차단 시험이 통과하는지가 수용 기준이다. [Claude sandbox 범위](https://code.claude.com/docs/en/sandboxing), [Codex Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox).

Windows MVP에서는 Codex를 `workspaceWrite` + 지정 worktree + 네트워크 기본 차단으로 실행한다. Claude 네이티브 실행은 **사용자가 신뢰한 프로젝트에서, 사용자 참석 하에, 권한 요청과 변경 검토를 수반하는 모드**로 한정한다. Claude에 “프로젝트 밖 접근을 OS가 차단한다”거나 “무인 수정이 안전하게 격리된다”고 표시하지 않는다. 그러한 보장이 필요한 Claude 작업은 WSL2·컨테이너·VM 등 **Claude 프로세스 전체**를 감싸는 별도 환경이 필요하다. macOS/Linux에서도 Bash sandbox만으로 MCP와 Hook까지 격리했다고 주장하지 않는다. Git worktree, `cwd`, 경로 allowlist, 파일 watcher, 사후 diff는 충돌·정책 관리 수단이며 sandbox가 아니다. **Claude 안:** worktree를 sandbox로 보지 않은 점에 동의한다. Windows Claude 격리의 한계는 MVP 설명과 모드 제한에 명시해야 한다. **위험:** 지원 OS라는 이유만으로 모든 도구가 같은 경계 안에 있다고 오해하는 것. **합의 여부: 합의.**

### 쟁점 3 — 프로젝트 지침 파일과 프롬프트 인젝션

**당신의 입장:** `CLAUDE.md`, `AGENTS.md`, README, 코드 주석과 MCP 응답은 작업 자료로 읽되 권한을 넓히는 근거로 삼지 않는다. 프로젝트 등록 시 지침 파일의 경로·SHA256·Git 상태를 보여주고, 외부 URL 호출, 비밀 읽기, 승인 우회, 새 Hook·MCP 설치, 배포를 요구하는 문장을 경고로 표시한다. 지침 파일이 바뀌면 프로젝트 신뢰 상태를 재검토한다. URL을 일괄 삭제하면 정상 빌드 문서까지 훼손하므로 **표시·검토·네트워크 통제**를 택한다. 에이전트의 “이 지침이 승인했다”는 설명은 `ApprovalBroker`의 권한 근거가 될 수 없다.

네이티브 보호는 보조 계층이다. Codex는 `AGENTS.md`를 시작 전에 로드하지만 sandbox와 승인 정책은 별도로 적용한다. Claude 역시 `CLAUDE.md`를 강제 설정이 아닌 맥락으로 취급하며, 모든 도구 호출을 검사해야 할 때 `PreToolUse` hook을 권한다. Claude의 네트워크 명령 승인과 지원 OS의 sandbox도 사용할 수 있다. 단, 자동 로드를 허용한 지침 파일을 프롬프트만으로 “완전히 불신 자료화”했다고 보증할 수는 없다. 신뢰하지 않는 저장소는 우선 읽기 전용으로 열고, 쓰기·네트워크·MCP를 해제할 때 별도 승인을 받는다. **Claude 안:** 위협 모델에는 동의한다. 통제는 지침 문구가 아닌 실행 계층에 놓아야 한다. **근거:** [Codex `AGENTS.md` 로딩](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Claude 지침과 Hook의 관계](https://code.claude.com/docs/en/memory), [Claude 프롬프트 인젝션 안내](https://code.claude.com/docs/en/security). **위험:** 악성 지침이 허용된 읽기·요약 작업의 답변까지 오염시키는 것. **합의 여부: 합의.**

### 쟁점 4 — 비밀 마스킹과 저장 암호화

**당신의 입장:** 저널에는 실행 재개에 필요한 구조화 정보와 제한된 출력만 저장한다. 수집기에서 stdout/stderr, 도구 인자·결과, 오류, diff, URL을 **DB 기록 전** 마스킹하고, 렌더러 전송 전 다시 검사한다. `Authorization`·`Cookie` 헤더, `Bearer` 값, PEM 개인키 블록, URL의 사용자 정보, 일반적인 `*_KEY`·`*_TOKEN`·`*_SECRET` 환경 변수, 알려진 공급자 키 형식을 탐지한다. 원문을 그대로 남겨야 하는 승인 화면은 메모리에서만 다루고 만료시킨다. 탐지 실패와 과잉 마스킹이 가능하므로 비밀 원본이 애초에 에이전트 환경에 노출되지 않도록 자격증명을 별도 브로커에서 필요한 프로세스에만 전달한다.

단일 사용자 Windows MVP의 SQLite 전체 암호화는 기본 요구로 두지 않는다. OS 계정 ACL과 디스크 암호화를 전제로 하되, DB에 토큰·API 키·세션 쿠키를 저장하지 않는다. 백업은 **항상 암호화**하고 복구 키를 OS 자격증명 저장소 또는 사용자가 관리하는 암호로 보호한다. DB 파일만 복사하지 말고 일관된 SQLite 백업을 만들며, 백업에도 저널과 경로 정보가 포함됨을 UI에 알린다. 민감한 조직 저장소를 지원할 V1에서는 암호화 DB 또는 암호화된 앱 데이터 볼륨을 요구할 수 있다. Claude/Codex가 자체적으로 남기는 세션 파일은 앱의 저널 마스킹 대상 밖이므로 별도 보존·접근 정책을 점검해야 한다. **Claude 안:** 저장 전 마스킹과 OS credential store에 동의한다. “마스킹했으니 모든 로그가 안전하다”는 표현은 피한다. **근거:** [SQLite Online Backup API](https://www.sqlite.org/backup.html), [Claude의 자격증명·sandbox 범위](https://code.claude.com/docs/en/sandboxing). **위험:** 원본 CLI 세션 로그, 임시 파일, 백업에서의 누출. **합의 여부: 조건부 합의.**

### 쟁점 5 — 실행 제한 최종값

**당신의 입장:** 에이전트 호출은 **20분 기본값**으로 정한다. 큰 저장소의 검증 작업을 위해 사용자가 작업 시작 전 30분까지 높일 수 있다. Claude의 20분 안에 동의하며, 일괄 30분은 멈춘 도구를 늦게 발견할 수 있다. 승인 대기는 실행 시간에서 제외하지만, *실시간 승인 요청 자체*는 15분 뒤 거절하고 `BLOCKED(approval_expired)`로 옮긴다. Claude가 제안한 24시간 보류는 app-server 연결·요청 수명 보장이 없어 채택하지 않는다. 아래 수치는 제품 정책 제안이며 공급자 기본 제한이 아니다. [요구사항 §11–12](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:155).

| 항목 | 권장값 | 조정 범위 | 예외 | 검증 테스트 |
|---|---|---|---|---|
| 작업 최대 활성 실행 시간 | 120분 | 프로젝트별 30–240분 | 승인 대기 제외 | 여러 턴 합산·중단 |
| 에이전트 호출 한도 | 20분 | 사전 설정 시 최대 30분 | 없음; 긴 테스트는 별도 관리 작업 | 멈춘 스트림·테스트 종료 |
| 리뷰·수정 반복 | 3회 | 1–5회 | 사용자가 새 작업으로 재개 가능 | REWORK 루프 |
| 인프라 오류 재시도 | 2회 | 0–3회 | 인증·한도 초과 0회 | 오류별 분류·백오프 |
| 동시 수정 | **MVP 프로젝트당 1개** | V1에서 독립 worktree당 1개, 프로젝트 최대치 별도 | 읽기 전용 리뷰는 병렬 | 같은 프로젝트·다른 worktree 경합 |
| 자동 Push/Merge/Deploy | 금지 | 명시 실행에만 허용 | 승인 범위의 대상·artifact 고정 | 셸·MCP 우회 시도 |
| 인증 실패 | 즉시 BLOCKED | 고정 | 재인증 후 수동 재개 | 만료 토큰 |
| 사용 한도 초과 | 즉시 BLOCKED | 고정 | 다음 한도 기간에 수동 재개 | 공급자 오류·토큰 상한 |
| 불확실한 복구 | 자동 재실행 금지 | 고정 | 효과 대조로 안전이 입증된 순수 읽기 작업 | 크래시 후 중복 커밋 |
| 실시간 승인 대기 | 15분 | 사용자 설정 5–60분 | 승인 카드는 이력으로 남김 | 부재·연결 끊김·늦은 클릭 |

**Claude 안:** “worktree당 1개”는 장기적으로 옳지만 MVP에는 프로젝트당 1개가 요구사항 문구와 안전한 복구 모델에 맞는다. V1에서 분리된 worktree와 독립 상태 검증을 통과하면 완화한다. 인프라 재시도와 리뷰 반복은 별도 계수로 둔다. **근거:** [Codex의 `workspace-write` 승인 경계](https://learn.chatgpt.com/docs/agent-approvals-security), [요구사항의 모호성 기록](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:197). **위험:** 큰 작업의 20분 초과와 승인 부재의 반복. **합의 여부: 조건부 합의.**

### 쟁점 6 — 백그라운드 실행의 MVP 수용 기준

**당신의 입장:** **독립 데몬 지속 실행을 Windows MVP의 출시 기준으로 확정**한다. Phase 00 시험이 실패하면 안전 중단·재개 프로토타입은 만들 수 있지만, 그것을 “백그라운드 실행 MVP 완료”라고 부르지 않는다. 수용 시험은 ① 실행 중 창을 닫고 Electron 프로세스까지 종료해도 데몬·진행 중 턴이 살아 있고 저널 seq가 증가할 것, ② 앱을 다시 열면 같은 run·승인 상태·마지막 seq로 재연결할 것, ③ 트레이의 “작업 중지 후 종료”는 새 턴을 막고 승인 요청을 거절한 다음 에이전트 자식을 종료·확인할 것, ④ OS 재부팅 뒤에는 기존 프로세스가 살아 있다고 가정하지 않고 Recovery Manager가 Git·저널을 대조하여 **재개 제안** 또는 `BLOCKED`를 표시할 것, ⑤ 시험 종료 뒤 `codex`·`claude` 자식과 손자 프로세스가 남지 않을 것이다.

Node의 `detached:true`와 `unref()`는 부모 종료 후 자식 생존의 공식 메커니즘이다. Windows에서 별도 콘솔 창이 생길 수 있으므로 `windowsHide:true`를 함께 시험하고, Electron→데몬 간 stdio를 부모 종료에 묶지 않는다. 데몬→에이전트는 별도 pipe로 유지한다. PID 파일만 신뢰하지 않고 PID·프로세스 시작 시각·데몬 nonce를 검증한다. Windows의 프로세스 트리를 확실히 정리하려면 Job Object가 적합하지만 Node 표준 API만으로 그 연결을 보증한다는 주장은 **UNVERIFIED**다. Phase 00에서 실제 자식·손자 정리 시험이 실패하면 Job Object 연동이나 다른 관리 방법을 구현해야 한다. Windows 로그아웃·재시작에서 Electron `before-quit`에 의존하지 않는 것도 필수다. **Claude 안:** detached 데몬 MVP에 동의하며, `detached+unref` 자체를 완료 판정으로 삼지 않는다. **근거:** [Node child process](https://nodejs.org/api/child_process.html), [Electron 종료 이벤트](https://www.electronjs.org/docs/latest/api/app), [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects). **위험:** 콘솔 창, 고아 프로세스, 재연결 정보 위조. **합의 여부: 합의.**

### 쟁점 7 — OS별 배포 전략

**당신의 입장:** Windows부터 수용 시험을 끝낸다. MVP의 무서명 설치 파일은 **내부 개발·제한된 시험 배포에만** 허용하고, 일반 사용자 공개 배포에는 Windows 서명을 선행한다. 서명 가능한 지역·주체라면 Azure Artifact Signing을 우선 검토하고, 사용할 수 없으면 OV 인증서를 선택한다. EV를 SmartScreen 경고의 즉시 해결책으로 전제하지 않는다. macOS 공개 배포는 Developer ID 서명과 notarization을 게이트로 둔다. [Microsoft 서명 선택지](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options), [Apple Developer ID](https://developer.apple.com/developer-id/).

| 단계 | Windows | macOS | Linux | 업데이트 |
|---|---|---|---|---|
| MVP | Windows x64 내부 시험 설치 파일; 서명된 공개 빌드는 별도 게이트 | 없음 | 없음 | 수동 설치, 데이터 이전·롤백 시험 |
| V1 | 서명된 설치 파일과 업데이트 채널 | macOS 호스트 CI에서 서명·notarization한 DMG | Linux 호스트 CI에서 AppImage 및 deb 시험 빌드 | Windows/macOS는 `electron-updater`; Linux AppImage는 해당 updater 시험 후 활성화 |
| V2 | 안정 채널·단계 배포 | 동일 | 배포판 저장소의 deb/RPM 채널 확대 | Linux 패키지 형식별 갱신·롤백 정책 확정 |

Electron의 내장 `autoUpdater`에는 Linux 지원이 없지만, 채택 후보인 **electron-builder의 `electron-updater`는 AppImage 등 Linux 대상을 별도로 지원**한다. 따라서 “Linux 업데이트 불가”도, “모든 Linux 패키지를 같은 방식으로 자동 갱신”도 아니다. deb는 배포판 패키지 관리자를 기본 경로로 설계하고 AppImage 자체 갱신은 V1에서 실측한다. **Claude 안:** electron-builder 선택에 동의한다. OS별 업데이트 방식은 분리한다. **근거:** [Electron `autoUpdater` 플랫폼 제한](https://www.electronjs.org/docs/latest/api/auto-updater/), [electron-builder의 업데이트 대상](https://www.electron.build/v26/docs/features/auto-update/). **위험:** 서명 키 관리, 업데이트 중 실행 데몬·DB 스키마 불일치. **합의 여부: 합의.**

### 쟁점 8 — Phase 순서 최종안

**당신의 입장:** Claude의 Gateway→queue→chat 순서를 유지하되, **01에서 상태·보안 계약을 먼저 정의**하고 10을 구현 전반의 게이트로 앞당긴다. Diff viewer는 편집기보다 먼저 제공한다. 원래 00–12 범위는 모두 남기고, 08·10·11만 출시 경계에 맞춰 분할한다.

| 순서·원래 Phase | 확정 범위와 이유 | 종료선 |
|---|---|---|
| 00 환경·기술 검증 | 아래 위험 스파이크를 먼저 통과 | 시작 게이트 |
| 01 Shell·데몬 골격 | IPC, 단일 writer, 저널, 상태 전이·승인 계약의 뼈대 |  |
| 10a Security·Reliability 핵심 | renderer/daemon 경계, 비밀 처리, 정책 엔진·복구 불변식; 뒤로 미루면 Gateway를 다시 설계해야 함 |  |
| 02 Agent Gateway | Codex app-server·Claude SDK, 버전 감지, 승인·중단 왕복 |  |
| 04 Orchestrator·영속 큐 | Chat이 구독할 이벤트·재시도 원본 마련 |  |
| 03 Chat Workspace | 스트리밍·승인 UI·작업 상태; queue 위에 구현 |  |
| 05 Session Manager·Recovery | 재개·분기·재부팅 복구 |  |
| 08a Diff viewer·Git 읽기 | 에이전트 변경 검토를 편집 기능보다 먼저 제공 |  |
| 11a Windows 패키징 | 설치본에서 데몬 생존·재연결 시험 | **MVP** |
| 06 Project/Phase Manager | 재계획 충돌은 사용자 수정 우선·자동 제안으로 처리 |  |
| 07 Skills·MCP Manager | 호환성·증거·프로젝트별 활성화 |  |
| 09 Multi-Agent Collaboration | 두 단일 에이전트 경로가 안정된 뒤 교차 리뷰 |  |
| 08b Editor·Terminal | 사용자/에이전트 권한·변경 귀속을 분리 |  |
| 10b 보안·CI·한도 확장, 11b 3-OS 릴리스 | 다중 worktree·공급망·서명·업데이트 검증 | **V1** |
| 12 장기 기억·동적 역할, 08c Preview, 11c 고급 배포 | 핵심 작업 흐름과 독립된 고도화 | **V2** |

Phase 00은 중복을 제거한 **여덟 스파이크**로 고정한다. (1) Codex 0.166.0의 start→승인→중단→resume와 `workspaceWrite` 내부 자동 쓰기 확인, (2) Claude SDK의 `canUseTool`·`PreToolUse`·streaming input·interrupt 확인, (3) 두 공급자의 인증 방식과 제품 배포 약관 확인, (4) Windows Codex sandbox 외부 경로·네트워크 차단과 Claude native/WSL2 차이 시험, (5) `detached` 데몬의 창 종료·재연결·재부팅·손자 프로세스 정리, (6) Electron+SQLite 드라이버+PTY의 Windows 설치본 시험, (7) Codex 스키마 고정·차이 감지와 스킬 실제 로드·충돌 시험, (8) 파일 변경 뒤 크래시·재시작 시 중복 패치/커밋 방지 시험. **Claude 안:** 순서의 핵심에는 동의한다. 10과 11을 마지막 “마감 Phase”로만 두면 MVP의 보안·백그라운드 기준을 검증할 수 없다. **근거:** [원 Phase와 복구 요구](D:/LLM/agent-studio/docs/planning/evidence/USER_DIRECTIVE.md:584), [요구사항의 충돌·누락 표](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:197). **위험:** Phase 00이 길어지는 것보다, 실패할 핵심 가정을 구현 후반에 발견하는 비용이 크다. **합의 여부: 조건부 합의.**

### 쟁점 9 — Codex가 보는 최대 위험 세 가지

**당신의 입장:**

| 우선 | 위험 | 완화 | 판정 Phase |
|---|---|---|---|
| 1 | 승인 요청만으로 모든 파일·셸·MCP 부작용을 사전 통제한다고 믿는 것 | 도구·OS 경계별 보증 범위를 문서화하고, 고위험 효과는 앱 전용 실행기 또는 읽기 전용 제안→승인된 적용 경로로 제한 | **00**에서 우회 재현, **10a**에서 정책 고정 |
| 2 | Windows Claude native 모드와 분리 데몬을 “격리된 무인 실행”으로 함께 취급하는 것 | Claude native의 권한 경계를 명시하고, 무인 수정에 OS 격리가 필요하면 WSL2/VM을 요구; 데몬·에이전트 프로세스 트리 정리를 설치본에서 시험 | **00**, **01**, **11a** |
| 3 | 세션 재개가 파일·Git·외부 효과까지 복원한다고 가정하는 것 | 세션 ID와 별도로 저널·Git ref·blob 해시·효과 ID 저장; 불확실한 효과는 자동 재실행 금지 | **00**, **04**, **05** |

제품 배포의 별도 게이트로 인증 약관도 확인해야 한다. 현재 Anthropic 공식 문서는 제3자 제품의 Agent SDK에 API key 사용을 권하고, Claude.ai 구독 자격증명을 앱이 대신 중개하는 것을 금지한다. 사용자가 **변경하지 않은 Claude Code 바이너리**에 직접 로그인하는 경우에 대한 문구도 있지만, Agent Studio의 정확한 배포·호출 방식에 적용되는지는 **UNVERIFIED**다. 따라서 MVP 기본 경로는 사용자 소유 API key 또는 허용된 클라우드 공급자 자격증명으로 잡고, 구독 로그인 경로는 법적·기술적 확인 전 공개 기능으로 약속하지 않는다. [Anthropic 공식 법률·인증 안내](https://code.claude.com/docs/en/legal-and-compliance). **Claude 안:** 약관 위험을 제기한 데 동의한다. **위험:** 구현을 완성한 뒤 공개 배포 경로를 바꿔야 하는 것. **합의 여부: 합의.**

### 합의 요약 표

| 쟁점 | 합의 상태 | 최종 권장 | 남은 검증 |
|---|---|---|---|
| 1 승인 정책 | 조건부 합의 | 11개 영역을 앱 정책으로 고정; 고위험 효과는 앱 실행기 | 내장 도구 우회 범위 |
| 2 격리 | 합의 | Codex Windows sandbox 검증; Claude native 한계 표시 | 실제 외부 접근 시험 |
| 3 인젝션 | 합의 | 지침 해시·신뢰 재평가·실행 계층 승인 | 자동 로드 범위 |
| 4 비밀 | 조건부 합의 | 저장 전 마스킹, 비밀 DB 저장 금지, 암호화 백업 | CLI 자체 로그 |
| 5 제한 | 조건부 합의 | 20분 호출, 프로젝트당 수정 1개, 승인 15분 | 실제 장기 작업 분포 |
| 6 백그라운드 | 합의 | 독립 데몬 지속·재연결·고아 없음이 Windows MVP 게이트 | 설치본·재부팅 시험 |
| 7 배포 | 합의 | Windows 내부 MVP → 서명된 3-OS V1 | 업데이트·롤백 |
| 8 Phase | 조건부 합의 | 상태·보안 골격 조기 배치, Diff 우선 | 00 스파이크 결과 |
| 9 최대 위험 | 합의 | 승인·격리·효과 복구를 우선 검증 | 인증 약관 적용 |

### UNVERIFIED

1. Agent Studio가 **사용자 로컬 Claude Code 구독 로그인**을 호출하는 구체적 제품 형태가 Anthropic의 허용 조건을 충족하는지. 공식 문구만으로 개별 제품 적용을 단정할 수 없다.
2. 현재 Codex 0.166.0 및 Claude 2.1.316의 모든 승인·sandbox 동작이 인용한 최신 공식 문서와 정확히 일치하는지. Phase 00에서 설치본으로 시험해야 한다.
3. Node 표준 API만으로 Windows Job Object에 데몬과 모든 에이전트 자손을 묶어 확실히 정리할 수 있는지. 필요한 연동 방식과 패키징은 실측·조사 대상이다.
4. `detached:true`·`windowsHide:true`로 패키징된 Windows 설치본에서 콘솔 창 없이 데몬이 지속되고, 재연결과 프로세스 정리가 모두 성공하는지.
5. Claude/Codex가 자체 저장하는 세션·진단 로그를 Agent Studio의 보존·마스킹 정책과 동일하게 제어할 수 있는지. 현재 설계는 이를 보증하지 않는다.