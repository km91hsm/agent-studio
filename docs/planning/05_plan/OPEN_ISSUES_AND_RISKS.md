# OPEN_ISSUES_AND_RISKS — 위험·미검증 작업

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 범위 | 기술 위험 R1~R23(현행 완화·소유·출고 차단), 활성 설계 문서의 미검증 사실과 해소 Task |
| 결정 경위 | 사용자 결정 U1~U10·C5·C7의 선택지·양측 입장·근거는 `archive/DECISION_LOG.md` §1~§2 |

## 1. 기술 위험

| # | 위험 | 심각도 | 완화 | 검증 Phase | 소유·출고 차단 |
|---|---|---|---|---|---|
| R1 | Windows detached Node 데몬 생명주기(콘솔·종료·좀비·재접속) | High | P00 S5 실측, Job Object/명시 kill, 락·포트 파일 | 00 | 소유: P00 S5, P01 T2(데몬 엔트리·락·포트)·T6(Shell 기동/접속). 출고 차단: TEST-BG-01~04, TEST-RC-01~03 실패 |
| R2 | Codex app-server experimental·스키마 변경 | High | CLI 버전 고정, 시작 스모크, CI `generate-json-schema` diff, exec 읽기 전용 fallback | 00·02 | 소유: P00 S1a·S7, P02 T2, P01 T10(CI 스키마 diff). 출고 차단: 시작 스모크 실패, 스키마 diff 비0 미처리 |
| R3 | Claude SDK↔CLI parity(0.3.N↔2.1.N), `-p` 기본 Manual 권한 모드 | Medium | capabilities 기능 감지, 승인 호스트 필수 | 00·02 | 소유: P00 S2, P02 T3·T4(fault 분류). 출고 차단: TEST-AG-06, TEST-RF-05 |
| R4 | better-sqlite3 네이티브 배포(데몬 런타임 방식 미결) | Medium | 동봉 Node vs runAsNode 비교, 설치물 로드 테스트 | 00·11 | 소유: P00 S6, P11a T2(데몬 런타임 패키징). 출고 차단: TEST-DT-01 설치물 로드 실패 |
| R5 | Monaco worker·strict CSP 설치물 호환 | Medium | custom protocol, P00 S6 | 00·08 | 소유: P00 S6, P08a T2(Monaco 로딩 계약). 출고 차단: TEST-DT-04 설치물 worker 실패 또는 TEST-DT-06 Diff 실패 |
| R6 | 승인 요청 장시간 보류 보장 없음 | Medium | 앱 TTL **15분**, 만료 시 `BLOCKED(approval_expired)`, 복귀 시 새 run·새 요청(D14) | 04 | 소유: P04 T5, P10a T2. 출고 차단: TEST-BG-05, TEST-RF-02 |
| R7 | Codex 스킬 "실제 사용" 전용 이벤트 부재 | Medium | 증거 4등급(DISCOVERED/INJECTION_ACCEPTED/LOAD_OBSERVED/APPLIED_VERIFIED) + 고유 절차 시그니처 | 07 | 소유: P00 S7, P07 T3·T4. 출고 차단: TEST-CO-06 |
| R8 | 토큰만 제공(비용 금액 없음) | Low | 토큰·호출·시간 한도, 금액은 추정 표기 | 10 | 소유: P04 T6(사용량 집계), P10b T8(비용 토큰 한도 UI). 출고 차단: 해당 없음(금액은 "추정" 표기 필수) |
| R9 | 3-OS 서명·notarization·CI 비용 | Medium | Windows MVP-Core 우선, 릴리스만 서명 | 11 | 소유: P11b T4·T5·T6(서명·notarization·패키징)·T10. 출고 차단: V1 게이트 TEST-DT-02·03 + P11b 서명 검증 AC; MVP-Core(Windows)에는 해당 없음 |
| R10 | 스킬 공급망(impeccable 바이너리, web-design-guidelines 원격 지시, caveman-compress 외부 전송) | Medium | 보류 분류, 격리 시험, 사본 고정 | 07 | 소유: P07 T1·T7(격리 시험 러너). 출고 차단: TEST-SE-05(보류 스킬 활성 차단 실패) |
| R11 | 깨진 스킬 참조(grilling, domain-modeling, setup-matt-pocock-skills, orca-cli, cavecrew 에이전트) | Low | 보류 분류, 사용자에게 설치 제안 | 07 | 소유: P07 T1·T6. 출고 차단: 해당 없음(설치 제안 UI만) |
| R12 | 프롬프트 인젝션(프로젝트 지침·원격 규칙) | High | 지침 파일 untrusted·해시 표시·경고·신뢰 재검토(SECURITY §4) | 10a | 소유: P10a T1(정책 엔진의 프로젝트 지침 신뢰 처리 — untrusted·해시·경고·신뢰 재검토). 출고 차단: TEST-SE-07 |
| R13 | 승인 요청이 모든 부작용의 관문이라는 오해(Codex workspaceWrite 자동 쓰기, Claude 자동 허용 도구) | High(완화됨) | 다층 방어·앱 전용 실행기·엄격 모드(D11), 보장 수준 표(ENFORCED/DETECTED/POLICY_ONLY) | 00·10a | 소유: P10a T1·T7(앱 전용 실행기). 출고 차단: TEST-SE-01a, TEST-SE-08, TEST-RF-01 |
| R14 | Windows Claude native = OS 격리 없음 | High | 기본 안전 모드에서는 신뢰 프로젝트·참석·검토 중심; 자동·무인 모드는 사용자 옵트인 가능(U8) — 경고 배지·활성 시 1회 확인·SECURITY §2.1 보장값(POLICY_ONLY/DETECTED) 표시·SE-08/09 감사 시험 | 00·01·11a | 소유: P00 S4, P01 T11(경고 집행), P11a T3(수용 시험). 출고 차단: TEST-SE-08·09 감사 미탐지, §2.1↔UI 라벨 불일치 |
| R15 | 세션 재개가 파일·Git·효과를 복원한다는 가정 | High | 저널·git ref·blob 해시·효과 ID 분리, 불확실 자동 재실행 금지 | 00·04·05 | 소유: P00 S8, P04 T3·T4, P05 T4. 출고 차단: TEST-RC-04·05·06 |
| R16 | Node 표준 API만으로 Windows Job Object 연동 불가 가능성 | Medium | 명시 kill 1차, 실패 시 네이티브 헬퍼 검토 | 00 | 소유: P00 S5. 출고 차단: 해당 없음(S5·TEST-BG-03의 자손 0 단언 실패 시 네이티브 헬퍼 결정) |
| R17 | CLI 자체 세션·진단 로그는 앱 마스킹 범위 밖 | Medium | 보존·접근 정책 점검, 사용자 고지 | 10a | 소유: P10a T3(Redaction + CLI 자체 로그 보존·접근 정책 점검·사용자 고지, V32). 출고 차단: 해당 없음(TEST-SE-04는 앱 로그만 검사) |
| R18 | Desktop 앱 전용 기능(computer-use·문서 플러그인·synced 스킬)이 헤드리스 경로에서 사라질 위험 + 공유 `CODEX_HOME`의 설정 변동·hook·MCP 노출 | High | 최대 통과 + 3단 보충(REQ-CAP) + S9 판정, 공유 시 유효 설정(`mcp_servers`·`notify`·hooks·플러그인) 스냅숏·표시·변경 감지, 앱 소유 스레드 필터, 격리 프로필 전환 옵션(U9) | 00·10b | 소유: P02 T2(스냅숏), P07 T5, S9 |
| R19 | **일반 모드 고위험 효과 우회** — Claude native Windows는 OS 격리가 없어 셸 명령으로 원격 Git·설치·외부 전송이 브로커 판정 없이 가능 | **Critical** | 보장 수준 표에 `POLICY_ONLY`·부분 `DETECTED` 명시, 사후 diff·원격 ref·네트워크 로그 감사, S4 판정 → 보장값 하향 + `capabilities.isolation_warning` 경고·활성 시 1회 확인(P01 T11), SE-08/09 감사 시험 | 00·10a·10b | 소유: P10a T1·T7, P01 T11. 출고 차단: SE-08 미탐지 1건, §2.1↔UI 라벨 불일치 1건 |
| R20 | **자동 권한 모드 옵트인(U8) 시 사전 승인 계층이 사라짐** — 앱 전용 실행기는 정식 경로로 남지만 셸 우회를 사전 차단하지 못함 | **Critical** | 프로젝트별 명시 옵트인·상시 배지("사전 차단 보장 없음")·§2.1 자동 모드 적용값(브로커 집행자 제거)·사후 감사 필수·Agent Studio 개발 세션 금지(CHECKLIST D5)·모든 조합에서 노출, 격리 미확인 조합은 경고 배지 + 활성 시 1회 확인 | 02·10a | 소유: P02 T6, P10a T1, P10b T3. 출고 차단: SE-09·SE-10 실패, 자동 모드 UI 문구가 §2.1과 불일치 |
| R21 | **CLI 로그인 재사용(U1)의 약관 위험** — Anthropic·OpenAI 약관이 CLI 로그인의 제3자 앱 재사용을 금지·변경하면 계정 제재 가능. 사용자 책임으로 선택됨 | High | 약관 상태 UI 안내(UI §1), 공급자별 API key 전환 경로 상시 유지(D20), S3에서 재인용·실측, ADR-0007 재검토 조건 | 00·02 | 소유: P00 S3, P02 T4(auth fault). 출고 차단: 전환 경로 미구현 |
| R22 | **public 저장소 노출(C7)** — 계획 문서에 홈 경로·사용자명(`archive/evidence/ENVIRONMENT_SURVEY.md`), 지시서 전문(`archive/evidence/USER_DIRECTIVE.md`), 기준 문서 사본(`archive/evidence/CLAUDE_CODE_SKILLS_SETUP.md`), Codex 응답 원문·thread id(`archive/codex/`)가 포함됨 | Medium | 첫 push 전 사용자 점검(CHECKLIST §2) **완료(2026-11-02)**: 사용자명·thread id 마스킹, 지시서·기준 문서 사본은 로컬 비공개 보관, 비밀 0건, 마스킹 전 이력은 로컬 `planning-history` 브랜치에만 보존(`docs/spikes/S0.md`) | 00 | 소유: P00 첫 Task. 출고 차단: 점검 미실시 push |
| R23 | **에이전트 자율 선택(U10)의 오선택·미선택** — 자동 트리거는 SKILL.md description 매칭과 모델 판단에 의존해 기대 주도 스킬을 건너뛰거나 경쟁 스킬을 고를 수 있음 | Medium | 증거 4등급 게이트(선택 안 하면 `DISCOVERED`로 끝나 REWORK), 기대 스킬 대조 후 REWORK 명시 호출 1회, S7 자동 선택 정확도 표로 기대 표 보정, 사용자 전용·보류 스킬은 노출 자체를 제한 | 00·07 | 소유: P07 T2(Router 대조)·T4(Verifier). 출고 차단: AC-P07-1 실패 |

