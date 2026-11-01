# 리뷰 요청: P00 스파이크 S1c (Codex 쓰기 범위 / readOnly 명령 / 승인 보류 TTL / steer 반영)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요.

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S1c" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-2의 S1c 부분
2. 보고서: `docs/spikes/S1c.md`
3. 코드: `spikes/s1-codex-app-server/s1c.test.ts` (클라이언트 `client.ts`·감사 `audit.ts`는 S1a/S1b 그대로)
4. 관찰값: `spikes/fixtures/codex-0.166.0/s1c-results.json`(2분 보류 실행), `s1c-results-hold900.json`(15분 보류 실행)
5. 녹화 픽스처(마스킹됨): `spikes/fixtures/codex-0.166.0/s1c-{file-write,shell-command,git-commit,network,outside-path,readonly-commands,approval-hold-120000,approval-hold-900000,steer-reflect}.jsonl`
6. 설계 참조: `docs/planning/04_security_test/SECURITY_MODEL.md` §2.1 보장 수준 표(실행 명령·고위험 효과 셀), `docs/planning/04_security_test/EXECUTION_LIMITS_POLICY.md` "실시간 승인 대기" 행, `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` V11·V30

## 리뷰 관점

A. 보고서 §1 판정 6행이 테스트 단언·관찰값·픽스처로 뒷받침되는가. "값은 기록" 테스트(2×2 표)의 단언이 너무 약해 잘못된 실측도 pass가 되는 구조라면 어디를 단언으로 올려야 하는지.
B. §2 "자동 쓰기 범위 표"와 그로부터 도출한 SECURITY_MODEL §2.1 제안값(실행 명령 ENFORCED 서술 수정, 고위험 효과 조건부 ENFORCED)이 과도한 일반화인지. 특히 `writableRoots:[]`+cwd 편차(§3 첫 항목)가 MASTER `writableRoots:[sample]` 의도를 대체할 수 있는지.
C. V11(승인 보류) "해소" 주장: 2분·15분 관찰로 충분한지, 보류 중 서버 알림 없음·연결 유지 판정이 녹화로 뒷받침되는지, decline 뒤 `turn/interrupt`를 함께 보내라는 권고가 타당한지.
D. V30(readOnly 명령) "해소(부분 부정)" 해석이 픽스처와 일치하는지 — 읽기 명령이 승인 없이 실행된 증거, 쓰기 명령이 승인 요청으로 간 증거.
E. `item/fileChange/requestApproval`이 한 번도 발생하지 않았다는 관찰과 "사후 diff 감사에 의존" 결론의 타당성.
F. 픽스처·보고서에 남은 민감 정보(사용자명·호스트명·홈 경로·토큰·thread id).

## 출력 형식

마크다운. 발견 사항 표 `| # | 심각도(Critical/High/Medium/Low) | 위치 | 문제 | 제안 |`. 마지막에 "판정: 수용 / 수정 후 수용 / 거부" 한 줄 + 이유 2~3문장. 추측은 "추정"으로 표시.
