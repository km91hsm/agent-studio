## 1. 요약

`402a5c0`의 활성 문서 34개를 읽고 `1ff4372`와 대조했다. REQ·AC·TEST·CAP·D·R ID, 18개 Phase의 18항목, 주요 표의 행 수는 유지됐다. 아래 건수는 **지적 위치 기준**이며, F에는 정리 전부터 있던 보장 문구의 잔존 오류도 별도로 표시했다.

| 항목 | 건수 | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|---:|
| A 결정 손실 | 1 | 1 | 0 | 0 | 0 |
| B 끊어진 참조 | 6 | 0 | 6 | 0 | 0 |
| C 이력·과정 잔존 | 6 | 0 | 0 | 4 | 2 |
| D 중복·추가 축약 | 3 | 0 | 0 | 2 | 1 |
| E U10 일관성 | 10 | 1 | 6 | 3 | 0 |
| F 모순·오류 | 7 | 3 | 1 | 2 | 1 |

**판정: 수정 후 수용.** 결정과 표의 대량 손실은 없지만, 2차 승인 조건의 누락과 U5를 뒤집는 D18 문구는 먼저 고쳐야 한다.

## 2. 판정표

### A. 결정 손실

| # | 문서 | 위치(절·표 행, 원문 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 수 있는 문장) |
|---|---|---|---|---|---|
| A1 | `05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md` | §1 2차 승인: “P00 보고서 11건 … + 범위 축소 제안 + SECURITY_MODEL §2.1 갱신분” | 정리 전에는 **수정분의 Codex 독립 재검증 결과**도 2차 승인 입력이었다. 현재 활성 문서에는 없고 `DECISION_LOG` §1에만 남았다. 승인 게이트의 실질 조건이 빠졌다. | Critical | “2차 승인 입력: P00 보고서 11건, 범위 축소 제안, SECURITY_MODEL §2.1 갱신분, 설계 수정분의 Codex 독립 재검증 결과.” |

### B. 끊어진 참조

| # | 문서 | 위치(절·표 행, 원문 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 수 있는 문장) |
|---|---|---|---|---|---|
| B1 | `02_agents_state/COLLABORATION_PROTOCOL.md` | §2 구현 행: “§5.5 조건” | §5.5 절은 없다. 뜻하는 대상은 §5의 **5번 규칙**이다. | High | “§5의 5번 리뷰 생략 규칙을 모두 충족할 때만 리뷰를 생략한다.” |
| B2 | `02_agents_state/PHASE_MANAGEMENT_DESIGN.md` | §2 `IMPLEMENTING→VERIFYING`: “COLLABORATION §5.5” | 같은 잘못된 참조이며, 이 행의 요약에는 `capture_confidence=complete`도 빠져 있다. | High | “COLLABORATION_PROTOCOL §5 5번의 금지 범주·파일 ≤2·테스트 통과·효과 원장·`capture_confidence=complete` 조건을 모두 충족한다.” |
| B3 | `03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md` | §2 아래: “ROUTING_POLICY §1.2” | 정책 문서에는 §1.2 절이 없다. §1의 2번 규칙이다. | High | “한 단계의 lead는 하나다(ROUTING_POLICY §1 2번).” |
| B4 | `03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md` | §5: “스킬 선택을 검토(§8)” | 이 문서는 §5에서 끝난다. U10 이후의 선택 대조 위치도 Task 시작 시로 고정할 수 없다. | High | “관찰된 선택과 기대 스킬의 대조 결과는 ROUTING_POLICY §3에 따라 `SkillSelectionReviewed`로 기록한다.” |
| B5 | `03_skills/SKILL_CONFLICT_RESOLUTION.md` | §3 첫 행: “확정 반영(§4.0)” | §4.0 절은 없다. §4의 번호 0 규칙을 뜻한다. | High | “실험 후 §4의 0번 확정 규칙에 반영한다.” |
| B6 | `02_agents_state/DATABASE_SCHEMA.md` | §4 백업: “SECURITY_MODEL §7 백업 행” | SECURITY_MODEL §7은 Electron·IPC이고, 백업 행은 §5에 있다. | High | “백업 파일은 항상 암호화한다(SECURITY_MODEL §5 ‘백업’ 행).” |

Markdown ADR 색인의 링크와 현행 `archive/…` 경로는 존재한다. `docs/spikes/…`는 구현 시 생성할 산출 경로로 명시되어 있으므로 끊어진 참조로 세지 않았다.

### C. 잔존 이력·과정 서술

