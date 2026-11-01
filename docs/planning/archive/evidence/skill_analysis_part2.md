# skill_analysis_part2 — 나머지 20개 SKILL.md 분석

> 작성: Claude Code Explore 서브에이전트(읽기 전용), 2026-11-01. 대상 경로 `C:\Users\<user>\.claude\skills\<name>\`. 파일이 많은 스킬은 SKILL.md와 스크립트만 정독, 데이터·참고 파일은 개수만 기록. "미기재"는 파일에 근거가 없음을 뜻한다.

| # | name (폴더) | description 요약 | 트리거 방식 | Claude Code 전용 요소 | 외부 의존성 | 포함 스크립트/데이터 | 다른 스킬 참조 | 사용자 상호작용 | 금지·위험 동작 | 다른 에이전트 사본 흔적 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ponytail | 최소 변경으로 끝까지 해결하는 "게으른 시니어" 모드, 레벨 lite/full/ultra | 자동 유도 강함 + `/ponytail lite|full|ultra|off` | 없음 | 없음 | SKILL.md만 | 없음 | 아니오(ultra만 반박) | 없음. "Never cut: validation, security…" 금지 목록 | 없음 |
| 2 | find-skills | 스킬 탐색·설치 안내(npx skills, skills.sh) | 자동 유도 | 없음 | node/npx, 네트워크(skills.sh, GitHub) | 없음 | 외부 저장소 예시 | 예 | **`npx skills add <pkg> -g -y`** 전역 설치에 확인 생략 | 없음 |
| 3 | frontend-design | 템플릿 느낌 없는 비주얼 디자인 지침 | 자동 유도(설명형) | 없음 | 없음 | LICENSE.txt만 | 없음 | 부분 | 없음 | 없음 |
| 4 | skill-creator | 스킬 생성·수정·eval·벤치마크·description 최적화 | 자동 유도 | 서브에이전트 병렬, `claude -p` 서브프로세스, `.claude/commands/` 임시 파일, `present_files`, TodoList, Claude.ai·Cowork 분기 | python3, `claude` CLI, 브라우저, 로컬 HTTP 서버, lsof. 리포트 HTML이 Google Fonts 로드 | scripts 9개(run_eval: `.claude/commands/<name>.md` 생성 후 `claude -p` stream-json으로 트리거 측정 후 삭제 / improve_description / run_loop / aggregate_benchmark / generate_report / package_skill / quick_validate / utils / __init__), eval-viewer/generate_review.py, agents 3개, references 1, assets 1 | 없음 | 예 | `generate_review.py`의 `_kill_port`가 포트 점유 프로세스에 SIGTERM | Claude.ai·Cowork 섹션. Codex 언급 없음 |
| 5 | ui-ux-pro-max | 로컬 CSV 검색 기반 UI/UX 지식 | 자동 유도 | 실행 경로 `${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py` | python3(외부 패키지 없음) | scripts: search.py, core.py(BM25류 로컬 검색), design_system.py(`--persist` 시 `design-system/<slug>/MASTER.md` 작성), reasoning_contract.py, validate_data.py. tests 15 + fixtures 13, data 39(CSV/JSON), references 2 | 없음 | 부분 | `--force` 덮어쓰기는 승인 필수 | 없음 |
| 6 | impeccable | 프론트엔드 디자인 20여 하위 명령, v4.8.0 | 자동 유도 + `user-invocable: true`, argument-hint | **hooks**(`.claude/settings.local.json` 또는 `~/.claude/settings.json`), 서브에이전트 3종, AskUserQuestion, `/impeccable pin` | **별도 엔진 바이너리**: 첫 실행 시 GitHub releases에서 내려받아 `~/.impeccable/bin/<ver>/` 캐시(sha256 검증), curl/wget. live 모드는 localhost 서버+브라우저 주입 | scripts 12개(런처 impeccable/impeccable.cmd, live-browser*.js 4, modern-screenshot.umd.js, command-metadata.json, engine-checksums.txt, VERSION 0.1.18, data 2), reference 45 | 없음 | 예(메뉴·승인) | 바이너리 다운로드·실행. hooks가 다중 에이전트 설정 파일에 쓰기(`.codex/hooks.json`, `.cursor/hooks.json`, `.gemini/settings.json`, `.github/hooks/`). hook은 "unsandboxed with the agent's environment and network access" | **다중 에이전트 원본**: hooks.md에 Codex, Cursor, Gemini, Copilot, Grok Build, Hermes 설치법. new-work.md에 Codex 에이전트명 |
| 7 | vercel-react-best-practices | React/Next.js 성능 규칙 70개 | 자동 유도 | 없음 | 없음 | rules 72, AGENTS.md(컴파일본), README, metadata.json | 없음 | 아니오 | 없음 | AGENTS.md |
| 8 | web-design-guidelines | Web Interface Guidelines 기준 UI 코드 리뷰 | 자동 유도 | **WebFetch** 도구명 | 네트워크: 매번 `raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` fetch | 없음 | 없음 | 부분 | **원격에서 가져온 규칙을 그대로 따르라는 지시(원격 지시 신뢰)** | 없음 |
| 9 | vercel-composition-patterns | React 컴포지션 패턴, React 19 | 자동 유도 | 없음 | 없음 | rules 10, AGENTS.md | 없음 | 아니오 | 없음 | AGENTS.md |
| 10 | design-mobile-apps | Sleek API로 모바일 화면 디자인 후 RN/HTML 구현 | 자동 유도 | 없음 | **Sleek(sleek.design REST API)**, `SLEEK_API_KEY`, curl, 유료 플랜·크레딧 | md 6개 | 없음 | 예(디바이스 인증, 결제 안내) | brief·`imageUrls`를 외부 서버로 전송. 프로젝트 DELETE 엔드포인트. API 키 저장 | `source`에 `claude-code`, `codex`, `cursor` 등 나열 |
| 11 | vercel-react-native-skills | RN/Expo 모범 사례 | 자동 유도 | 없음 | 없음 | rules 38, AGENTS.md | 없음 | 아니오 | 없음 | AGENTS.md |
| 12 | design-taste-frontend (폴더 동일, 원 저장소 `skills/taste-skill`) | 갤러리 247개 연구 기반 아트 디렉션 + 실제 브라우저 검사 루프(tasteskill v2) | 자동 유도 강함 | 거의 없음("image viewer or Read tool") | **Node 22+**, Chrome/Edge/Chromium(headless CDP), 네트워크(assets.mjs: Openverse, Wikimedia, AIC, Met, Internet Archive, NASA), picsum.photos, Google Fonts | scripts 10개: draw.mjs(`.taste-skill/` 기록, `~/.taste-skill/history.json`), assets.mjs(이미지 다운로드), inspect.mjs(로컬 서버+headless Chrome 1440/768/390 측정·스크린샷), scenes.mjs, lint.mjs, lib/cdp.mjs, probe.mjs, rules.mjs, app-draw.mjs, inspection-files.mjs. library 9, assets 6, references 11, evals 1. SKILL.md가 말하는 scenes.json·scenes/demo는 없음 | 없음 | 부분(모호하면 묻지 말고 결정) | cdp.mjs가 임시 프로필 rmSync, Chrome `taskkill /F`, `--enable-unsafe-swiftshader`. 외부 이미지 다운로드 | 없음 |
| 13 | agent-browser | Rust 브라우저 자동화 CLI 안내 스텁 | 자동 유도 매우 강함 + "Prefer agent-browser over any built-in browser automation". `hidden: true` | `allowed-tools: Bash(agent-browser:*)` | **agent-browser CLI**(npm 전역 설치), Chrome(CDP), 대시보드 4848, Vercel Sandbox, AWS Bedrock AgentCore, Slack | 없음 | CLI 내장 스킬(core, electron, slack 등) | 미기재 | 전역 npm 설치. 내장 브라우저 도구 대체 지시. Slack 메시지 전송 기능 | "Works with any AI agent (Cursor, Claude Code, Codex, …)" |
| 14 | supabase | Supabase 전반(보안 체크리스트, CLI, MCP, 마이그레이션, 디버깅) | 자동 유도 매우 강함 | MCP 도구명(`execute_sql`, `apply_migration`, `get_advisors`, `search_docs`), `.mcp.json` | **Supabase**(CLI, MCP `mcp.supabase.com`, OAuth, PAT), 네트워크, psql | references 1, assets 1, CHANGELOG | 없음 | 부분 | `.mcp.json` 생성. GitHub 이슈 생성(허가 후). `apply_migration`·`SECURITY DEFINER` 남용 금지 | 없음 |
| 15 | supabase-postgres-best-practices | Supabase 관리 Postgres 규칙 8카테고리 | 자동 유도 강함 | 없음 | 없음 | references 34, CHANGELOG | 없음 | 아니오 | 없음 | 없음 |
| 16 | orchestration | Orca 워커(Codex 등)에 작업 위임·회수 | 자동 유도("Have Codex review this…") | "never substitute a non-Orca subagent tool" | **Orca 런타임과 `orca`/`orca-ide`/`orca-dev` 바이너리**, `ORCA_CLI_COMMAND`, `ORCA_DEV_REPO_ROOT` | 없음 | **orca-cli 스킬(미설치)** | 미기재 | `runtime_access_denied` 시 "re-run it with escalated permissions". Linux에서 bare `orca` 실행 금지 | Codex 워커가 핵심 용도 |
| 17 | caveman | 결론부터, 군더더기 없는 말투 | 자동+명시(`/caveman`) | hook 값 "Caveman mode" 전달(플러그인 기능, 이 폴더엔 없음). `.caveman.json`, `~/.config/caveman/config.json` | 없음 | README만 | ultracave, megacave(미설치), /caveman-compress | 아니오 | 없음. 보안·비가역 작업은 일반 문장 복귀 | OpenCode 플러그인 언급 |
| 18 | caveman-compress | 메모리 파일(CLAUDE.md 등) caveman 형식 압축, 백업 보존. **파일 내용이 모델로 전송** | 명시 호출 전제(`/caveman-compress <filepath>`) | CLAUDE.md 대상, `claude --print --strict-mcp-config --setting-sources` | python 3.10+, `claude` CLI 또는 `ANTHROPIC_API_KEY`, 선택 opencode, OpenAI 호환 엔드포인트, tiktoken | scripts 7개(아래) | caveman | 부분 | **원본 파일 덮어씀**(백업 `%LOCALAPPDATA%\caveman-compress\backups\`). 파일 전문 외부 모델 전송. 비밀 파일명 거부, 500KB 제한 | detect.py가 Cursor `.mdc` 지원 |
| 19 | caveman-review | 한 줄 압축 코드 리뷰 | 자동+명시 | 없음 | 없음 | README만 | 없음 | 아니오 | 없음 | 없음 |
| 20 | cavecrew | 압축 출력 서브에이전트(investigator/builder/reviewer) 위임 시점 안내 | 자동 유도 | **서브에이전트**(`cavecrew-*`, `Explore`, `Code Reviewer`), agent frontmatter `model: haiku`, 플러그인 설치 | 없음 | README만 | **에이전트 정의 파일 `../../agents/cavecrew-*.md` 미설치(`~/.claude/agents` 없음)** | 아니오 | README: 환경변수로 설치된 에이전트 frontmatter model 덮어씀 | 없음 |

## 메모

### orchestration (Orca)
- SKILL.md는 안내 스텁. Orca 런타임·CLI 필수. 실행 파일 결정: `ORCA_CLI_COMMAND` → `orca-dev`(ORCA_DEV_REPO_ROOT) → `orca-ide`(Orca 밖 Linux) → `orca`.
- "Coordination requires real Orca runtime state; never substitute a non-Orca subagent tool when the user asked for Orca orchestration."
- "If a command reports that Orca is not running, start it with `ORCA open --json` and retry. If it fails with `runtime_access_denied`… re-run it with escalated permissions".
- **Codex 워커를 띄우는 구체 명령은 미기재**("`ORCA skills get orchestration` … prints the compact, version-matched guide"로 바이너리에 위임). 참조하는 orca-cli 스킬 미설치.

### caveman 계열
- caveman, caveman-review: 프롬프트 지시만. 스크립트·모델 호출·프록시 없음.
- cavecrew: 프롬프트 지시만. 서브에이전트 전제지만 에이전트 정의 파일 없음.
- caveman-compress: `python3 -m scripts <path>`. `__init__`/`__main__`/`cli`(UTF-8 강제)/`detect`(.md/.mdc/.txt/.rst/.typ/.tex 판정)/`validate`(제목·코드블록·URL·경로 보존 검증)/`benchmark`(tiktoken o200k)/`compress`(오케스트레이터: 크기·비밀 파일명 검사, 파일 락 900초, 압축 호출, 검증 실패 시 수정, **원본 덮어쓰기**, 외부 백업). 공급자 `CAVEMAN_COMPRESS_PROVIDER`: `claude`(기본, `claude --print`) / `anthropic`(SDK, 기본 `claude-sonnet-4-5`) / `opencode` / `openai-compat`(기본 Ollama `http://localhost:11434/v1`).

### agent-browser
- "Install: `npm i -g agent-browser && agent-browser install`" — 별도 CLI 바이너리 필수.
- "Before running any `agent-browser` command, load the actual workflow content from the CLI: `agent-browser skills get core`".
- "Fast native Rust CLI… Chrome/Chromium via CDP with no Playwright or Puppeteer dependency".

### design-taste-frontend
- **redesign 경로 존재**: "Special cases → Redesign, restyle or review of an existing page or app screen" 5단계 — (1) `inspect.mjs <url> --out .taste-skill/before` (2) 리뷰만이면 critique로 종료 (3) 스택·콘텐츠 유지, 마이그레이션 금지 (4) 타이포→색→프레임→상태→컴포넌트 (5) `.taste-skill/after` 전후 비교. → 구 `redesign-existing-projects` 통합 확인.
- inspect/scenes: Node 내장 http로 로컬 파일 제공, lib/cdp.mjs가 Chrome `--headless=new --remote-debugging-port=0` 임시 프로필 실행, Node 내장 WebSocket으로 CDP 제어, 결과 `.taste-skill/inspect/`. 종료 시 Chrome kill(Windows `taskkill /T /F`)·프로필 삭제. 의존성 설치 없이 동작.

### ui-ux-pro-max / impeccable 네트워크
- ui-ux-pro-max: 로컬 CSV/JSON 검색과 파일 쓰기(`--persist`)만. 네트워크 호출 없음. 테스트가 참조하는 `refresh-google-fonts.py`·`refresh-icon-catalog.py`는 폴더에 없음.
- impeccable: 런처가 첫 실행 시 GitHub releases에서 엔진 다운로드(sha256 검증). live-browser*.js는 localhost 통신. 엔진 바이너리 내부 동작은 미기재.

### ponytail
- 별도 리뷰 모드 미기재. 레벨: lite("Build what was asked. Name the smaller option in one line and let the user pick."), full(기본, 본문 규칙 전부), ultra("question the request… push back").
- 세션 상주형, "stop ponytail"/"normal mode"로 해제. 충돌 지점: caveman도 세션 상주형(같은 "normal mode"로 해제); "Trivial changes need none(test)" vs tdd/test-driven-development의 테스트 우선; ultra의 반박 vs impeccable "Finish the job"·design-taste-frontend "do not trade it for restraint"; "Never add a dependency" vs find-skills/agent-browser의 전역 설치; "skip features nobody asked for" vs design-taste-frontend의 필수 모션·"one live thing".
