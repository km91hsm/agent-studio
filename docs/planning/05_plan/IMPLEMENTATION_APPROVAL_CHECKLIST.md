# IMPLEMENTATION_APPROVAL_CHECKLIST — 남은 승인·개발 중 적용 규칙

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 승인 범위 | 1차 승인(계획 전체 + P00 스파이크 S1a/b/c·S2~S9)은 완료. 구현 착수는 사용자의 별도 요청으로 시작한다 |
| 원칙 | 지시서 원칙 11·12: 기존 설정·파일 덮어쓰기 금지, 구현은 승인 후. 승인 경위는 `archive/DECISION_LOG.md` |

## 1. 남은 승인 항목

| # | 항목 | 시점 | 결정 입력 |
|---|---|---|---|
| C3 | P00 S6 설치물 빌드에 Windows C++ Build Tools(electron-builder·node-pty 네이티브 빌드) 설치가 필요하면 별도 승인(U7) | S6 착수 시 | S6 빌드 시도 결과(UNVERIFIED: 필요 여부) |
| C4 | Codex 주도 스킬 8종을 스킬 폴더 전체(`agents/openai.yaml` 생략)로 `~/.codex/skills`에 복사(U5 재결정, USAGE_PLAN §3). `.system`·`config.toml`·`AGENTS.md`는 미수정 | 구현 착수 시, P00 S7 전 | 복사 대상 목록(CONFLICT §2 8행의 주도 스킬 9개 중 Codex 미라우팅 `brainstorming`(ROUTING §2)을 제외한 8개: writing-plans, executing-plans, test-driven-development, systematic-debugging, code-review, writing-skills, frontend-design, ui-ux-pro-max — 명단 확정·경로·해시는 이 승인의 입력, V35) + 원본 경로(`D:\LLM\claude-skills\skills`)·커밋·해시표, CONFLICT §2 각 행과의 대응 |
| C9 | V1 Agent Studio MCP 도구 서버의 OS 입력 제어(화면 캡처·마우스·키보드)와 이미지 생성 API(공급자 키 키링 저장) 구현 범위 | S9 결과 보고 후, P10b T9 전 | `docs/spikes/S9.md` CAP 판정표 |
| 2차 승인 | P01 이후 구현 착수 | P00 종료 게이트 후(S9 미완으로 AC-P00-9 미통과이면 사용자가 그 예외를 명시 수용한 경우에만) | S0 첫 push 점검·CI 결과 보고서 1건 + 스파이크 보고서 11건(pass/fail 판정표; S9 미완 시 상태 보고서 포함) + 범위 축소 제안 + SECURITY_MODEL §2.1 갱신분 + 설계 수정분의 Codex 독립 재검증 결과 |

## 2. 첫 push 전 점검 (C7 — public 저장소, 커밋마다 push, CI)

구현 착수 시 첫 Task(MASTER Phase 00 S0: 비밀 스캔·점검 기록 → 마스킹 → `gh repo create` public → 최소 CI → 첫 push)를 수행한다. **첫 push 전** 사용자가 아래를 확인한다(R22).

- [x] `archive/evidence/ENVIRONMENT_SURVEY.md`의 홈 경로·사용자명 공개 여부 → 사용자명을 `<user>`로 마스킹(2026-11-02, `scripts/mask_archive.py`)
- [x] 지시서 전문·기준 문서 사본 공개 여부 → 저장소에서 제거, 로컬 비공개 보관
- [x] `archive/codex/*/response.md` 원문·`meta.json` thread id 공개 여부 → 원문 유지, thread id는 `<thread-id>`로 마스킹
- [x] settings 키 목록·설치 스킬 해시표의 공개 여부 → 공개(공개 스킬의 해시·설정 키 이름만)
- [x] 토큰·키·`auth.json` 내용 0건(비밀 스캔) → 0건
- 마스킹된 트리를 orphan `main`의 단일 초기 커밋으로 push하고, 마스킹 전 전체 이력은 로컬 브랜치 `planning-history`에만 보존한다. 결과는 `docs/spikes/S0.md`.

## 3. 개발 중 적용 규칙 (상시)

- **D1** 자동 merge/deploy 금지. push는 C7에 따라 개발 저장소로 커밋마다 허용(제품 ApprovalBroker의 원격 Git DENY 기본값과는 별개 — 개발 저장소 한정).
- **D2** 매 Task 주도 스킬은 에이전트 자율 선택(U10) + 증거 기록, 기대 스킬 미선택 시 명시 호출로 교정.
- **D3** Claude 구현→Codex 리뷰 / Codex 구현→Claude 리뷰 교차 유지.
- **D4** Phase 00 실패 항목은 자동 진행 없이 사용자 재보고.
- **D5** Agent Studio **자체 개발 세션**은 자동 권한 모드를 쓰지 않음(Claude `default`, Codex `on-request`) — 제품의 U8 옵트인과 별개.
- **D6** S4 격리 게이트 불합격 조합은 P01 진입 시 **경고 배지 + 자동 모드 활성 시 1회 확인 대화**(차단·비활성화 아님; AC-P00-7b·AC-P01-6·P01 T11).
- 환경 불변: `~/.claude/skills`·`~/.codex/config.toml`·`AGENTS.md`·`~/.codex/skills/.system/*` 미수정(`~/.codex/skills/<name>` 추가는 C4 승인 후만). S9 탐침은 사용자 `CODEX_HOME`을 읽기 전용으로 사용(`-c` 오버라이드만). P00 실호출 상한 없음, 사용량은 보고서에 기록(C5).