| # | 문서 | 위치(절·표 행, 원문 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 수 있는 문장) |
|---|---|---|---|---|---|
| C1 | `02_agents_state/COLLABORATION_PROTOCOL.md` | 메타: “UNVERIFIED \| 0” | C1에서 제거하기로 한 메타 집계다. | Low | 해당 메타 행 삭제. |
| C2 | `02_agents_state/PHASE_MANAGEMENT_DESIGN.md` | 메타: “UNVERIFIED \| 0” | 같은 메타 집계가 남았다. | Low | 해당 메타 행 삭제. |
| C3 | `03_skills/SKILL_COMPATIBILITY_MATRIX.md` | §B `research`, `codebase-design`: “계획 중 적용” | 활성 호환성 표에 계획 수립 과정의 실행 시점이 남았다. 실행 증거는 archive를 참조하면 된다. | Medium | 실행 열은 “실행 관찰됨”으로 표기하고, 당시 증거 경로는 표 머리의 archive 참조 한 곳에 둔다. |
| C4 | `03_skills/SKILL_COMPATIBILITY_MATRIX.md` | §E: “실행 검증됨 2 … 계획 단계 Claude 측” | 55행 분류 집계와 별개인 과거 계획 세션 상태다. | Medium | “분류는 55행을 기준으로 집계한다. 공급자별 실행 검증 상태는 P00 S7 결과로 갱신한다.” |
| C5 | `03_skills/SKILL_COMPATIBILITY_MATRIX.md` | §G: “최신 커밋이 확인된 항목: impeccable(…→…), orchestration(…→…)” | 업데이트 보류라는 현행 규칙 뒤에 과거 후보 커밋 비교가 남았다. 비교 이력은 `DECISION_LOG`에 있다. | Medium | “설치본은 매트릭스 기준 커밋에 고정한다. 업데이트는 변경 검토와 사용자 승인 후에만 적용한다.” |
| C6 | `05_plan/OPEN_ISSUES_AND_RISKS.md` | §3: “확인된 사실 (계획 중 해소)”, “Codex 후보 스킬 미설치” | 계획 과정의 확인 기록과 당시 로컬 환경 스냅숏이다. U5 설치 후에는 “미설치” 행이 곧 낡는다. | Medium | §3은 현재 계약의 근거만 한 줄로 가리키고, 당시 확인 목록은 `archive/evidence/`와 `DECISION_LOG`에 둔다. |

### D. 단일 출처·불필요한 중복

| # | 문서 | 위치(절·표 행, 원문 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 수 있는 문장) |
|---|---|---|---|---|---|
| D1 | `01_architecture/FINAL_ARCHITECTURE_DECISIONS.md` | D11: 승인 계층·U8·경고·보장 수준을 장문으로 재서술 | 정본인 SECURITY_MODEL §2.1과 두 군데를 함께 고쳐야 한다. D11의 결정과 U8 결과는 남기되 조건표 설명은 참조로 줄일 수 있다. | Medium | “승인은 요청이 발생한 효과에 적용하고, 고위험 효과의 정식 경로는 앱 실행기다. U8의 안전 기본값·전 조합 옵트인·경고 조건과 조합별 보장은 SECURITY_MODEL §2.1을 따른다.” |
| D2 | `05_plan/PHASE_BREAKDOWN.md` | P00 7항 S1a~S9 설명과 MASTER Phase 00 Task 상세 | Phase의 18항목 구조는 필요하지만, 스파이크별 시험 내용이 MASTER와 이중 관리된다. | Medium | “7. Task: S1a→(S1b∥S1c), S2~S9. 각 Task의 입력·단언·보고서는 MASTER_IMPLEMENTATION_PLAN Phase 00을 정본으로 한다.” |
| D3 | `01_architecture/TECH_STACK_DECISIONS.md` | §1 대안 표 직후 “A는 Python 사이드카로… B1은… B2는…” | 바로 위 비교표의 기각 이유를 문장으로 다시 읽는다. C의 위험·검증 실험만 문단에 남기면 된다. | Low | “채택한 C의 데몬 생명주기와 재접속은 P00 S5·S6의 E1~E5로 검증한다.” |

### E. U10 일관성·설계 결함

