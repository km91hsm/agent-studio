# SKILL_COMPATIBILITY_MATRIX — 40개 후보(superpowers 하위 15개 포함) 검증 매트릭스

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 기준일 | 2026-11-01 |
| 근거(설치본 해시·정독 기록) | `archive/evidence/SKILL_INVENTORY.md`(해시·설치·인식), `archive/evidence/skill_analysis_part1.md`·`part2.md`(SKILL.md 정독), `archive/evidence/ENVIRONMENT_SURVEY.md`(frontmatter 집계) |
| 상태 정의 | **설치됨**: `~/.claude/skills`에 존재, 원본 사본과 해시 일치 · **인식됨**: Claude Code 세션 스킬 목록 노출 · **실행 검증됨**: Skill 도구 호출 후 산출물 확인 · **Codex 호환**: 형식 검토만(주도 8종 설치는 구현 착수 시 — U5) |
| UNVERIFIED | Codex 측 실제 로딩(전부), Windows에서 jq 의존 hook 동작 |

분류(7종): **공통** 공통 설치 후보 / **프로젝트** 프로젝트별 설치 후보 / **조건부** 조건부 사용 / **통합** 기존 스킬에 기능 통합 / **중복제외** 중복으로 제외 / **미확인** 호환성 미확인 / **보류** 보안 또는 유지보수 문제로 보류

## A. superpowers (obra/superpowers@2ce8aa1, `skills/<name>/SKILL.md`) — 15개

| 스킬 | Claude 설치/인식/실행 | Codex 호환(형식) | 외부 의존성 | Hook·스크립트 위험 | 중복 상대 | 깨진 참조 | 모델 호출 | 분류(잠정) |
|---|---|---|---|---|---|---|---|---|
| using-superpowers | ✅/✅/미 | 부분 — 본문이 Skill 도구·plan mode·CLAUDE.md 전제. `references/codex-tools.md` 동봉 | 없음 | 없음 | mattpocock 자동 트리거 전체(노출 시 경쟁) | 없음 | 허용 | **조건부** — Phase 00 경쟁 재현 후 결정. 에이전트 자율 선택 기본(U10)이므로 노출 대상 — Router는 노출 여부만 판정 |
| brainstorming | ✅/✅/미 | 부분 — 서브에이전트(builder check), 로컬 HTTP+WS 서버 스크립트 | node, 브라우저, git | `server.cjs`가 127.0.0.1 서버 기동·파일 쓰기·외부 로고 이미지(primeradiant.com) 삽입 | grill-me/grill-with-docs | 없음 | 허용 | **공통(요구사항 단계)** — 시각 서버는 비활성(텔레메트리 env 설정) |
| writing-plans | ✅/✅/미 | 양호(프롬프트 지시만) | git, 테스트 러너 | 없음 | wayfinder/to-spec/to-tickets | 없음 | 허용 | **공통(계획 단계)** |
| executing-plans | ✅/✅/미 | 부분 — 서브에이전트 리뷰어, todo | git, bash | `task-start/task-done` 스크립트: 테스트 실행·`progress.md` 쓰기 | implement-spec | 없음 | 허용 | **공통(구현 단계, 인라인)** |
| subagent-driven-development | ✅/✅/미 | 낮음 — Claude 서브에이전트 모델 지정 전제 | git, bash | `sdd-workspace`가 `.superpowers/sdd/` 생성·`.gitignore` 쓰기, `rm -rf` 지시 | implement-spec, cavecrew, orchestration | 없음 | 허용 | **조건부(Claude 전용, 구현 단계)** |
| dispatching-parallel-agents | ✅/✅/미 | 낮음 — Claude 서브에이전트 전제 | 테스트 러너 | 없음 | cavecrew | 없음 | 허용 | **조건부(Claude 전용)** |
| test-driven-development | ✅/✅/미 | 양호 | 테스트 러너 | 없음 | tdd | 없음 | 허용 | **공통(TDD) — 주도 후보 A** |
| systematic-debugging | ✅/✅/미 | 양호 | git | `find-polluter.sh`(npm test 반복 실행) | diagnosing-bugs | 없음 | 허용 | **공통(디버깅) — 주도 후보 A** |
| requesting-code-review | ✅/✅/미 | 낮음 — 서브에이전트 전제 | git | 없음 | code-review, caveman-review | 없음 | 허용 | **조건부(Claude 전용 리뷰 요청)** — Agent Studio에서는 교차 에이전트 리뷰가 대체 |
| receiving-code-review | ✅/✅/미 | 양호 | gh | 없음 | 없음 | 없음 | 허용 | **공통(리뷰 수신 태도)** |
| verification-before-completion | ✅/✅/미 | 양호 | 테스트·빌드 | 없음 | 없음 | 없음 | 허용 | **공통(완료 전 검증) — 필수** |
| using-git-worktrees | ✅/✅/미 | 부분 — `EnterWorktree` 네이티브 도구 언급, fallback은 git | git, 패키지 매니저 | `.gitignore` 수정·커밋, 의존성 설치 실행 | 없음 | 없음 | 허용 | **공통(브랜치 격리)** — 의존성 설치는 승인 대상 |
| finishing-a-development-branch | ✅/✅/미 | 양호 | git, gh | 사용자 선택 시 push/merge/branch -D | 없음 | 없음 | 허용 | **공통(완료 처리)** — push/merge는 **원격 Git 전용 앱 실행기**로만(브로커는 승인 요청이 발생한 효과만 판정; 셸 우회는 사후 감사 탐지) |
| writing-skills | ✅/✅/미 | 부분 — 서브에이전트 압력 테스트 | node, graphviz, git | `render-graphs.js`(dot→svg), "push to your fork" | skill-creator | 없음 | 허용 | **조건부(스킬 제작)** |
| diagnosing-superpowers | ✅/✅/미 | 부분 | gh, curl, 네트워크 | `~/.superpowers/…`에 파일, 이슈 생성(승인 후) | 없음 | 없음 | 허용 | **조건부(superpowers 문제 진단 시만)** |

