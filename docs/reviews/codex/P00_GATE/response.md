| # | 심각도 | 위치(파일:행) | 문제 | 제안 |
|---|---|---|---|---|
| 1 | High | [SECURITY_MODEL.md:86](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:86) | Codex 엄격 모드에서 OS 입력 API 스크립트가 “샌드박스에 막히지 않음”을 확정하지만, S1c는 읽기 명령만 실행했다. OS 입력은 시험하지 않았다. | `DETECTED`를 보수적 설계 판정으로 한정하고 비차단 주장을 삭제한다. OS 입력 시험 전까지 실측 상태는 `UNVERIFIED`로 표시한다. |
| 2 | Medium | [SECURITY_MODEL.md:82](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:82) | Codex 엄격 열의 외부 호스트 `ENFORCED`를 “S4 합격”으로 표기했다. S4의 직접 차단 대조는 `workspaceWrite`이며, S1c의 `readOnly` 네트워크 효과는 직접 관찰하지 않았다. | 엄격 열에 모드 간 추론임을 밝히고 `readOnly` 외부 호스트·loopback을 별도 재검증한다. |
| 3 | Medium | [SECURITY_MODEL.md:76](D:/LLM/agent-studio/docs/planning/04_security_test/SECURITY_MODEL.md:76) | “`UNVERIFIED` 셀은 남아 있지 않다”는 서술이 WSL2 sandbox 미실측 및 OS 입력 미실측과 맞지 않는다. | 미실측 셀 또는 셀의 해당 경로를 `UNVERIFIED`로 남긴다. |
| 4 | High | [P00_GATE.md:9](D:/LLM/agent-studio/docs/spikes/P00_GATE.md:9), [P00_GATE.md:38](D:/LLM/agent-studio/docs/spikes/P00_GATE.md:38) | AC-P00-5를 `충족`이라 했지만 S6에서 **정본 CSP의 Monaco Diff는 fail**이고, D5 결정과 CSP 변경은 제안 상태다. AC-P00-9도 정본 갱신 대기여서 현재의 “P00 통과” 표현은 이르다. | AC-P00-5를 `부분`, 전체 게이트를 `2차 승인·예외 결정 대기`로 표기한다. |
| 5 | Medium | [P00_GATE.md:37](D:/LLM/agent-studio/docs/spikes/P00_GATE.md:37) | AC-P00-4의 실제 재부팅 후 Recovery는 단위 판정과 수동 절차로 대체됐고 콘솔 창도 미관찰이다. `충족`은 검증 범위를 넘는다. | `부분`으로 표시하고 실제 재부팅·콘솔 관찰의 후속 게이트를 명시한다. |
| 6 | Medium | [P00_GATE.md:28](D:/LLM/agent-studio/docs/spikes/P00_GATE.md:28), [S3.md:3](D:/LLM/agent-studio/docs/spikes/S3.md:3) | “각 보고서에 실행 환경·사용량”은 사실과 다르다. S3에는 OS와 C5 사용량 절이 없다. | S3에 재사용 실험의 OS·버전과 자체 조사 호출의 미계량 상태, 리뷰 사용량 출처를 기록한다. |
| 7 | Medium | [P00_GATE.md:94](D:/LLM/agent-studio/docs/spikes/P00_GATE.md:94), [S6.md:29](D:/LLM/agent-studio/docs/spikes/S6.md:29) | 결정 제안 12건에 S6 무인 제거 후 updater 설치 파일·잠긴 빈 설치 폴더의 제품 처리 결정이 빠졌다. | 제거 완료 기준과 잔존물 처리·재시험을 결정 목록에 추가한다. |
| 8 | Low | [P00_GATE.md:89](D:/LLM/agent-studio/docs/spikes/P00_GATE.md:89) | V6·V9·V35를 `해소`로 묶었지만 D5·CSP 정본 반영은 대기 중이고, V35의 8종 로드 중 실행 관찰은 4종뿐이다. | 실측 해소와 정본·로드 검증 대기를 분리해 `부분 해소`로 표시한다. |

| 셀 | 새 값 | 동의 | 근거 |
|---|---|---|---|
| 파일 시스템 × Codex 엄격 | ENFORCED | OK | S1a·S1c의 `readOnly` 쓰기 차단. |
| 파일 시스템 × Codex 일반 | ENFORCED, TEMP 상위 DETECTED | OK | S4의 외부 경로 차단과 TEMP 통과·옵션 1회 차단. |
| 파일 시스템 × Claude native | POLICY_ONLY | OK | S4의 외부 쓰기 허용·정책 거부 관찰, S2 plan 예외. |
| 파일 시스템 × Claude sandbox | Bash ENFORCED + 파일 도구 POLICY_ONLY | 수정 | 이전 표의 값이지만 WSL2는 미실측이다. 실측 보장으로 읽히지 않게 표시해야 한다. |
| 실행 명령 × Codex 엄격 | DETECTED | OK | S1c에서 읽기 명령이 승인 없이 실행됐다. |
| 네트워크 × Codex 엄격 | 외부 ENFORCED / loopback DETECTED | 수정 | S4 직접 시험은 `workspaceWrite`; `readOnly`에는 모드 간 추론이 섞였다. |
| 네트워크 × Codex 일반 | 외부 ENFORCED / loopback DETECTED | OK | S4의 외부 호스트 차단 대조와 loopback 수신 기록. |
| 고위험 효과 × Codex 엄격 | DETECTED 유지 | OK | S1c는 `.git/index.lock`·외부 네트워크 각 한 경로만 관찰했고 우회 경로는 미실측이다. |
| MCP × Codex | 공유 홈 POLICY_ONLY / 분리 홈 조건부 ENFORCED | OK | S9 V31의 기존 MCP 잔존, 분리 홈 MCP 0. 로그인 재구성 미실측 조건도 명시했다. |
| MCP × Claude | 기본 POLICY_ONLY / 격리 옵션 ENFORCED | OK | S2 strict MCP 0, S9 `settingSources:[]`에서 플러그인 MCP 8→0. |
| 그 외 OS 입력 × Codex 엄격 | DETECTED | 수정 | S1c의 읽기 명령 결과만으로 입력 API 스크립트의 실행 가능성을 확정할 수 없다. |

사용량 산식은 Claude 약 **$33.84→$34**, Codex 리뷰 S1a~S8 **입력 6,485,921 / 출력 81,769**로 일치한다. `isolation_warning` 6건과 하향 4건은 S4 픽스처의 식별자·값과 일치한다. 커밋 변경 파일은 두 대상 문서뿐이고, 대상 문서에서 홈 경로·사용자명·호스트명·thread id 노출은 발견하지 못했다. `packages/`, `apps/` 구현 흔적도 없다.

**판정: 수정 후 수용.** §2.1의 핵심 하향 판정과 격리 입력은 대체로 타당하다. 다만 실측하지 않은 OS 입력·엄격 모드 네트워크를 확정한 문구와 AC-P00-5·4의 `충족` 표기는 게이트의 증거 수준에 맞게 낮춰야 한다.