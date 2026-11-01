# PLANNING_STATUS

> 갱신: 2026-11-01 (STEP 11 완료 — 최종 마스터플랜 확정, STEP 12 보고 직전)
> 모드: PLAN ONLY. 소스 코드 작성·설치·전역 설정 변경 없음.

## Codex 호출 카운터

> 표기 예외: 아래 호출표의 `on-failure`·`onRequest`·plain `MVP`는 **당시 응답 요지 이력**이며 현행 설계값이 아니다(현행: `on-request`, `MVP-Core`). 보존본(06_codesign/CLAUDE_INITIAL_PROPOSAL·CODEX_*·ARCHITECTURE_DEBATE)·evidence·codex 폴더·ADR·각 문서 상태 행의 변경 이력도 같은 예외다.

| 구분 | 사용 | 상한 |
|---|---|---|
| 총 호출 | 15 | 15 |

| # | 라운드 | 폴더 | 세션 | 시각 | 종료코드 | 결과 |
|---|---|---|---|---|---|---|
| 1 | R0 스모크 | codex/R0_smoke | ephemeral 01a196df… | 2026-11-01 11:30Z | 0 | CODEX_OK model=gpt-6, 파일 읽기 성공 |
| 2 | R1 독립 제안 | codex/R1_proposal | A 01a196f0… | 11:48~11:54Z | 0 | 29.8KB 제안, Electron+TS+C 구조 수렴 |
| – | R2-1 시도1 | codex/R2_debate_1/attempt1_* | A resume | 11:58Z | 2 | 인자 오류(`exec resume`은 `-s`/`-C` 미지원) → 모델 미호출, 토큰 0, **예산 미차감** |
| 3 | R2-1 기술 스택 토론 | codex/R2_debate_1 | A resume | 12:00~12:05Z | 0 | 8쟁점: 합의 4·조건부 4, Forge→electron-builder 철회, ToS→API key 기본 |
| 4 | R2-2 Gateway·세션·스킬 토론 | codex/R2_debate_2 | A resume | 12:08~12:13Z | 0 | 10쟁점: 합의 3·조건부 6·불일치 1(승인 경계) |
| 5 | R2-3 보안·제한·배포·Phase | codex/R2_debate_3 | A resume | 12:14~12:18Z | 0 | 9쟁점: 합의 5·조건부 4, 호출 20분·승인 15분·MVP 프로젝트당 1개·데몬 MVP 게이트·스파이크 8개 |
| 7 | R4-1 독립 리뷰(제품·아키텍처·UI) | codex/R4_review_1 | B1 신규 01a19717-a4c9… | 12:31~12:37Z | 0 | 19건(High 6·Medium 11·Low 2), 판정 "재작업" |
| 8 | R4-2 독립 리뷰(에이전트·상태·스킬) | codex/R4_review_2 | B2 신규 01a19717-a4e7… | 12:31~12:40Z | 0 | 25건(Critical 3·High 12·Medium 9·Low 1), API 이름 전부 실재 확인, `turn/completed.usage` 필드 오류 지적 |
| 9 | R4-3 독립 리뷰(보안·테스트·Phase) | codex/R4_review_3 | B3 신규 01a19717-a54c… | 12:31~12:38Z | 0 | 22건(Critical 2·High 11·Medium 9), 11영역·9행·35시나리오 존재 확인 |
| 10 | R6-1 재검토(제품·아키텍처·UI) | codex/R6_rereview_1 | B1 resume | 13:26~13:33Z | 0 | 원 19건: 해결 13·부분 6; 신규 R6A-01~10(High 6·Medium 3·Low 1) — Renderer WS vs CSP, S1b/S1c 뒤바뀜, `dontAsk` 누락 |
| 11 | R6-2 재검토(에이전트·상태·스킬) | codex/R6_rereview_2 | B2 resume | 13:26~13:35Z | 0 | 원 25건: 해결 12·부분 11·미해결 1(R4B-17 24h)·신규문제 1; 신규 R6B-01~18(Critical 1·High 7·Medium 7) — **`on-failure` 미존재(사실 오류)**, 자동 모드 집행 보증 없음 |
| 12 | R6-3 재검토(보안·테스트·Phase) | codex/R6_rereview_3 | B3 resume | 13:26~13:32Z | 0 | 원 22건: 해결 4·부분 16·미해결 1(R4C-01)·신규문제 1; 신규 R6C-01~11(Critical 1·High 5·Medium 5) — U8 (b-제한)·U9 (c) 권고 |
| 13 | B4 독립 재검증(R7 수정분 전체) | codex/R7_reverify_1 | B4 신규 01a19767-9642… | 13:58~14:07Z | 0 | 72건: 확인 29·불충분 43·미반영 0; 신규 R7-01~12(High 10·Medium 2). v2 approvalPolicy는 UNVERIFIED로 남김 → Claude가 생성 스키마로 확인(`on-request`, `onRequest` 아님) |
| 14 | B5 독립 재검증(R8 수정분 55건) | codex/R8_reverify_1 | B5 신규 01a1977a-27c0… | 14:18~14:24Z | 0 | 확인 44·불충분 11·미반영 0; 신규 R8-01~10(Critical 1 감사 이벤트 계약·High 5·Medium 3·Low 1) → R9 반영 |
| 15 | B6 독립 최종 검증(R9 수정분 + 사용자 결정 반영 일관성) | codex/R10_final_verify_1 | B6 신규 01a197a5-3833… | 15:05~15:12Z | 0 | Part A 확인 17·불충분 4·미반영 0; Part B 신규 R10-01~14(High 9·Medium 4·Low 1: 모순 8·잔존 4·누락 2) → R10 반영(Codex 미재검증, 예산 소진) |

