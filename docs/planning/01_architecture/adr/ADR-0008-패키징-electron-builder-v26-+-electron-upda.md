# ADR-0008: 패키징 electron-builder v26 + electron-updater

| 메타 | 값 |
|---|---|
| 상태 | ACCEPTED |
| 날짜 | 2026-11-01 |
| 배경 기록 | `archive/06_codesign/ARCHITECTURE_DEBATE.md`, `archive/evidence/research/RESEARCH_DESKTOP_STACK.md` |

## 맥락
Electron 내장 autoUpdater는 Linux 미지원, update.electronjs.org는 공개 GitHub 전제. 네이티브 의존성·다중 OS 업데이트 메타데이터를 한 설정 체계에서.

## 결정
Windows NSIS(MSI는 기업 요구 시), macOS DMG + Developer ID 서명·notarization, Linux AppImage(updater 채널) + deb(패키지 관리자). 3-OS CI 호스트. 공개 배포물 서명 필수, 내부 dev 빌드 unsigned 허용(자동 업데이트 금지). 실행 중 작업 있으면 업데이트 적용 연기.

## 검토한 대안
Electron Forge(공식이나 updater 범위 제한), 자체 업데이터(공급망 위험).

## 결과
+ 공식·준공식 경로. − 서명 자격 CI 노출, notarization.

## 재검토 조건
—
