# 충돌 실험 1 — TDD: `test-driven-development`(superpowers) vs `tdd`(mattpocock)

| 메타 | 값 |
|---|---|
| 정본 | SKILL_CONFLICT_RESOLUTION §2 "TDD" 행, §4 0번(실험 범위), ROUTING_POLICY §2 "TDD" 행 |
| 실행 | 2026-11-02 KST LIVE 1~4차(수치는 **4차** 06:23, `s7-skills.test.ts` (c)·(f1)·(d)), Claude Code 2.1.316 / Agent SDK 0.3.316, codex-cli 0.166.0 |
| 시나리오 | `spikes/s7-skills/experiments.ts` `writeBugScenario`: `calc.js` `sum`이 첫 원소를 건너뜀(`sum([1,2,3])`→5). 프롬프트 `SUM_BUG`(테스트는 `npm test` = `node --test`, `stats.js` 금지, 한 줄 보고) |
| 녹화 | `spikes/fixtures/claude-2.1.316/s7-claude-explicit-tdd.jsonl`, `s7-claude-explicit-mp-tdd.jsonl`, `spikes/fixtures/codex-0.166.0/s7-codex-explicit-tdd.jsonl` |
| 관찰값 | `spikes/fixtures/s7-skills-results.json` `claudeExplicitTdd`, `conflictTdd`, `codexExplicitTdd` |
| 횟수 | 4회(추출기 수정에 따른 재실행; 4회 모두 같은 결과) — 통계적 결론 아님 |

## 1. 방법

같은 저장소 사본·같은 프롬프트에 스킬 이름만 바꿔 Claude에 명시 호출("Use the `<skill>` skill (invoke it with the Skill tool before doing anything else) and follow it strictly."). 비교 지표는 §2 행의 "테스트 선행 여부·재작업 횟수"를 관찰 시퀀스(`observationsFromClaude`: Skill 블록 → `skill_invoked:`, Read → `read:`, Write/Edit → 산출물 경로, Bash/PowerShell 테스트 러너 → `test_run:fail|pass`)로 판정한다. 두 실행 모두 `docs/agent-studio/skill-signatures/test-driven-development.json` v2(1 스킬 호출(선택) → 2 테스트 파일 → 3 실패 실행 → 4 구현 변경(테스트 파일 제외) → 5 통과 실행)에 대조했다. **시그니처는 절차 신호이고 정체(어느 스킬인가)는 Skill 블록·주입으로 판정한다**(Codex 리뷰 #1).

## 2. 결과 (4차)

| 지표 | `test-driven-development` (c) | `tdd` (f1) | Codex + `{type:"skill"}` test-driven-development (d) |
|---|---|---|---|
| 정체 신호 | Skill 블록 `{"skill":"test-driven-development"}` + result "Launching skill: …" | Skill 블록 `{"skill":"tdd"}` | 주입 수락(`turn/completed`, `turnError: null`); SKILL.md 읽기 명령 없음(서버 내부 주입) |
| 증거 등급 | LOAD_OBSERVED | LOAD_OBSERVED(tdd 기준) / test-driven-development 기준으로는 **DISCOVERED**(정체 불일치, 음성 사례) | LOAD_OBSERVED |
| 관찰 시퀀스 | 1 skill → 2~4 read(calc.js·README·package.json) → 5 search → 6 `calc.test.mjs` → 7 `npm test` **fail** → 8 `calc.js` → 9 `npm test` **pass** | 1 skill → 2 조사 → 3 `calc.test.mjs` → 4 `npm test` **fail** → 5 `calc.js` → 6 **pass** | 3 README 읽기 → 6 `calc.test.mjs` → 7 `npm test` **fail** → 10 `calc.js` → 11 **pass** |
| 테스트 선행 | 예 | 예 | 예 |
| 시그니처 | observed [1,2,3,4,5], missing [], inOrder | observed [2,3,4,5](1단계는 스킬 이름이 달라 비관찰), inOrder | observed [2,3,4,5], inOrder |
| 재작업(구현 파일 편집 횟수) | 1 | 1 | 1 |
| diff | `calc.js` 3 +-- / `calc.test.mjs` +7 | 동일 | 동일 |
| 턴·시간·비용 | 11턴, 32.8s, $0.567 | 8턴, 25.3s, $0.510 | 26.5s, input 146,234(cached 133,504) / output 749 |
| 사후 `npm test` | exit 0 (1 pass) | exit 0 | exit 0 |

1~3차도 동일 패턴(테스트 선행·RED→GREEN·재작업 0; 비용 $0.53~0.96).

## 3. 해석

- 사소한 버그 1건에서 두 스킬의 **행위는 구별되지 않았다**(4회 모두). 차이는 보고 문구뿐.
- `tdd`(mattpocock)의 차별 요소(seam 사전 확인·통합 테스트 지향)는 이 시나리오에서 발동할 여지가 없었다 — "열등"을 말할 수 없다.
- 그래서 시그니처만으로는 두 스킬을 구별할 수 없고(리뷰 #1), 등급은 정체 신호와 결합해서만 올린다. `signatures.test.ts`가 "tdd 실행이 TDD 시그니처에 일치하지만 등급은 DISCOVERED"를 고정한다.
- Codex는 설치된 `test-driven-development`를 `{type:"skill"}` 주입만으로 같은 절차로 수행했고, `tdd`는 Codex에 설치되지 않았다(C4 8종 밖).

## 4. 결정(SKILL_CONFLICT_RESOLUTION v2 입력)

**주도 = `test-driven-development` 확정(이 시나리오에서 절차 재현 기준).** 근거: (1) 행위 동등이므로 결정 원칙 5(Codex에서도 동작해야 하는 단계는 Claude 전용 요소가 없는 쪽)와 C4 설치 명단(Codex에 test-driven-development만 존재)이 결정한다. (2) 시그니처는 superpowers 판으로 작성돼 있고 Codex 주입 실측(d)이 그 시그니처로 LOAD_OBSERVED를 냈다. `tdd`는 Claude에서 **비활성(라우팅 제외, 삭제 안 함)**, Codex에는 미설치. P07 재검증 조건: 통합 테스트·seam이 필요한 Task에서 `tdd`가 더 나은 산출물을 내는지 1회 비교.