## STEP 체크포인트

| STEP | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 0 | 저장소 준비·스모크 테스트 | DONE | bd6cec1 |
| 1 | 요구사항 분석 | DONE(DRAFT, R4 대기) | |
| 2 | 환경 조사 문서화 | DONE | |
| 3 | 독립 기술 설계 (R1) | DONE | |
| 4 | 기술 스택 공동 토론 (R2) | DONE(3회) | |
| 5 | Skills 검증·개발 활용 계획 (R3) | DONE(문서 5건 DRAFT; R3 Codex 호출은 R2-2 쟁점 7로 대체) | |
| 6 | 보안·실행 제한 | DONE | |
| 7 | 최종 아키텍처 초안 | DONE(DRAFT) | |
| 8 | Phase·Task 분해 | DONE(DRAFT) | |
| 9 | Codex 독립 리뷰 (R4) | DONE — 66건(Critical 5·High 29·Medium 29·Low 3) → CODEX_PLAN_REVIEW.md | |
| 10 | 수정·재검토 (R5·R6·R7·R8·R9) | DONE — R5: 66건 판정 + 2차 요청 병합(커밋 90c54ea). R6: 3건 수신(원 지적 해결 29·부분 33·미해결 2·신규문제 2, 신규 39건). R7: 신규 39건 중 ACCEPTED 33·PARTIALLY_ACCEPTED 2(U8·U9 사용자 결정)·NO_ACTION 4(Codex "문제 없음"), 잔존 37건 조치, 28문서 수정 → REVIEW_RESOLUTION §6~§8. B4: 72건 재검증(확인 29·불충분 43) + 신규 12 → R8에서 55건 전부 조치(PB 18항목 전수 보완, SEC §2.1·§2.2 재작성, U9 결정 전 기본=분리, `on-request` 철자 복원·스키마 증거). B5: 55건(확인 44·불충분 11) + 신규 10 → R9 전부 조치(§2.1 28셀·§2.2 DB 이름 정합·DB 이벤트 9종·백업 계약·AC-V1-8~10·U5 선택지·원본 스키마 보존). 예비 1회 보존. B5: 확인 44·불충분 11 → R9 반영, Codex 미재검증 → R9 반영 | f232a8a → 4bf4ffa |
| 11 | 최종 마스터플랜 | DONE — 26개 작업 문서 FINAL, UNVERIFIED 자동 집계(작업 문서 115건) OPEN_ISSUES §3.1, verify_step11 통과(31문서·ADR 8·소스 0·skills 52/52 파일 일치). `~/.codex/config.toml` 변경·`~/.codex/skills` 52개 생성 감지 — Claude 작업 아님, 아래 '미해결·대기 항목' 3번 | 4bf4ffa |
| 12 | 사용자 보고 | DONE — §24 15항목 보고 완료(14:45Z). 사용자 결정 U1 (b)·U5 보류·U8 (c)·U9 (a)·C5·C7 + 일괄 수용 접수 → 문서 반영(아래 '사용자 결정' 절) | 결정 반영 커밋 |

