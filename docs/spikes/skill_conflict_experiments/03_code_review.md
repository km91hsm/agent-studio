# 충돌 실험 3 — 코드 리뷰: `code-review`(mattpocock) 단일 패스(Codex) / 서브에이전트(Claude)

| 메타 | 값 |
|---|---|
| 정본 | SKILL_CONFLICT_RESOLUTION §2 "코드 리뷰" 행(주도 code-review, Codex는 단일 패스 변형; "Claude 구현 → Codex가 code-review 지시로 리뷰, 역방향도 수행. 서브에이전트 없이 동작하는지 확인"), ROUTING_POLICY §2 "코드 리뷰(교차)" |
| 실행 | 2026-11-02 05:45 KST, LIVE 2차 (f3) |
| 대상 | Codex 리뷰어 ← (c)에서 Claude가 TDD로 고친 저장소(커밋 `fix: sum (claude, test-driven-development)`); Claude 리뷰어 ← (d)에서 Codex가 고친 저장소 |
| 프롬프트 | "Review the changes since HEAD~1 … along the two axes of the code-review skill: Standards and Spec. The spec is the 'Bug' section of README.md. … Present the result under '## Standards' and '## Spec' headings. Do not modify any file." Codex에는 "No sub-agents are available in this session: run both axes yourself, sequentially." + `$code-review` + `{type:"skill", name:"code-review"}`; Claude에는 "Use the code-review skill (invoke it with the Skill tool first)." |
| 녹화 | `spikes/fixtures/codex-0.166.0/s7-codex-code-review.jsonl`, `spikes/fixtures/claude-2.1.316/s7-claude-code-review.jsonl` |
| 관찰값 | `s7-skills-results.json` `conflictReview.{codex,claude}` |

## 1. 결과

| 지표 | Codex(단일 패스) | Claude(SKILL.md대로 서브에이전트) |
|---|---|---|
| 증거 등급 | LOAD_OBSERVED(주입 수락 + 고유 절차 = `## Standards`/`## Spec` 두 축 출력) | LOAD_OBSERVED(Skill 블록 `{"skill":"code-review"}`) |
| 절차 관찰 | `git rev-parse`/`Get-Content README.md`/`Get-Content stats.js; npm test` → 두 축 보고. SKILL.md 읽기 명령 없음(서버 내부 주입) | Skill → `git` 조사(PowerShell ×2) → 파일 Read ×5 → **Agent ×2**(Standards·Spec 병렬 서브에이전트) → `npm test` → 종합 |
| 두 축 헤딩 | 있음 | 있음 |
| 파일 변경 | 없음(`git status` []) — 테스트 단언 | 없음 — 테스트 단언 |
| 발견 | Standards 0건; Spec 1건: "README Bug 절의 `median` 요구 미구현" | Standards 하드 위반 0건(표 형식, 근거 포함); Spec: `sum` 요구 충족 |
| 시간·사용량 | 19.8s, input 88,295(cached 78,080) / output 626 | 89.9s, 13턴, **$1.69**(이번 S7 Claude 실행 7건 중 최고 — 서브에이전트 2개 비용) |

## 2. 해석

- **단일 패스 변형은 동작한다**: Codex는 서브에이전트 없이 두 축을 순서대로 수행했고 산출 형식(Standards/Spec)이 교차 리뷰 보고 형식과 일치한다. 이 산출 형식 자체가 code-review의 고유 절차 신호로 쓸 수 있다(시그니처 `code-review.json`의 required 단계는 당초 `^command:git (diff|log|merge-base|status)`였는데 Codex는 pwsh 래퍼 안에서 `git rev-parse HEAD~1`만 썼으므로 앵커를 빼고 `rev-parse|show`를 더해 **보완했다** — Codex 리뷰 검토 대상).
- Codex의 Spec 지적(`median` 미구현)은 README 전체를 스펙으로 읽은 결과로, 프롬프트가 `stats.js`를 범위 밖으로 못 박은 사실과 어긋난다 — 리뷰어에게 **Task 범위**를 스펙과 함께 넘겨야 한다는 P01 ReviewPacket 입력(오탐 1건).
- Claude 쪽은 SKILL.md의 병렬 서브에이전트가 그대로 실행돼 비용이 3배 이상이다. Agent Studio 교차 리뷰에서는 리뷰어가 다른 에이전트이므로 §1 원칙 4대로 서브에이전트 분기는 불필요 — Claude 리뷰 지시에도 "단일 패스" 문구를 넣는 쪽이 비용상 유리하다(제안, 미실측).

## 3. 결정

**주도 = `code-review` 확정(Codex는 단일 패스 변형, Claude도 교차 리뷰에서는 단일 패스 지시 권장).** `requesting-code-review` 비활성 유지(교차 에이전트 리뷰가 대체), `caveman-review` 조건부 유지. P07 재검증 조건: ReviewPacket에 Task 범위를 포함했을 때 Spec 오탐이 사라지는지.
