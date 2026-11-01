# 충돌 실험 2 — 디버깅: `systematic-debugging`(superpowers) vs `diagnosing-bugs`(mattpocock)

| 메타 | 값 |
|---|---|
| 정본 | SKILL_CONFLICT_RESOLUTION §2 "디버깅" 행("S7: 재현 가능한 버그 1건 비교(1회); 성능 회귀 비교는 P07"), ROUTING_POLICY §2 "디버깅" 행 |
| 실행 | 2026-11-02 05:45 KST, LIVE 2차 (f2), Claude Code 2.1.316 |
| 시나리오 | `stats.js` `median`이 짝수 길이에서 위쪽 중앙값만 반환(`median([1,2,3,4])`→3). 프롬프트 `MEDIAN_BUG`(근본 원인을 이름 짓는 짧은 보고 요구, `calc.js` 금지) |
| 녹화 | `spikes/fixtures/claude-2.1.316/s7-claude-explicit-systematic-debugging.jsonl`, `s7-claude-explicit-diagnosing-bugs.jsonl` |
| 관찰값 | `s7-skills-results.json` `conflictDebug[]` |
| 횟수 | 각 1회 |

## 1. 방법

같은 사본·같은 프롬프트에 스킬 이름만 바꿔 명시 호출. 지표: **재현이 구현 편집보다 앞서는가**(`firstRepro` = 첫 `node`/`npm` 명령 seq, `firstSourceEdit` = 테스트 파일을 제외한 첫 Write/Edit seq — LIVE 1차에서 테스트 파일 작성을 편집으로 세던 지표 결함을 고쳤다), 근본 원인 명명, 테스트 수, 턴·시간·비용. 두 실행 모두 `systematic-debugging.json` 시그니처(1 스킬(선택) → 2 `test_run:fail` → 3 구현 변경 → 4 `test_run:pass`)에 대조했다.

## 2. 결과

| 지표 | `systematic-debugging` | `diagnosing-bugs` |
|---|---|---|
| 증거 등급 | LOAD_OBSERVED | LOAD_OBSERVED |
| 관찰 시퀀스 | 1 skill → 4 저장소 조사 → **5 `node -e` 재현** → 7 `stats.test.mjs` → 8 `npm test` fail → **9 `stats.js`** → 10 `npm test` pass → 11 git diff 확인 | 1 skill → 2 조사 → **3 `stats.test.mjs`** → **4 `node --test` fail(재현)** → 5·7 가설 반증 프로브(`node -e`) → 8 테스트 보강 → 9 fail → **10 `stats.js`** → 11 pass |
| 재현 < 구현 편집 | 예 (5 < 9) | 예 (4 < 10) |
| 재현 방식 | 수동 프로브(`node -e import('./stats.js')`) 후 테스트 작성 | 실패 테스트를 먼저 써서 재현(피드백 루프) |
| 근본 원인 명명 | 예("짝수 길이 분기 부재", 정렬·복사는 배제) | 예(동일, 가설 2~5를 프로브로 반증했다고 기록) |
| 시그니처(systematic-debugging) | observed [1,2,3,4], inOrder | observed [2,3,4], inOrder |
| 추가 테스트 | 5개(+26줄: 짝수·비정렬·홀수·2원소·불변) | 3개(+21줄: 짝수·홀수·미정렬) |
| 구현 diff | `stats.js` 2 +- (1줄) | `stats.js` 2 +- (1줄) |
| 턴·시간·비용 | 13턴, 59.8s, $0.74 | 13턴, 76.5s, $0.91 |
| 사후 `npm test` | exit 0 | exit 0 |

## 3. 해석

- 둘 다 "수정 전 재현"을 지켰고 같은 1줄 수정에 도달했다. `systematic-debugging`은 Phase 1(조사·재현)→4(수정)의 순서가 관찰 시퀀스에 그대로 드러났고(EXECUTION_LIMITS의 3회 실패 에스컬레이션은 발동할 일이 없었다), `diagnosing-bugs`는 피드백 루프(실패 테스트 먼저)와 가설 반증 프로브가 더 많아 시간·비용이 ~28%·~23% 높았다.
- 재현 가능한 단순 버그에서는 `diagnosing-bugs`의 강점(성능 회귀·재현 어려운 버그용 루프 구축)이 비용으로만 나타났다. 성능 회귀 비교는 정본대로 P07로 미룬다.

## 4. 결정

**주도 = `systematic-debugging` 확정.** `diagnosing-bugs`는 **조건부 유지**(성능 회귀·재현이 어려운 버그·사용자가 "diagnose"를 명시할 때) — §2 행의 잠정 결정과 같다. P07 재검증 조건: 성능 회귀 1건으로 같은 비교.
