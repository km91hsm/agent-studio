# COLLABORATION_PROTOCOL — 실행 모드·역할 분배·handoff·교차 리뷰

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 요구사항 | REQ-MODE-01~06, REQ-CE-01~12, REQ-DEV-04, REQ-SM-08 |
| 원칙 | 교차 리뷰, 역할 변경 가능, 불필요한 이중 호출 방지 |

## 1. 실행 모드

| 모드 | 에이전트 | 오케스트레이터 역할 | 승인·효과 통제 | MVP-Core |
|---|---|---|---|---|
| Claude Mode | Claude만 | 세션·저널·승인 브로커·앱 실행기·사후 감사 | 다층 방어(아래) | ✅ |
| Codex Mode | Codex만 | 동일 | 다층 방어 | ✅ |
| Auto Collaboration | 둘 | 분류 → 역할 배정 → 단계 실행 → 교차 리뷰 → 재작업 루프 → 검증 | 다층 방어 + 단계 전이 승인(정책) | V1 |
| Manual Collaboration | 둘 | 사용자가 담당 선택·handoff 시점 지정, 결과 비교 뷰 | 다층 방어 | V1 |

**다층 방어(모든 모드 공통, SECURITY_MODEL §2·§3)**: ApprovalBroker는 **승인 요청이 발생한 효과만** 판정한다. 공급자 샌드박스 허용 범위 내 쓰기(Codex `workspaceWrite`, Claude 자동 허용 도구)는 요청 없이 실행되므로 **사후 diff 감사**로 포착하고, 원격 Git·DB·설치·배포·외부 서비스의 정식 경로는 **앱 전용 실행기**이며, 실행기 외 경로(셸·MCP)의 사전 차단 여부는 SECURITY_MODEL §2.1의 조합별 보장을 따른다. 어떤 문서도 "모든 부작용이 브로커를 거친다"고 표현하지 않는다.

모드 전환(REQ-MODE-06): 전환은 Task 경계에서만 허용. 진행 중 턴이 있으면 interrupt → 세션·변경사항 보존 → 새 모드의 첫 Task는 `Context Handoff` 문서를 입력으로 시작.

## 2. 작업 분류와 역할 배정 (REQ-CE-01·02·12)

| Task 종류 | 기본 담당 | 리뷰어 | 위험도 기반 이중 호출 |
|---|---|---|---|
| 요구사항 분석·계획 | Claude | Codex(계획 검토) | 계획은 항상 교차 검토(저비용) |
| 구현(코드 변경) | Codex(기본 흐름) | Claude | §5의 5번 리뷰 생략 규칙(금지 범주 제외, 변경 파일 ≤2 고정 상한, 테스트 통과, 효과 원장 비어 있음, `capture_confidence=complete`)을 모두 충족할 때만 리뷰 생략 |
| 테스트 작성·실행 | 구현 담당 | — | — |
| 코드 리뷰 | 구현의 반대편 | — | — |
| 디버깅 | 실패를 낸 담당, 2회 실패 시 반대편으로 교체 | — | 교체 자체가 역할 변경 이벤트 |
| 리디자인·UI | Claude | Codex | 시각 변경은 사용자 승인 |
| 독립 검증(verify) | 구현·리뷰 둘 다 아닌 쪽이 없으므로 **오케스트레이터가 테스트·증거 검사**, 에이전트는 보조 | — | — |

기본 흐름: Claude 계획 → Codex 구현 → 테스트 → Claude 리뷰 → Codex 수정 → 독립 검증 → 완료. 프로젝트 정책으로 담당을 뒤집을 수 있고(Codex 계획/Claude 구현), 분류기는 과거 성공률(V2)로 조정.

## 3. 단계 프로토콜 (Auto 모드)

```
PLANNING   : Claude  → PlanArtifact(목표, 변경 파일 예상, 테스트 계획, 주도 스킬)
             Codex   → PlanReview(ACCEPT | REVISE{items})   -- 1회, REVISE면 Claude 재작성 1회 후 사용자 확인
IMPLEMENTING: Codex  → 구현 + 테스트 실행 → RunArtifacts
REVIEWING  : Claude  → ReviewReport(Standards, Spec 두 축; Critical/High/Medium/Low)
             판정    : Critical/High 0 → VERIFYING, 그 외 → REWORK(iteration+1, 상한 3)
REWORK     : 해당 Task 시도의 implementer_agent(기본 Codex; 역할을 뒤집은 프로젝트는 Claude) → 지적 항목별 ACCEPTED/REJECTED_WITH_RATIONALE + 수정
VERIFYING  : Orchestrator → 테스트 재실행, 스킬 증거, AC 체크, 승인 범위 대조, diff≠보고 검사
```

