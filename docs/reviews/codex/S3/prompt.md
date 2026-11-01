# 리뷰 요청: P00 Task S3 (인증·약관 확인 — 1차 출처 재인용, 인증 모드별 기동, ADR-0007 재검토 조건 판정)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요. 웹 접근은 하지 않아도 됩니다(저장소 안 자료만으로 판단).

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S3" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-7a
2. 보고서: `docs/spikes/S3.md`
3. 1차 출처 조사 노트: `docs/research/S3_AUTH_TERMS_SOURCES.md`(인용·URL·fetch 날짜·403 미확인 목록)
4. 결정 문서: `docs/planning/01_architecture/adr/ADR-0007-인증-모드-CLI-로그인-재사용-기본.md`, `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` R21·V5
5. 실측 근거: `docs/spikes/S2.md` §1 행 9(인증), `spikes/fixtures/claude-2.1.316/s2-results.json` `auth`; S1a~S1c 보고서의 Codex CLI 로그인 재사용

## 리뷰 관점

A. S3.md §1 인용이 조사 노트의 원문 인용과 일치하는가(요약 과정에서 의미가 바뀐 곳). "이 세션 직접 확인" 표시가 붙은 행과 조사 노트에만 기댄 행의 구분이 적절한가.
B. §3 ADR-0007 재검토 조건 판정(Codex 미발동 / Claude 조건부 미발동 + 설계 제약 5개 + 공개 배포 전 확인 게이트)이 인용 근거로 뒷받침되는가. 특히 Anthropic Legal의 "third-party developers … offer Claude.ai login / route requests through plan credentials / intermediate tokens" 금지와 "end user signing in to the unmodified Claude Code binary" 예외 사이에서 Agent Studio(데스크톱 앱이 사용자 설치 CLI를 spawn)가 어느 쪽에 해당하는지에 대한 판단이 과도하게 낙관적이지 않은가. 반대로 과도하게 보수적인 곳.
C. §2 인증 모드별 기동 표가 AC-P00-7a("인증 모드별 기동 pass/fail 표")를 충족하는가 — API key 모드 미실측을 "부분"으로 두는 것이 허용되는지, 아니면 범위 축소 제안으로 사용자에게 올려야 하는지.
D. 조사 노트의 "찾지 못함/403" 항목(OpenAI Terms·Usage Policies)이 판정의 신뢰도에 미치는 영향이 보고서에 충분히 드러나는가.
E. 민감 정보(사용자명·홈 경로·세션 id 등)가 두 문서에 남아 있는가.

## 출력 형식

마크다운. 발견 사항 표 `| # | 심각도(Critical/High/Medium/Low) | 위치 | 문제 | 제안 |`. 마지막에 "판정: 수용 / 수정 후 수용 / 거부" 한 줄 + 이유 2~3문장. 추측은 "추정"으로 표시. 약관 자문이 아니라 문서 일관성·근거 충분성 리뷰임을 전제로 합니다.
