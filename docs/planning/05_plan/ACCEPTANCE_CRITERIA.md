# ACCEPTANCE_CRITERIA — Phase·릴리스 수용 기준

| 메타 | 값 |
|---|---|
| 상태 | FINAL (2026-11-01) |
| 형식 | `AC-<Phase>-<n>`: 조건 | 검증 방법 | 증거 | 관련 REQ/TEST |
| 원칙 | AI의 "완료" 보고는 증거가 아니다. 모든 AC는 **조건별 pass/fail 단언 + 증거 파일 경로 + 설치 버전·OS·실행 시각**으로 입증. "보고서 존재"·"결과 기록"만으로는 합격 아님 |

## 1. Phase별 AC

### P00
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P00-1 | 스파이크 보고서 **11건**(S1a·S1b·S1c·S2~S9), 각각 **성공 기준별 pass/fail 표**와 실행 환경(CLI 버전·OS·시각) 포함; 실패 항목은 범위 축소 제안 연결; S9가 1주 상한 내 미완이면 `S9.md`를 **상태 보고서**(미완 사유·CAP별 현재 판정·남은 실험)로 제출해 11건을 채우고, 미완 CAP의 결정 게이트(AC-P00-9)·2차 승인 예외는 사용자에게 명시 | 문서 검토 + 체크리스트 | `docs/spikes/S1a.md`·`S1b.md`·`S1c.md`·`S2.md`~`S9.md`(11건; `S0.md`는 별도 선행 운영 증거) | — |
| AC-P00-2 | **S1a** 기본 왕복: `readOnly`+`on-request`에서 무단 변경 0(필수), 승인 요청 수신·응답은 관찰 기록, `tokenUsage` 상관 pass; **S1b** 제어·세션: steer·interrupt·resume·fork·재구독·queue opt-in 거부 pass; **S1c** 쓰기 범위·보류: `workspaceWrite`에서 승인 요청 없이 변경이 발생한 경우 그 파일이 사후 diff 감사에 `unapproved_write`로 포착됨(변경이 없으면 변경 0과 승인 요청 유무를 기록), 15분 보류 동작 기록 | 실행 로그 | 녹화 픽스처 | AG-02~05 |
| AC-P00-3 | S2: Claude SDK canUseTool·PreToolUse·streaming input·interrupt 성공; 자동 허용 우회 재현 기록 | 실행 로그 | 픽스처 | AG-01·03·04 |
| AC-P00-4 | S5: 창·Electron 종료 후 데몬·턴 생존, 재접속 seq 연속, 재부팅 후 Recovery 제안, 자손 프로세스 0 | 스크립트 | 로그·프로세스 목록 | RC-01~03 |
| AC-P00-5 | S6: Windows 설치물에서 better-sqlite3·node-pty 로드, Monaco worker+CSP 동작, 데몬 런타임 방식 결정 | 설치물 실행 | 로그, ADR 갱신 | DT-01 |
| AC-P00-6 | S7: 스키마 산출물 고정·diff 스크립트 동작(CI는 P01 T10); 스킬 로드 증거 3등급 각 1회 실측(Codex 측은 C4 설치 후); 자동 선택 재현 2종(U10) — 양 에이전트가 스스로 고른 스킬과 기대 주도 스킬 대조표; **충돌 실험 4건(SKILL_CONFLICT_RESOLUTION §2 TDD·디버깅·코드 리뷰 3행 + §3 노출 충돌 1건) 주도 스킬 확정 + §2 나머지 5행(요구사항 심문·계획·구현·스킬 제작·UI 디자인) 잠정 유지·P07 재검증 조건 기재**(SKILL_CONFLICT_RESOLUTION v2); 주도 스킬 9개(Codex 설치 8개 + Claude 전용 brainstorming) 시그니처 초안 존재 | 문서 | 실험 기록 | SK-05 |
| AC-P00-7a | S3: 인증 모드별 기동 pass/fail 표, ADR-0007 재검토 조건 발동 여부 기록 | 문서 | 보고서 | SEC-02 |
| AC-P00-7b | S4 **격리 게이트**: Codex Windows sandbox에서 worktree 외부 쓰기·미등록 호스트 요청이 각각 차단 또는 승인 요청으로 나타나면 해당 조합 **합격**, 아니면 불합격. **AC 통과 조건(P00 전체)** = 모든 조합의 판정이 기록되고 보장 수준 표가 갱신되며 불합격 조합이 `capabilities.isolation_warning`으로 등록됨(경고 배지 + 자동 모드 활성 시 1회 확인; 차단·비활성화 없음). 조합 불합격 자체는 P00 실패가 아님 | 스크립트 | 로그, SECURITY_MODEL §2.1 갱신 커밋 | SEC-02, SE-06b |
| AC-P00-8 | S8: 패치 후 크래시·재시작 시 중복 적용 0, blob 3분기 판정 각 1회 pass | 스크립트 | 로그 | RC-S13 |
| AC-P00-9 | S9 기능 상속 탐침(**결정 게이트**): CAP-01~09 × 2공급자 각 행에 `supported/conditional/unsupported` 판정 + 도달 단계(발견/기동/실행/산출물) + 증거; 공유 vs 분리 `CODEX_HOME` 비교 포함. 통과 = 모든 행 판정 완료 + 각 CAP의 1/2/3단 경로 확정(AGENT_INTEGRATION §7 갱신). 기능 실현은 V1 AC(AC-V1-5~10)에서 별도 판정 | 스크립트+문서 | `docs/spikes/S9.md`, AGENT_INTEGRATION §7 갱신 | CAP-01~09 |