## 2. 미검증 사실 → 해소 작업

활성 설계 문서에 `UNVERIFIED`로 남은 사실과 그것을 해소하는 Task, 결과를 반영할 정본. 이 표에 없는 `UNVERIFIED`는 두지 않는다.

| # | 활성 문서(위치) | 미검증 사실 | 해소 Task | 결과 반영 정본 |
|---|---|---|---|---|
| V1 | PRODUCT §15 #8, REQ-SK-10 | Claude Desktop ZIP 업로드 파일 수 상한 | P07 T1(공식 문서 재확인) | PRODUCT §15 |
| V2 | PRODUCT §15 #3, SESSION_RECOVERY 메타 | CLI 세션 저장 형식(Codex 세션 파일)의 공식 보장 — 공식 API만 사용해 우회 | P05 T1(API 변동 감지) | SESSION_RECOVERY §2 |
| V3 | PRODUCT §15 #12, AGENT_INTEGRATION §7 CAP-03·04·06, R18 | Desktop 전용 기능(computer-use·문서 플러그인·synced 스킬)의 헤드리스 가용성 | P00 S9 (a)(c)(e) | AGENT_INTEGRATION §7, PRODUCT §13A |
| V4 | ADR-0002, TECH_STACK §4 | 설치 크기·메모리 수치 | P00 S6, P11a·P11b 측정 | TECH_STACK §4 |
| V5 | ADR-0007 | 신규 제품의 CLI 로그인 재사용 허용 범위(약관) | P00 S3 | ADR-0007 재검토 조건, R21 |
| V6 | SYSTEM_ARCHITECTURE·TECH_STACK 메타, ADR-0005 | 데몬 런타임 방식(동봉 Node vs Electron `runAsNode`) | P00 S6 Step 3 | ADR-0005, FINAL D5 |
| V7 | SYSTEM_ARCHITECTURE 메타 | Windows detached 데몬 동작(콘솔·종료·자손 정리·Job Object 필요성) | P00 S5 | SYSTEM_ARCHITECTURE, R1·R16 |
| V8 | SYSTEM_ARCHITECTURE·AGENT_INTEGRATION §3 재연결 행·SESSION_RECOVERY 메타 | app-server 재접속 후 재구독 절차 | P00 S1b | AGENT_INTEGRATION §3 |
| V9 | TECH_STACK 메타, R5 | Monaco worker + strict CSP 설치물 호환 | P00 S6 | SECURITY §7 CSP 문자열(한 줄만 조정) |
| V10 | TECH_STACK §4 | `@napi-rs/keyring` OS 백엔드 범위(3-OS) | P00 S6(Windows), P11b(mac·Linux) | TECH_STACK §4 |
| V11 | AGENT_INTEGRATION 메타, R6 | 승인 요청 장시간 보류(15분) 시 공급자 동작 | P00 S1c | EXECUTION_LIMITS §1 승인 대기 행 |
| V12 | AGENT_INTEGRATION 메타, EVIDENCE_SPEC §3 | Codex `{type:"skill"}` 입력의 실제 주입 | P00 S7(C4 설치 후) | EVIDENCE_SPEC §3 |
| V13 | AGENT_INTEGRATION §3 MCP 행, SECURITY §2.1 MCP 셀 | SDK `mcpServers`로 사용자 MCP 완전 배제 가능 여부 | P00 S2 Step 4 | AGENT_INTEGRATION §3, SECURITY §2.1 |
| V14 | AGENT_INTEGRATION §5 취소 행 | Windows SIGINT 동작(취소 fallback) | P00 S1b·S2 | AGENT_INTEGRATION §5 |
| V15 | AGENT_INTEGRATION 메타, EXECUTION_LIMITS §5 | `thread/tokenUsage/updated` 증분·누적 의미 | P00 S1a | EXECUTION_LIMITS §5 수집 행 |
| V16 | AGENT_INTEGRATION 메타·§5 Fork 행 | SDK 0.3.316 `forkSession(sessionId,{upToMessageId})` 존재 | P00 S2 Step 4 | AGENT_INTEGRATION §5, SESSION_RECOVERY(Fork) |
| V17 | AGENT_INTEGRATION 메타 | `thread/queue/add` experimental opt-in 거부 동작 | P00 S1b | AGENT_INTEGRATION §3 |
| V18 | AGENT_INTEGRATION §1 이벤트표 | SDK MCP elicitation 이벤트 형식 | P00 S2 | AGENT_INTEGRATION §1 `mcp_elicitation_requested` |
| V19 | AGENT_INTEGRATION §7 CAP-01·02 | SDK `permissionMode:'plan'`·자동 모드 값 전달 | P00 S2, S9(f) | AGENT_INTEGRATION §7, PRODUCT §13A |
| V20 | AGENT_INTEGRATION §7 CAP-04 | synced 스킬(pdf·docx·xlsx·pptx) SDK 로드 | P00 S9(a) | AGENT_INTEGRATION §7 |
| V21 | AGENT_INTEGRATION §7 CAP-05 | headless `image_gen` 호출·API key 모드 가용성 | P00 S9(d) | AGENT_INTEGRATION §7, AC-V1-9 |
| V22 | AGENT_INTEGRATION §7 CAP-06 | `--chrome` 상당 SDK 옵션, 번들 브라우저 플러그인 헤드리스 호출 | P00 S9(b)(c) | AGENT_INTEGRATION §7, AC-V1-10 |
| V23 | DATABASE_SCHEMA 메타 | better-sqlite3의 Electron 내장 Node ABI 리빌드 절차 | P00 S6 | DATABASE_SCHEMA, TECH_STACK §4 |
| V24 | SKILL_COMPATIBILITY_MATRIX 메타 | Codex 측 스킬 실제 로딩(주도 8종) | P00 S7(C4 설치 후) | MATRIX |
| V25 | SKILL_COMPATIBILITY_MATRIX 메타·§F | Windows에서 jq 의존 hook 동작 | P07 T7 격리 시험 | MATRIX §F |
| V26 | SKILL_CONFLICT_RESOLUTION 메타 | 실행 결과 기반 충돌 판정(4건 + 잠정 5행) | P00 S7(4건), P07 T2(5행) | SKILL_CONFLICT_RESOLUTION v2 |
| V27 | SKILL_EXECUTION_EVIDENCE_SPEC 메타·§3 | Codex 스킬 로드 이벤트 부재 여부, Claude Skill 도구 블록 필드명 | P00 S7 | EVIDENCE_SPEC §3 |
| V28 | SECURITY 메타 | 설치 버전의 승인·sandbox 동작과 최신 문서 일치 | P00 S1a·S4 | SECURITY §2·§3 |
| V29 | SECURITY 메타·§2.1 파일·네트워크 셀 | Codex Windows `sandbox="elevated"` 실제 차단 | P00 S4 | SECURITY §2.1, `capabilities.isolation_warning` |
| V30 | SECURITY §2.1 실행 명령·고위험 효과·OS 입력 셀 | `readOnly`에서 명령 실행이 승인 요청으로만 가능한지 | P00 S1c | SECURITY §2.1, AC-P10a-5 사전조건 |
| V31 | SECURITY §2.1 MCP 셀 | `-c mcp_servers` 오버라이드가 기존 항목을 제거하는지 | P00 S9(g) | SECURITY §2.1 MCP 셀 |
| V32 | SECURITY §5, R17 | CLI 자체 세션·진단 로그의 보존·접근 통제 | P10a T3(정책 점검·고지 문구) | SECURITY §5 |
| V33 | CHECKLIST §1 C3 | Windows C++ Build Tools 설치 필요 여부 | P00 S6 | CHECKLIST C3 승인 |
| V34 | EVIDENCE_SPEC §3 Codex 행, ROUTING_POLICY §1 1번 | Codex가 이름 없는 프롬프트에서 `skills/list` 노출만으로 설치 스킬을 자율 선택하는지, 선택 관찰 신호(고유 절차 첫 단계)가 다른 스킬·일반 작업과 구별되는지(오탐) | P00 S7 자동 선택 재현(C4 설치 후) | EVIDENCE_SPEC §3, ROUTING_POLICY §2 기대 표 |
| V35 | CHECKLIST §1 C4, USAGE_PLAN §3 | Codex 설치 대상 8개(주도 스킬 9개 − `brainstorming`)의 명단 확정·원본 경로·해시, 8개 모두 Codex에서 로드 가능한지 | C4 승인 입력 작성(구현 착수 시) | CHECKLIST C4, USAGE_PLAN §3 |

현행 미검증 항목과 해소 Task는 이 표에서만 추적한다. 근거 자료는 `archive/evidence/`에 보관한다.
