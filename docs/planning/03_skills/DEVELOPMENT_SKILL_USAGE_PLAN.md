# DEVELOPMENT_SKILL_USAGE_PLAN — Agent Studio 개발 과정의 Phase별 스킬 사용 계획

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 요구사항 | REQ-DEV-01~05, 지시서 §6·§8(10개 필수 항목) |
| 관련 | SKILL_COMPATIBILITY_MATRIX(분류), SKILL_CONFLICT_RESOLUTION(잠정 주도), DEVELOPMENT_SKILL_ROUTING_POLICY(라우팅), PHASE_BREAKDOWN(Task) |
| 설치 범위 | Claude: 기존 `~/.claude/skills` 52개 유지(변경 없음). Codex: **주도 스킬 8종 폴더 전체 설치(U5; 구현 착수 시 C4 승인, P00 S7 전)** — 현재 `~/.codex/skills`에는 시스템 스킬 `.system/{imagegen,openai-docs,review-agent,skill-creator,skill-installer}` 5개만 존재. P00 S7에서 `skills/list` 실제 발견 목록을 기록 |

## 0. 모든 Phase 공통 (§8 10개 항목)

| 항목 | 공통 규칙 |
|---|---|
| 적용 스킬 후보 | ROUTING_POLICY §2 표 |
| 선택 이유 | Task 유형 매핑 + CONFLICT_RESOLUTION 주도 결정 |
| 사용 단계 | Task 시작 시 에이전트 자율 선택(U10; 사용자 명시 호출은 우선) → 앱이 선택 관찰·기대 스킬 대조 → 실행 → 증거 수집 → Verifier(미선택·오선택은 REWORK 명시 호출) |
| 담당 에이전트 | Claude: 전체 스킬(인식됨). Codex: Claude 전용 요소 없는 스킬만, 주도 8종 설치 후(U5) |
| 설치 범위 | 전역(Claude 기존), Codex는 주도 8종(C4 승인 후) |
| 호환성 확인 | Claude: 세션 스킬 목록·Skill 도구 호출 블록. Codex: `skills/list`(DISCOVERED) + skill 입력 수락(INJECTION_ACCEPTED 상한) |
| 중복·충돌 제거 | CONFLICT_RESOLUTION §2·§3. 같은 단계에 주도 1개 |
| 실행 증거 수집 | EVIDENCE_SPEC §3·§4 |
| 실패 대응 | ROUTING_POLICY §4(BLOCKED(skill_missing) / REWORK 1회 / 승인 차단) |
| 미적용 사유 | 프로젝트 무관(supabase 등), 보류(공급망), 사용자 전용(자동 선택 불가), 깨진 참조 |

## 1. Phase별 계획

| Phase | 주도 스킬 | 보조 | 담당 | 적용 Task | 미적용(사유) | 증거 |
|---|---|---|---|---|---|---|
| **P00 검증** | research(조사), prototype(스파이크), systematic-debugging(실패 분석) | codebase-design, verification-before-completion; **충돌 실험용 쌍**(S7: TDD 쌍·디버깅 쌍·리뷰 단일 패스·`using-superpowers` 노출 vs 트리거) | Claude(S2~S6·S8, S7 스킬 실험, S9 Claude 측), Codex(S1a/b/c, S7 스키마 diff — 스킬은 `.system` 발견 기록만, S9 Codex 측) | S1a/b/c·S2~S9 | grill-me·grill-with-docs·wayfinder·cavecrew(깨진 참조 — 실험에서 "동작 불가" 기록만), orchestration(런타임 없음) | 스파이크 보고서(`docs/spikes/S*.md`)에 스킬 호출 블록 인용, `docs/spikes/skill_conflict_experiments/` |
| **P01 골격** | writing-plans(Phase 계획), executing-plans(구현), test-driven-development | codebase-design(모듈 경계), ponytail(full), verification-before-completion, using-git-worktrees, finishing-a-development-branch | Codex 구현 / Claude 리뷰(code-review) | T1~T8 | tdd·diagnosing-bugs·code-review 요청측(비활성, 주도 결정) | 저널 `SkillSelected/LoadObserved`, PR 설명에 증거 링크 |
| **P10a 보안** | test-driven-development, codebase-design | systematic-debugging, ponytail, verification-before-completion | Claude 구현 / Codex 리뷰 | T1~T7 | git-guardrails-claude-code(앱 브로커·앱 실행기가 역할 대체 — 집행 보장은 SECURITY §2.1) | 동일 |
| **P02 Gateway** | executing-plans, test-driven-development, systematic-debugging | code-review(리뷰어), receiving-code-review(구현자), research(공식 문서 재확인) | T2 Codex / T3 Claude, 교차 리뷰 | T1~T6 | — | 동일 + 계약 테스트 로그 |
| **P04 큐** | executing-plans, test-driven-development | systematic-debugging, ponytail | Codex / Claude | T1~T6 | — | 동일 |
| **P03 Chat UI** | 단계별: T0 디자인 체계 = ui-ux-pro-max(1회, `--persist` 승인) → T1~T6 구현 = frontend-design(lead) + vercel-react-best-practices·vercel-composition-patterns(support ≤2) → 각 Task 테스트 단계 = test-driven-development(lead 교체) → 검증 = verification-before-completion | — | Claude / Codex 리뷰 | T0~T6 | impeccable(보류), design-taste-frontend(공개 페이지 아님), web-design-guidelines(사본 고정 전) | 동일 + 디자인 체계 산출물 |
| **P05 세션** | executing-plans, test-driven-development | systematic-debugging | Codex / Claude | T1~T5 | 사용자 호출 제안: `/handoff`(포맷 참고, 자동 라우팅 아님) | 동일 |
| **P08a Diff** | frontend-design, test-driven-development | vercel-react-best-practices | Claude / Codex | T1~T4 | — | 동일 |
| **P11a 패키징** | executing-plans, verification-before-completion | finishing-a-development-branch | Codex / Claude | T1~T4 | — | 동일 + 설치물 시험 로그 |
| **P06 Phase Mgr** | executing-plans, frontend-design, test-driven-development | writing-plans(제안 생성 로직 참고), codebase-design | Codex / Claude | T1~T5 | to-spec·to-tickets(사용자 전용; 사용자가 원하면 `/to-tickets`로 분해 참고) | 동일 |
| **P07 Skills Mgr** | writing-skills(앱 전용 스킬: 증거 기록·handoff 템플릿), executing-plans, test-driven-development | find-skills(탐색만), skill-creator(eval 필요 시) | Codex(T1·T2·T5·T6) / Claude(T3·T4·T7) | T1~T7 | caveman 계열(실험 Task만) | 동일 + 격리 시험 기록 |
| **P09 협업** | code-review(리뷰어), receiving-code-review(구현자), executing-plans | test-driven-development, dispatching-parallel-agents(Claude 전용, 독립 Task) | Claude / Codex | T1~T6 | subagent-driven-development(앱 오케스트레이터가 대체), implement-spec(사용자 전용·병렬 머지 위험). 사용자 호출 제안: `/handoff` | 동일 + 교차 리뷰 기록 |
| **P08b 편집기** | frontend-design, test-driven-development | web-design-guidelines(규칙 사본 고정 후 감사), vercel-react-best-practices | Claude / Codex | T1~T4 | — | 동일 |
| **P10b/P11b V1** | test-driven-development, verification-before-completion, finishing-a-development-branch | systematic-debugging, setup-pre-commit(저장소에 승인 후 1회) | 교차 | 전부 | — | 동일 |
| **P12/P08c/P11c V2** | executing-plans | agent-browser(CLI 설치 승인 후, 브라우저 테스트), design-taste-frontend(대시보드 다듬기), impeccable(격리 통과 시 후처리) | 교차 | 전부 | design-mobile-apps·vercel-react-native(모바일 아님), supabase 계열(SQLite) | 동일 |