## 문서 상태 (31개)

| 문서 | 상태 |
|---|---|
| 00_product/PRODUCT_REQUIREMENTS.md | FINAL(STEP 11) |
| evidence/ENVIRONMENT_SURVEY.md | FINAL |
| evidence/SKILL_INVENTORY.md | FINAL |
| 06_codesign/CLAUDE_INITIAL_PROPOSAL.md | FINAL(R1) |
| 06_codesign/CODEX_INITIAL_PROPOSAL.md | FINAL(R1) |
| 03_skills/SKILL_COMPATIBILITY_MATRIX.md | FINAL(STEP 11) |
| 03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md | FINAL(STEP 11) |
| 03_skills/SKILL_CONFLICT_RESOLUTION.md | FINAL(STEP 11) |
| 03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md | FINAL(STEP 11) |
| 00_product/UI_UX_SPECIFICATION.md | FINAL(STEP 11) |
| 02_agents_state/PHASE_MANAGEMENT_DESIGN.md | FINAL(STEP 11) |
| 02_agents_state/DATABASE_SCHEMA.md | FINAL(STEP 11) |
| 02_agents_state/COLLABORATION_PROTOCOL.md | FINAL(STEP 11) |
| 02_agents_state/SESSION_RECOVERY_DESIGN.md | FINAL(STEP 11) |
| 01_architecture/ARCHITECTURE_COMPARISON.md | FINAL(STEP 11) |
| 01_architecture/TECH_STACK_DECISIONS.md | FINAL(STEP 11) |
| 01_architecture/SYSTEM_ARCHITECTURE.md | FINAL(STEP 11) |
| 01_architecture/adr/ADR-0001~0008 | ACCEPTED 7 / PROPOSED 1 |
| 06_codesign/ARCHITECTURE_DEBATE.md | FINAL(R2-1~3) |
| 04_security_test/TEST_STRATEGY.md | FINAL(STEP 11) |
| 04_security_test/RECOVERY_TEST_PLAN.md | FINAL(STEP 11) |
| 05_plan/OPEN_ISSUES_AND_RISKS.md | FINAL(STEP 11) |
| 02_agents_state/AGENT_INTEGRATION_DESIGN.md | FINAL(STEP 11) |
| 04_security_test/SECURITY_MODEL.md | FINAL(STEP 11) |
| 04_security_test/EXECUTION_LIMITS_POLICY.md | FINAL(STEP 11) |
| 05_plan/PHASE_BREAKDOWN.md | FINAL(STEP 11) |
| 05_plan/ACCEPTANCE_CRITERIA.md | FINAL(STEP 11) |
| 05_plan/MASTER_IMPLEMENTATION_PLAN.md | FINAL(STEP 11) |
| 03_skills/DEVELOPMENT_SKILL_USAGE_PLAN.md | FINAL(STEP 11) |
| 06_codesign/CODEX_PLAN_REVIEW.md | FINAL(R4 보존본) |
| 06_codesign/REVIEW_RESOLUTION.md | FINAL(STEP 11) |
| 01_architecture/FINAL_ARCHITECTURE_DECISIONS.md | FINAL(STEP 11) |
| 05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md | FINAL(STEP 11) |

## 완료 조건 체크 (지시서 §22, 21항목)