산출물은 모두 저널 이벤트(`PlanArtifact`, `PlanReview`, `ReviewReport`, `ReworkResponse`)로 기록되고 파일로도 `docs/agent-studio/<task>/`에 저장(사용자 열람용).

## 4. Handoff 스키마 (REQ-SM-08, Context Handoff)

```json
{
  "handoff_id": "ULID",
  "from": {"agent":"claude","session_ref":"claude:...","run_id":"..."},
  "to":   {"agent":"codex"},
  "task": {"id":"...","title":"...","phase":"...","acceptance":[...]},
  "state": {"git_ref":"...","dirty_files":[...],"last_tests":{...}},
  "context": {"summary":"...","decisions":[...],"open_questions":[...],"constraints":[...]},
  "skills": {"lead":"executing-plans","support":["ponytail"]},
  "approvals_in_effect": [...],
  "do_not": ["push","install deps"],
  "journal_seq_range": [a, b]
}
```

mattpocock `handoff` 스킬(사용자 전용)은 이 스키마의 `context.summary` 생성에 사용할 수 있다(사용자가 호출).

## 5. 교차 리뷰 규칙 (REQ-DEV-04)

1. 구현 에이전트 ≠ 리뷰 에이전트 — **Auto·Manual 모든 모드, REWORK 포함**. Task 시도마다 `implementer_agent`·`reviewer_agent`를 저널에 기록하고 REWORK는 같은 구현자에게 재배정한다. 같은 에이전트의 다른 세션은 "교차"로 인정하지 않는다. Manual 모드에서 사용자가 두 산출물 중 하나를 선택하면 **반대편 에이전트의 리뷰**를 거치거나, 사용자가 명시적으로 생략을 선택해 `ReviewSkipped{reason:user_policy}`를 남긴다 — 단 **5항의 생략 금지 범주·`capture_confidence=uncertain`에는 사용자 생략도 적용되지 않는다**(리뷰 필수).
2. 리뷰어는 `code-review` 스킬 지시(Standards/Spec 두 축)를 사용. Codex는 단일 패스 변형.
3. 리뷰 입력: diff(기준 커밋 대비), PlanArtifact, 테스트 결과, 스킬 증거. 리뷰어는 코드 수정 권한 없음(읽기 전용 모드·read-only 샌드박스).
4. 구현자는 `receiving-code-review` 태도 규칙 적용: 지적마다 수용/기술적 반박, 성급한 동의 금지.
5. 위험도 기반 생략(상한 고정): 프로젝트 정책 `review.skip_if`는 **다음 조건을 모두** 충족할 때만 — (a) 변경 파일 ≤ **2**(정책으로 올릴 수 없음) (b) 테스트 통과 (c) `effects` 원장에 외부 효과·`unverifiable` 없음 **그리고 run의 `capture_confidence=complete`**(불확실하면 원장이 비어 있어도 생략 금지) (d) **생략 금지 범주**가 아님: 인증·권한·보안 정책, DB 스키마·마이그레이션, 복구·상태 머신, 앱 실행기·승인 정책, 배포·CI 설정, 비밀 처리 경로. 생략 시 `IMPLEMENTING→VERIFYING(review_skipped)` 전이와 `ReviewSkipped{policy, files, reason}` 감사 이벤트를 남긴다.

## 6. 반복·중복·복구 (REQ-CE-05~09)

- 반복 상한: 리뷰·수정 3회(변화 없는 반복 2회면 조기 종료) → FAILED + 사용자 알림.
- 중복 방지: Task당 활성 AgentRun 1개(lease), 효과는 idempotency key.
- 자동 복구: 네트워크·일시 오류만. 인증·한도·충돌·불확실 상태는 BLOCKED/WAITING_APPROVAL.
- 테스트 실패 자동 분석: 실패 로그를 `systematic-debugging` 지시와 함께 구현 담당에게 REWORK 입력으로 전달.

## 7. Manual 모드 비교 뷰

같은 Task를 두 에이전트에게 각각 fork된 worktree에서 수행시키고 diff·테스트·토큰을 나란히 표시. 사용자가 하나를 선택하면 다른 worktree는 보존(삭제는 승인). V1.
