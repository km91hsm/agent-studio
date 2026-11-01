# ENVIRONMENT_SURVEY — 읽기 전용 환경 조사

| 메타 | 값 |
|---|---|
| 상태 | FINAL (STEP 2) |
| 조사일 | 2026-11-01 (UTC 10:30~11:40) |
| 방법 | PowerShell 7 / Git Bash 읽기 전용 명령. 설정·파일 변경 없음 |

## 1. 시스템

| 항목 | 값 | 명령 |
|---|---|---|
| OS | Windows 11 Pro 10.0.26300 | `[Environment]::OSVersion` |
| Shell | PowerShell 7.6.9, Git Bash(git 2.56.0.windows.4) | `$PSVersionTable` |
| Node / npm | v24.21.0 / 12.0.2 | `node --version` |
| Python | 3.14.7 (`C:\Python314`), py launcher 3.14.6 | `python --version` |
| gh | 2.95.0 | `gh --version` |
| cargo / rustc | 없음 | `Get-Command` |
| go, pnpm, uv | 없음 | `Get-Command` |
| dotnet | 명령은 있으나 `--version` 로드 오류("The command could not be loaded") | `dotnet --version` |

## 2. 에이전트 CLI

| 항목 | 값 |
|---|---|
| Claude Code | 2.1.316, `C:\Users\<user>\.local\bin\claude.exe` |
| Claude 설정 | `~/.claude/settings.json`: statusLine, language=korean, model=fable, tui=fullscreen. Hook 없음. 플러그인 디렉터리 `~/.claude/plugins/{marketplaces,synced}` |
| Claude 주요 플래그(확인) | `-p/--print`, `--output-format text|json|stream-json`, `--input-format stream-json`, `--include-partial-messages`, `--resume <id>`, `--continue`, `--fork-session`, `--permission-mode`, `--json-schema`, `--bg`, `--mcp-config`, `--plugin-dir`, `--bare`, `--restricted`, `--add-dir`, `--agents` |
| Codex CLI | codex-cli 0.166.0, `C:\Users\<user>\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe`; `codex login status` → "Logged in using ChatGPT" |
| Codex 설정(`~/.codex/config.toml`, 수정 안 함) | `model = "gpt-6-sol"`, `model_reasoning_effort = "low"`, `[windows] sandbox = "elevated"`, `[features] memories = true`, Desktop 앱 번들 플러그인(browser, computer-use, documents 등), MCP `node_repl` |
| Codex 하위 명령(확인) | `exec`(`-s read-only|workspace-write|danger-full-access`, `--json`, `-o`, `--ephemeral`, `--output-schema`, `--skip-git-repo-check`, `-C`, `--worktree`, `--add-dir`), `exec resume <id|--last>`, `exec fork`, `review --uncommitted|--base`, `app-server {daemon,proxy,generate-ts,generate-json-schema}`, `agents`, `queue`, `fork`, `resume`, `features`, `doctor`, `sandbox`, `exec-server`(experimental) |
| Codex `--json` 이벤트(R0 실측) | `thread.started{thread_id}`, `turn.started`, `item.started/completed{item.type: command_execution|agent_message}`, `turn.completed{usage{input_tokens,cached_input_tokens,cache_write_input_tokens,output_tokens,reasoning_output_tokens}}` |
| Codex 세션 저장 | `~/.codex/sessions/`(7개 파일), `session_index.jsonl`, `state_5.sqlite`, `thread_history_1.sqlite` 등(내용 미열람) |
| Claude 세션 저장 | `~/.claude/projects/<경로-slug>/`(4개 폴더 확인, 내용 미열람) |

## 3. SDK 배포 버전 (레지스트리 조회, 기능 범위는 STEP 3 조사)

| 패키지 | 버전 |
|---|---|
| `@anthropic-ai/claude-agent-sdk` (npm) | 0.3.316 |
| `claude-agent-sdk` (PyPI) | 0.2.176 |
| `@anthropic-ai/claude-code` (npm) | 2.1.316 |
| `@openai/codex-sdk` (npm) | 0.166.0 |
| `@openai/codex` (npm) | 0.166.0 |

## 4. Skills 설치 상태

