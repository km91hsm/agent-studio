# SKILL_EXECUTION_EVIDENCE_SPEC — 스킬 실행 증거 규격

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 출처 | 지시서 §8 "Skill Execution Evidence", §6 원칙 6·9, §7.1 |
| 관련 | `DEVELOPMENT_SKILL_ROUTING_POLICY.md`, `DATABASE_SCHEMA.md`(`skill_evidence` 투영), `AGENT_INTEGRATION_DESIGN.md` |
| UNVERIFIED | Codex 스킬 로드 이벤트, Claude Skill 도구 블록의 정확한 필드명(둘 다 P00 S7) |

## 1. 목적과 원칙

- "설치됨 ≠ 인식됨 ≠ 호출됨 ≠ 적용됨"을 데이터로 구분한다.
- **프롬프트에 스킬 이름이 들어간 것은 증거가 아니다.** 증거는 에이전트 이벤트 스트림에서 관찰된 **로드/호출 사실**과, 그 호출 이후 생성된 **산출물**이 연결될 때만 성립한다.
- 증거가 없으면 Task는 `VERIFYING` 상태를 통과하지 못하고 `REWORK`로 돌아간다(필수 스킬인 경우). 선택 스킬은 "미사용"으로 기록만 한다.

## 2. 증거 레코드 (13개 필수 필드 + 확장)

| # | 필드 | 타입 | 출처 | 비고 |
|---|---|---|---|---|
| 1 | `project_id` | ULID | Scheduler | |
| 2 | `phase_id` | ULID | Scheduler | |
| 3 | `task_id` | ULID | Scheduler | |
| 4 | `agent_run_id` | ULID | Gateway | 하나의 run에 여러 스킬 증거 가능 |
| 5 | `skill_id` | string | Router | `<repo>/<name>` 예: `mattpocock/skills/tdd` |
| 6 | `repo_commit` | string | SkillRegistry | 설치 시 고정한 커밋. `archive/evidence/SKILL_INVENTORY.md`의 출처·커밋과 대조 |
| 7 | `skill_md_path` | path | SkillRegistry | 실제 로드된 파일의 절대 경로 + 집계 SHA256 |
| 8 | `selection_reason` | enum+text | Router | `AGENT_SELF`(기본, U10) / `USER_EXPLICIT` / `ROUTED_BY_POLICY`(REWORK 교정 주입) / `FALLBACK`, 사유 문장 |
| 9 | `load_evidence` | JSON | Adapter | §3의 어댑터별 관찰 이벤트 원문(이벤트 seq 참조) |
| 10 | `execution_result` | JSON | Adapter | 스킬 지시로 실행된 명령·도구 호출 요약(`item_id` 목록) |
| 11 | `artifacts` | JSON | Gateway | 생성·수정 파일 경로 + git blob 해시(가능 시) |
| 12 | `test_result` | JSON | Verifier | 테스트 명령, 종료코드, 요약. 없으면 `null`과 사유 |
| 13 | `verification_status` | enum | Verifier | **등급**: `NOT_FOUND`(미설치) / `DISCOVERED`(목록 존재·프롬프트 언급만) / `INJECTION_ACCEPTED`(앱이 skill 입력 전송, 서버 거부 없음) / `LOAD_OBSERVED`(Skill 도구 호출 성공 또는 스킬 고유 절차 단계 관찰) / `APPLIED_VERIFIED`(스킬 고유 절차에 연결되는 산출물·테스트·해시 또는 명시적 수동 검증 근거) / `UNVERIFIABLE` / `FAILED` |
| + | `agent` | enum | | `claude` / `codex` |
| + | `invocation_mode` | enum | | `implicit`(에이전트 자율 선택, 기본) / `explicit`(`/name`·교정 주입) / `user_only_refused` |
| + | `journal_seq_range` | [int,int] | | 저널 구간. 재검증 시 재생용 |
| + | `conflict_note` | text | Router | 같은 Task에 경쟁 스킬이 트리거됐으면 기록 |

## 3. 어댑터별 로드·호출 관찰 방법

