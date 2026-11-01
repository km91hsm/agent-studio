# 리뷰 요청: P00 스파이크 S4 (격리 시험 — Codex Windows sandbox 외부 경로·네트워크, Claude native, WSL2)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요.

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S4" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-7b
2. 보고서: `docs/spikes/S4.md`
3. 코드: `spikes/s4-isolation/verdict.ts`, `verdict.unit.test.ts`, `s4.test.ts`
4. 관찰값: `spikes/fixtures/s4-isolation-results.json`(20행 + isolationWarnings/guaranteeDowngrades + windowsSandboxReadiness + wsl2 + listenerHits)
5. 녹화 픽스처(마스킹됨): `spikes/fixtures/codex-0.166.0/s4-*.jsonl`(17), `spikes/fixtures/claude-2.1.316/s4-*.jsonl`(3)
6. 설계 참조: `docs/planning/04_security_test/SECURITY_MODEL.md` §2.1 보장 수준 표·격리 게이트 문단, `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` V29, `docs/spikes/S1c.md` §2(cwd 쓰기 범위 결과)

## 리뷰 관점

A. 판정 로직(`judge`): "효과 있음 → bypassed(승인 요청 유무 무관) / 요청 있음·효과 없음 → approval_requested / 둘 다 없음 → blocked"이 AC-P00-7b의 "차단 또는 승인 요청으로 나타나면 합격"과 정합한가. 모델이 자발적으로 묻는 승인 요청(샌드박스 거부 없이)을 집행자 증거로 쓰지 않고 `never` 행으로 판정하겠다는 §3의 규칙이 타당한가.
B. 영역 재설계(§3 첫 항목): MASTER의 `../outside.txt`가 TEMP라서 "외부"를 측정하지 못한다는 진단과, 저장소 안 git-ignored `.tmp/`를 외부 대상으로 쓴 선택이 적절한가(다른 함정: `.tmp/`가 저장소 루트의 writable 루트에 포함될 가능성 등).
C. 효과 판정의 직접 관찰(파일 존재·수신 서버 hit·`curl -w %{http_code}`)이 각 행에서 실제로 쓰였는지, 픽스처와 `evidence`가 판정값을 뒷받침하는지(특히 `network_external`의 `000`·exit 1 해석, `fs_tmp_parent` on-request/elevated 행의 approval_requested).
D. `unelevated` 변형 적용 여부 미검증(§1 행 7)과 V29 "해소" 범위가 솔직한가. WSL2 미실측 처리.
E. §2 보장 수준 입력(외부 경로·외부 호스트 ENFORCED, TEMP·loopback DETECTED, Claude native POLICY_ONLY)과 `isolation_warning` 목록이 과도하거나 누락된 곳. loopback 허용이 S5 데몬 설계에 미치는 영향 서술.
F. 환경 불변·민감 정보: 테스트가 TEMP 상위·`.tmp/`에 만든 파일의 정리, 픽스처의 사용자명·호스트명·홈 경로·토큰·thread id.

## 출력 형식

마크다운. 발견 사항 표 `| # | 심각도(Critical/High/Medium/Low) | 위치 | 문제 | 제안 |`. 마지막에 "판정: 수용 / 수정 후 수용 / 거부" 한 줄 + 이유 2~3문장. 추측은 "추정"으로 표시.
