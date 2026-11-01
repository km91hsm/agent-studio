# ADR-0003: C Hybrid: Electron Shell + 독립 Node 오케스트레이터 데몬

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/06_codesign/ARCHITECTURE_COMPARISON.md`, `archive/06_codesign/ARCHITECTURE_DEBATE.md` |

## 맥락
앱 종료 후 작업 지속(REQ-GOAL-06), UI 크래시와 작업 분리, SQLite 단일 writer, 향후 OS 서비스 승격. 대안 비교는 TECH_STACK_DECISIONS §1.

## 결정
Shell(main)은 창·트레이·업데이트·데몬 기동/접속만. 데몬이 Gateway·Scheduler·ApprovalBroker·SkillRegistry·SessionIndex·SQLite를 소유. localhost WS JSON-RPC + 토큰 + 프로토콜 버전. Renderer는 main IPC 릴레이로만 데몬과 통신한다(SYSTEM_ARCHITECTURE §1).

## 검토한 대안
A Python 사이드카(언어 2개, Codex SDK 부재), B1 Electron main 통합(창 수명에 묶임), B2 Tauri Rust(백그라운드 지속·SDK·툴체인 불리).

## 결과
+ 복구·백그라운드·다중 에이전트 제어. − 데몬 생명주기(Windows detached·좀비·재접속)가 최대 위험.

## 재검토 조건
P00 S5(데몬 생명주기 실험 E1~E5) 실패 시 사용자에게 재보고하고 MVP-Core 범위를 "안전 중단·재개"로 축소(D4).
