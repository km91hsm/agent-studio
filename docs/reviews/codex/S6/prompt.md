# 리뷰 요청: P00 스파이크 S6 (설치물 — Electron + better-sqlite3 + node-pty + Monaco/CSP + 데몬 런타임 비교)

당신은 Agent Studio 프로젝트의 교차 리뷰어(Codex)입니다. 구현자는 Claude입니다. **읽기 전용**으로 리뷰해 주세요. 파일을 수정하지 마세요. `spikes/s6-installer/node_modules`, `runtime/`, `dist/`는 읽지 마세요(빌드 산출물).

## 읽을 것 (저장소 루트 기준)

1. 정본: `docs/planning/05_plan/MASTER_IMPLEMENTATION_PLAN.md` "### Task S6" 절, `docs/planning/05_plan/ACCEPTANCE_CRITERIA.md` AC-P00-5, `docs/planning/01_architecture/TECH_STACK_DECISIONS.md` E3·§4, `docs/planning/01_architecture/adr/ADR-0005-SQLite.md`(D5), `docs/planning/04_security_test/SECURITY_MODEL.md` §7(webPreferences·CSP 정본), `docs/planning/05_plan/OPEN_ISSUES_AND_RISKS.md` V4·V10·V23·V33, `docs/planning/05_plan/IMPLEMENTATION_APPROVAL_CHECKLIST.md` C3
2. 보고서: `docs/spikes/S6.md`
3. 코드: `spikes/s6-installer/package.json`(electron-builder 설정·fuses), `app/main.js`, `app/preload.js`, `app/daemon.js`, `app/renderer/index.html`, `app/renderer/renderer.js`, `app/renderer/csp-collect.js`, `scripts/prepare-runtime.js`, `runtime-node-abi/package.json`, `s6.test.ts`
4. 관찰값: `spikes/fixtures/s6-installer-results.json`

## 관점

- **pass/fail 판정 타당성**: 정본 Step 1의 단계(설치→실행→데몬 기동→better-sqlite3 WAL 쓰기→node-pty spawn→Monaco Diff 렌더(worker)→제거)가 실제로 설치물에서 실행되고 단언됐는가. "데몬 런타임 두 방식 모두 빌드해 비교" 요구에 대해 동봉 Node(`resources/runtime/node.exe` + Node ABI 모듈) vs `ELECTRON_RUN_AS_NODE`(Electron ABI, `app.asar.unpacked`)의 비교가 공정한가(같은 daemon.js, 같은 단계). N-API prebuild로 리빌드 없이 두 ABI에서 동작했다는 결론이 관찰로 뒷받침되는가(`nativePath`, `versions.modules`).
- **CSP 결론**: 정본 CSP에서 Monaco Diff가 실패하고 `style-src 'unsafe-inline'`·`font-src data:`·`worker-src blob:` 완화에서만 성공한다는 측정이 변형 3종(canonical / monaco-min / monaco-style-only)으로 충분히 좁혀졌는가. `getWorker` 직접 생성으로도 blob: 위반이 남는다는 관찰의 해석. 보고서가 정본 수정을 "제안"으로만 두는가(자동 수정 금지).
- **보안 설정 유지**: webPreferences(§7)·app scheme·`will-navigate`·`setWindowOpenHandler`·preload 좁은 함수가 코드에 그대로 있는가. fuses(`runAsNode:true`)가 데몬 런타임 비교를 위해 켜져 있는데 보고서가 보안 함의(runAsNode 허용 시 위험)를 D5 결정 입력으로 적었는가.
- **측정의 한계**: 설치 크기·메모리(V4) 수치가 무엇을 포함하는지(개발 vs 설치물, GPU 프로세스 포함) 명시됐는가. keyring(V10) "Windows 백엔드 동작"의 증거 범위. C3(Build Tools)는 "설치돼 있음(VS Build Tools 2026) + 리빌드 불필요"인데 V33 해소 표현이 과도하지 않은가.
- **환경 불변·정리**: 설치/제거가 사용자 환경에 남기는 것(레지스트리·시작 메뉴·userData)과 테스트의 정리 범위. 테스트 실패 시 설치물이 남는 경로.
- **마스킹**: 픽스처·보고서에 홈 경로·사용자명·호스트명이 남아 있지 않은가.

## 출력 형식

표 `| # | 심각도(Critical/High/Medium/Low) | 위치(파일:행) | 문제 | 제안 |` 로 정리하고, 마지막 줄에 **판정: 수용 / 수정 후 수용 / 거부** 중 하나와 한 문단 근거를 적어 주세요. 추정은 "추정:"으로 표시해 주세요.