| 에이전트 | 관찰 지점 | 판정 규칙 | 상태 |
|---|---|---|---|
| Claude (Agent SDK / stream-json) | `assistant` 메시지의 `tool_use` 블록 중 Skill 도구 호출(스킬명 인자), 이어지는 `user.tool_result`; `PreToolUse`/`PostToolUse` 훅 이벤트 | Skill 도구 호출 + 성공 result → `LOAD_OBSERVED`. 이후 동일 run에서 **스킬 고유 절차와 연결되는** 산출물(예: writing-plans→계획 파일 형식, TDD→실패 테스트 커밋이 구현 커밋보다 앞섬)·테스트가 있으면 `APPLIED_VERIFIED`. 단순 "같은 run에 파일 변경 있음"은 승격 근거 아님 | 블록의 정확한 필드명은 Phase 00에서 실측(UNVERIFIED) |
| Claude (사용자 전용 스킬) | 사용자가 `/name` 입력한 UI 이벤트 + 위와 동일 | `invocation_mode=explicit` | |
| Codex (app-server) | (a) `skills/list{cwds, forceReload}`에 스킬 존재(`name, description, enabled`) (b) 명시 호출·REWORK 교정 시 앱이 `turn/start.input`에 `{type:"text","$name …"}` + `{type:"skill", name, path}` 전송 (c) 이후 도구 활동이 스킬 절차와 일치 | (a) = `DISCOVERED`, (a)+(b) = **`INJECTION_ACCEPTED` 상한**(요청·발견 증거일 뿐 사용 증거 아님; 서버 내부 주입이라 SKILL.md 읽기 명령이 안 보일 수 있음). (c) 스킬 고유 절차 단계(예: progress.md 생성, 실패 테스트 선행) 관찰 시 `LOAD_OBSERVED`. 산출물·테스트·해시가 그 절차에 연결될 때만 `APPLIED_VERIFIED` | "skill used" 전용 알림은 공식 이벤트 목록에 없음(UNVERIFIED). 실제 주입 성공 여부는 Phase 00 실측. 이름 없는 프롬프트에서 `skills/list` 노출만으로 자율 선택이 일어나는지와 (c) 관찰 신호의 오탐 가능성은 UNVERIFIED(V34, P00 S7) |
| 공통 | 스킬 미설치·경로 불일치 | `NOT_FOUND` + 사유. 필수 스킬이면 Task 완료 보류 | |
| 공통 | 스킬별 **고유 절차 시그니처** — 스키마: `skill_signatures{skill_id, skill_commit, version, steps[]{order, artifact_glob|event_pattern, required}, author, reviewed_by, created_seq}`; 작성자 = P00 S7 Claude 초안 + Codex 검토, 저장 = Registry 테이블·`docs/agent-studio/skill-signatures/<skill>.json`; 판정 알고리즘 = required 단계가 순서대로 관찰되면 `LOAD_OBSERVED`, 마지막 산출물 단계까지 해시 연결되면 `APPLIED_VERIFIED` | `LOAD_OBSERVED`/`APPLIED_VERIFIED` 판정의 기준. 시그니처가 없는 스킬은 수동 검증 근거 필요 | P00 S7에서 주도 스킬 9개(Codex 설치 8개 + brainstorming) 시그니처 작성 |
| 공통 | **3단 LLM 위임 산출물 증거**(문서·이미지 생성) | 스킬 증거와 별도: 산출물 파일 해시 + 형식 검증(해당 파서로 재열기 성공) + 렌더 검사(페이지/시트 수·이미지 치수) 기록 → `RunArtifacts{files[],validation}` | 라이브러리 설치는 승인 효과로 별도 기록 |

판정 불가(`UNVERIFIABLE`) 조건: 어댑터가 도구 호출 이벤트를 제공하지 않는 모드(예: Codex `exec` 제한 모드)에서 실행된 경우. 이때 Task는 "스킬 증거 없음"으로 명시 표시되며 필수 스킬 Task는 해당 모드에서 실행을 금지한다.

## 4. 수집 파이프라인

1. Router가 `SkillSelected` 이벤트(필드 1~8 + `invocation_mode`)를 저널에 기록 — 사용자 명시 호출·교정 주입은 Task 시작 시, 에이전트 자율 선택은 선택이 관찰된 시점(Claude Skill 도구 블록, Codex 스킬 고유 절차 첫 단계)에 기록.
2. Adapter가 run 중 §3 조건에 맞는 이벤트를 `SkillLoadObserved`로 저널에 기록(원본 이벤트 seq 참조).
3. Gateway가 run 종료 시 파일 변경·테스트 결과를 `RunArtifacts`로 기록.
4. Verifier가 `SkillSelected`×`SkillLoadObserved`×`RunArtifacts`를 조인해 `skill_evidence` 투영을 만들고 `verification_status`를 확정.
5. UI Activity 화면과 Phase 완료 검사가 이 투영만 읽는다.

## 5. 상태 전이 연계

- Task 완료 조건: 필수 스킬 모두 `APPLIED_VERIFIED`. **`LOAD_OBSERVED`로 충분한 Task는 `tasks.kind ∈ {plan, research, prototype, review}`로 닫힌 목록**(DATABASE_SCHEMA `tasks.kind` enum과 동일) — 이 경우 해당 kind의 산출물(계획 파일·조사 노트·프로토타입·ReviewReport)이 시그니처의 마지막 단계와 일치할 때 완료 근거가 되며, 단순 존재는 근거가 아니다. `INJECTION_ACCEPTED` 이하는 어떤 Task 유형에서도 완료 근거가 아니다. `NOT_FOUND`/`FAILED`가 하나라도 있으면 `REWORK`.
- P07(Verifier) 이전 Phase에서는 **수동 증거 프로토콜**(AC-P10a-6): Task마다 `SkillSelected` 저널 + 공급자별 증거(Claude: Skill 도구 블록; Codex: `skills/list` 발견·고유 절차 관찰, explicit 시 skill 입력 로그) + 산출물 경로를 기록하고 리뷰어가 체크리스트로 확인.
- 관찰된 선택과 기대 주도 스킬의 대조 결과(ROUTING_POLICY §3)는 `SkillSelectionReviewed` 이벤트로 기록.
