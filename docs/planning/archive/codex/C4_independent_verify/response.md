## 1. 요약

정리 전 인벤토리 **1,356개 항목을 활성 문서 34개와 대조한 결과, 확인된 결정 손실은 없습니다.** 다만 잘못된 절 참조와 수용 시험의 조건 불일치가 남아 있습니다. 문서는 수정 후 수용이 적절합니다. 문서는 수정하지 않았습니다.

| 항목 | 건수 | 심각도 |
|---|---:|---|
| A 결정 인벤토리·의미 손실 | 0 | — |
| B 교차 참조 | 5 | High 5 |
| C 이력 잔존 | 3 | Medium 3 |
| D 단일 출처·보장 표현 | 3 | Critical 2, Medium 1 |
| E P00~P01 실행 가능성 | 3 | Critical 2, Medium 1 |
| **전체 판정** | **14** | **수정 후 수용** |

## 2. 판정표

| # | 문서 | 위치(절·표 행, 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 문장) |
|---|---|---|---|---|---|
| B1 | [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:7), [FINAL_ARCHITECTURE_DECISIONS.md](D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md:44), [AGENT_INTEGRATION_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:9), [SECURITY_MODEL.md](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:9) | “미검증 사실과 해소 Task는 OPEN_ISSUES_AND_RISKS §3” | 해당 문서 §3은 ‘확인된 사실’이다. 미검증 작업표는 §2다. PRODUCT §15에도 같은 오류가 있다. | High | “미검증 사실과 해소 Task는 `OPEN_ISSUES_AND_RISKS §2`에서 추적한다.” |
| B2 | [MASTER_IMPLEMENTATION_PLAN.md](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:50), [PHASE_BREAKDOWN.md](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:75) | “ACCEPTANCE §MVP-Core” | 그런 절은 없다. MVP-Core 게이트는 ACCEPTANCE §1의 P11a와 §2의 릴리스 행에 있다. | High | “MVP-Core 수용 기준은 `ACCEPTANCE_CRITERIA §1 P11a 및 §2 MVP-Core 행`을 따른다.” |
| B3 | [ACCEPTANCE_CRITERIA.md](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:19), [MASTER_IMPLEMENTATION_PLAN.md](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:114) | “§2 TDD·디버깅·코드 리뷰 … §3 라우터 충돌” | 문서명을 생략해 AC 문서의 §2로 읽힌다. AC 문서에는 §3도 없다. | High | “`SKILL_CONFLICT_RESOLUTION §2`의 TDD·디버깅·코드 리뷰 3행과 `§3`의 노출 충돌 1건을 실험한다.” |
| B4 | [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md:6) | “기준 문서 `CLAUDE_CODE_SKILLS_SETUP.md`(U3)” | 저장소 안에서 원문을 찾지 못했다. U3가 수용한 기준 문서의 내용은 이 문서 묶음만 받은 구현자가 확인할 수 없다. 외부 원문의 존재는 **UNVERIFIED**다. | High | “U3의 기준 문서 `CLAUDE_CODE_SKILLS_SETUP.md` 원문은 저장소에 포함되지 않아, 원문 확보 전 출처를 UNVERIFIED로 둔다.” |
| B5 | [SECURITY_MODEL.md](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:144), [SKILL_EXECUTION_EVIDENCE_SPEC.md](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md:25) | “커밋 고정(SOURCES.md)”; “SOURCES.md와 대조” | `SOURCES.md`가 저장소에 없다. 출처·커밋·해시가 있는 인벤토리는 `archive/evidence/SKILL_INVENTORY.md`에 존재한다. | High | “스킬 출처·고정 커밋·해시는 `archive/evidence/SKILL_INVENTORY.md`와 대조한다.” |
| C1 | [DEVELOPMENT_SKILL_USAGE_PLAN.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md:64) | “계획 수립 단계에서 … 실제 호출·적용하고 … 거부된 기록” | 활성 설계에 계획 수립 과정 전용 §4가 남았다. | Medium | “수동 증거 기록의 형식 예시는 `archive/evidence/PLANNING_SKILL_LOG.md`를 참조한다.” |
| C2 | [OPEN_ISSUES_AND_RISKS.md](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md:79) | “계획 당시 기록”; §3 “계획 수립 중 확인한 사실” | 허용된 ‘결정 경위’ 한 줄 외에 과정 설명이 남았다. | Medium | “현행 미검증 항목은 §2에만 기재하며, 근거 자료는 `archive/evidence/`에 보관한다.” |
| C3 | [README.md](D:/LLM/agent-studio/docs/planning/README.md:55) | “`archive/evidence/`는 계획 당시 증거” | 이력 표현 ‘당시’가 활성 문서에 남았다. | Medium | “`archive/evidence/`는 설계 근거 자료의 보관 경로다.” |
| D1 | [SECURITY_MODEL.md](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:132), [ADR-0007](D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0007-인증-모드-CLI-로그인-재사용-기본.md:13) | “자격증명은 별도 브로커에서 필요한 프로세스에만 전달” | ADR은 앱이 CLI 자격증명을 읽거나 복사하지 않고 CLI가 자체 인증한다고 결정했다. ‘브로커 전달’은 다른 구현을 지시한다. | Critical | “CLI 자격증명은 앱·브로커가 읽거나 복사·전달하지 않으며, 설치된 CLI 프로세스가 자체 인증을 사용한다.” |
| D2 | [SECURITY_MODEL.md](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:111), [ACCEPTANCE_CRITERIA.md](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:43) | 엄격 모드 보장 “모든 쓰기 사전 승인” | §2.1과 AC-P10a-5는 고위험 효과의 사전 차단을 S1c·S4 실측과 MCP·Hook 제외에 조건부로 둔다. §3의 짧은 표현은 보장 범위를 넓게 읽히게 한다. | Medium | “엄격 모드의 파일 적용은 앱 승인을 거치며, 그 외 고위험 효과의 사전 차단 보장은 §2.1의 실측·설정 조건을 충족할 때만 성립한다.” |
| D3 | [PHASE_BREAKDOWN.md](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md:75), [MASTER_IMPLEMENTATION_PLAN.md](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:31) | P11a “서명 없음(내부)”과 “보안: 서명 검증” | 같은 P11a 항목 안에서도 충돌한다. 내부 빌드는 unsigned이고 공개 배포물에 서명이 필수라는 결정과 맞춰야 한다. | Critical | “P11a 내부 빌드는 설치물 해시를 검증하고, 공개 배포물의 서명 검증은 P11b 게이트에서 수행한다.” |
| E1 | [MASTER_IMPLEMENTATION_PLAN.md](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:100), [ACCEPTANCE_CRITERIA.md](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:21) | S4 “차단 또는 승인 요청으로 나타남을 단언” | AC-P00-7b는 차단 실패 조합도 판정·경고 등록 후 P00을 통과시킨다. S4 테스트의 단언대로면 그 조합에서 테스트가 실패해 실행 게이트가 달라진다. | Critical | “S4 테스트는 각 조합의 차단·승인 요청·우회 결과를 단언 가능한 판정값으로 기록하고, 불합격 조합은 `isolation_warning` 등록과 보장 수준 하향을 검증한다.” |
| E2 | [ACCEPTANCE_CRITERIA.md](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:15), [MASTER_IMPLEMENTATION_PLAN.md](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:68) | AC-P00-2 “승인 요청 없이 변경된 파일이 … 포착됨” | S1a의 `workspaceWrite` 시험은 변경 발생 여부를 관찰값으로 둔다. 변경이 없을 때도 AC 문장은 변경 파일 포착을 요구한다. | Critical | “`workspaceWrite`에서 변경이 발생한 경우에는 승인 없는 변경 파일을 사후 diff 감사가 `unapproved_write`로 포착하고, 변경이 없으면 변경 0과 승인 요청 여부를 기록한다.” |
| E3 | [MASTER_IMPLEMENTATION_PLAN.md](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:62), [IMPLEMENTATION_APPROVAL_CHECKLIST.md](D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md:20) | “첫 Task로 C7 저장소 생성·push·CI” | 첫 Task가 S1a~S9처럼 단계·검증·증거로 정의되지 않았다. 현재 Git remote도 없어 public 저장소 생성과 첫 push 전 점검의 실행 순서를 구현자가 직접 정해야 한다. | Medium | “P00 첫 Task: 비밀 스캔과 CHECKLIST §2 점검 결과를 기록한 뒤 public 저장소를 생성하고, 최소 CI를 추가·검증한 다음 첫 push를 수행한다.” |

