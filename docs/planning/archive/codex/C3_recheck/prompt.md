# C3 — C2 지적 반영 재확인 (세션 D 이어서, 호출 3/6)

당신이 C2(`docs/planning/archive/codex/C2_full_review/response.md`)에서 낸 33건(A1, B1~B6, C1~C6, D1~D3, E1~E10, F1~F7)을 Claude가 활성 문서에 반영했습니다. 아직 커밋하지 않았으므로 **작업 트리 변경분**이 반영 결과입니다. 반영 요약은 `docs/planning/archive/DECISION_LOG.md` §6.3에 있습니다. 샌드박스는 read-only이며 `git diff 402a5c0 -- docs/planning`(작업 트리 vs 정리본 커밋)으로 변경분을 볼 수 있습니다.

## 할 일

1. **항목별 해소 판정**: 33건 각각에 대해 `해소 / 부분 해소 / 미해소 / 반영이 새 문제를 만듦` 중 하나와 근거(파일·절·인용 ≤100자). 특히 다음을 확인하십시오.
   - A1: CHECKLIST 2차 승인 입력. F7: OPEN_ISSUES R1~R17 소유·출고 차단 열에 적은 **Task 번호(P01 T2·T6·T10·T11, P02 T2~T4, P04 T3~T6, P05 T4, P07 T1~T7, P08a T2, P10a T1~T3·T7, P11a T2)와 TEST ID가 PHASE_BREAKDOWN §2 각 Phase 7항·TEST_STRATEGY 표와 실제로 일치하는지** 행별로 대조.
   - D2: PHASE_BREAKDOWN P00 7항을 한 문단으로 요약했습니다. MASTER_IMPLEMENTATION_PLAN Phase 00 Task S1a~S9에 없는 정보가 요약 과정에서 사라졌는지(정리 전 `git show 402a5c0:docs/planning/05_plan/PHASE_BREAKDOWN.md`와 비교).
   - E2: SYSTEM_ARCHITECTURE Router 인터페이스를 `expose(...)→{exposed[], expectedLead, support[]}`, `reconcile(observedSelection)`으로 바꾸고 §3 2번 흐름을 관찰 후 기록으로 바꿨습니다. 다른 문서(ROUTING_POLICY §3, EVIDENCE_SPEC §4, PHASE P07 T2, AGENT_INTEGRATION)와 어긋나는 곳이 있는지.
   - E3: ROUTING_POLICY §4에 "사용자 명시 호출이 기대표와 다름" 행을 추가했습니다. §1 1번·§3·CONFLICT §4와 모순 없는지.
   - E4·E8: OPEN_ISSUES V34(Codex 자율 선택 UNVERIFIED)·V35(설치 명단 UNVERIFIED) 신설, CHECKLIST C4·USAGE_PLAN §3에 후보 폴더 9개(brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, code-review, writing-skills, frontend-design, ui-ux-pro-max)를 적었습니다. CONFLICT §2 8행의 주도 스킬과 대응이 맞는지, "8종"이라는 표현이 남은 곳(FINAL D18·README·PHASE·MASTER·AC-P00-6·PRODUCT)과 "후보 9개"가 충돌하는지 — 충돌하면 어느 표현으로 통일할지 제안.
   - F1: README 8번에 `LOAD_OBSERVED` 예외를 넣었습니다. EVIDENCE_SPEC §5·DATABASE_SCHEMA `tasks.kind`와 일치하는지.
   - F5·F6: COLLABORATION §1·SYSTEM_ARCHITECTURE §4를 조합별 보장으로 고쳤습니다. SECURITY_MODEL §2.1 표와 문구가 맞는지.
   - C6: OPEN_ISSUES §3을 한 문단으로 줄였습니다. 삭제한 9행 중 다른 활성 문서에 근거가 없는 사실이 있는지(Claude는 키워드 검색으로 전부 있다고 판정했으나 확인 필요).
2. **새 지적**: 이번 변경이 만든 끊어진 참조·모순·이력 잔존. 추가로 UI_UX_SPECIFICATION 메타의 `UNVERIFIED | 0` 행도 삭제했습니다.
3. **C4 준비 판정**: 새 세션의 독립 검증(C4)으로 넘겨도 되는지 "가능 / 아래 수정 후 가능 / 불가" 한 줄.

## 출력 형식 (한국어, Markdown)

1. 요약 표: 해소 n / 부분 n / 미해소 n / 새 문제 n.
2. 항목별 판정표 `| # | 판정 | 근거(파일·절·인용) | 남은 수정(바로 적용할 문장) |` — 33건 전부.
3. 새 지적 표(같은 열).
4. C4 준비 판정 한 줄.

근거 없는 추측은 쓰지 말고, 확인하지 못한 것은 `UNVERIFIED`로 표기하십시오.