## B. mattpocock/skills@4ae2317 — 17개 (`agents/openai.yaml` 전부 포함 → Codex 형식 겸용)

| 스킬 | 저장소 경로 | Claude 설치/인식/실행 | Codex 호환(형식) | 외부 의존성 | Hook·스크립트 위험 | 중복 상대 | 깨진 참조 | 모델 호출 | 분류(잠정) |
|---|---|---|---|---|---|---|---|---|---|
| grill-me | productivity/grill-me | ✅/✅/거부 | 형식 OK, 본문은 Skill 도구로 `grilling` 호출 | 없음 | 없음 | brainstorming | **grilling 미설치 → 동작 불가** | 사용자 전용 | **보류(깨진 참조)** |
| handoff | productivity/handoff | ✅/✅/미 | 형식 OK | 없음 | 임시 디렉터리 파일 쓰기 | 없음 | 없음 | 사용자 전용 | **공통(세션 전달, 사용자 호출)** |
| grill-with-docs | engineering/grill-with-docs | ✅/✅/미 | 형식 OK | 없음 | 없음 | brainstorming | **grilling, domain-modeling 미설치** | 사용자 전용 | **보류(깨진 참조)** |
| to-spec | engineering/to-spec | ✅/✅/거부(계획 중) | 형식 OK | 이슈 트래커 | 트래커 게시·라벨 | writing-plans | setup-matt-pocock-skills 미설치 | 사용자 전용 | **조건부(트래커 사용 프로젝트, 사용자 호출)** |
| research | engineering/research | ✅/✅/실행 관찰됨 | 형식 OK, 백그라운드 서브에이전트 전제 | 네트워크 | 레포 파일 쓰기 | find-skills(탐색 한정) | 없음 | 허용 | **공통(기술 조사)** |
| triage | engineering/triage | ✅/✅/미 | 형식 OK | 트래커, git | 이슈 닫기·댓글 | 없음 | grilling, domain-modeling, setup-… 미설치 | 사용자 전용 | **조건부(트래커 운영 시)** |
| prototype | engineering/prototype | ✅/✅/미 | 형식 OK | 브라우저, 러너, git | 일회용 브랜치 커밋 | 없음 | 없음 | 허용 | **공통(프로토타입)** |
| codebase-design | engineering/codebase-design | ✅/✅/실행 관찰됨 | 형식 OK, DESIGN-IT-TWICE는 서브에이전트 | 없음 | 없음 | 없음 | 없음 | 허용 | **공통(아키텍처·명세)** |
| improve-codebase-architecture | engineering/improve-codebase-architecture | ✅/✅/미 | 형식 OK | git log, 브라우저, CDN(Tailwind·Mermaid) | 임시 HTML, ADR/GLOSSARY 쓰기, 외부 CDN 로드 | codebase-design | grilling, domain-modeling 미설치 | 사용자 전용 | **조건부(기존 코드베이스 개선, V1 이후)** |
| diagnosing-bugs | engineering/diagnosing-bugs | ✅/✅/미 | 형식 OK | curl, Playwright 등 선택 | `hitl-loop.template.sh`(안전) | systematic-debugging | 없음 | 허용 | **공통(디버깅) — 주도 후보 B** |
| code-review | engineering/code-review | ✅/✅/미 | 부분 — 병렬 서브에이전트 2개 전제 | git, 트래커 | 없음 | requesting-code-review, caveman-review | setup-… 미설치 | 허용 | **공통(코드 리뷰) — 주도 후보 B** |
| implement-spec | engineering/implement-spec | ✅/✅/미 | 낮음 — 백그라운드 구현자·merger 서브에이전트 | git worktree·merge, 트래커, PR | 통합 브랜치 reset, draft PR 생성 | executing-plans/SDD | tdd·code-review(설치됨), setup-… 미설치 | 사용자 전용 | **조건부(병렬 구현 실험)** |
| wayfinder | engineering/wayfinder | ✅/✅/미 | 형식 OK | 트래커, git push | `research/<name>` 브랜치 push | writing-plans | grilling, domain-modeling, setup-… 미설치 | 사용자 전용 | **보류(깨진 참조 + push)** |
| to-tickets | engineering/to-tickets | ✅/✅/미 | 형식 OK | 트래커 또는 로컬 | `.scratch/` 쓰기 | writing-plans | setup-… 미설치 | 사용자 전용 | **조건부(티켓 분해, 사용자 호출)** |
| tdd | engineering/tdd | ✅/✅/미 | 형식 OK(Skill 도구 참조 1건) | 없음 | 없음 | test-driven-development | 없음 | 허용 | **공통(TDD) — 주도 후보 B** |
| git-guardrails-claude-code | misc/git-guardrails-claude-code | ✅/✅/미 | **비호환(Claude Code hook 전용)** | bash, **jq**, grep | `settings.json` 수정 + PreToolUse hook 설치. Windows jq 부재 가능 | Agent Studio ApprovalBroker·앱 실행기와 **역할** 중복(hook의 사전 차단 기능은 모드별 보장이 다름 — SECURITY §2.1) | 없음 | 허용 | **조건부(Claude 단독 개발 세션용) — Agent Studio 내부에서는 브로커·앱 실행기가 역할 대체(집행 보장은 SECURITY_MODEL §2.1)** |
| setup-pre-commit | misc/setup-pre-commit | ✅/✅/미 | 형식 OK | npm/npx, 레지스트리 | devDependencies 설치·package.json 수정·자동 커밋 | 없음 | 없음 | 허용 | **프로젝트(Node 프로젝트, 승인 후)** |

