# ADR-0001: TypeScript 단일 언어

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/06_codesign/ARCHITECTURE_DEBATE.md`, `archive/evidence/research/` |

## 맥락
두 에이전트의 공식 SDK(`@anthropic-ai/claude-agent-sdk` 0.3.x, `@openai/codex-sdk` 0.166.x, app-server `generate-ts`)가 TypeScript 1급. 개발 환경 툴체인은 Node 24(Rust/Go/.NET 없음).

## 결정
UI·오케스트레이터·프로세스 제어·테스트를 모두 TypeScript(Node 24 LTS)로 작성한다. Rust/Tauri는 V1까지 범위 밖.

## 검토한 대안
Python(Claude SDK만 존재, Codex app-server 클라이언트 자작·패키징 비용), Rust(SDK 없음·툴체인 없음), Go/C#(SDK 없음).

## 결과
+ 타입 공유(Gateway 이벤트·UI·전이), 단일 빌드 체인. − CPU 집약 작업은 worker_threads/별도 프로세스 필요.

## 재검토 조건
V1 성능 시험에서 배치·worker·프로파일링 후에도 Node CPU 포화로 이벤트 수신→저널 확정 p95가 목표 초과, 또는 OS 격리 요구를 기존 경로로 충족 불가(침투 테스트)일 때만 네이티브 헬퍼 재검토.
