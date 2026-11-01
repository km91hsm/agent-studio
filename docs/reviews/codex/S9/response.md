| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |
|---|---|---|---|---|
| 1 | High | [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:41), [ACCEPTANCE_CRITERIA.md](/D:/LLM/agent-studio/docs/planning/05_plan/ACCEPTANCE_CRITERIA.md:23) | 보고서는 AC-P00-9를 “통과”로 선언하지만, 수용 기준이 요구하는 정본 `AGENT_INTEGRATION_DESIGN` §7 갱신은 제안으로만 남아 있다. §13A도 미갱신이다. | 두 정본에 검토된 경로를 반영한 뒤 통과로 판정하거나, 현재는 결정 게이트 미완으로 표기한다. |
| 2 | High | [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:35), [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:96), [MASTER_IMPLEMENTATION_PLAN.md](/D:/LLM/agent-studio/docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md:127) | CAP-07 (e)의 **Desktop 앱 미실행** 조건을 충족하지 못했다. 보고서가 이를 정직하게 밝힌 점은 좋지만, “양쪽 헤드리스 1단 없음”과 Codex의 “2단 전용”을 실측 결론처럼 확정할 근거는 부족하다. | Codex 미실행 조건을 재측정할 때까지 해당 결론을 제품 정책 또는 미검증 판정으로 구분하고, 게이트 예외를 명시한다. 캡처·입력 금지 지시와 전부 거부 설정은 안전 원칙에 부합한다. |
| 3 | Medium | [probe.ts](/D:/LLM/agent-studio/spikes/s9-capabilities/probe.ts:342), [s9-capabilities-results.json](/D:/LLM/agent-studio/spikes/fixtures/s9-capabilities-results.json:1471) | CAP-08 Codex는 목록에 이름이 있다는 이유로 `started`가 된다. 실제 `s9_probe`는 MCP 핸드셰이크 실패, 도구 0개다. 이는 서버 **발견** 증거다. | `reached`를 `discovered`로 낮추거나 정상 초기화되는 테스트 MCP 서버로 기동을 입증한다. V31의 “추가해도 기존 항목은 남는다”는 관찰은 별도로 유효하다. |
| 4 | Medium | [probe.ts](/D:/LLM/agent-studio/spikes/s9-capabilities/probe.ts:197), [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:43), [AGENT_INTEGRATION_DESIGN.md](/D:/LLM/agent-studio/docs/planning/02_agents_state/AGENT_INTEGRATION_DESIGN.md:135) | CAP-09 비교는 스킬·플러그인·MCP 목록과 config layer를 보여 주지만, 정본이 지정한 `notify` **값**과 hooks의 유효 설정은 비교하지 않는다. 분리 홈에서는 로그인 필요 작업도 실행하지 않았다. `supported/executed`가 상속 범위 전체를 입증하는 듯 읽힌다. | `notify`·hooks의 공유/분리 유효값을 민감정보 없이 비교하고 로그인 상속은 미실측으로 분리한다. SECURITY §2.1에는 `-c`가 허용 목록 집행자가 아니며 **빈 분리 홈**이 격리 조건임을 반영한다. |
| 5 | Medium | [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:26), [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:27) | CAP-03의 `supported` 증거는 일반 파일 Read/Edit와 명령 실행이다. 요구에 포함된 PDF·이미지 **읽기**는 실행하지 않았고, Codex PDF 플러그인도 노출만 확인했다. | 행을 내장 파일 기능 `supported`, PDF·이미지 읽기 `conditional/미실측`으로 나누거나 전체 판정을 `conditional`로 낮춘다. |
| 6 | Medium | [probe.ts](/D:/LLM/agent-studio/spikes/s9-capabilities/probe.ts:217), [experiments.ts](/D:/LLM/agent-studio/spikes/s7-skills/experiments.ts:281), [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:14) | 자동 승인 함수는 발견한 절대경로만 검사하고 경로를 못 찾으면 `accept`한다. 따라서 “저장소 밖이면 거부”라는 설명은 상대경로 이동 등을 포함한 보장이 아니다. 이번 세 턴의 승인 요청은 0건이라 관찰된 외부 변경은 없다. | 탐침에서는 승인 요청을 전부 거부하거나, 자동 허용 범위를 검증 가능한 읽기 전용 요청으로 제한한다. 보고서의 보장 표현도 좁힌다. |
| 7 | Low | [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:29), [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:31), [s9-capabilities-results.json](/D:/LLM/agent-studio/spikes/fixtures/s9-capabilities-results.json:2097) | 보고서의 DOCX 995B·PNG 2,713B가 최종 픽스처의 948B·2,522B와 다르다. 자동 검증도 DOCX 내부 문자열과 PNG 헤더에 한정된다. 다만 녹화에는 DOCX XML·문단 재열기와 완료된 `imageGeneration` 아이템이 있어, **최소한의 `artifact` 도달 판정은 수용 가능**하다. | 보고서 수치를 최종 실행과 맞추고, 형식·치수·내용의 완전한 검증은 V1 수용 기준으로 명확히 남긴다. |