표의 복수 스킬은 왼쪽→오른쪽이 단계 순서(계획→구현→테스트→검증)이며 한 단계에 lead는 하나다(ROUTING_POLICY §1 2번).

## 2. 에이전트별 가용 스킬

| 스킬 | Claude | Codex(호환본 설치 후) | 비고 |
|---|---|---|---|
| test-driven-development, systematic-debugging, verification-before-completion, writing-plans, executing-plans(스크립트는 bash → Windows 검증), ponytail, codebase-design, research, prototype, frontend-design, vercel-* , diagnosing-bugs, tdd, caveman, caveman-review | ✅ | ✅(형식 호환, 실측 P00) | 주도 후보 대부분 양측 가능 |
| code-review | ✅(병렬 서브에이전트) | ✅ 단일 패스 변형 | |
| brainstorming, requesting-code-review, subagent-driven-development, dispatching-parallel-agents, writing-skills, skill-creator, cavecrew | ✅ | ❌(서브에이전트·Claude 도구 전제) | Codex 세션에선 미라우팅 |
| handoff, to-spec, to-tickets, triage, implement-spec, wayfinder, grill-me, grill-with-docs, improve-codebase-architecture | 사용자 호출만 | `allow_implicit_invocation:false`로 동일 의도 | 자동 라우팅 제외 |
| git-guardrails-claude-code | Claude 단독 세션 선택 | ❌ | 앱 내부 비활성 |

## 3. Codex 측 설치 계획 (U5 — 구현 착수 시 C4 승인 후, P00 S7 전; 현재 미실행)

1. 대상: CONFLICT §2 8행의 주도 스킬 9개 중 Codex 미라우팅 `brainstorming`을 제외한 8개(writing-plans, executing-plans, test-driven-development, systematic-debugging, code-review, writing-skills, frontend-design, ui-ux-pro-max); 명단 확정·해시는 C4 승인 입력(V35). 양측 가능 보조 스킬(§2 1행)은 S7 결과 후 추가 검토.
2. 방식: 원본 사본(`D:\LLM\claude-skills\skills`)에서 `$CODEX_HOME/skills/<name>/`로 **스킬 폴더 전체**(SKILL.md + 참조 문서·스크립트·자산)를 그대로 복사해 먼저 `skills/list{forceReload}` 발견을 시험한다(`agents/openai.yaml`은 공식 문서상 선택 사항이므로 생략). 메타데이터가 필요할 때만 해당 버전 스키마(`interface.display_name` 등)를 검증한 호환본을 추가(원본 수정 아님, 별도 호환본으로 기록). 커밋·해시 기록.
3. 검증: `skills/list{forceReload}` 발견 확인 → skill 입력 주입 실측(`INJECTION_ACCEPTED`) → 고유 절차 관찰(`LOAD_OBSERVED`). P00 S7에서 Codex 측 3등급 각 1회 + 자동 선택 재현(U10)을 실측한다.
4. 금지: 플러그인/Skills CLI 재설치(이중 등록), 사용자 `~/.codex/config.toml` 수정.
