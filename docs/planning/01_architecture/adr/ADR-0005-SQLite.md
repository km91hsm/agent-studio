# ADR-0005: SQLite(WAL) + append-only 이벤트 저널, better-sqlite3

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/06_codesign/ARCHITECTURE_DEBATE.md`, sqlite.org/wal |

## 맥락
로컬 단일 사용자, 복구 신뢰성, 감사. SQLite는 "one writer at a time" → 데몬 단일 writer. node:sqlite는 Node 24에서 RC(1.2).

## 결정
better-sqlite3 고정 버전, 드라이버 인터페이스 뒤에 격리. 저널 원본 + 투영 파생(테이블·이벤트 목록은 DATABASE_SCHEMA). 백업은 온라인 백업 API/VACUUM INTO(WAL 파일 단독 복사 금지).

## 검토한 대안
node:sqlite(RC), PostgreSQL(로컬 앱에 과함), 파일 JSON(원자성 약함).

## 결과
+ 동기 API·prebuilt. − 네이티브 바이너리 배포 실패 위험. 데몬 런타임(동봉 Node vs Electron `runAsNode`)은 네이티브 바이너리 로드 방식과 결합되어 P00 S6에서 결정한다(D5).

## 재검토 조건
node:sqlite Stability 2 도달 + 트랜잭션·동시 읽기·백업·전원 손실 테스트 통과 + 3-OS 네이티브 제거 이득 확인 시 전환 검토.
