# skill_analysis_part1 — superpowers 15 + mattpocock 17 SKILL.md 분석

> 작성: Claude Code Explore 서브에이전트(읽기 전용), 2026-11-01. 대상 경로 `C:\Users\<user>\.claude\skills\<name>\`. "미기재"는 파일에 근거가 없음을 뜻한다.
> 이 문서는 분석 노트(1차 자료는 각 SKILL.md). `SKILL_COMPATIBILITY_MATRIX.md`의 근거로 쓰인다.

| name | description 요약 | 트리거 방식 | Claude Code 전용 요소 | 외부 의존성 | 포함 스크립트/추가 파일 | 다른 스킬 참조 | 사용자 상호작용 | 금지·위험 동작 |
|---|---|---|---|---|---|---|---|---|
| brainstorming | 기능·컴포넌트 추가나 계획 등 모든 창작 작업 전에 반드시 쓰는 설계 대화 | 자동("You MUST use this before any creative work") | 서브에이전트(builder check) | 브라우저, node(visual companion), git(설계 문서 커밋) | builder-check-prompt.md / visual-companion.md / scripts/start-server.sh: `node server.cjs`를 nohup 백그라운드 실행, `/tmp/brainstorm-<id>` 또는 `<project>/.superpowers/brainstorm/`에 세션·state 파일 씀 / scripts/server.cjs: 127.0.0.1 랜덤 포트 HTTP+WebSocket 서버, 토큰·포트·server-info 파일 쓰고 `--open`이면 브라우저 실행(win32는 rundll32). 텔레메트리 비활성 env가 없으면 `https://primeradiant.com/...logo.png` 외부 이미지를 페이지에 넣음 / scripts/stop-server.sh / scripts/helper.js / scripts/frame-template.html | writing-plans | 예(한 번에 질문 하나, 승인 게이트) | HARD-GATE: 설계 승인 전 코드·스캐폴딩·의존성 설치 금지. 설계 문서는 `docs/superpowers/specs/`에 커밋 |
| writing-plans | 스펙·요구사항이 있는 다단계 작업에서 코드 작성 전 구현 계획 작성 | 자동 | 미기재 | git, 테스트 러너 | 없음 | using-git-worktrees, subagent-driven-development, executing-plans | 예(계획 검토·실행 방식 선택) | 계획 템플릿에 git add/commit 포함. `docs/superpowers/plans/`에 저장 |
| executing-plans | 서브에이전트 없이 현재 세션에서 계획 순차 실행 | 자동 | 서브에이전트(최종 리뷰어), todo | git, bash, 테스트 러너 | scripts/task-start(브리프 파일 쓰고 HEAD SHA 출력) / scripts/task-done(테스트 명령 실행, 로그 저장, 성공 시 `progress.md` 추가) | test-driven-development, verification-before-completion, systematic-debugging, using-git-worktrees, subagent-driven-development, requesting-code-review, finishing-a-development-branch | 부분(파괴적·보안·외부 부작용·계획 붕괴 4경우만 멈춤) | main/master에서 동의 없이 구현 금지. 완료 후 플랜 워크스페이스 삭제 |
| subagent-driven-development | 독립 작업을 작업마다 새 서브에이전트로 구현·리뷰 | 자동 | 서브에이전트(구현자·리뷰어·모델 지정), todo | git, bash | implementer/task-reviewer/re-review-prompt.md / references/*.md 7개 / scripts/sdd-workspace(`.superpowers/sdd/<plan>/` 생성, `.gitignore` 생성) / scripts/task-brief / scripts/review-package(git log/diff 파일 쓰기) | using-git-worktrees, finishing-a-development-branch, executing-plans | 부분 | 구현 서브에이전트 병렬 금지. final-review.md에 워크스페이스 `rm -rf`. merge·push는 질문 대상 |
| dispatching-parallel-agents | 공유 상태 없는 독립 작업 2개 이상을 병렬 에이전트로 | 자동 | 서브에이전트(general-purpose 병렬) | 테스트 러너 | 없음 | 없음 | 아니오 | 없음 |
| test-driven-development | 구현 전 TDD(RED-GREEN-REFACTOR) 강제 | 자동 | 없음 | 테스트 러너 | writing-good-tests.md | 없음 | 부분 | 테스트 전에 쓴 코드는 "Delete it. Start over" |
| systematic-debugging | 수정 제안 전 근본 원인 조사 4단계 | 자동 | 없음 | git | root-cause-tracing.md, defense-in-depth.md, condition-based-waiting.md(+ -example.ts) / find-polluter.sh(테스트 파일마다 `npm test` 실행) / CREATION-LOG.md, test-*.md | test-driven-development, verification-before-completion | 부분(3회 실패 시 사람과 논의) | 없음 |
| requesting-code-review | 완료·머지 전 리뷰 서브에이전트 요청 | 자동 | 서브에이전트(general-purpose) | git | code-reviewer.md | 미기재 | 아니오 | 없음 |
| receiving-code-review | 리뷰 피드백을 맹목 수용 대신 기술 검증 | 자동 | 없음 | gh | 없음 | 없음 | 예 | "You're absolutely right!" 류 응답 금지 |
| verification-before-completion | 완료 주장·커밋·PR 전 검증 명령 실행 강제 | 자동 | 없음 | 테스트·빌드 명령 | 없음 | 없음 | 아니오 | 검증 없이 commit/push/PR 금지 |
| using-git-worktrees | 기능 작업 전 격리 워크스페이스 확보 | 자동 | 네이티브 워크트리 도구(`EnterWorktree`) | git, npm/cargo/pip/poetry/go | 없음 | 없음 | 예 | `.gitignore` 수정·커밋, 의존성 설치 실행 |
| finishing-a-development-branch | 구현 완료 후 머지·PR·보존 결정 | 자동 | 없음 | git, gh | 없음 | 없음 | 예(옵션 메뉴, 'discard' 확인) | 사용자 선택 시 pull/merge, `push -u`, `branch -d/-D`, `worktree remove`. force는 명시 요청 시만 |
| using-superpowers | 모든 대화 시작 시 스킬 탐색·호출 규칙 확립(라우터) | 자동("ABSOLUTELY MUST") | Skill 도구, todo, plan mode, CLAUDE.md, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | 없음 | references/claude-code-tools.md, codex-tools.md, gemini-tools.md, pi-tools.md, antigravity-tools.md, hermes-tools.md, muse-tools.md(하네스별 도구 매핑, 실행 코드 없음) | brainstorming, systematic-debugging, frontend-design | 아니오 | 없음 |
| writing-skills | 스킬 생성·편집·배포 전 검증(문서 TDD) | 자동 | 서브에이전트, todo, `~/.claude/skills/` | node, graphviz(dot), git | render-graphs.js(dot→SVG) / references 8개 | test-driven-development | 아니오 | 테스트 전에 쓴 스킬 삭제. "Commit… and push to your fork" |
| diagnosing-superpowers | superpowers 세션 문제 진단·버그 리포트 | 자동 | 서브에이전트, todo | gh, curl, zip/tar, 네트워크(github.com) | prompts 11개 / references 4개 / templates 4개. `~/.superpowers/diagnosing-superpowers/<id>/`에 파일 씀 | 미기재 | 예 | 세션 파일 수정·삭제 금지. 이슈 생성·아카이브는 승인 후 |
| grill-me | 계획·설계를 다듬는 집요한 인터뷰 | **명시 호출**(`disable-model-invocation: true`, openai.yaml `allow_implicit_invocation: false`) | Skill 도구 | 없음 | agents/openai.yaml | **grilling(미설치)** | 미기재 | 없음 |
| handoff | 대화를 다음 에이전트용 인계 문서로 압축 | **명시 호출** | Skill 도구 | 없음 | agents/openai.yaml | 없음 | 아니오 | OS 임시 디렉터리에 파일 쓰기. 비밀정보 삭제 지시 |
| grill-with-docs | 인터뷰하며 ADR·용어집 생성 | **명시 호출** | Skill 도구 | 없음 | agents/openai.yaml | **grilling, domain-modeling(미설치)** | 미기재 | 없음 |
| to-spec | 대화를 스펙으로 종합해 이슈 트래커에 게시 | **명시 호출** | 없음 | 이슈 트래커 | agents/openai.yaml | **setup-matt-pocock-skills(미설치)** | 부분 | 트래커에 게시, `ready-for-agent` 라벨 |
| research | 1차 출처 조사→인용 포함 Markdown 저장 | 자동 | 백그라운드 서브에이전트 | 네트워크 | agents/openai.yaml | 없음 | 아니오 | 레포에 파일 쓰기 |
| triage | 이슈·외부 PR 트리아지 상태 머신 | **명시 호출**(`/triage`) | Skill 도구 | 이슈 트래커, git, 테스트 | AGENT-BRIEF.md / OUT-OF-SCOPE.md / agents/openai.yaml | **grilling, domain-modeling, setup-matt-pocock-skills(미설치)** | 예 | 이슈 닫기·댓글·라벨, `GLOSSARY.md`/ADR/`.out-of-scope/` 쓰기 |
| prototype | 설계 질문용 일회용 프로토타입 | 자동 | 없음 | 브라우저, 프로젝트 러너, git | LOGIC.md / UI.md / agents/openai.yaml | 없음 | 부분 | 일회용 브랜치 커밋 |
| codebase-design | deep module 설계 어휘 | 자동 | 서브에이전트(DESIGN-IT-TWICE 3개 병렬) | 없음 | DEEPENING.md / DESIGN-IT-TWICE.md / agents/openai.yaml | 없음 | 부분 | 없음 |
| improve-codebase-architecture | 심화 기회 HTML 보고서 후 grilling | **명시 호출** | Skill 도구, 서브에이전트 | git log, 브라우저, CDN(Tailwind, Mermaid) | HTML-REPORT.md / agents/openai.yaml | codebase-design, **grilling, domain-modeling(미설치)** | 예 | 임시 HTML, `GLOSSARY.md`/ADR 쓰기 |
| diagnosing-bugs | 어려운 버그·성능 회귀 진단(피드백 루프) | 자동 | 없음 | curl, Playwright/Puppeteer, git bisect, 디버거 | scripts/hitl-loop.template.sh(`read`로 답 받는 템플릿, 네트워크·파일 쓰기 없음) / agents/openai.yaml | 없음 | 부분 | 비밀정보 삭제. 디버그 로그 정리 |
| code-review | 기준점 이후 diff를 Standards·Spec 두 축으로 병렬 리뷰 | 자동 | 서브에이전트(병렬) | git, 이슈 트래커 | agents/openai.yaml | **setup-matt-pocock-skills(미설치)** | 부분 | 없음 |
| implement-spec | /to-spec·/to-tickets 결과를 통합 브랜치에 병렬 구현 | **명시 호출** | Skill 도구, 서브에이전트(백그라운드 구현자·merger) | git(worktree, merge), 트래커, PR | agents/openai.yaml | tdd, code-review, **setup-matt-pocock-skills(미설치)** | 아니오 | 통합 브랜치로 reset, draft PR 생성, 워크트리 정리 |
| wayfinder | 세션을 넘는 큰 작업을 결정 티켓 지도로 | **명시 호출** | Skill 도구, 서브에이전트 | 트래커(기본 local-markdown), git push | agents/openai.yaml | **grilling, domain-modeling(미설치)**, research, prototype, **setup-matt-pocock-skills(미설치)** | 예 | `research/<name>` 브랜치 push. 이슈 생성·닫기 |
| to-tickets | 계획·스펙을 tracer-bullet 티켓으로 분해·게시 | **명시 호출** | 없음 | 트래커(GitHub/Linear) 또는 로컬 | agents/openai.yaml | **setup-matt-pocock-skills(미설치)** | 예 | `.scratch/<slug>/issues/` 쓰기 |
| tdd | 테스트 우선 red→green 루프 기준 | 자동 | Skill 도구 | 없음 | tests.md / mocking.md / agents/openai.yaml | codebase-design, code-review | 예(seam 사전 확인) | 없음 |
| git-guardrails-claude-code | 위험 git 명령 차단 PreToolUse hook 설치 | 자동 | **hooks(PreToolUse, matcher Bash), settings.json, `$CLAUDE_PROJECT_DIR`** | bash, jq, grep | scripts/block-dangerous-git.sh(stdin JSON에서 `jq`로 명령 추출, 위험 패턴이면 exit 2) / agents/openai.yaml | 없음 | 예(범위·패턴) | 전역 선택 시 `~/.claude/settings.json` 수정, `~/.claude/hooks/` 복사, chmod +x |
| setup-pre-commit | Husky·lint-staged(Prettier)·타입체크·테스트 pre-commit | 자동 | 없음 | npm/pnpm/yarn/bun, npx, 레지스트리(네트워크), git | agents/openai.yaml | 없음 | 아니오 | devDependencies 설치, package.json 수정, 자동 커밋 |

## 메모

### using-superpowers 라우팅 규칙(원문)
- "If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill."
- "Invoke relevant or requested skills BEFORE any response or action — including clarifying questions, exploring the codebase, or checking files."
- "Before entering plan mode: if you haven't already brainstormed, invoke the brainstorming skill first."
- "When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out."
- "User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills". 서브에이전트로 디스패치된 경우 이 스킬을 무시(`<SUBAGENT-STOP>`).

### 중복 쌍별 핵심 차이
- **brainstorming ↔ grill-me/grill-with-docs**: brainstorming은 자동 트리거·승인 게이트·설계 문서·시각 서버 후 writing-plans로 이어짐. grill-me/grill-with-docs는 명시 호출 전용이며 본문은 Skill 도구로 `grilling`(+`domain-modeling`)을 부르는 한 줄 — **둘 다 미설치라 현재 동작 불가**.
- **writing-plans ↔ wayfinder/to-spec/to-tickets**: writing-plans는 로컬 md에 파일·시그니처·테스트 수준 단계 계획. mattpocock 쪽은 이슈 트래커 중심(to-spec=사용자 스토리 스펙, to-tickets=블로킹 관계 vertical-slice 티켓, wayfinder=결정 티켓 지도).
- **executing-plans/SDD ↔ implement-spec**: superpowers는 순차 실행(SDD는 구현자 병렬 금지)+작업별 리뷰+원장 스크립트. implement-spec은 워크트리별 백그라운드 구현자 병렬 + merger 서브에이전트.
- **test-driven-development ↔ tdd**: superpowers는 "테스트 전 코드 삭제" Iron Law 강제형. tdd는 seam 사전 합의, 리팩터링을 리뷰 단계로 분리.
- **systematic-debugging ↔ diagnosing-bugs**: 4단계 근본원인 절차·3회 실패 시 아키텍처 재검토 vs 빠른 피드백 루프·가설 3~5개·태그 디버그 로그·비밀정보 삭제.
- **requesting-code-review ↔ code-review**: 단일 general-purpose 리뷰어+Critical/Important/Minor vs Standards·Spec 두 서브에이전트 병렬+Fowler 스멜 기준선.
- **writing-skills ↔ skill-creator(anthropics)**: writing-skills는 서브에이전트 압력 시나리오 TDD 방식(`references/anthropic-best-practices.md` 포함).

### git-guardrails-claude-code / setup-pre-commit이 실제로 쓰는 것
- git-guardrails: `PreToolUse`/matcher `Bash`/type `command`. 프로젝트 범위는 `.claude/settings.json` + `.claude/hooks/block-dangerous-git.sh`; 전역은 `~/.claude/settings.json` + `~/.claude/hooks/`. 차단 패턴: `git push`, `reset --hard`, `clean -fd/-f`, `branch -D`, `checkout .`, `restore .`, `push --force`. `jq` 필요. Windows 네이티브 환경(jq 부재 가능)에서 동작 여부 UNVERIFIED.
- setup-pre-commit: husky·lint-staged·prettier devDependencies 설치, `npx husky init`, `.husky/pre-commit`(`npx lint-staged`, `npm run typecheck`, `npm run test`), `.lintstagedrc`, `.prettierrc`, 마지막에 자동 커밋. Claude settings.json은 건드리지 않음.

### "codex"/"openai"/"AGENTS" 등장 위치
- mattpocock 17개 전부 `agents/openai.yaml`(`interface.display_name/short_description`, 일부 `policy.allow_implicit_invocation: false`) → **Codex 스킬 형식을 이미 겸함**.
- using-superpowers: `references/codex-tools.md`(`~/.codex/config.toml`의 `multi_agent = true`, `[agents] default_subagent_model`, `spawn_agent`, `~/.codex/agents/`) 보유. "CLAUDE.md, AGENTS.md, GEMINI.md … take precedence".
- writing-skills: "Codex, Copilot CLI, and Gemini CLI all also recognize `~/.agents/skills/`".
- brainstorming: `server.cjs`가 `.codex-plugin/plugin.json` 시도, `start-server.sh`가 `CODEX_CI` 감지, `visual-companion.md`에 Codex 섹션.

### 깨진 참조
설치되지 않은 스킬을 호출하는 스킬: grill-me, grill-with-docs, triage, improve-codebase-architecture, wayfinder → `grilling`, `domain-modeling`; to-spec, triage, code-review, implement-spec, wayfinder, to-tickets → `setup-matt-pocock-skills`.
