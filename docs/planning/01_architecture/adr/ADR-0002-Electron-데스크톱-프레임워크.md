# ADR-0002: Electron 데스크톱 프레임워크

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/06_codesign/ARCHITECTURE_DEBATE.md`, `archive/evidence/research/RESEARCH_DESKTOP_STACK.md` |

## 맥락
Monaco·xterm.js·Git Diff를 품는 IDE형 UI, 자식 프로세스 stdin/stdout/kill 완전 제어, 3-OS 배포. Tauri는 Rust 필수 + SDK용 Node 사이드카로 런타임 2개.

## 결정
Electron 45.x. renderer sandbox·contextIsolation 등 Electron 보안 기본값(SECURITY_MODEL §7, D22)을 필수 완료 기준으로 한다.

## 검토한 대안
Tauri v2(Rust 툴체인·WebKit 차이·사이드카), Avalonia(.NET SDK 없음·웹 컴포넌트 재사용 불가), Qt/PySide6(LGPL·웹 컴포넌트 비용).

## 결과
+ Chromium 일관성, 런타임 1개, 공식 보안 체크리스트. − 설치 크기·메모리(수치 UNVERIFIED, P00 S6·P11a·P11b 측정).

## 재검토 조건
설치 크기·메모리 실측(Phase 00·11)에서 수용 불가 수준이면 재검토.
