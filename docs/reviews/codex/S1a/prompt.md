# 리뷰 요청: P00 스파이크 S1a (Codex app-server 기본 왕복)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. 아래 산출물을 읽고 **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요.

## 읽을 것 (저장소 루트 기준)

1. 정본 계획: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` 의 "### Task S1a" 절과 `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` 의 AC-P00-2 행
2. 보고서: `docs/spikes/S1a.md`
3. 코드: `spikes/s1-codex-app-server/client.ts`, `spikes/s1-codex-app-server/audit.ts`, `spikes/s1-codex-app-server/s1a.test.ts`, `spikes/_shared/*.ts`
4. 녹화 픽스처(마스킹됨): `spikes/fixtures/codex-0.166.0/s1a-readOnly.jsonl`, `spikes/fixtures/codex-0.166.0/s1a-workspaceWrite.jsonl`
5. 설계 참조: `docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md` §3, `docs/planning/04_security_test/SECURITY_MODEL.md` §2.1

## 리뷰 관점

A. **pass/fail 판정의 타당성** — 보고서 §1 각 행의 판정이 코드의 단언·픽스처 내용으로 뒷받침되는가. 단언이 계획(MASTER S1a Step 1 (a)(b)(c))보다 약하거나 누락된 것이 있는가.
B. **단언 누락·오류** — 테스트가 통과했지만 실제로는 아무것도 증명하지 않는 부분(예: 조건부 분기로 빠져나가는 단언, 관찰값만 기록하고 끝나는 부분이 계획상 "필수 단언"이어야 하는 경우).
C. **보안 우회·관찰 누락** — 승인 없이 발생한 효과를 감사가 놓칠 수 있는 경로(예: `git status`가 못 보는 변경, 작업 트리 밖 쓰기, 명령 실행 부수 효과), 클라이언트가 서버 요청을 잘못 응답하거나 놓치는 경로.
D. **프로토콜 해석** — 보고서 §3의 프레이밍·승인 요청 3종 응답 구조·tokenUsage 의미 해석이 픽스처와 일치하는가. P02 CodexAppServerAdapter 초안 인터페이스로서 `client.ts`에 빠진 것.
E. **픽스처 마스킹** — 픽스처에 남아 있는 민감 정보(홈 경로·사용자명·호스트명·id)가 있는가.

## 출력 형식

마크다운. 발견 사항은 표 1개: `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행 또는 보고서 §) | 문제 | 제안 |`. 마지막에 "판정: 수용 / 수정 후 수용 / 거부" 한 줄과 그 이유 2~3문장. 추측은 "추정"이라고 표시하고, 픽스처·코드에서 확인한 것과 구분해 주세요.
