# C5 — C4 지적 반영 재검증 (세션 E 이어서, 호출 5/6)

당신이 C4에서 낸 14건(B1~B5, C1~C3, D1~D3, E1~E3)을 Claude가 활성 문서에 반영했습니다. 커밋 전이므로 **작업 트리**가 반영 결과이며 `git diff 402a5c0 -- docs/planning`으로 정리본 커밋 이후의 모든 변경(C2·C3·C4 반영 포함)을 볼 수 있습니다. 반영 요약은 `docs/planning/archive/DECISION_LOG.md` §6.5. 샌드박스는 read-only, 문서는 수정하지 말고 지적만 하십시오.

## 반영 내용 요약
- B1 `OPEN_ISSUES_AND_RISKS §3`→`§2` 참조 5곳(PRODUCT 메타·§15 서문, FINAL §3, AGENT_INTEGRATION 메타, SECURITY 메타).
- B2 `ACCEPTANCE §MVP-Core`→`ACCEPTANCE_CRITERIA §1 P11a + §2 MVP-Core 행`(MASTER·PHASE P11a), PHASE P11b의 `ACCEPTANCE §V1`도 같은 방식.
- B3 AC-P00-6·MASTER S7의 충돌 실험 참조에 `SKILL_CONFLICT_RESOLUTION` 문서명 명시.
- B4 기준 문서 `CLAUDE_CODE_SKILLS_SETUP.md` 사본을 `archive/evidence/`에 추가(새 파일), PRODUCT 메타에 경로, CHECKLIST §2 첫 push 전 공개 점검 항목에 추가.
- B5 `SOURCES.md`→`archive/evidence/SKILL_INVENTORY.md`(EVIDENCE §2 필드 6, SECURITY §6).
- C1 USAGE §4 한 줄로. C2 OPEN §2 끝 문장·§3 문단 재작성. C3 README 마지막 줄. 추가로 EXECUTION_LIMITS §1 토큰 한도 행의 "계획 수립 중 Codex 호출" 표현도 제거.
- D1 SECURITY §5 CLI 자격증명 행을 ADR-0007과 일치(앱·브로커 미접근, CLI 자체 인증, API key는 키링 참조).
- D2 SECURITY §3 엄격 모드 보장 표현을 §2.1 조건부로.
- D3 PHASE P11a 13항: 내부 unsigned·해시 검증, 서명 검증은 P11b.
- E1 MASTER S4 Step 1: `blocked | approval_requested | bypassed` 판정값 기록·존재 단언, bypassed 조합은 `isolation_warning`·보장 하향 입력.
- E2 AC-P00-2 S1c 문장을 "변경이 발생한 경우 … 포착, 없으면 변경 0과 승인 요청 유무 기록"으로.
- E3 MASTER Phase 00 서문에 첫 Task **S0(저장소 개설)** 6단계 정의 + `docs/spikes/S0.md`(11건과 별도), CHECKLIST §2 서문 연결.

## 할 일
1. 14건 각각 `해소 / 부분 해소 / 미해소 / 새 문제` 판정과 근거(파일·절·인용 ≤100자), 남은 수정 문장.
2. 반영이 만든 새 문제(끊어진 참조·모순·이력 잔존·S0 추가로 생긴 수 불일치 — "보고서 11건"·AC-P00-1·PHASE P00 7항·CHECKLIST 2차 승인과 S0의 관계).
3. **최종 판정** 한 줄: "수용 가능 / 수정 후 수용 / 재작업 필요". 수용 가능이면 그대로 커밋합니다.

## 출력 형식 (한국어, Markdown)
1. 요약 표(해소/부분/미해소/새 문제 건수). 2. 항목별 판정표 `| # | 판정 | 근거 | 남은 수정 |`. 3. 새 지적 표(같은 열). 4. 최종 판정 한 줄.
근거 없는 추측 금지, 확인 못 한 것은 `UNVERIFIED`.
