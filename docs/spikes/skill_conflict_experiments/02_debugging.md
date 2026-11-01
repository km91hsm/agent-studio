# 충돌 실험 2 — 디버깅: `systematic-debugging`(superpowers) vs `diagnosing-bugs`(mattpocock)

| 메타 | 값 |
|---|---|
| 정본 | SKILL_CONFLICT_RESOLUTION §2 "디버깅" 행("S7: 재현 가능한 버그 1건 비교(1회); 성능 회귀 비교는 P07"), ROUTING_POLICY §2 "디버깅" 행 |
| 실행 | 2026-11-02 KST LIVE 1~4차(수치는 **4차** 06:23, (f2)), Claude Code 2.1.316 |
| 시나리오 | `stats.js` `median`이 짝수 길이에서 위쪽 중앙값만 반환(`median([1,2,3,4])`→3). 프롬프트 `MEDIAN_BUG`(근본 원인을 이름 짓는 짧은 보고 요구, `calc.js` 금지) |
| 녹화 | `spikes/fixtures/claude-2.1.316/s7-claude-explicit-systematic-debugging.jsonl`, `s7-claude-explicit-diagnosing-bugs.jsonl` |
| 관찰값 | `s7-skills-results.json` `conflictDebug[]` |
| 횟수 | 4회(4회 모두 같은 방향) |

## 1. 방법

같은 사본·같은 프롬프트에 스킬 이름만 바꿔 명시 호출. 지표: **재현이 구현 편집보다 앞서는가**(`firstRepro` = 첫 `node`/`npm` 명령 seq, `firstSourceEdit` = 테스트 파일을 제외한 첫 Write/Edit seq, `firstTestWrite` 별도 — LIVE 1차에서 테스트 파일 작성을 편집으로 세던 지표 결함을 고쳤다), 근본 원인 명명, 테스트 수, 턴·시간·비용. 두 실행 모두 `systematic-debugging.json` v2(1 스킬(선택) → 2 조사·재현 프로브 → 3 `test_run:fail` → 4 구현 변경(테스트 제외) → 5 `test_run:pass`)에 대조했다. 시그니처는 절차 신호이며 두 스킬을 구별하지 못한다(리뷰 #1·표) — 정체는 Skill 블록으로 판정.

## 2. 결과 (4차)

| 지표 | `systematic-debugging` | `diagnosing-bugs` |
|---|---|---|
| 정체·등급 | Skill 블록 → LOAD_OBSERVED | Skill 블록(diagnosing-bugs) → LOAD_OBSERVED(자기 기준) |
| 관찰 시퀀스 | 1 skill → 2~4 read(stats.js·README·package.json) → 5 search → **6 `node -e` 재현** → 7 `git log/status/diff` → 8 `git show` → 9 `stats.test.mjs` → 10 `npm test` fail → **11 `stats.js`** → 12 pass | 1 skill → 2 조사 → 3 search → **4 `stats.test.mjs`** → **5 `node --test` fail(재현)** → 6·7 가설 프로브 → 8 read stats.js → **9 `stats.js`** → 10 pass → 11 `DEBUG-` 잔재 검색 → 12 정리 확인 |
| 재현 < 구현 편집 | 예 (6 < 11) | 예 (5 < 9) |
| 재현 방식 | 수동 프로브(`node -e import('./stats.js')`) + git 이력 조사 후 테스트 작성 | 실패 테스트를 먼저 써서 재현(피드백 루프), 디버그 태그 정리 단계 포함 |
| 근본 원인 명명 | 예("짝수 길이 분기 부재") | 예(동일) |
| 시그니처(systematic-debugging v2) | observed [1,2,3,4,5], inOrder | observed [2,3,4,5], inOrder(절차 일치 — 정체 불일치) |
| 추가 테스트 | 4개(+24줄) | 2개(+11줄) |
| 구현 diff | `stats.js` +3 | `stats.js` 2 +- |
| 턴·시간·비용 | 14턴, 55.0s, $0.744 | 14턴, 84.0s, $0.912 |
| 사후 `npm test` | exit 0 | exit 0 |

1~3차: 둘 다 매번 재현 < 구현 편집, 같은 수정; diagnosing-bugs가 매번 더 느리고(+28~53%) 비교적 비쌌다(+5~23%).

## 3. 해석

- 둘 다 "수정 전 재현"을 지켰고 같은 수정에 도달했다. `systematic-debugging`은 Phase 1(조사·재현: 프로브 + git 이력)→4(수정)가 관찰 시퀀스에 그대로 드러났고, `diagnosing-bugs`는 피드백 루프(실패 테스트 먼저)·가설 프로브·정리 단계가 더 많아 시간·비용이 높았다.
- 재현 가능한 단순 버그에서는 `diagnosing-bugs`의 강점(성능 회귀·재현 어려운 버그용 루프)이 비용으로만 나타났다. 성능 회귀 비교는 정본대로 P07.
- 두 스킬은 도구 관찰값으로 구별되지 않는다(가설·원인 조사는 대화 안에 있다) — 시그니처 `note`에 기록.

## 4. 결정

**주도 = `systematic-debugging` 확정(이 시나리오에서 절차 재현 기준).** `diagnosing-bugs`는 **조건부 유지**(성능 회귀·재현이 어려운 버그·사용자가 "diagnose"를 명시할 때). P07 재검증 조건: 성능 회귀 1건으로 같은 비교.
