## 1. 요약

| 해소 | 부분 해소 | 미해소 | 새 지적 |
|---:|---:|---:|---:|
| 11 | 3 | 0 | 7 |

작업 트리 기준으로 C4의 핵심 참조 오류와 보장 조건 충돌은 고쳐졌습니다. 정리 전 인벤토리 1,356항목도 활성 문서에서 계속 확인됩니다. **S0 추가에 따른 Task·보고서·승인 범위 정합성은 아직 수정이 필요합니다.**

## 2. C4 항목별 재검증

| # | 판정 | 근거(파일·절·인용 ≤100자) | 남은 수정 |
|---|---|---|---|
| B1 | 해소 | [PRODUCT](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:226) §15 “OPEN_ISSUES_AND_RISKS §2”; FINAL·AGENT_INTEGRATION·SECURITY도 §2 | 없음 |
| B2 | 해소 | [MASTER](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:50) “ACCEPTANCE_CRITERIA §1 P11a + §2 MVP-Core 행”; PHASE P11a·P11b도 수정 | 없음 |
| B3 | 해소 | [ACCEPTANCE](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:19) “SKILL_CONFLICT_RESOLUTION §2 … §3”; MASTER S7도 문서명 명시 | 없음 |
| B4 | 해소 | [PRODUCT](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:6)가 [보관 사본](D:/LLM/agent-studio/docs/planning/archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md)을 지정하며 파일은 존재함 | 원본과 사본의 동일성은 독립 원본이 없어 **UNVERIFIED**. 커밋 포함 문제는 N6 참조 |
| B5 | 해소 | [EVIDENCE_SPEC](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:25)와 [SECURITY](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:144)가 존재하는 `SKILL_INVENTORY.md`를 지정 | 없음 |
| C1 | 부분 해소 | [USAGE_PLAN](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:64) §4가 여전히 “선례” 한 절로 남고 계획 로그만 가리킴 | “§4 선례”를 삭제하고, 필요한 형식 참조 한 줄만 수동 증거 프로토콜을 설명하는 기존 절로 옮긴다. |
| C2 | 부분 해소 | [OPEN_ISSUES](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:79) “`archive/` 문서에 남은 `UNVERIFIED`”; §3은 근거 파일 위치만 서술 | “현행 미검증 항목과 해소 Task는 §2 표에서 추적한다.”로 §2 끝을 정리하고, §3의 출처 경로는 해당 설계 문서 메타에만 둔다. |
| C3 | 해소 | [README](D:/LLM/agent-studio/docs/planning/README.md:55) “`archive/evidence/`는 설계 근거 자료의 보관 경로” | 없음 |
| D1 | 해소 | [SECURITY](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:132) “앱·브로커는 CLI 자격증명을 읽거나 복사·전달하지 않으며” | 없음 |
| D2 | 해소 | [SECURITY](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:111) “사전 차단은 §2.1의 실측·설정 조건 … 충족할 때만” | 없음 |
| D3 | 해소 | [PHASE](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:75) P11a “내부 빌드는 unsigned … 공개 배포물 서명 검증은 P11b” | 없음 |
| E1 | 해소 | [MASTER](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:100) S4가 `blocked / approval_requested / bypassed`를 기록하고 값 자체는 단언하지 않음 | 없음 |
| E2 | 해소 | [ACCEPTANCE](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:15) AC-P00-2 “변경이 발생한 경우 … 포착됨(변경이 없으면 변경 0 … 기록)” | 없음 |
| E3 | 부분 해소 | [MASTER](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:62)에 S0 단계가 생겼으나 PHASE·AC·2차 승인과 범위가 맞지 않음 | 아래 N1~N4를 반영해 S0를 **11개 스파이크와 별도인 선행 운영 Task**로 일관되게 정의한다. |

## 3. 새 지적

| # | 판정 | 근거(파일·절·인용 ≤100자) | 남은 수정 |
|---|---|---|---|
| N1 | 새 문제 | [MASTER](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:62) “각 Task는 `spikes/<id>/`에 … 스크립트”; S0는 저장소 개설 Task이며 별도 스크립트·테스트가 정의되지 않음. CI 추가 뒤 커밋 단계도 없음 | “각 **스파이크 Task(S1a/b/c·S2~S9)**는 독립 스크립트와 보고서를 산출한다. S0는 점검 결과·CI 설정을 커밋한 뒤 첫 push를 수행한다.” |
| N2 | 새 문제 | [PHASE](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:50) P00 7항은 S0를 Task 목록에서 빼고 “Task당 1건 = 11건”이라고 함 | “첫 Task S0는 저장소 개설·첫 push 점검이며, 이후 **11개 스파이크 Task**가 각각 보고서 1건을 산출한다(S0 보고서는 별도).” |
| N3 | 새 문제 | [ACCEPTANCE](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:14) AC-P00-1은 11건인데 증거 경로 `docs/spikes/S*.md`에는 새 `S0.md`도 포함됨 | “AC-P00-1의 11건은 S1a·S1b·S1c·S2~S9 보고서에 한정한다. `S0.md`는 별도 선행 운영 증거로 확인한다.” |
| N4 | 새 문제 | [CHECKLIST](D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:16) 2차 승인 입력은 “P00 보고서 11건”뿐이라 S0 점검·첫 push·CI 결과의 포함 여부가 불명확함 | “2차 승인 입력에는 **S0 첫 push 점검·CI 결과 보고서 1건과 스파이크 보고서 11건**을 제출한다.” |
| N5 | 새 문제 | [CHECKLIST](D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:23)는 새 기준 문서의 공개 여부를 점검하지만 [R22](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:34)의 공개 대상 목록에는 빠짐 | “R22의 첫 push 공개 점검 대상에 `archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md` 사본을 포함한다.” |
| N6 | 새 문제 | `git status --short`에서 `archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md`가 `??`로 표시됨. 따라서 `git diff 402a5c0 -- docs/planning`에는 파일 내용이 포함되지 않음 | B4 수정이 커밋에서 빠지지 않도록 해당 새 파일을 명시적으로 포함한다. |
| N7 | 추가 발견 | [OPEN_ISSUES](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:7) 결정 경위가 “U1~U9·C5·C7”로 표기돼 §1.1의 U10을 빠뜨림. C4 수정으로 생긴 오류는 아님 | “사용자 결정 U1~U10·C5·C7의 결정 경위는 `archive/DECISION_LOG.md` §1에 있다.” |

**최종 판정: 수정 후 수용.**