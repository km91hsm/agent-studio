# ADR-0004: React 19 + 외부 store(useSyncExternalStore) + 저널 seq 배치

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/06_codesign/ARCHITECTURE_DEBATE.md`, `archive/evidence/research/RESEARCH_DESKTOP_STACK.md` |

## 맥락
고빈도 토큰 델타가 React 상태를 직접 갱신하면 렌더가 밀림. 작업 상태의 권위는 SQLite 투영.

## 결정
렌더러는 읽기 전용 외부 store를 `useSyncExternalStore`로 구독, `lastAppliedSeq` 기반 재접속, rAF당 1회 스냅샷, 카드 단위 가상화. 상태 라이브러리(Zustand 등)는 화면 복잡도 확인 후 결정.

## 검토한 대안
Vue/Svelte(스킬 생태계·래퍼 얇음), Zustand 즉시 확정(필요성 미확인).

## 결과
+ 공식 구독 모델, 라이브러리 비의존. − 배치 규칙 구현 책임이 앱에 있음.

## 재검토 조건
합성 부하 1,000 delta/s에서 p95 100ms 초과 또는 재접속 누락 발생 시 설계 재검토.