## 3. 인벤토리 대조 결과

**손실 없음.** `inventory_before.json`의 34개 원본 파일에서 추출된 REQ·AC·TEST·CAP·D·R·ADR·Phase·Spike·Event·Enum·U·수치 **총 1,356개 항목**은 활성 문서 어딘가에 모두 존재한다. `ARCHITECTURE_COMPARISON`의 현행 비교는 `TECH_STACK_DECISIONS §1`, 개명된 ADR-0007의 결정은 현행 ADR에서 확인했다.

원본의 `30분`처럼 이력 표에서 제거된 값은 현행 제한값 `20분(작업 시작 전 설정 시 최대 30분)`과 구분했다. 안전 모드 기본, CLI 로그인 재사용 기본, `CODEX_HOME` 공유 기본, 에이전트 자율 스킬 선택 기본도 활성 문서에 남아 있다. 위 판정표는 **항목 소실**과 별개로, 현행 문서 사이에서 구현·검증을 다르게 이끌 수 있는 문제다.

## 4. C5 재검증에서 다시 볼 파일

B1~B5의 참조 수정과 D·E의 조건 정합성을 확인할 파일은 [README.md](D:/LLM/agent-studio/docs/planning/README.md), [PRODUCT_REQUIREMENTS.md](D:/LLM/agent-studio/docs/planning/00_product/PRODUCT_REQUIREMENTS.md), [FINAL_ARCHITECTURE_DECISIONS.md](D:/LLM/agent-studio/docs/planning/01_architecture/FINAL_ARCHITECTURE_DECISIONS.md), [ADR-0007](D:/LLM/agent-studio/docs/planning/01_architecture/adr/ADR-0007-인증-모드-CLI-로그인-재사용-기본.md), [AGENT_INTEGRATION_DESIGN.md](D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md), [DEVELOPMENT_SKILL_USAGE_PLAN.md](D:/LLM/agent-studio/docs/planning/03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md), [SKILL_EXECUTION_EVIDENCE_SPEC.md](D:/LLM/agent-studio/docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md), [SECURITY_MODEL.md](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md), [MASTER_IMPLEMENTATION_PLAN.md](D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md), [PHASE_BREAKDOWN.md](D:/LLM/agent-studio/docs/planning/05_plan/PHASE_BREAKDOWN.md), [ACCEPTANCE_CRITERIA.md](D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md), [IMPLEMENTATION_APPROVAL_CHECKLIST.md](D:/LLM/agent-studio/docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md), [OPEN_ISSUES_AND_RISKS.md](D:/LLM/agent-studio/docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md)입니다.