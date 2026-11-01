# 독립 재검증 요청: P00 종료 게이트 문서 + SECURITY_MODEL §2.1 보장 수준 표 갱신

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 검증해 주세요. 파일을 수정하지 마세요. `node_modules`와 `spikes/fixtures/**/*.jsonl`(녹화 원문, 큼)은 통째로 읽지 말고 필요한 줄만 grep 하세요.

## 대상

1. `docs/spikes/P00_GATE.md` — P00 종료 게이트: 보고서 11건 + S0 표, AC-P00-1~9 체크표, §2.1 갱신 요약, `isolation_warning` 등록 입력, 사용량 합계, OPEN_ISSUES 상태 입력, 범위 축소·결정 제안 12건, 2차 승인 요청.
2. `docs/planning/04_security_test/SECURITY_MODEL.md` §2.1(보장 수준 표·자동 모드 도출표·격리 게이트 문단·메타 UNVERIFIED 행) — 이번 커밋에서 **유일하게 수정한 정본**. 변경 전후는 `git show HEAD -- docs/planning/04_security_test/SECURITY_MODEL.md`.

## 근거 문서(필요한 절만)

- `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-1~9, `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "선행 검증 작업"(범위 축소 규칙)·"P00 종료 게이트", `docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md`(C3·C4·C5·C7·C9, 2차 승인)
- 입력 보고서: `docs/spikes/S1c.md` §2(V30), `S2.md` §2(plan 정책), `S4.md` §2(격리 매트릭스·isolation_warning 6건·하향 4건), `S9.md` §2(V31·공유/분리 비교), 그 외 `S1a`·`S1b`·`S3`·`S5`·`S6`·`S7`·`S8.md`의 판정문·사용량 절
- 픽스처: `spikes/fixtures/s4-isolation-results.json`(`isolationWarnings`, `guaranteeDowngrades`), `spikes/fixtures/s9-capabilities-results.json`(`raw.v31`, `raw.codexInheritance`)

## 관점

- **§2.1 갱신이 입력 보고서의 실측 범위를 넘지 않는가**: 각 셀의 새 값(ENFORCED/DETECTED/POLICY_ONLY)이 S1c·S4·S9의 관찰로 뒷받침되는지, "실측 범위 밖은 올리지 않는다"(S1c 리뷰 #2 원칙)가 지켜졌는지. 특히 (1) 실행 명령 Codex 엄격 열 UNVERIFIED→DETECTED, (2) 고위험 효과 DETECTED 유지와 조건 재정의, (3) MCP 셀 "공유 홈 POLICY_ONLY 확정 / 격리 집행자 = 분리 CODEX_HOME", (4) 네트워크·파일 시스템의 예외(loopback·TEMP 상위) 표기, (5) 자동 모드 도출표가 본표와 일치하는지.
- **AC-P00 체크표의 정직성**: "충족/부분/판정 완료"가 보고서 판정문과 맞는가. AC-P00-7a(API key 미실측)·AC-P00-9(정본 갱신 대기)·AC-P00-5(제안)·AC-P00-4(수동 관찰 1건)의 표기가 과장되지 않았는가. 보고서 11건이 모두 존재하고 각자 pass/fail 표·환경·사용량을 갖는가.
- **범위 축소·결정 제안 12건**이 MASTER의 축소 규칙과 대응하는가, 빠진 미완 항목이 있는가(예: S7 V24 미실행 4종, S6 제거 잔존물, S5 콘솔 창, S9 Desktop 앱 재실측).
- **isolation_warning 입력 6건·하향 4건**이 S4 산출물과 식별자까지 일치하는가.
- **사용량 합계(C5)**의 산식이 각 보고서 수치와 맞는가(추정치는 추정으로 표기됐는가).
- **보안·불변**: 다른 정본(ADR·PRODUCT·AGENT_INTEGRATION·DATABASE_SCHEMA·CSP)이 수정되지 않았는가(`git show --stat HEAD`), 문서에 홈 경로·사용자명·호스트명·thread id가 없는가.
- **P01 미착수**: 저장소에 P01 구현 흔적(packages/, apps/ 등)이 없는가.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |` 과, §2.1 셀별 동의표 `| 셀 | 새 값 | 동의(OK/수정) | 근거 |`(최소: 파일 시스템 ×4열, 실행 명령 Codex 엄격, 네트워크 ×2, 고위험 효과 Codex 엄격, MCP Codex·Claude, 그 외 OS 입력 Codex 엄격). 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 와 한 문단 근거. 추정은 "추정:"으로 표시해 주세요.
