# 리뷰 요청: P00 스파이크 S7 (스키마 고정 + 스킬 증거 3등급 + 자동 선택 + 충돌 실험 4건 + 시그니처 초안 9개)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요. `node_modules`, `spikes/fixtures/claude-2.1.316/*.jsonl`·`spikes/fixtures/codex-0.166.0/*.jsonl`(녹화 원문, 큼)은 필요한 줄만 grep 하세요.

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S7" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-6, `docs/planning/03_skills/SKILL_EXECUTION_EVIDENCE_SPEC.md` §2·§3(등급·시그니처 스키마), `docs/planning/03_skills/SKILL_CONFLICT_RESOLUTION.md`(v1 → v2 diff), `docs/planning/03_skills/DEVELOPMENT_SKILL_ROUTING_POLICY.md` §2(기대 주도 스킬), `docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md` C4, `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` V12·V24·V27·V34·V35
2. 보고서: `docs/spikes/S7.md`, `docs/spikes/skill_conflict_experiments/*.md`
3. 코드: `spikes/s7-schema/diff.sh`, `spikes/s7-schema/s7-schema.test.ts`, `spikes/s7-skills/evidence.ts`(등급·시그니처 매칭), `spikes/s7-skills/install-codex-skills.ts`(C4 설치·해시·불변 증명), `spikes/s7-skills/experiments.ts`(Claude/Codex 러너·관찰 추출), `spikes/s7-skills/s7-skills.test.ts`, `spikes/s7-skills/signatures.test.ts`
4. 시그니처 초안 9개: `docs/agent-studio/skill-signatures/*.json` (이 리뷰가 "Codex 검토"를 겸합니다 — 각 파일의 required 단계가 그 스킬의 **고유** 절차인지, 다른 스킬·일반 작업과 구별되는지(오탐), 관찰 가능한 신호(Claude Write/Edit/Bash/Skill 블록, Codex commandExecution/fileChange)로 실제로 잡히는지)
5. 관찰값: `spikes/fixtures/s7-skills-results.json`, `spikes/fixtures/s7-c4-install.json`, `spikes/fixtures/codex-0.166.0/s7-skills-list.json`, `spikes/s7-schema/codex-schema/PROVENANCE.md`

## 관점

- **pass/fail 판정 타당성**: 3등급(DISCOVERED→INJECTION_ACCEPTED→LOAD_OBSERVED)이 각각 **관찰**로 뒷받침되는가 — Claude는 `system/init.skills` + Skill 도구 tool_use/tool_result 블록, Codex는 `skills/list` 응답 + `turn/start` skill 입력 수락 + 시그니처 단계 관찰. "LOAD_OBSERVED"를 주는 조건이 너무 느슨하거나(아무 파일 변경이나 인정) 너무 엄격하지(Codex가 SKILL.md를 cat 하지 않으면 영원히 INJECTION_ACCEPTED) 않은가.
- **자동 선택 정확도 표(V34)**: 이름 없는 프롬프트 2종 × 2 에이전트의 "고른 스킬" 판정 근거(Claude = Skill 호출, Codex = SKILL.md 읽기 명령)가 타당한가. Codex가 스킬을 **언급만** 하고 읽지 않은 경우의 처리.
- **충돌 실험 4건**: 각 실험이 1회 실측이라는 한계를 보고서가 명시하고, SKILL_CONFLICT_RESOLUTION v2의 "확정"이 1회 관찰에서 과도하게 일반화되지 않았는가. 비교 지표(테스트 선행 여부·재현 선행·재작업·리뷰 변경 0)가 두 후보에 공정하게 적용됐는가.
- **시그니처 초안 9개**: EVIDENCE_SPEC 스키마 준수, `skill_commit`(출처 커밋 — 로컬 설치본은 git 저장소가 아님)의 의미, required 단계의 오탐·미탐 위험, `reviewed_by: null` 유지가 맞는가(이 리뷰 후 채울 값 제안).
- **C4 설치·환경 불변**: 복사 범위(`agents/openai.yaml` 생략), 전후 해시(`.system`·`config.toml`·`AGENTS.md`)가 "불변"을 충분히 증명하는가. 설치본과 원본의 트리 해시 비교 방식.
- **스키마 고정**: `diff.sh`의 비교가 재생성 산출물 전체를 덮는가(`-x PROVENANCE.md`), archive 사본 대조의 의미, `--update`가 커밋본을 조용히 덮어쓰는 위험.
- **보안·마스킹**: 실호출이 임시 복사본에서만 이뤄졌는가, 픽스처·보고서·녹화에 홈 경로·사용자명·호스트명·thread id가 남아 있지 않은가(`<home>`·`<user>`·`<thread-id>` 치환), Codex 승인 요청 자동 수락(`decision:"accept"`)의 범위가 writableRoots=임시 저장소로 제한됐는가.
- **사용량 기록(C5)**: 호출 수·토큰·비용이 보고서에 있는가.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |` 로 정리하고, 시그니처 9개에 대해서는 별도 표 `| 스킬 | 판정(OK/수정) | 지적 |` 를 추가해 주세요. 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 중 하나와 한 문단 근거를 적어 주세요. 추정은 "추정:"으로 표시해 주세요.