## C. 기타 저장소 — 20개

| 스킬 | 저장소@커밋 / 경로 | Claude 설치/인식/실행 | Codex 호환(형식) | 외부 의존성 | Hook·스크립트 위험 | 중복 상대 | 깨진 참조 | 모델 호출 | 분류(잠정) |
|---|---|---|---|---|---|---|---|---|---|
| ponytail | DietrichGebert/ponytail@96608e0 / skills/ponytail | ✅/✅/미 | 양호(지시만) | 없음 | 없음 | caveman(세션 상주 충돌), tdd(테스트 생략 문구) | 없음 | 허용 | **공통(구현 원칙, full 레벨)** — tdd와 충돌 시 TDD 우선 명시 |
| find-skills | vercel-labs/skills@92a9a34 / skills/find-skills | ✅/✅/미 | 양호 | npx, 네트워크 | `npx skills add -g -y` 전역 설치(확인 생략) | research | 없음 | 허용 | **조건부(탐색만, 설치 명령은 승인 필수)** |
| frontend-design | anthropics/skills@ca45fc4 / skills/frontend-design | ✅/✅/미 | 양호 | 없음 | 없음 | impeccable, design-taste-frontend, ui-ux-pro-max | 없음 | 허용 | **공통(UI 구현 지침) — UI 주도 후보** |
| skill-creator | anthropics/skills@ca45fc4 / skills/skill-creator | ✅/✅/미 | 낮음 — `claude -p` 서브프로세스, `.claude/commands/` | python3, `claude` CLI, 브라우저, 로컬 서버 | `_kill_port` SIGTERM, Google Fonts 로드 | writing-skills | 없음 | 허용 | **조건부(스킬 제작·eval, Claude 환경)** |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill@3a13158 / .claude/skills/ui-ux-pro-max | ✅/✅/미 | 부분 — 경로가 `${CLAUDE_PLUGIN_ROOT}` 전제 | python3(외부 패키지 없음) | 로컬 검색만, `--persist` 파일 쓰기, 네트워크 없음 | frontend-design 등 | refresh-*.py 부재(테스트만 참조) | 허용 | **프로젝트(디자인 체계 수립 시)** |
| impeccable | pbakaus/impeccable@4f95649 / .claude/skills/impeccable | ✅/✅/미 | 형식 OK(원본이 다중 에이전트용; `.codex/hooks.json` 설치법 포함) | **엔진 바이너리 다운로드**(GitHub releases, sha256), curl/wget, localhost 서버 | hooks 설치 시 다중 에이전트 설정 파일 쓰기, hook "unsandboxed" 명시 | frontend-design, design-taste-frontend | 없음 | 허용 | **보류(공급망: 바이너리 다운로드·hook) → 격리 시험 후 프로젝트 사용** |
| vercel-react-best-practices | vercel-labs/agent-skills@1a2c79d / skills/react-best-practices | ✅/✅/미 | 양호(AGENTS.md 컴파일본 포함) | 없음 | 없음 | 없음 | 없음 | 허용 | **프로젝트(React 채택 시 → Agent Studio 해당)** |
| web-design-guidelines | vercel-labs/agent-skills@1a2c79d / skills/web-design-guidelines | ✅/✅/미 | 부분 — WebFetch 도구명 | 네트워크(매번 raw.githubusercontent 규칙 fetch) | **원격 지시를 그대로 따름(원격 지시 신뢰)** | impeccable 감사 기능 | 없음 | 허용 | **보류(원격 지시 신뢰) → 규칙 사본 고정 후 조건부** |
| vercel-composition-patterns | vercel-labs/agent-skills@1a2c79d / skills/composition-patterns | ✅/✅/미 | 양호 | 없음 | 없음 | 없음 | 없음 | 허용 | **프로젝트(React)** |
| design-mobile-apps | designed-by-ai/skills@03c20ae / skills/design-mobile-apps | ✅/✅/미 | 형식 OK(`source: codex` 지원 명시) | **Sleek 유료 API**, `SLEEK_API_KEY`, 네트워크 | 사용자 brief·이미지 외부 전송, DELETE 엔드포인트 | 없음 | 없음 | 허용 | **보류(외부 서비스·데이터 전송; 모바일 범위 밖) — Agent Studio에 해당 없음** |
| vercel-react-native-skills | vercel-labs/agent-skills@1a2c79d / skills/react-native-skills | ✅/✅/미 | 양호 | 없음 | 없음 | 없음 | 없음 | 허용 | **프로젝트(RN 프로젝트) — Agent Studio 해당 없음** |
| design-taste-frontend | leonxlnx/taste-skill@12af471 / skills/taste-skill (name≠폴더) | ✅/✅/미 | 양호(Claude 전용 요소 거의 없음) | Node 22+, Chrome/Edge(headless CDP), 네트워크(오픈 컬렉션 이미지) | Chrome `taskkill /F`, 임시 프로필 삭제, 외부 이미지 다운로드 | frontend-design, impeccable | SKILL.md가 말하는 scenes.json·demo 부재 | 허용 | **조건부(공개 웹 페이지·대시보드 UI 다듬기; redesign 경로 = 구 redesign-existing-projects)** |
| agent-browser | vercel-labs/agent-browser@5868f7c / skills/agent-browser | ✅/✅/미 | 형식 OK(`hidden: true`, `allowed-tools: Bash(agent-browser:*)`) | **agent-browser CLI 전역 npm 설치**, Chrome | 전역 설치, 내장 도구 대체 지시, Slack 전송 기능 | 없음 | 없음 | 허용 | **조건부(브라우저 테스트, CLI 설치 승인 후) — V2 미리보기·자동화** |
| supabase | supabase/agent-skills@c9be0e9 / skills/supabase | ✅/✅/미 | 부분 — MCP 도구명·`.mcp.json` | Supabase CLI/MCP, 네트워크 | `.mcp.json` 생성, GitHub 이슈 생성(허가 후) | 없음 | 없음 | 허용 | **프로젝트(Supabase 프로젝트) — Agent Studio 해당 없음** |
| supabase-postgres-best-practices | supabase/agent-skills@c9be0e9 / skills/supabase-postgres-best-practices | ✅/✅/미 | 양호 | 없음 | 없음 | 없음 | 없음 | 허용 | **프로젝트(PostgreSQL) — Agent Studio는 SQLite라 해당 없음** |
| orchestration | stablyai/orca@4e2fcfe9 / skills/orchestration | ✅/✅/미 | 형식 OK | **Orca 런타임·`orca` CLI**(미설치) | 권한 상승 재실행 지시 | Agent Studio Orchestrator 자체와 중복, cavecrew | orca-cli 스킬 미설치 | 허용 | **보류(런타임 부재·기능 중복) → 격리 시험만** |
| caveman | JuliusBrussee/caveman@9b68f7e / skills/caveman | ✅/✅/미 | 양호 | 없음 | 없음 | ponytail(세션 상주) | ultracave/megacave 미설치(선택) | 허용 | **조건부(컨텍스트 절약 실험)** |
| caveman-compress | JuliusBrussee/caveman@9b68f7e / skills/caveman-compress | ✅/✅/미 | 부분 — `claude --print` 기본 공급자 | python 3.10+, `claude` CLI 또는 API 키 | **원본 파일 덮어씀**, 파일 전문 외부 모델 전송 | 없음 | 없음 | 허용(명시 호출 전제) | **보류(파일 덮어쓰기·외부 전송) → 백업 확인 후 조건부** |
| caveman-review | JuliusBrussee/caveman@9b68f7e / skills/caveman-review | ✅/✅/미 | 양호 | 없음 | 없음 | code-review, requesting-code-review | 없음 | 허용 | **조건부(리뷰 출력 압축 실험)** |
| cavecrew | JuliusBrussee/caveman@9b68f7e / skills/cavecrew | ✅/✅/미 | 낮음 — Claude 서브에이전트·플러그인 전제 | 없음 | 에이전트 model 덮어쓰기(환경변수) | SDD, dispatching-parallel-agents | **cavecrew-* 에이전트 정의 미설치** | 허용 | **보류(깨진 참조)** |