| # | 문서 | 위치(절·표 행, 원문 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 수 있는 문장) |
|---|---|---|---|---|---|
| E1 | `01_architecture/FINAL_ARCHITECTURE_DECISIONS.md` | D18: “Codex 측 스킬 설치는 보류(U5) → … V1 이후” | 2026-11-02 U5 재결정과 정반대다. 메타 행은 새 결정을 말하지만 D18은 옛 결정을 정본처럼 말한다. | Critical | “Codex 주도 스킬 8종은 구현 착수 시 C4 승인 후 P00 S7 전에 폴더 전체를 설치하며, S7에서 Codex 자율 선택과 로드 증거를 실측한다.” |
| E2 | `01_architecture/SYSTEM_ARCHITECTURE.md` | §2 `select(taskKind…)→Selection`; §3 “SkillRouter.select → SkillSelected → Gateway.startRun” | 앱이 선택해 실행 전에 `SkillSelected`를 쓰는 옛 순서다. U10의 자율 선택에서는 관찰 후에 기록된다. | High | “Router는 노출 범위와 기대 스킬을 산출한다. Gateway 실행 중 에이전트의 선택이 관찰되면 `SkillSelected`를 기록하고 기대값과 대조한다.” |
| E3 | `03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md` | §1 1번은 사용자 `/name` 우선, §4는 “기대 … 오선택 … REWORK” | 사용자가 기대표와 다른 허용 스킬을 명시했을 때도 오선택으로 처리할지 불명확하다. 두 규칙을 그대로 구현하면 사용자 우선이 무효화될 수 있다. | High | “허용된 사용자 명시 호출은 기대표 불일치만으로 REWORK하지 않는다. 금지·보류·비호환 스킬은 사유를 표시하고 실행을 거부한다.” |
| E4 | `03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md`; `05_plan/OPEN_ISSUES_AND_RISKS.md` | §3 Codex: “`skills/list` … DISCOVERED”; V12·V24는 주입·로딩만 검증 | `skills/list` 노출만으로 Codex가 **자율 선택**하는지는 확인되지 않았다. 고유 절차 첫 단계가 다른 스킬·일반 작업과 구별되는지도 미검증인데 V1~V33에 독립 항목이 없다. **UNVERIFIED.** | High | “V34: Codex가 이름 없는 프롬프트에서 설치 스킬을 자율 선택하는지, 선택 관찰 신호와 오탐 가능성을 P00 S7에서 실측하고 EVIDENCE_SPEC §3에 반영한다.” |
| E5 | `04_security_test/TEST_STRATEGY.md`; `05_plan/ACCEPTANCE_CRITERIA.md` | TEST-CO-06: “`SkillSelected`+`SkillInjectionAccepted`+…”; AC-P10a-6: “skill 입력 전송 로그” | 두 시험 모두 명시 주입을 필수 증거로 요구한다. U10의 정상적인 implicit 선택에는 `SkillInjectionAccepted`가 없을 수 있다. | High | “implicit 경로는 관찰된 `SkillSelected`·고유 절차·산출물로, explicit 교정 경로는 여기에 `SkillInjectionAccepted`를 더해 각각 판정한다.” |
| E6 | `05_plan/PHASE_BREAKDOWN.md` | P07 T3: “Evidence 관찰(Claude Skill 도구 블록, Codex skills/list+skill 입력)” | 제품 Verifier 구현 Task가 Codex implicit 경로를 빠뜨린다. | Medium | “T3 Evidence 관찰: Claude Skill 도구 블록, Codex의 자율 선택 시그니처, 명시 skill 입력을 별도 경로로 수집한다.” |
| E7 | `02_agents_state/DATABASE_SCHEMA.md` | `skill_evidence`: “… selection_reason … verification_status” | EVIDENCE_SPEC의 U10 필드 `invocation_mode`가 투영 열에 없다. implicit·explicit·거부를 UI와 재생 검사에서 구별할 저장 계약이 불명확하다. | High | “`skill_evidence`에 `invocation_mode`를 포함하고 `SkillSelected` 생산 이벤트에서 재생한다.” |
| E8 | `03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md`; `05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md` | “주도 스킬 8종”; C4 “복사 대상 목록·해시표” | 설치할 **정확한 8개 이름**이 활성 문서에 없다. CONFLICT §2는 8행이나 UI 행에는 단계별 두 스킬이 있어, 행 수로 폴더 8개를 추론할 수 없다. 대상 명단은 **UNVERIFIED**다. | High | “C4 결정 입력에는 설치할 8개 스킬의 정확한 이름·원본 경로·해시와 CONFLICT §2 각 행의 대응을 열거한다.” |
| E9 | `03_skills/SKILL_CONFLICT_RESOLUTION.md` | §3: “using-superpowers 라우터 **활성** 후보” | U10에서 Router는 스킬 선택 주체가 아니다. 이 표현은 앱이 후보를 골라 활성 호출하는 것으로 읽힌다. | Medium | “Router는 `using-superpowers`의 노출 가능 여부만 판정하고, 에이전트가 선택한 결과를 경쟁 스킬과 대조한다.” |
| E10 | `05_plan/MASTER_IMPLEMENTATION_PLAN.md` | S7 Step 3: “충돌 실험 … Skill 도구 호출 블록 인용” | 양 에이전트 실험을 요구하면서 Codex에도 Claude의 Skill 도구 블록을 증거로 요구하는 형태다. | Medium | “Claude는 Skill 도구 블록을, Codex는 `skills/list`·선택 관찰·고유 절차 이벤트를 인용한다.” |

