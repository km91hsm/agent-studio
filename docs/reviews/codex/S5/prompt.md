# 리뷰 요청: P00 스파이크 S5 (detached 데몬 생명주기 — Windows)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요.

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S5" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-4, `docs/planning/01_architecture/SYSTEM_ARCHITECTURE.md` §5 데몬 생명주기·§4 RPC 접속 계약, `docs/planning/04_security_test/SECURITY_MODEL.md` §7(데몬 RPC: 127.0.0.1·토큰·PID/시작 시각/nonce 검증), `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` V7·R16
2. 보고서: `docs/spikes/S5.md`
3. 코드: `spikes/s5-daemon/daemon.ts`, `spikes/s5-daemon/launcher.ts`, `spikes/s5-daemon/s5.unit.test.ts`, `spikes/s5-daemon/s5.test.ts`
4. 관찰값: `spikes/fixtures/s5-daemon-results.json`
5. 참고(선행 스파이크 입력): `docs/spikes/S4.md` §2 loopback 허용 실측(데몬 WS 인증 토큰 필수의 근거)

## 관점

- **pass/fail 판정 타당성**: 정본 Step 1의 세 단언(launcher 종료 후 5초 뒤 접속·seq 증가 / 두 번째 launcher의 pid·startedAt·nonce 검증 재접속 / 데몬 종료 시 자식 0)이 실제로 테스트 코드에서 단언되는가, 보고서의 pass가 증거(픽스처)와 맞는가. "부모 프로세스 종료"가 실제로 만들어졌는가(vitest 워커 안 spawn이 아니라 별도 launcher 프로세스).
- **단언 누락**: seq "연속"의 정의가 충분한가(welcome seq ≥ 이전 seq만 단언), 자손 0의 관찰 출처(CIM 폴링 10초)가 적절한가, 락 파일 원자성·stale 판정(`assessLock`)이 재부팅·PID 재사용·nonce 불일치를 빠짐없이 다루는가, `startedAt` 허용 오차 2초의 타당성.
- **보안 우회**: 토큰 파일(`<stateDir>/token`) 보관 방식이 스파이크로서 적절히 한정됐는가(제품은 키링), 토큰 없는/잘못된 hello 거부·hello 타임아웃·프로토콜 버전 불일치 처리, 127.0.0.1 바인딩, 락 파일 위조(다른 프로세스가 락을 써서 launcher를 자기 포트로 유도)에 대한 방어가 nonce·startedAt 검증으로 충분한지.
- **Job Object 판정(R16)**: "정상 shutdown 경로에서는 명시 kill(`taskkill /T /F`)로 충분, 크래시 경로는 미해결"이라는 결론이 관찰 범위를 넘지 않는가.
- **환경 불변·정리**: 테스트가 남기는 프로세스·임시 디렉터리·락 파일이 없는가, 실패 경로의 정리(`afterAll` taskkill)가 안전한가(잘못된 pid를 죽일 가능성).
- **마스킹**: 픽스처·보고서에 홈 경로·사용자명·호스트명이 남아 있지 않은가.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |` 로 정리하고, 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 중 하나와 한 문단 근거를 적어 주세요. 추정은 "추정:"으로 표시해 주세요.
