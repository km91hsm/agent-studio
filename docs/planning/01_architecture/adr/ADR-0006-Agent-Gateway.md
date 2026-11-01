# ADR-0006: Agent Gateway: Claude = Agent SDK, Codex = app-server(JSON-RPC)

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/evidence/research/RESEARCH_AGENT_GATEWAY.md`, `archive/06_codesign/ARCHITECTURE_DEBATE.md` |

## 맥락
승인 요청을 프로그램이 수신·응답하는 경로가 Claude는 SDK `canUseTool`, Codex는 app-server 서버→클라이언트 요청만. `codex exec`/SDK는 승인 콜백 부재.

## 결정
`AgentGateway` 작은 인터페이스(`capabilities`/`startRun(spec.mode: new|resume|fork)`/`listSessions`/`readSession`, `RunHandle.steer/interrupt/respond(requestId, answer)/close` — 정본은 AGENT_INTEGRATION §1) 뒤에 `ClaudeSdkAdapter`(`pathToClaudeCodeExecutable`=사용자 CLI)와 `CodexAppServerAdapter`(stdio). 공통 이벤트 스키마로 정규화. CLI 직접 구동은 fallback(Codex는 읽기 전용 일회성 분석만).

## 검토한 대안
Codex `exec --json`(승인·steer·interrupt 없음), Codex SDK(exec 래퍼), Claude CLI stream-json(가능하나 SDK가 상위).

## 결과
+ 승인 요청이 발생하는 효과는 모두 브로커를 통과하고, 샌드박스 허용 범위 내 쓰기는 사후 diff 감사로 포착(D11, SECURITY_MODEL §2.1). − app-server 전체 experimental·v1/v2 스키마 → CI에서 generate-json-schema 고정.

## 재검토 조건
app-server 장기 안정성 실측(Phase 00) 실패 시 범위 축소·버전 고정 전략 재검토.