### F. 모순·오류

F5·F6은 **정리 전에도 있던 문구**다. 새로 생긴 오류로 세지 않고, 최종본에서도 보장표와 충돌하는 잔존 오류로 표시한다.

| # | 문서 | 위치(절·표 행, 원문 인용 ≤120자) | 문제 | 심각도 | 제안 수정(바로 적용할 수 있는 문장) |
|---|---|---|---|---|---|
| F1 | `README.md` | 결정 8: “필수 스킬은 `APPLIED_VERIFIED` 없이 `VERIFYING` 통과 불가” | EVIDENCE_SPEC §5는 `plan/research/prototype/review`에 한해 마지막 단계 산출물과 결합한 `LOAD_OBSERVED`를 허용한다. 요약에서 보장 조건이 사라져 합격 기준이 달라졌다. | Critical | “필수 스킬은 기본적으로 `APPLIED_VERIFIED`가 필요하며, EVIDENCE_SPEC §5의 네 Task kind만 지정 산출물과 결합한 `LOAD_OBSERVED`로 통과한다.” |
| F2 | `README.md` | 문서 지도: “충돌 8행 … 4건 확정·5행 잠정” | 4+5는 9다. 실제 계획은 **8행 중 3행 실험 + 별도 횡단 충돌 1건**, 나머지 5행 잠정이며 S7은 아직 실행되지 않았다. | Medium | “충돌 8행: P00 S7에서 3행과 별도 횡단 충돌 1건을 실험하고, 나머지 5행은 P07까지 잠정으로 둔다.” |
| F3 | `README.md` | 문서 지도: “R1~R22” | OPEN_ISSUES에는 U10 위험 R23이 추가됐다. | Low | “R1~R23, 미검증 사실 V1~V33 → 해소 Task.” |
| F4 | `05_plan/ACCEPTANCE_CRITERIA.md`; `05_plan/MASTER_IMPLEMENTATION_PLAN.md` | AC-P00-1 “보고서 11건”; MASTER “S9 미완은 P01 진입을 막지 않음” | S9의 완료 보고·AC-P00-9 결정 게이트·2차 승인 입력이 어떤 상태이면 P01에 들어갈 수 있는지 서로 맞물리지 않는다. 11번째 **상태 보고서**와 S9 **완료 판정**을 구분해야 한다. | High | “S9가 미완이어도 `S9.md`에 미완 사유·CAP별 현재 판정·남은 실험을 기록해 11건의 상태 보고서를 제출한다. 미완 CAP의 결정 게이트와 2차 승인 예외는 사용자에게 명시한다.” |
| F5 | `02_agents_state/COLLABORATION_PROTOCOL.md` | §1: “원격 Git·DB·설치·배포·외부 서비스는 앱 전용 실행기만 수행” | **잔존 오류.** SECURITY_MODEL §2.1은 일반·자동 모드의 셸·MCP 우회를 인정한다. “만 수행”은 조건부 보장을 전 조합에 확대한다. | Critical | “이 효과의 정식 경로는 앱 전용 실행기다. 실행기 외 경로의 사전 차단 여부는 SECURITY_MODEL §2.1의 조합별 보장을 따른다.” |
| F6 | `01_architecture/SYSTEM_ARCHITECTURE.md` | §4: “worktree 밖 쓰기 거부(브로커 + 공급자 샌드박스)” | **잔존 오류.** Claude native Windows 등은 SECURITY_MODEL §2.1에서 `POLICY_ONLY` 또는 사후 탐지다. | Critical | “worktree 밖 쓰기는 가능한 조합에서 샌드박스로 제한하고, 나머지는 정책·사후 감사 및 경고로 처리한다(SECURITY_MODEL §2.1).” |
| F7 | `05_plan/OPEN_ISSUES_AND_RISKS.md` | §1 R1~R17 소유·출고 차단 열: “동일” | C1의 `R→Task→출고 차단` 추적을 이 행만으로 읽을 수 없다. 원문에도 있던 약점이 최종본에 남았다. | Medium | “R1~R17 각 행에 해소 Task와 출고 차단 시험 또는 ‘해당 없음’을 직접 적는다.” |

