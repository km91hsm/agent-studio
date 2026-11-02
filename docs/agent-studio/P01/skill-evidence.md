# P01 스킬 증거 (수동 프로토콜, AC-P10a-6 선행)

P01 은 에이전트 run 없이 Claude 세션(구현자)이 직접 구현했고 Codex 는 `codex exec -s read-only` 리뷰어로만 참여했다. 따라서
- **저널 seq**: 해당 없음(수동 프로토콜, AC-P10a-6 — P07 이전에는 사람이 호출 블록을 인용해 증거를 남긴다).
- **Codex 측 `skills/list`·explicit 주입 로그**: 해당 없음(P01 에 Codex run 이 없다. Codex 리뷰 호출은 스킬 주입 없이 프롬프트만 전달).
- **호출 블록**: Claude Code 세션 전사(`~/.claude/projects/D--LLM/12103321-73f5-45bc-9381-c9526685abf9.jsonl`, 로컬 비공개)에 기록된 `Skill` 도구 호출을 인용한다. 같은 스킬은 세션에서 1회만 호출되고 이후 Task 들은 그 지침을 유지한다(재호출 금지 규칙).

| Task | 주도 스킬 | 호출 블록(인용) | 산출물 경로 | 저널 seq | 리뷰어 판정 |
|---|---|---|---|---|---|
| 계획(P01.md) | writing-plans | `{"skill":"writing-plans","args":"P01 — Shell·데몬 골격 + 상태·승인 계약 (PHASE_BREAKDOWN P01 T1~T12, AC-P01-1~7). 실행 방식 executing-plans(인라인, TDD), Codex 리뷰. 산출: docs/plans/P01.md"}` | `docs/plans/P01.md`(13 Task) | 해당 없음(수동 프로토콜, AC-P10a-6) | Codex 계획 검토 `docs/reviews/codex/P01_PLAN/response.md` "판정: 수정 후 수용"(17건, 계획 끝 반영표) |
| Task 1~12 실행 틀 | executing-plans | `{"skill":"executing-plans"}` — ledger `.superpowers/sdd/P01/progress.md`(git-ignored), Task 마다 `task-start`/`task-done` 절차 | 커밋 6d90839 … e2aba9d | 해당 없음 | 미판정(리뷰어는 코드·테스트만 봄) |
| Task 1~12 각 Task | test-driven-development | `{"skill":"test-driven-development"}` — 모든 Task 가 실패 테스트 → RED 확인 → 구현 → GREEN → lint → 전체 스위트 순서(ledger 의 `tests:` 열) | 각 Task 의 `*.test.ts` + 커밋 | 해당 없음 | 리뷰 A·B 응답이 테스트 파일을 인용해 검토("E4 테스트 … `rpc.test.ts:166`", B#11) — 테스트 선행 자체는 미판정 |
| 리뷰 A·B·C 반영 | receiving-code-review | `{"skill":"receiving-code-review"}` — 각 지적을 정본 문서·코드와 대조해 수용/보류 판단 후 RED→GREEN 반영 | `bff7f5e`(A 12/13), `e16e39f`(B 8/13), `42bbf2d`(C 5/8) | 해당 없음 | 리뷰 B 의 "리뷰 A 재검증표"(닫힘 6·부분 6), 리뷰 C 의 "리뷰 B 재검증표"(보고서 §4) |
| Task 13 완료 주장 | verification-before-completion | `{"skill":"verification-before-completion"}` — 완료 선언 전 `npm run lint && npm run shell:build && npm test` + LIVE 재실행 결과를 보고서 §6 에 그대로 인용 | `docs/phases/P01.md` §6 | 해당 없음 | 최종 whole-branch 리뷰(보고서 §4) |

P00 에서 호출된 `research`·`prototype` 은 P00 Task 전용이라 P01 표에 넣지 않는다. UI 단계(Task 10·11)는 P01 범위가 "골격"이라 `frontend-design` 류 보조 스킬을 호출하지 않았다(보고서 §7 한계).
