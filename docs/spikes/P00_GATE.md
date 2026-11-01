# P00 종료 게이트 — 보고서 11건 + S0, AC-P00-1~9 체크, 보장 수준 표 갱신, 범위 축소 제안, 2차 승인 요청

| 메타 | 값 |
|---|---|
| 정본 | MASTER_IMPLEMENTATION_PLAN "P00 종료 게이트"·"선행 검증 작업"(범위 축소 규칙), ACCEPTANCE_CRITERIA AC-P00-1~9, IMPLEMENTATION_APPROVAL_CHECKLIST(C3·C4·C5·C7·C9, 2차 승인), SECURITY_MODEL §2.1·격리 게이트, OPEN_ISSUES_AND_RISKS §2 V1~V35 |
| 작성 | 2026-11-02 KST(P00 S0 착수 ~ S9 완료 같은 날), Windows 11 Pro 10.0.26300, Node v24.21.0, codex-cli 0.166.0, Claude Code 2.1.316 / Agent SDK 0.3.316 |
| 구현/리뷰 | implementer=claude(이 세션, Fable 5.1), reviewer=codex(`codex exec -s read-only`, 스파이크당 1회 = 11회 + 이 게이트의 독립 재검증 1회 §8) |
| 저장소 | https://github.com/km91hsm/agent-studio `main`(orphan, 마스킹 스냅숏 06211fc 기준) — 커밋마다 push, CI windows+ubuntu success |
| 결론 | **P00 작업 완료 — 게이트 판정은 2차 승인·예외 결정 대기**(Codex 재검증 #4). AC-P00-1·2·3·6·7b·8 충족; AC-P00-4 **부분**(실제 재부팅 Recovery·콘솔 창은 단위 판정·수동 절차로 대체); AC-P00-5 **부분**(정본 CSP로는 Monaco fail — 완화 3항목·D5는 제안); AC-P00-7a **부분**(API key 모드 미실측); AC-P00-9 **판정 완료·정본 갱신 대기**(§7·§13A 제안 diff는 S9.md §3·§4). 부분 항목은 §6의 사용자 결정으로만 닫힌다. **P01 착수는 하지 않는다** — §9 |

## 1. 보고서 11건 + S0 (AC-P00-1)

| ID | 보고서 | 판정 | 실행 환경(버전·시각 KST) | 커밋 | Codex 리뷰 |
|---|---|---|---|---|---|
| S0 | `docs/spikes/S0.md` | 완료(운영 증거 — 마스킹·orphan main·골격·첫 push·CI) | 2026-11-02, Node 24.21.0, gh 2.95.0 | 06211fc → 71c7655 | 사용자 확인(첫 push 전) |
| S1a | `S1a.md` | **pass** | 02:44~03:05, codex 0.166.0 | 4a453f5 → 8c1de76(+5a104dc 마스킹) | 수정 후 수용(8건: H1·M4·L3) → 7건 반영, #7 minor 보류 |
| S1b | `S1b.md` | **pass** | 02:50~03:10 | b504fa5 → 9d87ed1 | 수정 후 수용(7건: H2·M4·L1) |
| S1c | `S1c.md` | **pass**(15분 보류 ✓, V30 부분 부정) | 03:02~03:52(4차) | 01d6d5a → ccd0925 | 수정 후 수용 |
| S2 | `S2.md` | **pass**(정본 plan 조건 3a는 fail 기록 — 설계 입력) | 03:19~04:00(3차), Claude 2.1.316 / SDK 0.3.316 | 2443691 → 1f43ae5 | 수정 후 수용 |
| S3 | `S3.md` | **부분 완료**(AC-P00-7a: API key 모드 2건 비어 있음) | 03:25~03:45, 재사용 실측과 동일 환경(메타에 OS·버전·C5 행 추가 — 재검증 #6), research 노트 `docs/research/S3_AUTH_TERMS_SOURCES.md` | 243bb35 → 266a96b | 수정 후 수용 |
| S4 | `S4.md` | **부분 완료**(Windows 게이트 기록 완료, WSL2 미실측) | 03:40~04:06(4차), sandbox readiness=ready | 55da1b2 → ddc279f | 수정 후 수용 |
| S5 | `S5.md` | **pass(조건부 — 콘솔 창 미표시 수동 관찰 대기)** | 04:12~04:25(3차), ws 8.22.1 | 9d1b8c7 → 561e94f | 수정 후 수용(8건: H3·M4·L1) |
| S6 | `S6.md` | **pass(부분 — 정본 CSP로는 Monaco 불가, 완화 3항목; 제거 잔존물 1건)** | 04:32~05:09(4차), Electron 45.2.1, electron-builder 26.18.0, better-sqlite3 13.0.3, node-pty 1.1.0, monaco 0.57.0 | ad44846 → 8a0c99f | 수정 후 수용(8건: H2·M5·L1) |
| S7 | `S7.md` | **pass**(Step 1~5 + C4 설치 전부 pass) | 05:21~06:23(LIVE 4차 25 passed 578.6s) | ee907c9 → cf99046 | 수정 후 수용(12건 + 시그니처 9건) |
| S8 | `S8.md` | **pass** | 06:46~06:58, Vitest 5.0.5 | e7a8740 → 269d1d7 | 수정 후 수용(7건 전부) |
| S9 | `S9.md` | **판정 완료(18행) — 결정 게이트 입력; 정본 갱신 대기** | 07:11~07:22(3차) + 리뷰 반영 4차(§1 S9.md 메타) | f00b638 → (리뷰 반영 커밋, S9.md §10) | 수정 후 수용(7건: H2·M4·L1) → 전부 수용 |

각 보고서는 성공 기준별 pass/fail 표·실행 환경·사용량(C5)·Codex 리뷰 절을 가진다. 실패·부분 항목은 §6 범위 축소 제안으로 연결했다.

## 2. AC-P00-1~9 체크표

| AC | 조건 요약 | 상태 | 증거 경로 |
|---|---|---|---|
| AC-P00-1 | 보고서 11건 + pass/fail 표·환경; 실패 항목 → 범위 축소 제안 | **충족** | §1, `docs/spikes/S1a.md`~`S9.md`(11건) + `S0.md` |
| AC-P00-2 | S1a readOnly 무단 변경 0·승인 관찰·tokenUsage 상관 / S1b steer·interrupt·resume·fork·재구독·queue 거부 / S1c `unapproved_write` 포착·15분 보류 | **충족** | `S1a.md` §1(fileChange 0, requestApproval 1, tokenUsage ≥1), `S1b.md` §1(6 passed), `S1c.md` §1·§2(4 passed + 15분 1 passed; readOnly `.git/index.lock` 승인 1경로), 픽스처 `spikes/fixtures/codex-0.166.0/s1*.jsonl` |
| AC-P00-3 | S2 canUseTool·PreToolUse·streaming input·interrupt; 자동 허용 우회 기록 | **충족** | `S2.md` §1(8/8; deny 무변경, hook 양방향 일치, interrupt), §2(acceptEdits에서 canUseTool 없이 Edit; plan 파일 Write 예외), 픽스처 `claude-2.1.316/s2-*.jsonl` |
| AC-P00-4 | S5 데몬 생존·재접속 seq·재부팅 Recovery·자손 0 | **부분** — 생존·재접속·seq·자손 0 실측 ✓; **실제 재부팅 후 Recovery 제안은 미실측**(stale 락 판정 로직 단위 테스트 + 수동 절차로 대체, 플랜 허용) + 콘솔 창 수동 관찰 대기 → 후속 게이트 V1(TEST-BG-06~10) | `S5.md` §1(20 passed: 부모 종료 후 생존·재접속·seq 연속·taskkill /T 자손 0·위조 락·HMAC 상호 인증), 재부팅 stale 락은 판정 로직 단위 테스트 + 수동 절차 |
| AC-P00-5 | S6 better-sqlite3·node-pty 로드, Monaco+CSP, 데몬 런타임 결정 | **부분** — 로드 ✓·데몬 기동 ✓; **정본 CSP로는 Monaco Diff fail**(완화 3항목에서 pass), D5·CSP 변경은 제안 상태(§6 #5·#6 결정 전까지 미확정) | `S6.md` §1(8 passed: 두 런타임 같은 N-API prebuild 로드, 리빌드 0), §2 D5 제안(동봉 Node), §3 CSP 완화 3항목(style `'unsafe-inline'`·font `data:`·worker `blob:`) — ADR-0005·SECURITY §7 CSP는 **미수정(제안)** |
| AC-P00-6 | S7 스키마 고정·diff / 3등급 실측 / 자동 선택 2종 / 충돌 4건 + 5행 잠정 / 시그니처 9개 | **충족** | `S7.md` §1~§5·§9, `spikes/s7-schema/codex-schema/`(48 JSON, PROVENANCE), `docs/spikes/skill_conflict_experiments/01~04.md`, `SKILL_CONFLICT_RESOLUTION.md` v2, `docs/agent-studio/skill-signatures/*.json`(9) |
| AC-P00-7a | S3 인증 모드별 기동 표, ADR-0007 재검토 조건 발동 여부 | **부분** — CLI 로그인 모드 2건 ✓(S1·S2 재사용), API key 모드 2건 **미실측**(키 미보유); ADR-0007 **미발동**(로컬·비상업 전제) + 개정 제안 | `S3.md` §2 표·§3 판정·§4 ADR-0007 개정 제안(미수정) |
| AC-P00-7b | S4 격리 게이트: 조합별 판정 기록 + 보장 수준 표 갱신 + 불합격 조합 `isolation_warning` 등록 입력 | **충족** — 합격: Codex elevated 외부 경로·외부 호스트; 불합격 경계 6건 등록 입력; §2.1 갱신 = **이 커밋**(§3) | `S4.md` §1·§2, `spikes/fixtures/s4-isolation-results.json`(`isolationWarnings` 6·`guaranteeDowngrades` 4), `SECURITY_MODEL.md` §2.1(갱신 이력 2026-11-02) |
| AC-P00-8 | S8 크래시·재시작 중복 적용 0, blob 3분기 각 1회 | **충족** | `S8.md` §1(12 passed: patch-then-crash·crash-before-apply·commit-then-crash·before-record·before-commit, unverifiable 잠금), `spikes/fixtures/s8-idempotency-results.json` |
| AC-P00-9 | S9 18행 판정 + 공유/분리 비교 + 각 CAP 1/2/3단 경로 확정(**§7 갱신**) | **판정 완료 / 정본 갱신 대기** — 18행 status·reached·evidence ✓, 공유 vs 분리 ✓(V31 해소), §7·§13A 갱신은 **제안 diff**(S9.md §3·§4) → 사용자 승인 후 적용해야 "통과"(Codex 리뷰 #1) | `S9.md` §1·§2·§3·§4, `spikes/fixtures/s9-capabilities-results.json` |

## 3. SECURITY_MODEL §2.1 보장 수준 표 갱신 (S1c·S2·S4·S9 입력 → 이 커밋 1회)

플랜의 "설계 문서 수정은 1커밋 + Codex 독립 재검증 1회" 규칙에 따라 §2.1만 수정했다(다른 정본은 §7 제안 목록). 변경 요지:

| 셀 | 전 | 후 | 근거 |
|---|---|---|---|
| 메타 UNVERIFIED | S4·S1c·CLI 로그 | **해소 3건**(S4 elevated 차단·S1c readOnly 명령·S9 `-c mcp_servers`) + 잔존 4건(문서 추적, V32, WSL2, 우회 경로 시험) | S1c §2, S4 §2, S9 §2 |
| 파일 시스템 — Codex 일반 | ENFORCED(S4 합격 시) | **ENFORCED(S4 합격)** + 예외 TEMP 상위 DETECTED(`isolation_warning{fs_tmp_parent}`; 앱 기본값 `excludeTmpdirEnvVar`·`excludeSlashTmp`=true로 ENFORCED) | S4 §2 |
| 파일 시스템 — Claude native | POLICY_ONLY | **POLICY_ONLY 실측 확정** + plan 모드는 정책(ExitPlanMode 거부 필수, 홈 plan 파일 Write 예외) | S4 §2, S2 §2 |
| 실행 명령 — Codex 엄격 | UNVERIFIED → S1c | **DETECTED**: 읽기 명령 무승인 실행, 쓰기·외부 네트워크만 차단→승인. "승인 요청으로만 가능" 후보 **폐기** | S1c §2(V30) |
| 네트워크 — Codex 일반 | ENFORCED(S4 합격 시) | **ENFORCED(외부 호스트)** + 예외 loopback DETECTED(`isolation_warning{network_loopback}`, 데몬 토큰 필수) | S4 §2 |
| 네트워크 — Codex 엄격 | ENFORCED(S4 합격 시) | ENFORCED(**추론** — S4는 workspaceWrite만 직접 시험; readOnly 직접 시험 **UNVERIFIED** → SE-07) + loopback DETECTED | S4 §2, 재검증 #2 |
| Claude sandbox 열(파일·네트워크) | ENFORCED | **UNVERIFIED(설계값)** 표시 — WSL2 미실측 | S4 §1, 재검증 셀표 |
| 네트워크 — Claude native | POLICY_ONLY | 실측 확정(loopback bypassed) | S4 §2 |
| 고위험 효과 — Codex 엄격 | 실측 전 DETECTED, 조건 충족 시 ENFORCED 조건부 | **DETECTED 유지** — 조건 재정의(파일·네트워크 ENFORCED ✓ + 앱 실행기 + 분리 CODEX_HOME + 우회 경로 시험 미실측) | S1c §2 리뷰 #2, S4, S9 |
| MCP — Codex | `-c mcp_servers` 제거 여부 UNVERIFIED → S9 | **추가만, 제거 없음** → 공유 홈 POLICY_ONLY 확정; 격리 집행자 = **분리 CODEX_HOME**(플러그인·MCP 0) + `-c`; 로그인 재구성 미실측 | S9 §2(V31) |
| MCP — Claude | 격리 옵션 ENFORCED | + `settingSources:[]`(플러그인 MCP 8→0) 집행자 추가, S2 V13 strict 관찰 | S2, S9 |
| 그 외 OS 입력 경로 — Codex 엄격 | S1c 실측 전 UNVERIFIED | **DETECTED(보수적 설계 판정)** — "명령 불가 → ENFORCED" 전제 불성립(S1c); 입력 API 스크립트 실행 여부 자체는 **UNVERIFIED**(SE-10); computer-use 번들은 Desktop 앱 실행 중에만 노출 | S1c, S9, 재검증 #1 |
| 자동 모드 도출표 | UNVERIFIED 2셀 | 실측 셀은 DETECTED/ENFORCED + 예외 분리 표기; 미실측 경로(readOnly 네트워크·OS 입력 API·WSL2)는 UNVERIFIED 유지 | 위 전부 |
| 격리 게이트 문단 | 규칙만 | **S4 결과 6건 경계 목록** 추가 | S4 §2 |

`isolation_warning` 등록 입력(P01 T11, `S4.md` §2 그대로): codex/windows/workspaceWrite/elevated(verified) `fs_tmp_parent`·`network_loopback`; codex/windows/workspaceWrite/unelevated(unverified) `network_loopback`·`fs_tmp_parent`; claude/windows/native/default(verified) `fs_outside`·`network_loopback`. 보장 수준 하향 4건(verified만): codex elevated `fs_tmp_parent`→DETECTED, `network_loopback`→DETECTED; claude native `fs_outside`→POLICY_ONLY, `network_loopback`→POLICY_ONLY.

## 4. 사용량 합계 (C5)

| 구분 | Claude(Agent SDK, `total_cost_usd`) | Codex app-server 턴(토큰, 비용 미제공) | Codex 리뷰 exec(토큰) |
|---|---|---|---|
| S1a | — | 2회 × 2차: input ≈ 90k·69k ×2 | in 938,647 / out 8,893 |
| S1b | — | 완료 턴 6(각 20~25k, 대부분 cached) | in 830,930 / out 10,380 |
| S1c | — | 8 시나리오 누적 46k~238k(총 ≈ 0.75M+, 4차 반복) | in 667,209 / out 9,830 |
| S2 | 3차 × (deny 0.345 + plan 0.488 + acceptEdits 0.346 + interrupt ≈0 + sessions/auth/mcp 3×0.235) ≈ **$5.6** | — | in 498,683 / out 8,321 |
| S3 | research 에이전트(세션 내, 미계량) | — | in 328,941 / out 5,736 |
| S4 | 3실행 × 2회 ≈ **$1.8** | 17턴 × 2회(각 45~70k 누적) | in 1,285,297 / out 10,349 |
| S5 | 0 | 0 | in 224,695 / out 4,901 |
| S6 | 0 | 0 | in 212,770 / out 5,070 |
| S7 | 4회 ≈ **$24.0** | input ≈ 2.07M | in 1,183,045 / out 11,405 |
| S8 | 0 | 0 | in 315,704 / out 6,884 |
| S9 | 4회 × 3세션 ≈ **$2.4**(S9.md §11) | 4회 × 6턴 입력 ≈ 1.8M | S9.md §10(`docs/reviews/codex/S9/meta.json`) |
| **합계** | **≈ $34(추정, S3 제외)** | 입력 ≈ 5M+(대부분 캐시) | S1a~S8 10회: **in 6,485,921(cached ≈ 5.95M) / out 81,769** + S9 |

Claude 비용은 SDK가 돌려준 값의 합이고 Codex는 ChatGPT 로그인 모드라 토큰만 있다. 상한은 없었고(C5) 가장 큰 항목은 S7(스킬 실험 4회 반복)이다.

## 5. OPEN_ISSUES V1~V35 상태 입력 (정본 미수정 — 제안)

| 상태 | 항목 |
|---|---|
| **해소** | V7(Windows, 콘솔 1건 수동), V8, V11(15분 보류 ✓), V12, V13(strict 0 관찰), V14, V15, V16, V17, V18, V19, V23(리빌드 불필요), V26(4건 확정·5행 잠정), V27, V28(0.166.0 기준), V29, V30(부분 부정), V31, V33(C3 불필요) |
| **부분 해소** | V6(실측 ✓ — 동봉 Node 제안, ADR-0005 반영 대기), V9(완화 3항목 실측 ✓ — SECURITY §7 CSP 반영 대기), V35(명단·해시 ✓ — 8종 중 실행 관찰 4종), V3(문서·이미지 플러그인 헤드리스 ✓, computer-use 2단, synced 노출만), V4(설치 크기·메모리 S6 측정 — mac/Linux P11b), V5(약관 — Codex 로컬 허용/상업 불허, Claude 두 갈래), V10(Windows 키링만), V20(노출 ✓, 실행 미실측), V21(로그인 모드 ✓, API key 미실측), V22(노출 ✓, 호출 미실측), V24(발견 8/8, 실행 4/8), V34(4회 표본) |
| **미해소(이월)** | V1(P07), V2(P05), V25(P07), V32(P10a) |
| 신규 제안 | **V36** `mcpServerStatus/list`·`skills/list`는 initialize 직후 불완전 — 유효 설정 스냅숏(R18)은 집합 안정화 폴링 필요(S9 §2) / **V37** 분리 `CODEX_HOME` 로그인 재구성 경로(`account/login/start` 또는 auth 복사) 미실측(P02 T2) / **V38** Codex v2 아이템 `imageGeneration`(S1 스키마 외) 어댑터 매핑(P01) / **V39** Codex Desktop 앱 미실행 상태의 computer-use 1단 가용성(S9 재실측) |

## 6. 범위 축소·결정 제안 (사용자 결정 필요 — 자동 진행 안 함)

| # | 출처 | 제안 | 선택지 |
|---|---|---|---|
| 1 | S3 AC-P00-7a | API key 모드 2건 미실측 | (a) 사용자가 Anthropic·OpenAI API key 제공 → S1a(a)·S2(g) 1회 재실행 / (b) "미보유, 미실측"으로 확정하고 V1 게이트로 이월 |
| 2 | S3 ADR-0007 | 미발동. 개정 제안 5항(자격증명 미중개·바이너리 무수정·API key 1급 노출·공개 배포 전 contact-sales/SIWC 게이트 승격) | 승인 시 ADR-0007 수정 커밋 |
| 3 | S4 | WSL2 Claude sandbox 미실측(claude·node 미설치 — 환경 변경) | (a) WSL2에 claude 설치 승인 → S4 Step 5 재실행 / (b) V1 게이트(TEST-SE-06b)로 이월 |
| 4 | S5 | 콘솔 창 미표시 1건 수동 관찰 | 사용자 1회 관찰(`AGENT_STUDIO_LIVE=1 npx vitest run spikes/s5-daemon`) 또는 S6 설치물 실행 관찰로 갈음 |
| 5 | S6 ADR-0005 D5 | 동봉 Node 채택 제안 | 승인 시 ADR-0005·TECH_STACK 수정 커밋 |
| 6 | S6 SECURITY §7 CSP | 정본 CSP로 Monaco 불가 → `style-src 'unsafe-inline'`·`font-src data:`·`worker-src blob:` 완화 3항목 | 승인 시 §7 CSP 한 줄 수정(V9) — 대안: CodeMirror 재평가 ADR(MASTER 축소 규칙) |
| 7 | S7 V24 | Codex 주도 8종 중 실행 관찰 4종(executing-plans·writing-skills·frontend-design·… 4종 미실행) | P07 T7로 이월(발견 8/8은 확인) |
| 8 | S9 CAP-07 | Desktop 앱 실행 중 실측 → 미실행 조건 미판정 | 사용자가 Codex Desktop 앱 종료 후 `AGENT_STUDIO_LIVE=1 npx vitest run spikes/s9-capabilities` 1회(재실행 비용 ≈ $0.6 + Codex 토큰 ≈ 0.45M) |
| 9 | S9 CAP-05 | Codex 이미지 생성 API key 모드 미실측 | #1과 동일 |
| 10 | S9 C9 | 앱 MCP 도구 서버 범위: 이미지 API(Claude 전용 보충 vs Codex 라우팅), OS 입력(2단 전용 유지), 브라우저(agent-browser 보충) | S9.md §5 입력으로 C9 결정 |
| 11 | S2/S9 | `AGENT_INTEGRATION §7`·`PRODUCT §13A` 갱신 diff | S9.md §3·§4 승인 시 적용 → AC-P00-9 통과 |
| 12 | S8 | DATABASE_SCHEMA §3 `tree_sha` 필수 명시 | 승인 시 수정 |
| 13 | S6 제거 잔존물(재검증 #7) | 무인 제거 후 updater 설치 파일 + 잠긴 빈 설치 폴더 1건 잔존 | 제품의 "제거 완료" 기준(잔존물 허용 목록·재시도·재부팅 후 정리)을 P11a 입력으로 결정; 설치물 재시험 1회 |
| 14 | S1c/S4 | Codex `readOnly` 네트워크(외부 호스트·loopback)·OS 입력 API 스크립트는 직접 미실측(§2.1 UNVERIFIED 경로, 재검증 #1·#2) | V1 SE-07·SE-10 로 이월 또는 P00 추가 실측 1회(S4 하네스 readOnly 변형, 비용 소) |

## 7. 정본 갱신 제안 목록 (이 커밋에서 수정하지 않음)

- ADR-0005 D5(동봉 Node), ADR-0007 개정 5항, SECURITY §7 CSP 완화, AGENT_INTEGRATION §7·PRODUCT §13A(S9), DATABASE_SCHEMA `tree_sha`(S8), OPEN_ISSUES V 표 갱신 + V36~V39, EVIDENCE_SPEC §3(S7 Claude INJECTION_ACCEPTED 정의·Codex 로드 이벤트 부재), ROUTING_POLICY §1(V34 자동 선택 표본), CHECKLIST C3 "불필요" 표기.

## 8. Codex 독립 재검증 (이 문서 + §2.1 갱신) — `docs/reviews/codex/P00_GATE/response.md`, 07:51~07:54 KST, exit 0, 판정 "수정 후 수용"

| # | 심각도 | 지적 | 처리 |
|---|---|---|---|
| 1 | High | §2.1 OS 입력 Codex 엄격: "입력 API 스크립트를 샌드박스가 막지 않음"은 미실측 확정 | **수용** — DETECTED를 보수적 설계 판정으로 한정, 실행 가능성은 UNVERIFIED(SE-10) |
| 2 | Medium | 네트워크 Codex 엄격 ENFORCED "S4 합격" — S4는 workspaceWrite만 직접 시험 | **수용**(픽스처 확인: network 행 sandbox 전부 workspaceWrite) — "추론" 표기 + readOnly 직접 시험 UNVERIFIED; S1c V30 행의 "S4에서 readOnly 확인" 문구 정정 |
| 3 | Medium | "UNVERIFIED 셀은 남아 있지 않다"가 WSL2·OS 입력 미실측과 불일치 | **수용** — 갱신 이력 문구를 "미실측 경로는 UNVERIFIED로 남긴다"로 교체, Claude sandbox 열에 UNVERIFIED(설계값) 표시 |
| 4 | High | AC-P00-5 "충족"(정본 CSP Monaco fail·D5/CSP 제안) + "P00 통과" 표현이 이름 | **수용** — AC-P00-5 부분, 결론을 "작업 완료·게이트 판정은 2차 승인·예외 결정 대기"로 |
| 5 | Medium | AC-P00-4 "충족" — 실제 재부팅 Recovery 미실측·콘솔 미관찰 | **수용** — 부분 + 후속 게이트 명시 |
| 6 | Medium | S3.md에 OS·C5 사용량 없음 | **수용** — S3 메타에 환경·사용량 행 추가 |
| 7 | Medium | S6 제거 잔존물 처리 결정이 제안 목록에 없음 | **수용** — §6 #13 추가 |
| 8 | Low | V6·V9·V35 "해소"는 정본 반영·로드 검증 대기 | **수용** — 부분 해소로 이동 |

셀 동의표: 11셀 중 OK 8, 수정 3(Claude sandbox 파일 시스템, 네트워크 Codex 엄격, OS 입력 Codex 엄격) — 위와 같이 반영. 리뷰어 확인: 사용량 산식 일치, isolation_warning 6건·하향 4건 식별자 일치, 변경 파일 2개뿐, 노출 없음, P01 흔적 없음.

## 9. 2차 승인 요청

P01 착수는 이 문서와 보고서 11건을 사용자가 검토하고 §6 결정(특히 #1 API key, #3 WSL2, #5 D5, #6 CSP, #10 C9, #11 §7 갱신)을 내린 뒤에만 시작한다. 이 세션은 P01 작업을 시작하지 않았다.
