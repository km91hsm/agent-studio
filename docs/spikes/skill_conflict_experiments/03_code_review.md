# 충돌 실험 3 — 코드 리뷰: `code-review`(mattpocock) 단일 패스(Codex) / 서브에이전트(Claude)

| 메타 | 값 |
|---|---|
| 정본 | SKILL_CONFLICT_RESOLUTION §2 "코드 리뷰" 행(주도 code-review, Codex는 단일 패스 변형; "Claude 구현 → Codex가 code-review 지시로 리뷰, 역방향도 수행. 서브에이전트 없이 동작하는지 확인"), ROUTING_POLICY §2 "코드 리뷰(교차)" |
| 실행 | 2026-11-02 KST LIVE 1~4차(수치는 **4차** 06:23, (f3)) |
| 대상 | Codex 리뷰어 ← (c)에서 Claude가 TDD로 고친 저장소(커밋 `fix: sum (claude, test-driven-development)`); Claude 리뷰어 ← (d)에서 Codex가 고친 저장소. **서로 다른 구현이 대상**이므로 리뷰 품질 비교가 아니라 절차·형식 재현 확인이다(리뷰 #12) |
| 프롬프트 | "Review the changes since HEAD~1 … along the two axes of the code-review skill: Standards and Spec. The spec is the 'Bug' section of README.md. … Present the result under '## Standards' and '## Spec' headings. Do not modify any file." Codex에는 "No sub-agents are available in this session: run both axes yourself, sequentially." + `$code-review` + `{type:"skill", name:"code-review"}`; Claude에는 "Use the code-review skill (invoke it with the Skill tool first)." |
| 녹화 | `spikes/fixtures/codex-0.166.0/s7-codex-code-review.jsonl`, `spikes/fixtures/claude-2.1.316/s7-claude-code-review.jsonl` |
| 관찰값 | `s7-skills-results.json` `conflictReview.{codex,claude}` |

## 1. 결과 (4차)

| 지표 | Codex(단일 패스) | Claude(SKILL.md대로 서브에이전트) |
|---|---|---|
| 정체 신호 | 주입 수락(SKILL.md 읽기 명령 없음) | Skill 블록 `{"skill":"code-review"}` |
| 절차(시그니처 code-review v2: 2 기준점 git, 3 스펙/표준 출처 읽기) | `git rev-parse HEAD~1`(2) → `Get-Content README.md`(3) → `Get-Content stats.js; npm test` → observed [2,3], missing [] | Skill(1) → `git log/diff`(2) → Read README·calc·test(3) → Glob → **Agent ×2** → `git diff HEAD~1...HEAD --stat` → observed [1,2,3] |
| 증거 등급 | **LOAD_OBSERVED**(주입 + 절차). 3차까지는 플래그 미지원으로 3단계가 미탐이라 INJECTION_ACCEPTED였다 | LOAD_OBSERVED |
| 두 축 헤딩 | 있음 — 프롬프트가 요구했으므로 **등급 근거로 쓰지 않음**(리뷰 #3, `headingsRequestedByPrompt: true`) | 있음(동일) |
| 파일 변경 | 없음(`git status` []) — 테스트 단언 | 없음 — 테스트 단언 |
| 발견 | Standards 0건; Spec 1건: "README Bug 절의 `median` 요구 미완료" | Standards 하드 위반 0건(표준 소스 부재 명시, 스멜 기준선 적용); Spec: `sum` 요구 충족 |
| 시간·사용량 | 22.4s, input 87,382(cached 77,568) / output 669 | 103.9s, 13턴, **$1.70**(S7 Claude 실행 7건 중 최고 — 서브에이전트 2개) |

4회 모두 같은 패턴(Codex Spec 지적 `median` 미구현 4/4, Claude Agent ×2 4/4, 두 저장소 무변경 4/4).

## 2. 해석

- **단일 패스 변형은 동작한다**: Codex는 서브에이전트 없이 기준점 수집 → 스펙 읽기 → 두 축 보고를 순서대로 수행했다. 시그니처는 당초 `^command:git (diff|log|merge-base|status)`였는데 Codex는 pwsh 래퍼 안에서 `git rev-parse HEAD~1`만 썼으므로 앵커를 빼고 `rev-parse|show`를 더했고, 리뷰 #3·시그니처 표에 따라 "스펙/표준 출처 읽기" 단계를 required로 추가했다(헤딩은 판정에서 제외).
- Codex의 Spec 지적(`median` 미구현)은 README 전체를 스펙으로 읽은 결과로, 프롬프트가 `stats.js`를 범위 밖으로 못 박은 사실과 어긋난다(4/4 재현) — 리뷰어에게 **Task 범위**를 스펙과 함께 넘겨야 한다는 P01 ReviewPacket 입력(오탐 1건).
- Claude 쪽은 SKILL.md의 병렬 서브에이전트가 그대로 실행돼 비용이 3.4배다. Agent Studio 교차 리뷰에서는 리뷰어가 다른 에이전트이므로 §1 원칙 4대로 서브에이전트 분기는 불필요 — Claude 리뷰 지시에도 "단일 패스" 문구를 넣는 쪽이 비용상 유리하다(제안, 미실측).

## 3. 결정

**주도 = `code-review` 확정 — 범위는 "이 시나리오에서 절차·형식 재현"(Codex 단일 패스 동작, Claude 서브에이전트 동작). 리뷰 품질 비교·"충돌 없음"의 일반 확정은 아니다(리뷰 #12).** `requesting-code-review` 비활성 유지(교차 에이전트 리뷰가 대체), `caveman-review` 조건부 유지. P07 재검증 조건: 같은 구현을 두 에이전트가 리뷰하고 ReviewPacket에 Task 범위를 포함했을 때 Spec 오탐이 사라지는지.