- [x] 1. 모든 제품 요구사항 분석 완료 — PRODUCT_REQUIREMENTS(REQ-* 체계, 릴리스 열)
- [x] 2. 누락·모순·위험 분석 — PRODUCT §누락·모순, OPEN_ISSUES §2
- [x] 3. Claude·Codex 독립 아키텍처 초안 — CLAUDE_INITIAL_PROPOSAL, CODEX_INITIAL_PROPOSAL(원문)
- [x] 4. 기술 스택 대안 비교 — ARCHITECTURE_COMPARISON, TECH_STACK_DECISIONS, ADR-0001~0008
- [x] 5. 공동 토론·합의 근거 — ARCHITECTURE_DEBATE(R2-1~3 원문)
- [x] 6. 최종 권장 아키텍처 — SYSTEM_ARCHITECTURE, FINAL_ARCHITECTURE_DECISIONS D1~D28
- [x] 7. UI/UX 구조 — UI_UX_SPECIFICATION
- [x] 8. 전체 Phase·Task — PHASE_BREAKDOWN(18 Phase×18항목), MASTER_IMPLEMENTATION_PLAN
- [x] 9. 40개 스킬 매트릭스(폐기·통합 2개 사유, superpowers 하위 15) — SKILL_COMPATIBILITY_MATRIX
- [x] 10. 개발 활용 Skills 계획 — DEVELOPMENT_SKILL_USAGE_PLAN
- [x] 11. 중복·충돌 정책 — SKILL_CONFLICT_RESOLUTION(잠정) + ROUTING_POLICY
- [x] 12. 실행 검증 방법 — SKILL_EXECUTION_EVIDENCE_SPEC(4등급)
- [x] 13. 세션·Phase·작업 복구 — SESSION_RECOVERY_DESIGN, PHASE_MANAGEMENT_DESIGN, RECOVERY_TEST_PLAN
- [x] 14. 보안·실행 제한 — SECURITY_MODEL(§2.1 보장 수준·§2.2 분류 계약), EXECUTION_LIMITS_POLICY
- [x] 15. OS별 배포 전략 — TECH_STACK_DECISIONS §배포, PHASE P11a/P11b, TEST-DT
- [x] 16. 테스트·품질 기준 — TEST_STRATEGY(35+신설), ACCEPTANCE_CRITERIA
- [x] 17. Codex 독립 리뷰 — R4 3건(CODEX_PLAN_REVIEW 원문)
- [x] 18. 지적사항 반영 — REVIEW_RESOLUTION §1~§3(66건), §6(39건), §9(55건)
- [x] 19. Codex 재검토 — R6 3건 + B4 + B5(독립 세션)
- [x] 20. 미해결 위험 기록 — OPEN_ISSUES R1~R20, UNVERIFIED §3·§3.1
- [x] 21. 구현 착수 승인 체크리스트 — IMPLEMENTATION_APPROVAL_CHECKLIST(U1·U5·U8·U9 결정 포함)

범위 준수: 소스 코드 0개, 의존성 설치 0, Hook/MCP 등록 0, `~/.claude/skills` 무변경(52/52 파일 일치), settings.json의 `remoteControlAtStartup`만 사용자 명시 지시로 변경. `~/.codex/config.toml`·`~/.codex/skills`는 **Claude가 변경하지 않았으나 외부 변경이 감지됨**(UNVERIFIED — 아래 '미해결·대기 항목' 3번).

## 사용자 결정 (2026-11-01, STEP 12 보고 후)

| # | 결정 | 반영 |
|---|---|---|
| U1 | (b) 설치된 CLI 로그인 재사용 기본(약관 책임 사용자) — 양측 권고 (a) 미채택 | ADR-0007 ACCEPTED, FINAL D20, AGENT_INTEGRATION 인증 행, UI §1, R21 |
| U5 | 보류 — 설치 안 함, 외부 생성 52개 폴더 삭제(백업 `codex_skills_backup_20261101T145734Z`) | CHECKLIST C4, USAGE/ROUTING/CONFLICT, MASTER S7, PHASE P00·P07, FINAL D18 |
| U8 | (c) 기본 안전 모드, 모든 조합에서 자동 모드 옵트인 가능(격리 미확인 조합은 경고 + 1회 확인) — 양측 비권고 | FINAL D11·D13, SECURITY §2.1·격리 게이트·§7·R20, AGENT_INTEGRATION, PRODUCT REQ-CAP-02, UI, MASTER, PHASE S4·P01 T11, AC-P00-7b·P01-6·P02-6, TEST-SE-09, CHECKLIST D6 |
| U9 | (a) 사용자 `CODEX_HOME` 공유 기본 + 격리 옵션 | FINAL D19, SECURITY MCP 절, AGENT_INTEGRATION MCP 행·CAP-09, PRODUCT REQ-CAP-09, MASTER, PHASE P07 |
| C5 | P00 실호출 상한 없음(보고만) | CHECKLIST C5, MASTER P00 보고 |
| C7 | public GitHub + 커밋마다 push + CI(구현 착수 시), 첫 push 전 R22 점검 | CHECKLIST C7·D1, PHASE P00 선행, R22 |
| 일괄 | A1~A5·U2·U3·U4·U6·U7·C1·C2·C6·C8·D1~D6 수용 | CHECKLIST E 승인 기록 |

