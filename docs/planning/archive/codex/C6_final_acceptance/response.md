## C6 재검증

| # | 판정 | 근거(파일·절·인용 ≤100자) | 남은 수정 |
|---|---|---|---|
| C1 | 해소 | [USAGE_PLAN](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:57)은 §3에서 끝나며 ‘§4 선례’가 삭제됨 | 없음. 다른 문서의 이력 문구는 새 지적 X1 |
| C2 | 해소 | [OPEN_ISSUES](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:79) “현행 미검증 항목과 해소 Task는 이 표에서만 추적한다”; §3 삭제 | 없음 |
| E3 | 해소 | [MASTER](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:62) “S0는 … 선행 운영 Task”; 11개 스파이크와 구분 | 없음. CI 결과 기록 시점은 X2 |
| N1 | 해소 | [MASTER](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:62) S0의 커밋→첫 push→CI 확인 순서 명시 | 없음 |
| N2 | 해소 | [PHASE](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:50) “첫 Task S0 … → 스파이크 11개”; “11건(S0 제외)” | 없음 |
| N3 | 해소 | [ACCEPTANCE](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:14) 증거 열에 11개 파일을 지정하고 “S0.md는 별도” 명시 | 없음 |
| N4 | 해소 | [CHECKLIST](D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:16) 2차 승인 입력에 “S0 … 보고서 1건 + 스파이크 보고서 11건” | 없음. S0 보고서 내용의 완료 시점은 X2 |
| N5 | 해소 | [OPEN_ISSUES](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:34) R22에 기준 문서 사본 추가 | 없음 |
| N6 | **미해소(커밋 전)** | `git status --short`에서 `archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md`는 여전히 `??`. §6.6의 ‘커밋 ② 포함’은 계획이며 실제 포함은 **UNVERIFIED** | 커밋 ②에서 해당 새 파일을 명시적으로 stage하여 포함한다. |
| N7 | 해소 | [OPEN_ISSUES](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:7) “사용자 결정 U1~U10·C5·C7” | 없음 |

## 새 문제

| # | 판정 | 근거(파일·절·인용 ≤100자) | 남은 수정 |
|---|---|---|---|
| X1 | 추가 발견: 이력 잔존 | [MATRIX](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_COMPATIBILITY_MATRIX.md:101) “계획 세션의 실행 증거”; [EVIDENCE_SPEC](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:62) “형식 선례는 …”; [CHECKLIST](D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:32) “형식 선례 …”. C1의 절은 삭제됐지만 과정 서술이 활성 문서에 남음 | MATRIX 문장을 “공급자별 실행 검증 상태는 P00 S7 결과로 갱신하고, 분류 집계는 P07 Registry에서 행 기준으로 생성한다.”로 바꾼다. EVIDENCE_SPEC §5의 “형식 선례는 …” 문장과 CHECKLIST D2의 “(형식 선례 …)”를 삭제한다. |
| X2 | 새 문제: S0 증거 완료 시점 | [MASTER](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:62)는 `S0.md`를 첫 push 전에 커밋하고 **그 뒤** CI를 확인한다. [CHECKLIST](D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:16)는 CI **결과**가 담긴 S0 보고서를 2차 승인에 요구한다 | MASTER S0의 7단계 뒤에 “(8) 첫 push SHA·CI 실행 링크·최종 결과를 `docs/spikes/S0.md`에 추가하고 커밋·push한다.”를 추가한다. |

활성 문서의 정리 전 인벤토리 항목 누락과 깨진 Markdown 링크는 재검사에서 발견되지 않았습니다. 문서는 수정하지 않았습니다.

**최종 판정: 수정 후 수용.** X1·X2의 문장을 적용하고 새 기준 문서 사본을 커밋 ②에 포함하면 커밋 진행이 가능합니다.