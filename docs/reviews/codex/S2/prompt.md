# 리뷰 요청: P00 스파이크 S2 (Claude Agent SDK 0.3.316 — canUseTool / PreToolUse / permissionMode / interrupt / sessions / MCP / 인증)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요.

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S2" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-3
2. 보고서: `docs/spikes/S2.md`
3. 코드: `spikes/s2-claude-sdk/run.ts`, `spikes/s2-claude-sdk/s2.test.ts`
4. 관찰값: `spikes/fixtures/claude-2.1.316/s2-results.json`
5. 녹화 픽스처(마스킹됨): `spikes/fixtures/claude-2.1.316/s2-{deny,plan,accept-edits,interrupt,sessions,mcp-strict,mcp-default,auth}.jsonl`
6. 설계 참조: `docs/planning/04_security_test/SECURITY_MODEL.md` §2.1 "Claude native Windows" 열, `docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md` §1 이벤트표·§3·§5, `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` V13·V16·V18, `docs/planning/00_product/PRODUCT_REQUIREMENTS.md` REQ-CAP-01·02
7. SDK 타입(필요 시): `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`

## 리뷰 관점

A. 보고서 §1 판정 10행이 테스트 단언·관찰값·픽스처로 뒷받침되는가. "기록" 항목의 단언이 너무 약한 곳.
B. plan 모드 실측(§2 첫 항목: ExitPlanMode allow 시 plan 이탈, plan 파일 Write가 canUseTool 미경유)의 해석이 픽스처와 일치하는가. 이를 근거로 한 SECURITY §2.1 Claude 열 수정 제안이 타당한가. 테스트 (b)를 "ExitPlanMode deny" 조건부로 좁힌 것이 MASTER 의도를 훼손하는가.
C. PreToolUse "모든 도구 호출 관찰" 단언(tool_use_id 집합 일치)이 충분한가 — 서브에이전트·MCP 도구·거부된 도구까지 포함한다고 일반화할 수 있는가.
D. acceptEdits 우회 목록·interrupt 결과(`error_during_execution`)·forkSession·listSessions·MCP strict 결론에서 1회 관찰로 "해소"라 부를 수 없는 것.
E. `run.ts` 구조 위험: streaming input push 큐, 결과 대기, close() 타임아웃 후 강제 종료, canUseTool 미등록 시 기본 deny, `detectClaudeExecutable` 경로 탐지.
F. 환경 불변·민감 정보: 스파이크가 `~/.claude/projects/`·`~/.claude/plans/`에 남기는 부산물 처리, 픽스처·보고서의 사용자명·호스트명·홈 경로·토큰·session id.

## 출력 형식

마크다운. 발견 사항 표 `| # | 심각도(Critical/High/Medium/Low) | 위치 | 문제 | 제안 |`. 마지막에 "판정: 수용 / 수정 후 수용 / 거부" 한 줄 + 이유 2~3문장. 추측은 "추정"으로 표시.
