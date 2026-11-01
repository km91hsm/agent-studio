# archive — 계획 수립 과정 기록

`docs/planning/`의 설계 문서는 2026-11-01 정리 작업에서 **최종본만** 남기도록 재작성됐다. 그 과정에서 떼어낸 기록을 이 폴더에 원문 그대로 보존한다. 정리 전 전체 상태는 로컬 이력 브랜치 `planning-history`의 커밋 `1ff4372`(2026-11-01)에서 볼 수 있다(공개 저장소 `main`은 마스킹된 스냅숏 1커밋에서 시작하므로 이 문서들이 언급하는 과거 해시는 로컬 이력 기준이다).

| 경로 | 내용 |
|---|---|
| `06_codesign/` | Claude·Codex 독립 초안(`CLAUDE_INITIAL_PROPOSAL`, `CODEX_INITIAL_PROPOSAL`), 기술 토론(`ARCHITECTURE_DEBATE`), Codex 독립 리뷰 원문(`CODEX_PLAN_REVIEW`), 리뷰 판정·조치 기록(`REVIEW_RESOLUTION` — R4 66건, R6 39건, B4 55건, B5 21건, B6 35건, 원문 §7·§10·§12·§14), 구조 대안 A/B/C 점수 비교 원문(`ARCHITECTURE_COMPARISON`) |
| `codex/` | Codex CLI 호출 15회(R0~R10) + 정리 작업 호출(C1~)의 `prompt.md`·`response.md`(바이트 보존)·`events.jsonl`·`stderr.log`·`meta.json` |
| `evidence/` | 환경 조사(지시서 원문 `USER_DIRECTIVE.md`·기준 문서 사본은 로컬 비공개 보관이라 공개 저장소에 없음), 스킬 설치본 해시·분석, 공식 문서 조사 노트, Codex 0.166.0 app-server 스키마 원본(`codex_schema_0.166.0/`), 계획 단계 스킬 사용 로그 |
| `PLANNING_STATUS.md` | STEP 0~12 체크포인트, Codex 호출 카운터, 사용자 결정 접수 기록, 환경 변경 감지 기록 |
| `DECISION_LOG.md` | 설계 문서에서 제거한 결정 이력 — 양측 입장 변경, 사용자 결정 U1~U9의 선택지·양측 입장·결정 근거, 승인 체크리스트 완료 항목, 리뷰 라운드 요약, 정리 기준(Codex C1 합의) |

설계 문서를 읽을 때 이 폴더는 필요하지 않다. "왜 이렇게 결정했나"를 추적할 때만 참조한다.
