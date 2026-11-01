# 리뷰 요청: P00 스파이크 S9 (기능 상속 탐침 REQ-CAP-01~09 × {claude, codex} — 결정 게이트 입력)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요. `node_modules`와 `spikes/fixtures/**/s9-*.jsonl`(녹화 원문, 큼 — 필요한 줄만 grep)은 통째로 읽지 마세요.

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S9" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-9, `docs/planning/02_architecture/AGENT_INTEGRATION_DESIGN.md` §7(판정 규칙·CAP 표), `docs/planning/01_product/PRODUCT_REQUIREMENTS.md` §13A, `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` V3·V19·V20·V21·V22·V31·R18, `docs/planning/04_security_test/SECURITY_MODEL.md` §2.1 MCP 셀, `docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md` C9
2. 보고서: `docs/spikes/S9.md`(판정표·AGENT_INTEGRATION §7·PRODUCT §13A 갱신 **제안** diff — 제안만 하고 정본은 수정하지 않았습니다)
3. 코드: `spikes/s9-capabilities/probe.ts`(탐침·결과 계약 `validateResults`), `spikes/s9-capabilities/s9.test.ts`(CI 계약 3건 + LIVE 1건), S2 러너 확장 `spikes/s2-claude-sdk/run.ts`(settingSources/extraArgs/skills 전달)
4. 관찰값: `spikes/fixtures/s9-capabilities-results.json`(18행 + raw + usage)

## 관점

- **판정 근거의 타당성**: 각 행의 `status`(supported/conditional/unsupported)와 `reached`(discovered/started/executed/artifact)가 evidence 로 뒷받침되는가. 특히 (1) S1·S2·S4 픽스처를 **재사용**한 행(CAP-01·02·03·08)이 "실측"으로 읽혀도 되는가, (2) 산출물 검증(docx = zip + word/document.xml, png = 헤더)이 "산출물 도달"의 충분한 증거인가, (3) `reached` 를 "발견"으로 둔 행이 실제로는 더 낮거나 높지 않은가.
- **CAP-07 (e) 실행 조건 위반**: 정본은 "Desktop 앱 미실행 상태에서 computer-use 기동 시도"인데 실측 시 Codex Desktop 프로세스가 실행 중이었다(사용자 앱을 종료하지 않음). 보고서가 이를 한계·재실행 조건으로 정직하게 다루는가, 그리고 캡처·입력 금지 지시 하의 "기동 시도"가 안전 원칙(3단 금지·분리 승인)과 맞는가.
- **CAP-09 (g) 공유 vs 분리 비교·V31**: 분리 `CODEX_HOME`(빈 임시 디렉터리, 로그인 없음)과 공유 홈의 initialize·skills/list·plugin/installed·mcpServerStatus/list·config layers 비교가 "상속 범위" 질문에 답하는가. `-c mcp_servers.s9_probe` 오버라이드가 기존 항목을 제거하지 않는다는 관찰(V31)이 SECURITY §2.1 MCP 셀의 "조건부 ENFORCED(allowlist)" 서술에 어떤 영향을 주는가(추가 항목은 되지만 제거는 안 된다면 allowlist 집행자가 될 수 없음).
- **Claude 측 (a)(b)**: `settingSources` 생략 vs `[]` 의 skills/plugins/mcp 수치 차이가 CAP-04·09 판정에 맞게 해석됐는가; `extraArgs {chrome:null}` 로 `mcp__claude-in-chrome__*` 도구가 노출된 것을 "기동(started)"으로 본 것이 과한지.
- **결정 게이트 입력(C9·AC-P00-9)**: 보고서의 §7·§13A 갱신 제안이 각 CAP의 1/2/3단 경로를 실제로 확정하는가, 과도하게 일반화하지 않는가(1회 실측). C9(앱 MCP 도구 서버 범위) 결정에 필요한 정보가 빠져 있지 않은가.
- **보안·마스킹·환경 불변**: 사용자 `CODEX_HOME` 을 읽기 전용으로만 썼는가(`-c` 오버라이드·임시 홈), 픽스처·보고서·녹화에 홈 경로·사용자명·호스트명·thread id 가 없는가, 승인 요청 자동 응답의 범위, imagegen/documents 턴이 임시 저장소 밖을 건드리지 않았는가.
- **사용량 기록(C5)**: Claude 비용·Codex 토큰이 보고서에 있는가.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |` 로 정리하고, CAP 9개에 대해서는 별도 표 `| CAP | 에이전트 | 판정 동의(OK/수정) | 지적 |` 를 추가해 주세요. 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 중 하나와 한 문단 근거를 적어 주세요. 추정은 "추정:"으로 표시해 주세요.