### P01
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P01-1 | Task 제출→QUEUED→(가짜 Gateway)→COMPLETED 왕복, 전이는 `transition()` 단일 경로 | 단위·통합 | 테스트 로그 | STATE-02·03 |
| AC-P01-2 | 투영 삭제 후 저널에서 100% 재구성 | RC-S16 | 로그 | STATE-04 |
| AC-P01-3 | WS 재접속 시 seq 누락·중복 0 | E4 | 로그 | WS-01 |
| AC-P01-4 | 보안 설정 스냅숏 테스트 통과(webPreferences·CSP·IPC 검증; CSP는 SECURITY_MODEL §7 단일 정의와 바이트 일치) | SE-06a, 스냅숏 | 로그 | SEC |
| AC-P01-5 | 토큰 없는 RPC 접속 거부 + Renderer 프로세스에서 데몬 포트 접속 시도가 CSP·IPC 계약으로 불가함 단언 | SE-06a | 로그 | SEC-01 |
| AC-P01-6 | 격리 경고 집행: S4 불합격 조합을 `capabilities.isolation_warning`으로 등록하면 해당 조합에서 자동 모드 활성 요청이 1회 확인 대화를 거치고 경고 배지가 투영되며, 확인 없이 활성화되지 않음(단위+통합) | 단위·통합 | 로그 | SEC-02 |
| AC-P01-7 | 투영 대응표 `packages/protocol/projections.md` 존재(모든 투영 열 ↔ 생산 이벤트·필드), RC-S16 재생 테스트가 이 표 기준으로 열 단위 비교 | RC-S16 | 표·로그 | STATE-04 |

### P10a
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P10a-1 | 14행 매트릭스(원 11영역 + 브라우저·컴퓨터 사용·외부 문서 전송) 기본값 구현·테스트, 모드별 보장 수준 축소 적용, 범위 이탈 재요청 | SE-01a·01b·02·03 | 로그 | SEC-01·05·06 |
| AC-P10a-2 | 마스킹 패턴 목록 문서화, 토큰 포함 출력이 저널·로그·전송에 0건 | SE-04 | grep 결과 | SEC-03 |
| AC-P10a-3 | fencing 거부·blob 해시 3분기 판정·커밋 outbox | RC-S15, 단위 | 로그 | CE-07 |
| AC-P10a-4 | 암호화 백업 생성·복원, WAL 단독 복사 거부 | RC-S17 | 체크섬 | OPS-06 |
| AC-P10a-5 | **엄격 모드**(Codex readOnly + 앱 적용기 + **사전조건: 사용자 MCP·Hook 제외 확인(분리 프로필 또는 allowlist 공집합) + S1c에서 readOnly 명령 실행 경로 실측 + S4 해당 OS·공급자 조합 합격**(SECURITY §2.1 고위험 효과 엄격 셀과 동일))에서 원격 Git·설치·DB·배포가 앱 실행기 외 경로로 실행되지 않음을 단언(조건부 ENFORCED); 사전조건 미충족이면 이 단언을 생략하고 `DETECTED` AC만 적용. **일반·자동 모드**: 보장 수준 표와 UI 라벨 일치 + 셸·MCP·Hook 우회 시도가 사후 감사에 탐지됨(탐지 범위 밖 항목은 "부분 DETECTED"로 표시) | 단위 + SE-08 | 로그, 감사 이벤트 | SEC-05 |
| AC-P10a-6 | 수동 스킬 증거 프로토콜(P07 이전, 공급자별): Claude Task = `SkillSelected` 저널 + Skill 도구 블록 인용 + 산출물 경로; Codex Task = `SkillSelected` + `skills/list` 발견 + 고유 절차 산출물(implicit), explicit 교정·사용자 명시 시 skill 입력 전송 로그(`SkillInjectionAccepted`) 추가; 리뷰어가 체크리스트로 판정, 기록은 `docs/agent-studio/<task>/skill-evidence.md` | 문서 검토 | 로그 파일 | DEV-02 |

