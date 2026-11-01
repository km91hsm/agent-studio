# Agent Studio

Claude Code × Codex 통합 데스크톱 AI 개발 프로그램.

## 현재 단계: Phase 00 — 환경·기술 검증 (2026-11-02 착수)

계획(`docs/planning/`)은 2026-11-01에 완료됐고, 지금은 `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` Phase 00의 스파이크(S1a/b/c·S2~S9)를 순차 실행하는 중이다. P01 이후 구현은 P00 보고서 검토 뒤 2차 승인으로 시작한다.

- 설계 문서 지도: `docs/planning/README.md`
- 계획 과정 기록(초안·리뷰·Codex 호출 원문·결정 로그): `docs/planning/archive/`
- 스파이크 코드: `spikes/`, 보고서: `docs/spikes/`
- Codex 교차 리뷰 원문(구현 단계): `docs/reviews/codex/`

## 개발

```
npm install
npm run lint        # tsc --noEmit
npm test            # vitest (실호출 테스트 제외)
npm run test:live   # AGENT_STUDIO_LIVE=1 — 설치된 claude/codex CLI를 실제로 호출
```

Node 24 LTS, TypeScript만 사용(ADR-0001). 공개 저장소 `main`은 마스킹된 스냅숏 1커밋에서 시작하며 계획 단계의 전체 커밋 이력은 로컬에만 보존된다.
