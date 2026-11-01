# PLANNING_SKILL_LOG — 계획 수립 과정의 스킬 사용 증거

> 이 로그는 §8 Skill Execution Evidence 규칙을 계획 수립 작업 자체에 먼저 적용한 기록이다.
> "호출됨"은 Skill 도구가 SKILL.md를 로드했음을, "적용됨"은 그 지시에 따라 산출물이 만들어졌음을 뜻한다. 프롬프트에 이름만 적은 것은 기록하지 않는다.

| # | 시각(UTC) | STEP | 스킬 | SKILL.md 경로 | 저장소@커밋 | 호출 결과 | 적용 산출물 | 비고 |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-01 11:33 | 1 | to-spec | ~/.claude/skills/to-spec/SKILL.md | mattpocock/skills@4ae2317 | **호출 거부** — frontmatter `disable-model-invocation`로 모델 호출 금지, 사용자 `/to-spec` 전용 | 없음 | 요구사항 정규화는 스킬 워크플로를 모사하지 않고 일반 문서 작성으로 수행. 매트릭스에 "사용자 전용 호출" 속성 추가 필요 |
| 2 | 2026-11-01 11:33 | 3 | research | ~/.claude/skills/research/SKILL.md | mattpocock/skills@4ae2317 | 호출됨 | 지시대로 새 컨텍스트의 백그라운드 에이전트 2개에 1차 출처 조사 위임 → `evidence/research/RESEARCH_AGENT_GATEWAY.md`, `RESEARCH_DESKTOP_STACK.md` | 스킬 본문: "Spin up a background agent… primary sources… single Markdown file… where the repo keeps such notes" |
| 3 | 2026-11-01 12:05 | 3 | codebase-design | ~/.claude/skills/codebase-design/SKILL.md | mattpocock/skills@4ae2317 | 호출됨 | `CLAUDE_INITIAL_PROPOSAL.md` §4 AgentGateway를 모듈/인터페이스/심/어댑터 어휘로 설계(작은 인터페이스 8개 메서드, 어댑터 2개 = 실재 심) | DESIGN-IT-TWICE(병렬 서브에이전트 3개)는 비용상 미실행 |
| 4 | 2026-11-01 12:35 | 8 | writing-plans | ~/.claude/skills/writing-plans/SKILL.md | obra/superpowers@2ce8aa1 | 호출됨 | `MASTER_IMPLEMENTATION_PLAN.md` — 헤더(Goal/Architecture/Tech Stack/Spec), Global Constraints, Review Focus 5개, Phase 00 Task 8개를 Files/Interfaces/Step(실패 테스트→구현→통과→커밋) 형식으로 작성, Self-Review 5항목 수행 | 저장 위치는 스킬 기본값(`docs/superpowers/plans/`) 대신 프로젝트 구조(`docs/planning/05_plan/`) 적용. Execution Handoff 질문은 PLAN ONLY라 생략 |

## 미호출·호출 불가 기록

| 스킬 | 사유 |
|---|---|
| grill-me, brainstorming | 사용자에게 질문하고 답을 기다리는 구조. 사용자 부재 자율 실행이라 완전 실행 불가. 실행 검증 상태 부여 안 함 |
| to-spec | 위 #1 |
