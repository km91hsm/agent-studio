# 리뷰 요청: P00 스파이크 S8 (중복 적용 방지 — EffectLedger / outbox / 크래시 재기동 판정)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요. `node_modules`는 읽지 마세요.

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S8" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-8, `docs/planning/02_architecture/DATABASE_SCHEMA.md` §3(`effects` 테이블·Idempotency Key·file_patch/git_commit 복구 규칙), `docs/planning/04_security_test/RECOVERY_TEST_PLAN.md` TEST-RC-S13, `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` R15, DECISION_LOG의 D16(효과 원장/outbox)
2. 보고서: `docs/spikes/S8.md`
3. 코드: `spikes/s8-idempotency/effects.ts`(EffectLedger·blobOf), `spikes/s8-idempotency/worker.ts`(크래시 재현 자식 프로세스), `spikes/s8-idempotency/s8.test.ts`(CI 9건), 공용 `spikes/_shared/sampleRepo.ts`
4. 관찰값: `spikes/fixtures/s8-idempotency-results.json`

## 관점

- **pass/fail 판정 타당성**: 테스트가 "크래시 후 재기동"을 실제로 재현하는가 — 자식 프로세스가 `commit()` 전에 죽었다는 것을 단언이 증명하는가(종료 상태·원장 `intended`·파일 상태), 아니면 정상 종료 경로가 숨어 있는가. (A)의 "중복 적용 0" 단언(내용·mtime 불변)이 충분한가.
- **단언 누락**: 3분기(done / reapply_with_approval / conflict) 각각이 **파일·원장 양쪽**의 사후 상태를 확인하는가. git_commit outbox (D)에서 "재커밋하지 않음"이 `rev-list --count` 불변만으로 증명되는가(예: 다른 브랜치·amend·reflog). (E)의 conflict 조건(HEAD 이동)이 정본 DATABASE_SCHEMA §3의 규칙과 같은가.
- **RC-S13 `unverifiable`**: "자동 건너뛰기·자동 재시도 금지"가 코드에 실제로 고정됐는가(`assessExternal`·`conclude`의 상태 전이). `done`일 때만 자동 `committed` 전이하는 설계의 위험(이미 목표 상태라서 안전한가, 아니면 제3자가 우연히 같은 내용을 만든 경우를 효과 완료로 오인하는가).
- **원장 내구성**: tmp+rename 원자 쓰기의 Windows/Linux 차이, fsync 부재, 단일 writer 가정, JSON 전체 재기록. 스파이크 수준에서 받아들일 만한지와 P01 SQLite 전환 시 꼭 바뀌어야 하는 것.
- **인터페이스 확장(ledger Ruling)**: MASTER의 `EffectLedger{intend, commit, assess}`를 `kind` 판별자 + `assessGitCommit`/`assessExternal`/`recordResult`/`fileMode`로 넓힌 것이 DATABASE_SCHEMA §3·D16과 정합적인가, 과도한가.
- **한계 §5의 정직성**: "커밋됐는데 SHA 기록 전 크래시 → conflict 보류" 처리, `assess`가 `committed` 상태면 blob 무관 `done`인 설계가 보고서에 맞게 서술됐는가. 누락된 크래시 지점이 있는가(예: `intend` 쓰기 도중, `recordResult` rename 직전).
- **CI 이식성**: ubuntu CI에서 `process.kill(pid,"SIGKILL")`·`spawnSync(--import tsx)`·`renameSync`·git 설정이 그대로 동작하는가(Windows에서는 `status 1`, Linux는 `signal SIGKILL`).
- **보안·마스킹**: 픽스처·보고서에 홈 경로·사용자명·호스트명이 없는가. 테스트가 임시 디렉터리 밖을 건드리지 않는가.
- **사용량 기록(C5)**: 에이전트 호출 0이 보고서에 명시됐는가.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |` 로 정리하고, 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 중 하나와 한 문단 근거를 적어 주세요. 추정은 "추정:"으로 표시해 주세요.
