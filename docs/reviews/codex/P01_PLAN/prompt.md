# 계획 검토 요청: P01 — Shell·데몬 골격 + 상태·승인 계약 구현 계획

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 검토해 주세요. 파일을 수정하지 마세요. `node_modules`와 `spikes/fixtures/**/*.jsonl`(녹화 원문, 큼)은 통째로 읽지 말고 필요한 줄만 grep 하세요.

## 대상

`docs/plans/P01.md` — MASTER_IMPLEMENTATION_PLAN "Phase 01 이후" 규칙("각 Phase 시작 시 Claude가 Files·Interfaces·Step·테스트·커밋 형식의 Phase 계획을 작성하고 Codex가 검토")에 따른 P01 실행 계획. 13개 Task(PHASE_BREAKDOWN P01 T1~T12 + 보고서), 실행 순서는 의존성 기준(T1 → T10 → T9 → T3 → T4 → T5 → T11 → T12 → T2 → T7 → T6 → T8 → 보고서). 아직 구현은 시작하지 않았습니다(저장소에 `packages/`·`apps/` 없음).

## 근거 문서

- `docs/planning/05_plan/PHASE_BREAKDOWN.md` §2 P01(18항목), `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P01-1~7, `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` Global Constraints·"Phase 01 이후"
- `docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md` §1(RPC 접속 계약)·§2(모듈 인터페이스)·§4·§5·§6, `docs/planning/02_agents_state/DATABASE_SCHEMA.md`(이벤트 목록 단일 출처·투영·재생 불변식·마이그레이션), `docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md` §2(전이 규칙표·불변식), `docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md` §1(Gateway·공통 이벤트 10종), `docs/planning/04_security_test/SECURITY_MODEL.md` §2(14행 매트릭스·2.2 분류 계약)·§5·§7·§8, `docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md` §3·§4·§5
- P00 재사용 대상: `spikes/s5-daemon/{protocol,daemon,launcher}.ts`(락·HMAC 핸드셰이크·런처), `spikes/s7-schema/`(스키마 번들·diff.sh), `spikes/fixtures/s4-isolation-results.json`(`isolationWarnings`), `spikes/s7-skills/evidence.ts`

## 관점

1. **계약 누락·불일치**: 계획의 Interfaces(EventStore·Scheduler·ApprovalBroker·PolicyGate·RPC 메서드·GatewayEvent·preload API)가 SYSTEM_ARCHITECTURE §2 표·AGENT_INTEGRATION §1 코드 블록·DATABASE_SCHEMA 이벤트 payload와 어긋나는 곳. 특히 (a) 이벤트 타입을 새로 만들지 않고 기존 목록 payload로 해결한 선택(`WorkspaceSettingsChanged{capabilities}`, `UserInputRequested{kind:'isolation_confirm'}`, `McpElicitation-requested`→`McpElicitationRequested` 표기)이 "이벤트 목록이 단일 출처" 원칙과 양립하는지, (b) `task-transitions.json`의 `approved → $resume` 표기와 precondition ID 목록이 PHASE_MANAGEMENT §2 표를 빠짐없이 담는지, (c) P01에서 집행하지 않는 precondition을 "미집행(P04·P07 소유)"으로 남기는 것이 AC-P01-1 "전이는 transition() 단일 경로"와 충돌하지 않는지.
2. **AC-P01-1~7 증명 가능성**: 각 AC를 닫는 테스트가 계획에 있고 그 단언이 AC 문구를 실제로 증명하는지(예: AC-P01-3 E4는 누락·중복 0을 어떤 관찰로 보이는지, AC-P01-5의 "Renderer가 데몬 포트에 접속 불가"를 LIVE Electron 검사가 충분히 보이는지, AC-P01-4 CSP 바이트 일치의 추출 정규식이 문서 변경에 취약하지 않은지).
3. **보안 우회**: fencing token `null` 허용 집합(`USER_EVENTS`)이 넓지 않은지, `approved` 이벤트를 사용자 이벤트로 둔 것이 승인 콜백 경로와 모순되지 않는지, preload 노출 면·IPC 발신 검증·토큰 저장(키링 vs 파일 fallback 환경변수)에 약점이 없는지, 데몬 `daemon.shutdown` RPC가 쓰기 메서드로만 노출되는지.
4. **범위·순서·툴체인 결정**: npm workspaces + `exports: ./src/index.ts`(TS NodeNext가 .ts 대상을 해석) 가정의 위험, Electron·better-sqlite3·keyring을 루트 devDependencies로 두는 선택이 CI(windows+ubuntu, `npm ci`)에서 깨질 지점, Codex npm 패키지 `@openai/codex@0.166.0` 가용성 가정과 fallback, 실행 순서가 의존성과 맞는지, 한 Task가 너무 커서 리뷰 단위로 부적절한 곳.
5. **빠진 것**: PHASE_BREAKDOWN P01 항목 중 계획에 없는 것(예: 12 테스트 ID 4종, 13 보안 "SECURITY_MODEL §7 전부", 14 복구 REC-04 기초, 17 증거, 18 진입 조건 "계약 타입 패키지 태그"), 수동 스킬 증거 프로토콜(AC-P10a-6) 반영 여부.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행 또는 Task N Step M) | 문제 | 제안 |`. 그 뒤 "계약 동의표" `| 계약 | 계획 값 | 동의(OK/수정) | 근거 |`(최소: EventStore 서명, Scheduler.transition 서명·USER_EVENTS, ApprovalBroker 서명·DEFAULT_POLICY 14행, RPC 메서드 read/write 분류, preload API, GatewayEvent 10종, task-transitions.json 구조). 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 와 한 문단 근거. 추정은 "추정:"으로 표시해 주세요.