| CAP | 에이전트 | 판정 동의(OK/수정) | 지적 |
|---|---|---|---|
| 01 | claude | OK | S2 재사용 실측으로 `executed` 타당. ExitPlanMode 거부 조건 필요. |
| 01 | codex | OK | S1 재사용 실측으로 readOnly 실행 근거 있음. |
| 02 | claude | OK | 자동 모드 실행은 확인됐고 보장은 조건부다. |
| 02 | codex | OK | 모드 실행은 확인됨. S4 우회 영역의 보장 수준을 계속 구분해야 한다. |
| 03 | claude | 수정 | 일반 파일은 실행, PDF·이미지 읽기는 미실측. |
| 03 | codex | 수정 | 일반 파일은 실행, PDF 플러그인은 발견 단계. |
| 04 | claude | OK | synced 스킬 발견만 확인한 `conditional/discovered`가 맞다. |
| 04 | codex | OK | 단일 DOCX 산출물 도달은 확인. 형식 전체 지원의 증거는 아니다. |
| 05 | claude | OK | 관찰된 1단 도구·스킬 범위에서 `unsupported`; 2단은 제안 경로다. |
| 05 | codex | OK | 로그인 모드 산출물 확인. API key 모드는 미실측이다. |
| 06 | claude | OK | Chrome MCP가 `connected`로 노출되어 `started`는 가능하나 조작은 미실측이다. |
| 06 | codex | OK | 플러그인 발견만 확인. |
| 07 | claude | OK | 헤드리스 세션에서 스킬 발견, 도구 없음. “2단 전용”은 제품 정책으로 표현해야 한다. |
| 07 | codex | 수정 | `discovered`는 타당하나 Desktop 미실행 조건의 1단 가용성은 미판정이다. |
| 08 | claude | OK | SDK 설정·기존 MCP 노출은 발견 근거이며 앱 서버 실행은 미실측이다. |
| 08 | codex | 수정 | 핸드셰이크 실패로 `started`가 아닌 `discovered`. |
| 09 | claude | OK | `settingSources` 대응 비교로서 조건부·발견 판정은 타당하다. |
| 09 | codex | 수정 | 목록 상속은 확인됐지만 `notify`·hooks 값과 분리 홈 로그인 실행은 빠졌다. |

S1·S2·S4 픽스처 재사용은 보고서가 출처와 재실행하지 않은 사실을 밝혀 **과거 실측 증거**로 읽을 수 있다. 지정된 홈 경로·사용자명·호스트명·thread ID 패턴은 보고서·결과·S9 녹화에서 발견하지 못했고, 사용자 홈 설정을 직접 수정하는 코드는 확인하지 못했다. Claude 비용과 Codex 토큰도 [S9.md](/D:/LLM/agent-studio/docs/spikes/S9.md:152)에 기록돼 있다. 읽기 전용 요청에 따라 파일 수정과 LIVE 재실행은 하지 않았다.

**판정: 수정 후 수용.** 18행과 V31 비교는 결정에 유용하지만, AC-P00-9의 정본 갱신이 빠졌고 CAP-07 필수 조건 및 CAP-08 기동 판정이 해결되지 않았다. C9에는 OS 입력 서버 범위의 제안이 있으나 그 경로의 실행은 V1 검증 대상으로 남아 있으며, 이미지 API key 경로도 미실측으로 표시한 상태에서 결정해야 한다.