## 3. 추가 삭제 제안(D)

| 문서 | 절 | 이유 | 예상 절감 |
|---|---|---|---:|
| `TECH_STACK_DECISIONS.md` | §1 비교표 뒤 대안별 재서술 | 표에 이미 기각 이유가 있다. E1~E5와 C의 위험은 유지. | 약 0.4 KB |
| `FINAL_ARCHITECTURE_DECISIONS.md` | D11 장문 | 결정 한 문장과 SECURITY_MODEL 정본 참조로 축약. U8 결과는 유지. | 약 0.3 KB |
| `PHASE_BREAKDOWN.md` | P00 7항의 스파이크별 상세 | 18항목과 S1a/b/c 순서는 유지하고 MASTER의 Task 상세를 참조. | 약 1–2 KB |
| `OPEN_ISSUES_AND_RISKS.md` | §3 계획 중 확인 사실 | 현행 위험·V 작업표와 archive 근거가 이미 역할을 맡는다. | 약 0.7–1 KB |

## 4. 삭제 금지 재확인

| C1 삭제 금지 항목 | 판정 |
|---|---|
| D1~D28, U1~U10, REQ·AC·TEST·CAP·R ID의 활성 문서 존재 | ✅ |
| 120/20/15분, 90s/20s, 재시도 3/2, 토큰 3M·30M·300M | ✅ |
| DATABASE_SCHEMA 이벤트 목록, `effects.kind`, `tasks.kind`, 증거 4등급, `selection_reason`·`invocation_mode` enum | ✅ |
| SECURITY_MODEL §2.1의 7행×4열 보장 셀, §2.2의 14행 분류 계약 | ✅ |
| 18 Phase 각각의 1~18항목, 스킬 매트릭스 55행, 충돌표 8행, 복구 S01~S22 | ✅ |
| S1c·S4 실측 및 MCP·Hook 제외를 포함한 조건부 `ENFORCED` 사전조건 | ✅ |
| `capture_confidence` 기본 `uncertain`, `unverifiable` 자동 처리 금지, 만료 승인 재사용 금지 | ✅ |
| CAP 판정과 발견→기동→실행→산출물 축의 구분 | ✅ |
| 변경 파일 ≤2, 1,000 delta/s·p95 100ms, Monaco p95 200ms, 저널 180일 | ✅ |
| CLI 자격증명 미복사, `text_enc` 백업, CSP 정본, 공유 `CODEX_HOME` 설정 스냅숏 | ✅ |
| U5·C5·C7·R22 설치·공개 실행 경계 | ✅ |
| **2차 승인 시 독립 재검증 입력** | ❌ 활성 문서에서 누락(A1) |
| **R→Task→출고 차단을 각 위험에서 읽을 수 있는 추적성** | ❌ R1~R17의 “동일” 표기(F7) |
| **U10 Codex 자율 선택의 미검증 사실→실측 Task→정본 연결** | ❌ V1~V33에 별도 항목 없음(E4) |

## 5. C3에서 다시 볼 파일

수정 지적이 있는 파일만 나열한다.

- `README.md`
- `01_architecture/FINAL_ARCHITECTURE_DECISIONS.md`, `SYSTEM_ARCHITECTURE.md`, `TECH_STACK_DECISIONS.md`
- `02_agents_state/COLLABORATION_PROTOCOL.md`, `PHASE_MANAGEMENT_DESIGN.md`, `DATABASE_SCHEMA.md`
- `03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md`, `DEVELOPMENT_SKILL_USAGE_PLAN.md`, `SKILL_COMPATIBILITY_MATRIX.md`, `SKILL_CONFLICT_RESOLUTION.md`, `SKILL_EXECUTION_EVIDENCE_SPEC.md`
- `04_security_test/TEST_STRATEGY.md`
- `05_plan/MASTER_IMPLEMENTATION_PLAN.md`, `PHASE_BREAKDOWN.md`, `ACCEPTANCE_CRITERIA.md`, `OPEN_ISSUES_AND_RISKS.md`, `IMPLEMENTATION_APPROVAL_CHECKLIST.md`