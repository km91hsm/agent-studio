# 충돌 실험 4 — 횡단: `using-superpowers` 노출 vs mattpocock 자동 트리거 (자동 선택 재현, U10·V34)

| 메타 | 값 |
|---|---|
| 정본 | SKILL_CONFLICT_RESOLUTION §3 1행("Fix this bug"·"Plan this feature" 류 프롬프트로 어느 스킬이 선택되는지 양 에이전트 각 1회 → §4 0번), ROUTING_POLICY §2 기대 주도 스킬(디버깅→systematic-debugging, TDD→test-driven-development, 계획→writing-plans), EVIDENCE_SPEC §3 Codex 행(V34) |
| 실행 | LIVE 1차 2026-11-02 05:30 KST + 2차 05:45 KST (e) — 같은 프롬프트 2회 표본 |
| 프롬프트 | fix = `SUM_BUG`(스킬 이름 없음, "Bug: … must return 6 … Finish with a one-line report."), plan = `PLAN_FEATURE`("Plan this feature (planning only …): add a `--json` flag … Write the plan as a markdown file inside this repository …") |
| 선택 판정 | Claude = Skill 도구 호출 블록(`skillCalls`); Codex = `skills/list`에 있는 스킬의 `SKILL.md`를 읽는 commandExecution(`skill_invoked:`) — Codex에는 "skill used" 알림이 없으므로 이것이 유일한 직접 신호 |
| 녹화 | `spikes/fixtures/{claude-2.1.316,codex-0.166.0}/s7-*-auto-{fix,plan}.jsonl`(2차; 1차 녹화는 2차로 덮어씀, 1차 관찰값은 세션 스크래치에만 보관) |

## 1. 자동 선택 정확도 표

| 프롬프트 | 에이전트 | 기대 주도(ROUTING §2) | 1차 선택 | 2차 선택 | 일치 |
|---|---|---|---|---|---|
| fix | Claude | systematic-debugging 또는 test-driven-development | **없음**(Read→Edit→Write 테스트→PowerShell `npm test`) | **없음**(동일 순서; 구현을 먼저 고치고 테스트를 뒤에 추가) | 0/2 |
| fix | Codex | 〃 | `systematic-debugging` + `test-driven-development` SKILL.md를 한 명령으로 읽음 | 동일(`Get-Content …/systematic-debugging/SKILL.md; Get-Content …/test-driven-development/SKILL.md; rg --files; …`) → 실패 테스트 선행(`npm test` exit 1 → `calc.js` → exit 0) | 2/2 |
| plan | Claude | writing-plans | `writing-plans` Skill 호출 → `docs/superpowers/plans/2026-11-02-json-flag.md` | 동일 | 2/2 |
| plan | Codex | writing-plans | `Get-Content '…\.codex\skills\writing-plans\SKILL.md'` 관찰(1차 추출기가 겹친 백슬래시로 놓쳐 `chosen: []`로 기록됐으나 녹화에서 확인) → `docs/superpowers/plans/2026-11-02-json-cli-flag.md` | `skill_invoked:writing-plans` → `docs/superpowers/plans/2026-11-02-json-flag.md` | 2/2 |

mattpocock 스킬(`tdd`, `diagnosing-bugs`, `code-review`)은 네 실행 어디서도 자동 선택되지 않았다(Claude `init.skills`에 모두 노출돼 있었고 `using-superpowers`도 노출됨 — 녹화 `"using-superpowers"` 1건).

## 2. 해석

- **Claude**: 스킬 목록이 노출돼도("using-superpowers" 포함) 짧은 버그 수정에는 스킬을 고르지 않았고 **구현을 먼저 고친 뒤 테스트를 추가**했다(2회 모두). 계획 요청은 2회 모두 `writing-plans`를 골랐다. 즉 노출만으로는 TDD·디버깅 절차를 보장할 수 없고, EVIDENCE_SPEC의 `DISCOVERED → REWORK 명시 호출` 경로(AC-P07-1)가 실제로 필요하다.
- **Codex**: `skills/list` 노출만으로 4회 모두 관련 스킬의 SKILL.md를 **읽었고**, 그 뒤 절차(실패 테스트 선행·계획 파일 경로 규약 `docs/superpowers/plans/`)를 따랐다. 읽기 명령이 commandExecution으로 보이므로 V34의 "선택 관찰 신호" 질문은 **관찰 가능**으로 답한다. 단 `{type:"skill"}` 주입 때는 읽기 명령이 사라지므로(실험 1·3) 신호는 **자율 선택일 때만** 있고, 주입 때는 고유 절차로만 판정해야 한다.
- 오탐 검토: SKILL.md 읽기는 다른 작업과 혼동될 수 없는 경로(`…/skills/<name>/SKILL.md`)라 오탐 위험이 낮다. 미탐은 Codex가 경로를 겹친 백슬래시로 쓰는 pwsh 인용 때문에 1차에서 1건 발생했고 추출기를 고쳤다(`experiments.test.ts`).

## 3. 결정(§4 0번 확정 규칙 입력)

- Router 기본은 U10(에이전트 자율 선택)을 유지하되, **Claude Task에는 주도 스킬을 명시 주입하는 것을 기본**으로 하고(자율 선택 0/2), Codex Task는 자율 선택을 허용하되 `SKILL.md` 읽기 관찰이 없으면 REWORK 명시 주입으로 교정한다(2/2이지만 1회성 표본).
- `using-superpowers` 노출과 mattpocock 트리거는 실제로 **충돌하지 않았다**(mattpocock 자동 선택 0건). 충돌 행은 "노출은 선택을 보장하지 않음"으로 재정의한다.
