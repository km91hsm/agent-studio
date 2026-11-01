# ADR-0007: 인증 모드를 공급자별 1급 설정으로, 기본은 설치된 CLI 로그인 재사용

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/DECISION_LOG.md` §1(U1), `archive/evidence/research/RESEARCH_AGENT_GATEWAY.md` |

## 맥락
Anthropic legal: 제3자 앱의 Claude.ai 로그인·구독 대리 라우팅 불허. OpenAI app-server: 기존 로컬/오픈소스 앱 인증 지속·SIWC 권장, 상업·호스팅 불허. 신규 제품의 CLI 로그인 재사용 허용 범위 UNVERIFIED(P00 S3).

## 결정
인증 모드 = {API key, 공급자 허용 계정 연결(SIWC 등), 로컬 CLI 기존 인증}을 에이전트별 설정으로 분리하고 약관 상태를 UI에 표시. **기본값 = 설치된 CLI 로그인 재사용**(약관 책임은 사용자, UI에 약관 상태 안내). 앱은 CLI 자격증명을 읽거나 복사하지 않고 CLI 프로세스가 자체 인증을 사용하게 둔다. API key 경로는 공급자별 선택지로 유지하고 완성 가능하게 설계(공급자 정책 변경 시 전환 경로, R21).

## 검토한 대안
API key 기본(약관 위험 격리 — 기각: 구독 사용자 기대와 어긋남, API 과금, Desktop 플러그인·`image_gen` 등 기능 상속 불가), "CLI 로그인 재사용" 단일 토글(기각: API key 전환 경로 없음).

## 결과
+ 설치된 구독 로그인 그대로 사용(추가 과금 없음, 기능 상속과 일관). − 약관 위험을 사용자가 부담(R21), 공급자 정책 변경 시 API key 전환 필요. Claude Agent SDK는 Anthropic Commercial Terms이므로 공개 배포 전 사용·재배포 조건 확인 게이트.

## 재검토 조건
공급자 약관이 CLI 로그인 재사용을 명시적으로 금지하거나 P00 S3 실측에서 차단될 때 → API key 기본으로 전환(ADR 개정, R21).
