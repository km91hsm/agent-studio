# FINAL_ARCHITECTURE_DECISIONS — 아키텍처 결정 색인 D1~D28

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 용도 | 결정 번호(D1~D28)의 색인. 각 행은 현행 결정 한 문장과 정본 문서. 상세 규칙은 정본 문서가 단일 출처 |
| 사용자 결정 | U1 CLI 로그인 재사용 기본 · U5 Codex 주도 스킬 8종 설치(구현 착수 시 승인) · U10 스킬 자율 선택 기본 · U8 자동 모드 전 조합 옵트인(기본 안전) · U9 `CODEX_HOME` 공유 기본 — 결정 경위는 `archive/DECISION_LOG.md` §1 |

## 1. 결정 목록

| # | 결정 | 핵심 근거 | 정본 |
|---|---|---|---|
| D1 | TypeScript 단일 언어, Node 24 LTS; Rust/.NET/Go는 V1까지 범위 밖 | 두 공식 SDK TS 1급, 타입 공유, 측정 가능한 재검토 문턱 | ADR-0001 |
| D2 | Electron 45 데스크톱 | Chromium 일관·자식 프로세스 제어·런타임 1개 | ADR-0002 |
| D3 | 구조 C: Electron Shell + 독립 Node 오케스트레이터 데몬(detached), localhost WS JSON-RPC+토큰 | 백그라운드 지속·장애 분리·단일 writer | ADR-0003, TECH_STACK §1 |
| D4 | 백그라운드 지속(독립 데몬 생존·재접속·자손 0)은 **Windows MVP-Core 출시 기준**; P00 S5 실패 시 사용자 재보고 후 "안전 중단·재개"로 명시 축소 | 수용 시험 TEST-BG-01~10 | PHASE_BREAKDOWN P11a, TEST_STRATEGY |
| D5 | 데몬 런타임: 동봉 Node vs Electron `runAsNode` — P00 S6에서 결정(`runAsNode` fuse 보안 고려) | 네이티브 바이너리(better-sqlite3·node-pty) 로드와 결합 | TECH_STACK §5, ADR-0005 |
| D6 | React 19 + 외부 store(`useSyncExternalStore`) + 저널 seq 배치 + rAF 코얼레싱; 상태 라이브러리는 후결정 | 고빈도 델타 | ADR-0004 |
| D7 | Monaco(지연 로드, MVP-Core 읽기·Diff), xterm.js+node-pty, 에디터 2개 병행 금지 | 설치물 worker·CSP 검증 조건(S6) | TECH_STACK §2·§4 |
| D8 | SQLite WAL + better-sqlite3(고정 버전), append-only 저널 원본 + 투영, 데몬 단일 writer; node:sqlite는 Stability 2 + 테스트 통과 시 전환 검토 | sqlite.org 단일 writer, Node 24 RC | ADR-0005, DATABASE_SCHEMA |
| D9 | Claude 어댑터 = Agent SDK(사용자 CLI), Codex 어댑터 = app-server JSON-RPC; `exec`/CLI는 축소 fallback | 승인 콜백 경로 | ADR-0006, AGENT_INTEGRATION §2·§3 |
| D10 | 공통 이벤트 **10종**(`message_delta, item_started, item_updated, item_finished, approval_requested, user_input_requested, mcp_elicitation_requested, usage_updated, turn_finished, fault`) + `native` 보존 — 승인·질문·elicitation은 응답 구조가 달라 분리 | 어댑터 간 정규화 | AGENT_INTEGRATION §1 |
| D11 | **승인은 다층 방어**: 승인은 요청이 발생한 효과에만 적용하고, 고위험 효과(원격 Git·DB·설치·배포·외부 서비스)의 정식 경로는 앱 전용 실행기다. 공급자 샌드박스와 사후 diff·원격 ref 감사가 결합한다. **권한 모드(U8)**: 기본은 안전 모드, 모든 공급자·OS·격리 조합에서 사용자가 자동 모드를 켤 수 있고, 격리 미확인 조합은 경고 배지 + 활성 시 1회 확인(차단 아님). 조합별 보장 수준·자동 모드 적용값·UI 문구는 SECURITY_MODEL §2.1 | "모든 효과가 승인 경로를 통과"는 성립하지 않음 | SECURITY_MODEL §2·§2.1·§8 |
| D12 | 승인 매트릭스 14행(기본 11영역 + CAP 3영역: 브라우저·컴퓨터 사용·외부 문서 전송) | 영역별 기본 판정 | SECURITY_MODEL §2 |
| D13 | 격리 사실 명시: Codex Windows native sandbox 사용(차단 시험 후), Claude native Windows는 OS 격리 없음 → 보장 수준 표에 정직 표시; 자동 모드는 U8에 따라 옵트인 허용 + 경고, S4 불합격 조합은 쓰기 비활성화가 아니라 경고·1회 확인; worktree는 보안 아님 | S4 격리 게이트 | SECURITY_MODEL §3 |
| D14 | 실행 제한 최종값: 120분/20분(사전 30)/3회(무변화 2)/2회(인증·한도 0)/MVP-Core 프로젝트당 1/승인 15분→BLOCKED(approval_expired)/lease 90s·HB 20s | 세 시계 분리(활성·대기·턴) | EXECUTION_LIMITS |
| D15 | 세션 5동작 분리(Resume/Handoff/Fork/Checkpoint Restore/Replay), `ephemeral` fork 복구용 금지, `thread/list sourceKinds` 명시, 공식 API만(jsonl 파싱 금지) | 세션≠작업 상태 | SESSION_RECOVERY |
| D16 | 동시성: lease 90/20, fencing(SQLite만), 파일 패치 idempotency = (경로, base blob, target blob, patch 해시) 3분기 판정, git commit outbox, Git↔SQLite 원자성 없음 → 불확실 자동 재실행 금지 | 복구 판정 입력 | DATABASE_SCHEMA §3 |
| D17 | 스킬 증거 **4등급**: `DISCOVERED`(목록 존재) → `INJECTION_ACCEPTED`(skill 입력 수락 — 요청 증거 상한) → `LOAD_OBSERVED`(Skill 도구 호출 또는 고유 절차 단계 관찰) → `APPLIED_VERIFIED`(절차에 연결된 산출물·테스트·해시). 완료는 `APPLIED_VERIFIED`(한정 Task 유형은 `LOAD_OBSERVED`); 이름 포함 ≠ 실행. P07 이전은 수동 증거 프로토콜 | 요청 증거와 실행 증거 분리 | EVIDENCE_SPEC |
| D18 | 주도 스킬(잠정): brainstorming / writing-plans / executing-plans / test-driven-development / systematic-debugging / code-review(리뷰어) / writing-skills / ui-ux-pro-max→frontend-design; 확정은 P00 S7. Codex 주도 스킬은 구현 착수 시 C4 승인 후 P00 S7 전에 스킬 폴더 전체를 `~/.codex/skills`에 설치하고(U5), S7에서 Codex 자율 선택·로드 증거를 실측한다(U10) | 기준 문서 §4.6 | SKILL_CONFLICT_RESOLUTION, ROUTING_POLICY |
| D19 | MCP·플러그인: 프로젝트 allowlist, 전역 config 미수정(`-c` 오버라이드만). **`CODEX_HOME`은 사용자 것 공유 기본(U9)**, 격리 옵션은 프로젝트별. 공유 시 의무: 유효 설정(MCP·notify·hooks·플러그인) 스냅숏·표시·변경 감지, 앱 소유 스레드 필터(`sessions.app_owned`). 기본 실행은 사용자 MCP 상속(브로커 판정, POLICY_ONLY), 격리 옵션은 Claude `--strict-mcp-config`·Codex 분리 홈(ENFORCED) | 기능 상속과 집행 가능성의 교환 | AGENT_INTEGRATION §3·§7, SECURITY_MODEL §6 |
| D20 | 인증 모드 = 공급자별 1급 설정, **기본 = 설치된 CLI 로그인 재사용(U1; 약관 책임은 사용자)**, API key는 선택지·전환 경로로 유지(R21) | Anthropic legal, OpenAI app-server auth/SIWC | ADR-0007 |
| D21 | 패키징 electron-builder v26 + electron-updater; Win NSIS·mac DMG·Linux AppImage(updater)+deb(패키지 관리자); 공개 빌드 서명(Azure Artifact Signing→OV, Apple Developer ID+notarization); 3-OS CI; 실행 중 작업 시 업데이트 연기 | Linux updater 채널·네이티브 모듈 | ADR-0008 |
| D22 | Electron 보안 기본값(격리 webPreferences, 앱 scheme, strict CSP, navigation 차단, IPC 검증) 필수 완료 기준 | 공식 보안 체크리스트 | SECURITY_MODEL §7 |
| D23 | Phase 순서: P00→P01(+계약)→P10a→P02→P04→P03→P05→P08a→P11a(MVP-Core)→P06→P07→P09→P08b→P10b/P11b(V1)→P12/P08c/P11c(V2); Phase 00 스파이크 S1a/b/c·S2~S9(보고서 11건) | 위험 선행 검증 | PHASE_BREAKDOWN, MASTER |
| D24 | 비밀: 저장 전·전송 전 마스킹, 비밀 DB 저장 금지, SQLite at-rest 암호화 MVP-Core 비요구, **백업 항상 암호화** | 로컬 단일 사용자 | SECURITY_MODEL §5 |
| D25 | 프롬프트 인젝션: 지침 파일 untrusted·해시 표시·권한 확대 문장 경고·신뢰 재검토, 비신뢰 저장소 읽기 전용 개시 | 지침 파일은 실행 제어가 아님 | SECURITY_MODEL §4 |
| D26 | **최대 통과 + 3단 보충**: 런타임이 헤드리스에서 제공하는 도구·스킬·플러그인·MCP는 전부 통과(1단) → 없는 기능은 Agent Studio MCP 도구 서버가 제공(2단, REQ-CAP-08, V1) → 그래도 없으면 LLM이 스크립트로 수행(3단). **설계 원칙이며 능력 보증이 아님**: 각 CAP는 S9에서 `supported/conditional/unsupported`로 판정되고, 1단 표기는 S9 전까지 conditional. 3단 제한: 설치는 승인, OS 입력 제어는 2단 전용 | 사용자 요구(기능 전부 사용)와 실측 가능성 | AGENT_INTEGRATION §7, PRODUCT_REQUIREMENTS §13A |
| D27 | Git 읽기(스냅숏·diff·충돌·blob)는 **데몬 소유 `GitReadService`**; **Renderer는 데몬과 직접 통신하지 않고 main IPC 릴레이만 사용**(토큰·포트 미노출, CSP `connect-src 'none'` 유지); Gateway 서명은 `packages/protocol/gateway.ts` 단일 출처(`respond` 통합); 전이표는 `task-transitions.json` 단일 출처(P01 산출물) | Shell 부재 시 검증, 토큰 노출 방지 | SYSTEM_ARCHITECTURE §1·§2, PHASE_MANAGEMENT §2 |
| D28 | 릴리스 명명: **MVP-Core**(Windows 내부 단독 에이전트 검증판) → **V1**(핵심 사용자 경험 완성 = 제품 MVP) → V2. 요구사항 릴리스 열은 범위 분리 표기 | 게이트 분리 | MASTER, PRODUCT_REQUIREMENTS |

## 2. P00 결과로 확정하는 결정

D5(데몬 런타임, S6), D7(Monaco+CSP, S6), D13(Codex Windows 차단 실측, S4 격리 게이트), D16(Job Object 필요성, S5), D17(skill 입력 주입·고유 절차 관찰 실측, S7), D18(주도 스킬, S7 핵심 4쌍), D19(`CODEX_HOME` 공유 시 플러그인 노출, S9), D26(CAP-01~09 실측표, S9). 미검증 사실과 해소 Task는 OPEN_ISSUES_AND_RISKS §2.