### P02
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P02-1 | 두 어댑터로 AG-01~05 통과 | E2E | 로그 | MODE-01·02 |
| AC-P02-2 | 발생한 승인 요청 전부 Broker 경유 + 승인 이벤트 없는 fileChange가 `unapproved_write` 배지로 표시(TEST-RF-01) | 계약 테스트 | 로그 | SEC-05 |
| AC-P02-3 | 프로젝트 옵트인 **없이** 어댑터 옵션·환경변수·CLI 플래그로 `--approve-for-me`·`dangerFullAccess`·`--dangerously-bypass-*`·bypass/acceptEdits가 주입되면 어댑터 기동 거부; `dangerFullAccess`·`--dangerously-bypass-*`는 옵트인과 무관하게 항상 거부 | 단위 | 로그 | SEC |
| AC-P02-4 | fallback 2종이 "축소 모드" 라벨과 함께 동작 | E2E | 스크린샷·로그 | — |
| AC-P02-5 | capabilities 감지로 미지원 기능 UI 비활성 | 단위 | 로그 | — |
| AC-P02-6 | 권한 모드 선택지(Claude plan/default/acceptEdits/auto/bypassPermissions/dontAsk, Codex untrusted/on-request/never) 중 **프로젝트 설정에서 옵트인된 값**만 어댑터에 전달됨, 자동 모드 선택 시 경고 배지("사전 차단 보장 없음")·앱 실행기 정식 경로 유지(TEST-SE-09); 모든 조합에서 노출(U8), 격리 미확인 조합은 1회 확인 대화 선행 | E2E | 로그·스크린샷 | CAP-01·02 |

### P04
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P04-1 | 프로젝트당 수정 1개 슬롯, 초과 QUEUED 유지 | 통합 | 로그 | LIM |
| AC-P04-2 | 120분/20분/3회/2회/15분·토큰 한도 동작; 승인 대기 제외(TEST-LIM-01·02); 활성 중 재기동 보수 계산(TEST-LIM-05); 토큰 한도 BLOCKED(budget)(TEST-LIM-04); 만료 `requestId` decide 거부(TEST-RF-02) | 통합 | 로그 | LIM-01~04 |
| AC-P04-3 | Recovery 판정표 4분기 재현 | RC-S03·S05·S12·S13 | 로그 | REC |
| AC-P04-4 | 사용량 증분 집계, Codex 금액 "정보 없음" 표시 | 단위·UI | 로그 | OPS-02 |

### P03
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P03-1 | Claude/Codex Mode로 실제 작업 1건: 스트리밍·승인·취소·추가 지시 UX | E2E | 녹화 | WS-01·09 |
| AC-P03-2 | 1,000 delta/s 합성 입력에서 UI p95 < 100ms, 누락 0 | 부하 | 측정 | WS-01 |
| AC-P03-3 | "AI 보고" vs "검증" 카드 분리 표시, 불일치 경고 | E2E | 스크린샷 | WS-13 |
| AC-P03-4 | 키보드만으로 모든 승인 동작 수행 가능 | 접근성 테스트 | 로그 | WS-12 |

### P05
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P05-1 | 5동작이 서로 다른 명령·라벨로 동작, Checkpoint Restore에 "대화 미복원" 경고 | E2E | 스크린샷 | SM-13 |
| AC-P05-2 | RECOVERY_TEST_PLAN MVP-Core 게이트(S01~S05, S07, S12, S13, S15, S16, **S20, S22**) 통과 — 목록은 RECOVERY_TEST_PLAN §4와 동일해야 함 | 테스트 | 로그 | REC |
| AC-P05-3 | SessionIndex가 `sourceKinds` 포함 Codex 목록과 Claude `listSessions` 결과를 통합, 열 때 native 재검증 | 통합 | 로그 | SM-01·02 |