## D. 원저자 폐기·통합·묶음 — 3행

| 후보 | 상태 | 사유 | 분류(잠정) | 처리 |
|---|---|---|---|---|
| superpowers(묶음, 지시서 40개 후보 중 1개) | obra/superpowers@2ce8aa1 — 하위 15개를 §A에서 개별 평가 | 묶음 자체는 설치 단위가 아님 | **통합**(하위 15행으로 펼쳐 평가; 독립 설치·라우팅 대상 아님) | 55번째 검토 단위. 플러그인 재설치 금지 |
| resolving-merge-conflicts | mattpocock/skills에서 삭제(CHANGELOG #1120), 대체 없음 | 원저자 판단 | **중복제외**(폐기) | 다른 저장소 동명 스킬로 대체하지 않음. Merge conflict는 에이전트 기본 능력 + 테스트·빌드 재검증 + Git 충돌 시 `WAITING_APPROVAL` |
| redesign-existing-projects | taste-skill 2.1.1부터 design-taste-frontend에 통합 | 원저자 판단 | **통합** | design-taste-frontend "Redesign, restyle or review of an existing page" 5단계 경로 사용 |

## E. 집계 (행별 "분류(잠정)" 열의 최종 분류 1개씩 — 중복 없음, 합 55 = 52 설치본 + 폐기·통합 2 + 묶음 1)

| 분류 | 개수 | 스킬 |
|---|---|---|
| 공통 | 18 | brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, receiving-code-review, verification-before-completion, using-git-worktrees, finishing-a-development-branch, handoff, research, prototype, codebase-design, diagnosing-bugs, code-review, tdd, ponytail, frontend-design |
| 프로젝트 | 7 | setup-pre-commit, ui-ux-pro-max, vercel-react-best-practices, vercel-composition-patterns, vercel-react-native-skills, supabase, supabase-postgres-best-practices |
| 조건부 | 18 | using-superpowers, subagent-driven-development, dispatching-parallel-agents, requesting-code-review, writing-skills, diagnosing-superpowers, to-spec, triage, improve-codebase-architecture, implement-spec, to-tickets, git-guardrails-claude-code, find-skills, skill-creator, design-taste-frontend, agent-browser, caveman, caveman-review |
| 통합 | 2 | redesign-existing-projects → design-taste-frontend, superpowers(묶음 → 하위 15행) |
| 중복제외 | 1 | resolving-merge-conflicts(원저자 폐기) |
| 미확인 | 0 | (Codex 측 실제 로딩은 별도 상태 열 "Codex 호환(형식)"으로 관리, 분류 아님) |
| 보류 | 9 | grill-me, grill-with-docs, wayfinder, cavecrew(깨진 참조) / impeccable, web-design-guidelines, caveman-compress, design-mobile-apps, orchestration(공급망·외부 전송·런타임) |
| **합계** | **55** | |

분류는 55행을 기준으로 집계한다. 공급자별 실행 검증 상태는 P00 S7 결과로 갱신하고, 분류 집계는 P07 Registry에서 행 기준으로 생성한다.

## F. 공급망 검토 요약 (§11.4)

| 위험 유형 | 해당 스킬 | 조치 |
|---|---|---|
| 바이너리 다운로드·실행 | impeccable(엔진), agent-browser(npm 전역 CLI) | 격리 시험, 해시 고정, 승인 후 설치 |
| 원격 지시 신뢰 | web-design-guidelines | 규칙 파일 사본을 커밋 고정하고 fetch 금지 |
| 외부 서비스 전송 | design-mobile-apps(Sleek), caveman-compress(모델 공급자), diagnosing-superpowers(GitHub 이슈) | 기본 비활성, 사용 시 승인 |
| 설정 파일 쓰기(hook) | git-guardrails-claude-code(`settings.json`), impeccable(hooks) | Agent Studio 내부에서는 비활성. 브로커·앱 실행기가 hook의 **역할**을 대신하되, 사전 차단 **보장**은 엄격 모드 조건부 ENFORCED·그 외 DETECTED/POLICY_ONLY(SECURITY §2.1) — hook과 동등하다고 주장하지 않음 |
| 로컬 서버·프로세스 종료 | brainstorming(server.cjs), skill-creator(`_kill_port`), design-taste-frontend(taskkill) | 허용하되 로그 기록 |
| 전역 설치·의존성 설치 | find-skills(`-g -y`), setup-pre-commit, using-git-worktrees | 승인 필수 |
| 파일 덮어쓰기 | caveman-compress | 백업 경로 확인 후 조건부 |

## G. 업데이트 보류 (U4)

설치본은 매트릭스 기준 커밋에 고정한다. 업데이트는 변경 내용 검토와 사용자 승인 후에만 적용한다.