구현 착수는 사용자의 별도 요청으로 시작한다(1차 범위 P00). 결정 반영분과 R9 수정분은 Codex 호출 15/15(R10, B6)로 재검증했고(REVIEW_RESOLUTION §13), R10 조치분(R10-01~14 + Part A 불충분 4건)은 Codex 미재검증 상태로 남아 P00 착수 시 새 예산으로 재검증한다.

## 미해결·대기 항목

- impeccable(77ac20b), orca(89f9ce0) 최신 커밋이 설치본과 다름 → 업데이트 검토 필요(실행 안 함)
- 기준 문서 `(2)` 버전 부재 → `CLAUDE_CODE_SKILLS_SETUP.md` 사용, 사용자 확인 필요
- **Claude가 수행하지 않은 환경 변경 감지(2026-11-01 14:02Z, B4 호출 실행 중 시각)** — `~/.codex/skills`에 후보 52개 스킬 폴더 전체가 생성됨(`~/.claude/skills` 52개와 폴더 목록·내용 일치, `agents/openai.yaml`·원본 mtime 보존 = 복사). 같은 시각대에 `~/.codex/config.toml` 변경(14:00:56Z, 3718→3763B, sha256 `321c0ffc…`→`d3cfda4d…`; 기존 키 model/effort/sandbox 유지, `[projects.'D:\LLM'] trust_level="trusted"`·`[tui]` 키 추가)과 `~/.codex/AGENTS.md` 생성(14:02:42Z, 한국어 전역 지침). B4·B5 `stderr.log`·`events.jsonl`에 설치·복사 명령 없음, 호출은 `-s read-only`. Codex Desktop 프로세스(`codex.exe`×3, `codex-computer-use`)가 실행 중이며 `trust_level` 추가는 Desktop에서 폴더를 열 때의 전형적 변경이므로 **사용자 측 Codex Desktop 조작 가능성이 높으나 원인 미확정**. 삭제·원복은 사용자 승인 사항이므로 수행하지 않음. 영향: U5(Codex 스킬 설치)는 '설치본이 이미 존재' 상태에서 결정해야 하고, `config.toml` 무변경 주장은 철회(UNVERIFIED). **후속(14:57Z)**: U5 보류 결정에 따라 사용자 지시로 52개 폴더 삭제(백업 scratchpad `codex_skills_backup_20261101T145734Z`, 519파일, 삭제 전 `diff -rq` 일치), `.system` 5개·`config.toml`·`AGENTS.md`는 미수정.

## 2차 사용자 요청 (2026-11-01 12:45Z, R4 진행 중 접수)

1. **기능 범위 질의** — 플랜/자동 모드, PDF·이미지·엑셀 문서 작업, 이미지 생성, 컴퓨터 사용의 지원 여부. 사용자 결론: "가져올 수 있는 기능은 가져오고, 못 가져오는 건 LLM에 요청". → 설계 원칙 **최대 통과 + 3단 보충**(런타임 통과 / 앱 MCP 도구 서버 / LLM 스크립트 위임)으로 확정. STEP 10에서 REQ-CAP-01~08, U8(자동 권한 모드 옵트인), U9(`CODEX_HOME` 공유), R18, P00 S9 스파이크로 문서 반영. 세부는 플랜 파일 §9.1.
2. **범위 외 전역 설정 변경(사용자 명시 지시)** — `~/.claude/settings.json`에 `"remoteControlAtStartup": true` 추가(12:48:04Z). 기존 키 10개 보존, 백업 `scratchpad/settings.json.bak-20261101T124804Z`. 공식 근거 code.claude.com/docs/en/remote-control. **Agent Studio 계획 산출물과 무관**하며 지시서 원칙 11의 "사용자 승인 없이"에 해당하지 않음(사용자가 직접 지시). `~/.claude/skills`·`~/.codex/config.toml`은 변경 없음.