### P08a
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P08a-1 | 턴·Task별 Diff, 귀속 등급(관찰된 Diff / 실행과 연결됨 / 작성자 불명) 표시 — 해시·시점·실행 범위로 입증된 때만 확정 | DT-06, RF-01 | 스크린샷 | WS-05 |
| AC-P08a-2 | Monaco Diff 지연 로드, 설치물에서 worker·CSP 정상 | 설치물 | 로그 | WS-04 |

### P11a (MVP-Core 게이트)
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P11a-1 | Windows NSIS 내부 빌드 설치→실행→제거, 잔여 프로세스 0 | DT-01 | 로그 | GOAL-01 |
| AC-P11a-2 | TEST-BG-01~05 각각 pass(프로세스 목록·run ID·seq·승인 상태 증거) | 자동화 | 로그 | GOAL-06 |
| AC-P11a-3 | 설치물에서 네이티브 모듈 로드·데몬 재접속; 프로토콜 버전 불일치 접속 거부(TEST-RF-03) | 설치물 | 로그 | — |

### P06 / P07 / P09 / P08b (V1)
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-P06-1 | 지시→Phase 제안→수락→Task 실행; 사용자 편집 항목은 자동 재계획이 수정 불가(제안 Diff만) | E2E | 로그 | PH-01·02·07 |
| AC-P06-2 | DAG 사이클 저장 거부, 의존 미충족 Task QUEUED 유지 | RC-07 | 로그 | PH-03 |
| AC-P07-1 | 스킬 증거 등급이 Task 완료를 막는 E2E(에이전트가 필수 스킬을 고르지 않음 또는 이름만 포함 → `DISCOVERED` → REWORK 명시 호출 → 재실패 BLOCKED) | CO-06 | 로그 | SK-06·12 |
| AC-P07-2 | 사용자 전용·보류 스킬은 자동 라우팅 제외, 제안만 | 단위 | 로그 | SK-11 |
| AC-P07-3 | 해시 불일치 스킬 격리, 공급망 격리 시험 러너 동작 | SE-05 | 로그 | SEC-04 |
| AC-P07-4 | MCP 프로젝트 allowlist 외 서버 미노출(양 에이전트) | 통합 | 도구 목록 | SK-08 |
| AC-P09-1 | 기본 흐름 E2E(Claude 계획→Codex 구현→Claude 리뷰→REWORK→VERIFYING) | CO-01·02 | 로그 | MODE-03 |
| AC-P09-2 | 반복 상한·무변화 조기 종료 | CO-03 | 로그 | CE-06 |
| AC-P09-3 | handoff 문서로 다른 에이전트 재개, 역할 뒤집기 동작 | CO-04·05 | 로그 | MODE-04·05 |
| AC-P09-4 | 병렬 worktree 비교 뷰(T5b): 두 worktree 결과 diff 비교·선택, 선택되지 않은 worktree 정리 | E2E | 스크린샷·로그 | MODE-04 |
| AC-P08b-1 | 편집·저장 `actor=user` 저널, 에이전트가 사용자 PTY에 접근 불가 단언 | DT-04·05 | 로그 | WS-04·06 |
| AC-P08b-2 | base 해시 불일치 Save 거부(에이전트가 먼저 바꾼 파일을 사용자가 저장 시 충돌 안내, 조용한 덮어쓰기 0) — TEST-RF-04 | DT-04 | 로그 | WS-04 |
| AC-P08b-3 | 파일 첨부 왕복: 이미지·PDF·텍스트 첨부가 Claude 블록/Codex `localImage`로 전달되고 저널에는 해시만 기록 | E2E | 로그 | WS-03 |