| 항목 | 값 |
|---|---|
| Claude 설치 경로 | `C:\Users\<user>\.claude\skills\` — 53 폴더 = 후보 52 + `synced/`(Claude Desktop 동기화 폴더, UUID 이름, 후보 아님) |
| 원본 사본 | `D:\LLM\claude-skills\skills\`(52 폴더), `D:\LLM\claude-skills\upload\`(52개 ZIP, Claude Desktop 업로드용), `SOURCES.md`(14 저장소 커밋) |
| 무결성 | 52/52 스킬 집계 SHA256 일치(`skill_hashes.tsv`) |
| Claude 인식 | 이번 Claude Code 세션의 사용 가능 스킬 목록에 52개 모두 노출 → **인식됨**. `/skills` 대화형 명령 대신 세션 스킬 목록을 증거로 사용 |
| 실행 검증 | 미실시(Phase 00 과제). 계획 과정에서 `research` 호출·적용 1건 성공, `to-spec` 호출 거부 1건(`PLANNING_SKILL_LOG.md`) |
| Codex 설치 경로 | `C:\Users\<user>\.codex\skills\.system\{imagegen,openai-docs,review-agent,skill-creator,skill-installer}` 만 존재. 후보 38개 **미설치** |
| Codex 스킬 형식(확인) | `$CODEX_HOME/skills/<name>/SKILL.md`, frontmatter `name/description/metadata`, 선택 `agents/openai.yaml`(`interface.display_name`, `policy.allow_implicit_invocation`) — `skill-installer/SKILL.md` 및 mattpocock 스킬의 `agents/openai.yaml`로 확인 |
| frontmatter 키 집계(52개) | name 52, description 52, `disable-model-invocation` 9, metadata 7, license 7, argument-hint 3, version 1, user-invocable 1, hidden 1, allowed-tools 1 |
| 모델 호출 금지(사용자 전용) 9개 | grill-me, grill-with-docs, handoff, implement-spec, improve-codebase-architecture, to-spec, to-tickets, triage, wayfinder (전부 mattpocock; `agents/openai.yaml`의 `allow_implicit_invocation: false`와 동일 집합) |
| description 200자 초과(Claude Desktop 업로드 제한 관련) 19개 | agent-browser 925, supabase-postgres-best-practices 836, supabase 790, impeccable 591, ui-ux-pro-max 497, code-review 421, diagnosing-superpowers 375, vercel-react-best-practices 329, skill-creator 319, find-skills 303, codebase-design 265, to-tickets 247, git-guardrails-claude-code 243, setup-pre-commit 238, research 238, receiving-code-review 234, verification-before-completion 225, brainstorming 215, frontend-design 204 |
| 스크립트 포함 | brainstorming(js/sh 3), caveman-compress(py 7), design-taste-frontend(js/mjs/json 23), diagnosing-bugs(sh 1), git-guardrails-claude-code(sh 1), impeccable(js/json 8), skill-creator(py 10), systematic-debugging(sh/ts 2), ui-ux-pro-max(py/json 33), writing-skills(js 1), vercel-* (json 1씩) |

## 5. 저장소 최신 커밋 대조 (gh api, 2026-11-01 11:31Z)

| 저장소 | SOURCES.md | 최신 커밋 | 일치 | 라이선스 | 비고 |
|---|---|---|---|---|---|
| obra/superpowers | 2ce8aa1 | 2ce8aa1 (10-21) | ✅ | MIT | |
| DietrichGebert/ponytail | 96608e0 | 96608e0 (10-29) | ✅ | MIT | |
| vercel-labs/skills | 92a9a34 | 92a9a34 (10-29) | ✅ | MIT | |
| mattpocock/skills | 4ae2317 | 4ae2317 (10-31) | ✅ | MIT | |
| anthropics/skills | ca45fc4 | ca45fc4 (10-28) | ✅ | NOASSERTION(저장소 수준 미표기, 스킬별 LICENSE.txt 확인) | |
| vercel-labs/agent-skills | 1a2c79d | 1a2c79d (10-27) | ✅ | NOASSERTION | |
| vercel-labs/agent-browser | 5868f7c | 5868f7c (10-31) | ✅ | Apache-2.0 | |
| nextlevelbuilder/ui-ux-pro-max-skill | 3a13158 | 3a13158 (11-01) | ✅ | MIT | |
| pbakaus/impeccable | 4f95649 | **77ac20b** (11-01 10:50Z) | ❌ 변경 | Apache-2.0 | 업데이트 검토 대상(실행 안 함) |
| supabase/agent-skills | c9be0e9 | c9be0e9 (10-02) | ✅ | MIT | |
| leonxlnx/taste-skill | 12af471 | 12af471 (10-24) | ✅ | MIT | |
| designed-by-ai/skills | 03c20ae | 03c20ae (10-05) | ✅ | MIT | ⭐23, 소규모 |
| stablyai/orca | 4e2fcfe9 | **89f9ce0** (11-01 11:14Z) | ❌ 변경 | MIT | 업데이트 검토 대상(실행 안 함) |
| JuliusBrussee/caveman | 9b68f7e | 9b68f7e (10-25) | ✅ | Apache-2.0 | |

아카이브된 저장소 없음. 변경 2건(impeccable, orca)은 `OPEN_ISSUES_AND_RISKS.md`에 "업데이트 검토 필요"로 올린다.

## 6. 기타

- 지시서가 참조한 `CLAUDE_CODE_SKILLS_SETUP(2).md`는 없고 `C:\Users\<user>\Downloads\CLAUDE_CODE_SKILLS_SETUP.md`가 있음. 이 파일을 기준 문서로 사용.
- Codex config의 `projectlessWorkspaceRoot = D:\LLM\Codex` 경로는 존재하지 않음.
- `D:\LLM`은 git 저장소가 아니었음. `D:\LLM\agent-studio`를 새 저장소로 초기화(사용자 결정).
- R0 스모크 테스트 stderr에 ChatGPT 연동 MCP(`product-account-links/mcp`) 403 Cloudflare 오류 1회. 실행 결과에 영향 없음. Codex Desktop 번들 설정에 의한 것으로 추정(UNVERIFIED).
- Bash 도구로 8KB 이상 heredoc을 쓰면 명령줄 길이 한계로 잘림(이번 세션에서 2회 발생). 긴 문서는 Write 도구로 작성.