### P10b+P11b (V1 게이트)
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-V1-1 | 3-OS 설치물 테스트(DT-01~03) 통과, 공개 빌드 서명·notarization | CI | 로그 | GOAL-01 |
| AC-V1-2 | 업데이트 중 실행 작업 있으면 적용 연기, 롤백 동작 | DT-08 | 로그 | OPS-07 |
| AC-V1-3 | worktree당 1개 병렬 경합 테스트 통과 | 통합 | 로그 | LIM |
| AC-V1-4 | RECOVERY_TEST_PLAN 전부 3-OS 통과 | 테스트 | 로그 | REC |
| AC-V1-5 | macOS·Linux 설치물에서 TEST-BG-06~10(창 종료·앱 종료·재접속·자손 정리·늦은 승인) pass | INST | 로그 | GOAL-06 |
| AC-V1-6 | 핵심 사용자 경험(지시서 §1: 지시→Phase 생성→Skills 선택→Claude/Codex 협업→검증) E2E 1건 완료 — **제품 MVP 완성 게이트는 V1** | E2E | 녹화 | GOAL-04·07 |
| AC-V1-7 | 컴퓨터 사용(CAP-07/08): 앱 MCP 도구 서버의 `screen.capture`와 `input.*`가 분리 승인되고 동작 ID·대상 창·효과 로그가 기록되며, 거부 시 입력이 발생하지 않음; 3단 스크립트로 입력 제어 시도 시 `AuditSignal{input_api_detected}` 기록(TEST-SE-10; OS별 보장은 SECURITY §2.1 "그 외 OS 입력 경로" 행). S9에서 CAP-07/08이 2·3단 포함 `unsupported`면 N/A + 범위 변경 보고 | E2E(Windows) | 로그·감사 이벤트 | CAP-07·08 |
| AC-V1-8 | 문서 생성(CAP-04): S9 판정표에서 **확정된 경로**(1단 플러그인/스킬, 2단, 3단 중 하나)로 docx·xlsx·pdf 각 1건 생성 → 파서 재열기 성공 + 해시·`RunArtifacts` 기록; 3단이면 `EffectCommitted{pkg_install}` 선행. **S9가 모든 경로를 `unsupported`로 판정한 CAP는 이 AC가 N/A가 되고 REQ-CAP 행을 V1 범위에서 제외하는 범위 변경을 사용자에게 보고**(실패 아님) | E2E | 산출물·로그 | CAP-04 |
| AC-V1-9 | 이미지 생성(CAP-05): S9 확정 경로(Codex `image_gen` 또는 2단 앱 API)로 1건 생성 → 치수·형식 검증·해시 기록; API key 모드 가용성은 S9 판정대로 UI 표시. unsupported 시 N/A·범위 변경 보고 | E2E | 산출물·로그 | CAP-05 |
| AC-V1-10 | 브라우저 자동화(CAP-06) — **앱 MCP 도구 서버 경로**: 로컬 테스트 페이지 열람·클릭 1회에 `ToolServerAction{browser}` + ASK 승인 요청 발생·호스트 범위 기록(ENFORCED 단언). **공급자 플러그인 경로**(S9 conditional인 경우만): 같은 동작을 `AgentEvent{mcpToolCall}`로 관찰·기록하고 승인 발생 여부는 단언하지 않음(§2.1 DETECTED). S9에서 앱 MCP 경로까지 `unsupported`면 N/A + 범위 변경 보고 | E2E | 로그 | CAP-06 |

### V2
| ID | 조건 | 검증 | 증거 | REQ/TEST |
|---|---|---|---|---|
| AC-V2-1 | 컨텍스트 압축: Codex `thread/compact/start` 후 세션 지속, handoff 요약 생성 | E2E | 로그 | SM-09 |
| AC-V2-2 | 브라우저 미리보기(`WebContentsView` 또는 외부 브라우저 연동 결정 후) 로드 | DT-07 | 스크린샷 | WS-08 |
| AC-V2-3 | 다중 창 동기화(동일 저널 seq) | E2E | 로그 | WS-11 |
| AC-V2-4 | 금액 추정(단가표 입력 시만 표시, 미입력 시 "정보 없음") | 단위·UI | 로그 | OPS-02 |
| AC-V2-5 | 요구사항 변경 → 영향 Task 목록 + 재계획 제안 Diff(수락 전 변경 없음) | E2E | 스크린샷·저널 | PH-07 |
| AC-V2-6 | 스킬 업데이트: 최신 커밋 비교 표시 → 승인 → 격리 시험 → 적용, 롤백 시 해시 복원 | E2E | 해시 비교표 | SK-09 |

## 2. 릴리스 AC 요약

| 릴리스 | 포함 Phase | 게이트 |
|---|---|---|
| **MVP-Core**(Windows 내부, 단독 에이전트 검증판 — Phase 생성·Skills 선택·협업은 포함하지 않음) | P00~P05, P08a, P11a | AC-P11a 전부 + RECOVERY MVP-Core 게이트(RECOVERY_TEST_PLAN §4) + SE-01a·02·03·04·06a·08 + BG-01~05 + LIM-01~05 + 인증 모드 설정 반영 |
| V1(3-OS 공개, **핵심 사용자 경험 완성**) | +P06, P07, P09(T5b 포함 — P10b T1 이후, P11b 전 완료), P08b, P10b, P11b | AC-V1 전부(V1-6~10 포함) + AC-P09-1~4 + CO 전부 + 서명 |
| V2 | +P12, P08c, P11c | AC-V2 |
