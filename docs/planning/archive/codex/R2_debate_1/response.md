TypeScript 단일 언어 — 동의.  
Electron — 동의.  
React — 동의.  
Monaco — 동의하되 MVP 로딩 시점은 조정한다.  
xterm.js — 동의.  
Electron shell + 독립 Node 오케스트레이터인 C 구조 — 동의.  
SQLite WAL + 이벤트 저널 — 동의.  
OS 자격증명 저장소 — 동의.  

아래 판단은 [Claude의 독립 제안](D:/LLM/agent-studio/docs/planning/06_codesign/CLAUDE_INITIAL_PROPOSAL.md), [내 Round 1 제안과 Claude의 검토 메모](D:/LLM/agent-studio/docs/planning/06_codesign/CODEX_INITIAL_PROPOSAL.md), [데스크톱 스택 조사](D:/LLM/agent-studio/docs/planning/evidence/research/RESEARCH_DESKTOP_STACK.md)를 읽고, 쟁점별 공식 문서를 다시 확인한 결과다. 파일은 변경하지 않았다.

### 쟁점 1 — 패키징 도구

- **당신의 입장:** Round 1의 Electron Forge 추천을 **electron-builder v26 + electron-updater로 수정**한다. Windows 기본 배포물은 NSIS, macOS는 DMG와 업데이트용 산출물, Linux는 AppImage와 `deb`를 별도 채널로 둔다. 배포 형식과 업데이트 정책을 먼저 고정한 뒤 도구를 택하는 편이 이 제품에 맞다.
- **Claude 입장에 대한 반박 또는 동의:** Claude의 선택에 동의한다. 내가 Forge를 고른 근거인 공식 패키징 경로는 유효하지만, builder는 네이티브 의존성 패키징과 여러 OS의 업데이트 메타데이터를 한 설정 체계에서 다룬다. [electron-builder v26 공식 문서](https://www.electron.build/v26/docs/)는 이 범위를 설명하고, [v26 업데이트 문서](https://www.electron.build/v26/docs/features/auto-update/)는 NSIS·DMG·AppImage·DEB 등의 업데이트 대상도 명시한다. 단, **DEB가 업데이트 대상이라는 사실과 제품이 자체 업데이트를 해야 한다는 판단은 다르다.** `deb`는 패키지 관리자 경로를 권장한다. AppImage는 electron-updater 경로를 검증한다. `update.electronjs.org`는 [Forge 문서상 공개 GitHub 저장소를 전제](https://www.electronforge.io/advanced/auto-update)하므로 기본 배포 인프라로 가정하지 않는다.
- **공식 근거:** Electron 내장 [`autoUpdater`는 Linux를 지원하지 않는다](https://www.electronjs.org/docs/latest/api/auto-updater/). 반면 builder의 updater는 별도 패키지이며, [AppImage 문서](https://www.electron.build/v26/docs/appimage/)는 AppImage 업데이트와 DEB/RPM의 패키지 관리자 경로를 구분한다. 따라서 “Electron의 Linux 자동 업데이트 부재”가 “electron-updater의 Linux 경로 부재”를 뜻하지는 않는다.
- **위험:** 업데이트 중 독립 오케스트레이터를 교체하면 작업이 끊길 수 있다. 설치물은 서비스 프로토콜 버전을 검사하고, 실행 중 작업이 있으면 업데이트 적용을 미뤄야 한다. builder의 네이티브 모듈 리빌드와 Windows·macOS 서명도 CI에서 실제 설치물로 검증해야 한다.
- **합의 여부:** **합의.** Linux의 기본 정책은 `deb`는 배포판 패키지 관리자, AppImage는 검증된 updater 채널이다. 어떤 채널도 검증 전 자동 설치를 약속하지 않는다.

### 쟁점 2 — SQLite 드라이버

- **당신의 입장:** MVP에는 **`better-sqlite3`를 고정 버전으로 사용**하고 DB 접근을 독립 오케스트레이터 한 프로세스로 제한한다. `node:sqlite`는 전환 후보로 남긴다. 저장소 코드는 드라이버 인터페이스 뒤에 두어 이벤트 저널·마이그레이션·백업 로직이 특정 API에 묶이지 않게 한다.
- **Claude 입장에 대한 반박 또는 동의:** Claude의 MVP 선택에 동의한다. 다만 “Electron ABI 리빌드”를 무조건적인 비용으로 적은 부분은 실행 방식을 먼저 정해야 한다. **별도 동봉 Node 런타임에서 데몬을 실행한다면 그 Node 런타임을 대상으로 빌드·테스트**해야 한다. Electron 실행 파일을 Node로 재사용한다면 Electron 대상 호환성 검증이 필요하다. 어느 쪽이든 설치물에서 실제 로드 테스트가 필수다.
- **공식 근거:** Node 24의 [`node:sqlite`는 Stability 1.2, release candidate](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)다. [`better-sqlite3` 저장소](https://github.com/WiseLibs/better-sqlite3)는 동기 API와 주요 플랫폼용 사전 빌드 바이너리를 설명한다. [SQLite WAL 문서](https://www.sqlite.org/wal.html)는 동시에 한 writer만 허용함을 명시한다.
- **위험:** `better-sqlite3`는 네이티브 바이너리 배포 실패가 가장 큰 위험이다. 반대로 `node:sqlite`는 코어 모듈이지만 현재 안정 등급을 무시하고 상태 DB의 유일한 구현으로 삼기 이르다. 특히 Claude 제안의 “Electron 내장 Node로 독립 데몬 실행”은 패키징상 간단해 보여도 보안 비용이 있다. Electron의 [`runAsNode` fuse](https://www.electronjs.org/docs/latest/tutorial/fuses)는 `ELECTRON_RUN_AS_NODE` 사용 여부를 제어하며, 켜 둔 실행 파일의 공격 표면을 고려해야 한다. 별도 Node 런타임 동봉과 크기·서명·업데이트 비용을 Phase 00에서 비교하자.
- **전환 조건:** `node:sqlite`가 Node가 제공하는 안정 등급 **2**에 도달하고, 현재 스키마의 트랜잭션·동시 읽기·백업·전원 손실 테스트를 통과하며, 세 OS 설치물에서 네이티브 모듈 제거 이득이 확인될 때 바꾼다. 안정 등급만으로 자동 전환하지 않는다.
- **합의 여부:** **조건부 합의.** 드라이버는 합의 가능하며, 데몬 런타임과 네이티브 바이너리 배포 방식은 실험이 남았다.

### 쟁점 3 — Monaco와 CodeMirror 6

- **당신의 입장:** 제품 목표가 IDE 패널이므로 Monaco 선택을 유지한다. 단, **MVP의 기본 화면에 전체 편집기를 즉시 올리지는 않는다.** 파일 목록·짧은 읽기 뷰는 가벼운 표시 컴포넌트로 시작하고, Diff를 열 때 Monaco를 지연 로드한다. V1 편집 기능과 LSP 연결은 별도 완료 기준으로 둔다.
- **Claude 입장에 대한 반박 또는 동의:** Claude가 지적한 크기와 `file://` worker 제약에 동의한다. 조사 문서의 Monaco 약 102MB와 `@codemirror/view` 약 1.3MB는 **npm 설치 패키지의 unpacked size**이며 실제 앱 번들 크기 비교 수치가 아니다. 이것만으로 런타임 메모리나 초기 로딩 성능을 단정할 수 없다. CodeMirror 6는 [모듈식 구성](https://codemirror.net/docs/guide/)이라 MVP 읽기 뷰에 매력적이지만, 이후 Diff·언어 기능을 별도로 조립하는 비용도 있다. 에디터 두 개를 제품에 장기 병행하는 선택은 피한다.
- **공식 근거:** [Monaco 저장소](https://github.com/microsoft/monaco-editor)는 `file://` 페이지에서 web worker 생성에 제약이 있다고 설명한다. Electron은 [`file://` 대신 통제 가능한 custom protocol을 권장](https://www.electronjs.org/docs/latest/tutorial/security/)하고, [`protocol` API](https://www.electronjs.org/docs/latest/api/protocol)는 표준·보안 scheme 등록을 제공한다. 이를 사용하되 worker가 실제 설치물에서 동작하는지는 스파이크로 확인한다.
- **위험:** worker URL, CSP, 번들러 경로가 개발 서버에서는 작동하고 서명된 설치물에서는 깨질 수 있다. 초기 번들 크기, 첫 Diff 표시 시간, 5MB 이상 파일의 스크롤, 스크린리더 사용을 측정한다. **Monaco 기반 LSP 통합의 구체 구현 비용은 UNVERIFIED**다.
- **합의 여부:** **조건부 합의.** Monaco를 목표 컴포넌트로 유지하고, MVP 읽기·Diff의 지연 로드와 설치물 검증을 조건으로 한다.

### 쟁점 4 — React 상태 관리와 고빈도 이벤트

- **당신의 입장:** 처음부터 Zustand를 전역 필수 의존성으로 확정하지 않는다. 오케스트레이터의 작업 상태는 SQLite 투영이 권위 있는 값이고, 렌더러는 **읽기 전용 외부 store**를 구독한다. React의 [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)가 이 구독 모델을 공식 지원한다. 화면 로컬 상태에는 React state를 쓰고, 여러 화면에 걸친 선택·패널 상태가 복잡해질 때 Zustand 같은 작은 store를 도입한다.
- **Claude 입장에 대한 반박 또는 동의:** 토큰 델타마다 React state를 갱신하면 안 된다는 지적에 동의한다. 라이브러리 선택보다 **전송·투영·렌더의 세 단계에서 이벤트를 합치는 규칙**이 먼저다.
- **구체 설계:** 오케스트레이터가 `runId`, 단조 증가 `seq`, `eventType`, `turnId`, 시각을 저널에 기록한다. 승인·오류·상태 전이는 즉시 확정한다. 텍스트 델타는 원래 순서를 보존한 채 짧은 구간으로 묶어 저장·전송한다. UI는 `lastAppliedSeq`를 유지하고, 재접속 때 그 번호 이후를 페이지 단위로 요청한다. 번호가 비면 실시간 표시를 잠시 멈추고 누락 구간을 채운다. 렌더러는 도착한 텍스트를 가변 버퍼에 모아 `requestAnimationFrame`당 한 번만 해당 메시지 블록의 불변 스냅샷을 갱신한다. 타임라인은 **이벤트 한 개가 아니라 메시지·도구 실행·승인 카드 단위**로 가상화한다. 화면 밖의 긴 로그는 요청한 구간만 읽는다.
- **공식 근거:** React 문서는 외부 store 스냅샷의 동일성 유지와 변경 시 재렌더 조건을 설명한다([`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)). 나머지 batching·`seq` 규칙은 Agent Studio 설계안이며 특정 라이브러리의 보장 기능이라고 주장하지 않는다.
- **위험:** 이벤트 묶기 과정에서 최종 텍스트와 감사용 도구 이벤트를 섞거나 잃으면 안 된다. 승인·상태·오류는 절대 델타와 함께 생략하지 않는다. 목표로는 1,000 delta/s 합성 입력에서 UI 상호작용 지연 p95 100ms 미만과 재접속 누락 0건을 제안한다. 이 수치는 **목표값**이며 측정 결과가 아니다.
- **합의 여부:** **조건부 합의.** 이벤트 설계는 합의, Zustand 채택은 실제 화면 복잡도를 본 뒤 결정한다.

### 쟁점 5 — 이용 약관과 인증 방식

- **당신의 입장:** Claude가 올린 위험은 중요하며 Round 1에서 놓쳤다. **인증 모드를 공급자별 1급 설정**으로 둔다. `API key`, 공급자가 지원하는 계정 연결, 로컬 CLI의 기존 인증은 서로 다른 경로로 모델링하고, 제품이 어떤 자격증명을 보관·전달하는지 화면에 명시한다. “사용자가 자신의 PC에 CLI를 설치했다”는 사실만으로 제3자 앱의 구독 인증 사용 권한을 추론하지 않는다.
- **Claude 입장에 대한 반박 또는 동의:** Claude Agent SDK의 구독 로그인 우려에 동의한다. [Anthropic 공식 법무 문서](https://code.claude.com/docs/en/legal-and-compliance)는 제3자 개발자가 자체 앱에서 Claude.ai 로그인을 제공하거나 사용자 구독 자격으로 요청을 대리 라우팅하는 것을 허용하지 않는다고 설명한다. 동시에 사용자가 수정되지 않은 Claude Code 바이너리에 직접 로그인하는 경우에 관한 단서도 있다. **Agent Studio의 SDK 통합이 그 단서에 해당하는지는 UNVERIFIED**다. 따라서 MVP의 Claude 통합 인증은 사용자 소유 API key 또는 Anthropic이 명시적으로 허용한 공급자 자격증명을 기본으로 잡는다.
- **Codex 측 공식 근거와 해석:** OpenAI의 [Codex App Server 문서](https://developers.openai.com/codex/app-server)는 제품 내 깊은 통합을 용도로 제시한다. 인증 절에서는 기존 **로컬 또는 오픈소스 앱**의 app-server 인증 사용을 계속할 수 있다고 하면서 Sign in with ChatGPT(SIWC)로의 이전을 권장하고, **상업·호스팅 서비스에 app-server 인증을 사용한 적은 허용되지 않았다**고 명시한다. 새 Agent Studio가 이미 로그인된 CLI 자격을 그대로 재사용하는 방식이 이 “계속 사용” 범위에 드는지는 **UNVERIFIED**다. 반면 OpenAI는 [로컬 오픈소스 앱의 SIWC ChatGPT plan 사용](https://developers.openai.com/siwc/token-sharing-open-source)과 [SIWC 토큰을 Codex App Server에 전달하는 절차](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)를 문서화했다. [SIWC 약관](https://openai.com/policies/sign-in-with-chatgpt-terms/)은 사용자 승인, 백그라운드 사용에 대한 명시적 동의, 토큰의 사용자 통제 로컬 저장, 구독 경로의 무과금 사용 등을 요구한다. 이 경로를 구현하려면 프로그램 접근성·등록·대상 플랜을 별도로 확인해야 한다.
- **위험 및 MVP 영향:** Claude와 Codex의 구독 인증을 “설치된 CLI 로그인 재사용” 한 토글로 묶지 않는다. MVP는 **두 에이전트의 API key 경로**로 완성할 수 있게 설계한다. Codex ChatGPT 구독 경로는 SIWC 접근과 조건이 확인된 로컬 오픈소스 배포에서만 활성화한다. Claude 구독 경로는 제품 통합 허용 범위가 확인되기 전에는 제공하지 않는다. 이는 구독 인증을 요구한 사용자 경험의 범위를 바꾸므로 릴리스 계획에 명시해야 한다. Codex의 [API key 인증](https://learn.chatgpt.com/docs/auth)도 공식 지원되며 구독 포함 사용량이 아니라 API 과금이다.
- **합의 여부:** **조건부 합의.** 위험 진단과 인증 분리는 합의한다. 구독 인증을 실제 배포물에 넣을 수 있는 범위는 공급자 문서·프로그램 접근성 확인이 남았다.

### 쟁점 6 — Rust 도입 조건

- **당신의 입장:** **V1까지 Rust와 Tauri는 범위 밖**으로 정한다. Round 1의 “격리 헬퍼가 필요하면 Rust”는 너무 넓은 조건이었다. OS별 권한 경계가 Node 라이브러리와 공급자 샌드박스로 구현되지 않는다는 구체적 실패가 있을 때만, 작은 네이티브 헬퍼를 별도 설계 결정으로 검토한다. Tauri로 프레임워크를 바꾸는 결정과 혼동하지 않는다.
- **Claude 입장에 대한 반박 또는 동의:** Claude의 현 단계 배제에 동의한다. 두 Gateway가 이미 Node/TypeScript 경로를 가지므로 Rust를 더해도 Node 프로세스가 사라지지 않는다. Tauri 개발에는 [Rust와 Windows C++ Build Tools](https://tauri.app/start/prerequisites/)가 필요하며, 현재 PC에는 Rust가 없다.
- **측정 가능한 재검토 조건:** V1 성능 시험에서 batching·별도 worker·프로파일링 뒤에도 오케스트레이터 CPU 작업이 지속적으로 병목이고, 예를 들어 합성 부하에서 이벤트 수신→저널 확정 p95가 설정 목표를 넘으며 Node CPU 포화가 원인으로 확인된 경우다. 또는 필수 OS 격리 요구를 기존 경로로 충족할 수 없다는 침투 테스트 결과가 있어야 한다. 이는 **재검토 문턱**이지 Rust가 자동으로 해결한다는 주장이 아니다.
- **위험:** 측정 없는 조기 도입은 툴체인·빌드·코드 리뷰 표면만 늘린다. 반대로 실제 보안 요구가 나오면 범위 조정이 늦어질 수 있으므로 Phase 00에서 권한 격리 가능성을 시험한다.
- **합의 여부:** **합의.** V1까지 TypeScript 중심으로 간다.

### 쟁점 7 — Electron 보안 기본값

- **당신의 입장:** UI 렌더러에는 오케스트레이터 포트·인증 토큰·파일 시스템 경로를 직접 주지 않는다. Electron main이 사용자 동작을 검증한 후 최소 IPC만 중계한다. 패키지 안의 UI는 `file://` 대신 앱 전용 보안 custom scheme에서 로드한다.
- **Claude 입장에 대한 반박 또는 동의:** Claude가 제안한 Electron을 받아들이는 조건으로 이 설정을 **필수 완료 기준**으로 삼자. Electron 기본값에 기대지 않고 명시한다. [Electron 보안 체크리스트](https://www.electronjs.org/docs/latest/tutorial/security/)가 격리·CSP·탐색 제한·IPC 발신자 검증을 권고한다.
- **정확한 기본 설정안:**

```ts
webPreferences: {
  preload: trustedPreloadPath,       // 앱이 고정한 절대 경로
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  nodeIntegrationInSubFrames: false,
  webviewTag: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  devTools: isDevelopment
}
```

  앱 전용 scheme은 `standard: true`, `secure: true`로 등록하고 `bypassCSP`를 켜지 않는다([Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol)). UI 응답에 다음 정책을 기본으로 건다.

```text
default-src 'self'; script-src 'self'; style-src 'self';
img-src 'self' data:; font-src 'self'; worker-src 'self';
connect-src 'none'; object-src 'none'; base-uri 'none';
form-action 'none'; frame-src 'none'
```

  `will-navigate`에서 예상한 앱 내부 경로 외 탐색을 거부하고, `setWindowOpenHandler`는 기본 `deny`로 둔다. 외부 링크는 허용된 `https:` 출처를 URL로 파싱하고 사용자 동작에 연결한 뒤 main에서만 `shell.openExternal`로 연다. 앱 UI 세션의 권한 요청은 기본 거부한다. 모든 IPC에서 발신 frame의 origin·창 ID와 요청 스키마를 확인하고, preload는 `startTask`, `approveRequest`처럼 좁은 함수만 노출한다. 임의 채널명이나 `ipcRenderer` 자체를 렌더러에 넘기지 않는다.
- **공식 근거·위험:** [`webSecurity: false`가 동일 출처 정책을 끄고 비보안 콘텐츠 허용으로 이어진다](https://www.electronjs.org/docs/latest/tutorial/security/). custom scheme과 Monaco worker, 엄격한 `style-src`의 설치물 호환은 **UNVERIFIED**이므로 CSP를 조용히 완화하기보다 Phase 00에서 검사한다. 또한 렌더러 격리만으로 오케스트레이터가 열어 둔 localhost 포트를 보호할 수 없다. 포트 바인딩·클라이언트 인증·요청별 권한 검사는 별개다.
- **합의 여부:** **조건부 합의.** 설정과 원칙은 합의하되 Monaco worker·CSP와 데몬 IPC의 설치물 실험이 남았다.

### 쟁점 8 — 3-OS 빌드 호스트

- **당신의 입장:** 최소 CI는 `windows-latest` x64(NSIS), `macos-latest` arm64 및 x64 또는 universal(DMG), `ubuntu-latest` x64(AppImage·deb) 세 호스트다. 각 호스트에서 **빌드 → 설치 → 앱 실행 → 데몬 시작·재접속 → DB 네이티브 모듈 로드 → 종료·제거**까지 확인한다. 일반 PR에서는 서명 없는 테스트 설치물을 만들고, 보호된 릴리스 작업에서만 서명 자격을 사용한다.
- **Claude 입장에 대한 반박 또는 동의:** 멀티 호스트가 필요하다는 Claude의 결론에 동의한다. [electron-builder의 멀티 플랫폼 문서](https://www.electron.build/v26/docs/features/multi-platform-build/)도 네이티브 의존성이 있으면 대상 플랫폼에서 빌드하는 제약과 macOS 서명은 macOS에서만 가능함을 설명한다. [Forge DMG 문서](https://www.electronforge.io/config/makers/dmg)는 DMG 빌드를 macOS로 제한한다. MSI 호스트 제약을 배포 설계의 기준으로 삼을 필요는 없다. 일반 사용자용 Windows 산출물은 NSIS로 정하고 MSI는 기업 배포 요구가 생기면 추가한다.
- **서명 계획·공식 근거:** 공개 Windows MVP는 **Azure Artifact Signing을 이용할 수 있으면 우선 검토**, 그렇지 않으면 OV 또는 EV 인증서를 선택한다. OV는 신뢰 평판 형성 기간이 있을 수 있고 EV는 운영 방식이 더 무겁다. [Electron 공식 서명 문서](https://www.electronjs.org/docs/latest/tutorial/code-signing)와 [builder v26 서명 문서](https://www.electron.build/v26/docs/features/code-signing/)가 선택지를 제시한다. macOS V1 직접 배포는 Apple Developer ID 서명과 notarization을 요구한다([Apple Developer](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)). Linux `deb`는 패키지 저장소 배포 시 저장소 서명 정책을 별도로 정하고, AppImage는 업데이트 파일·메타데이터의 무결성 검증을 시험한다.
- **MVP 수용 기준과 위험:** **Windows 내부 개발 빌드는 unsigned 허용**, 단 자동 업데이트와 일반 사용자 배포는 하지 않는다. 공개 MVP는 서명된 Windows 설치물을 기준으로 한다. 단일 개발 PC의 수동 빌드 성공은 3-OS 지원 증거가 아니다. 서명 자격의 CI 노출, macOS notarization 실패, 네이티브 모듈의 아키텍처별 불일치가 릴리스 위험이다.
- **합의 여부:** **합의.** V1 3-OS 배포는 각 OS 설치물 테스트를 통과해야 한다.

### Claude 질문에 대한 답변

1. **App Server 장기 안정성과 `exec` 대체:** App Server는 [공식적으로 제품 통합용 인터페이스](https://developers.openai.com/codex/app-server)지만, 설치된 `0.166.0`에서 장시간 재접속·승인·업데이트 호환성을 실측하지 않았다. 제품은 지원 CLI 버전을 고정하고, 시작 시 초기화와 필수 메서드를 시험하며, 릴리스 CI에서 생성 스키마와 기록된 이벤트 계약을 비교해야 한다. CLI `codex exec --json -s read-only`는 설치된 `codex exec --help`에서 확인한 옵션으로 **읽기 전용 일회성 분석 대체 경로**가 될 수 있다. 승인·중간 지시·취소가 필요한 쓰기 작업의 일반 대체 경로는 아니다.

2. **승인을 몇 시간 보류할 수 있는가:** App Server 문서는 서버 주도 `item/commandExecution/requestApproval`과 `serverRequest/resolved`를 설명하지만, **몇 분 또는 몇 시간의 보장된 최대 대기 시간은 UNVERIFIED**다. 제품은 자체 승인 대기 TTL을 두고 만료 시 거부·중단·`BLOCKED` 전이를 기록해야 한다. 대기 중인 프로세스가 살아 있는 것과 안전하게 다시 실행할 수 있는 것은 별개다.

3. **`thread/fork` 의미:** 공식 문서상 `lastTurnId`를 주면 **그 턴까지 포함**한 이력으로 새 thread를 만들고 이후 턴은 제외한다. 진행 중인 턴을 지정하면 거부한다. `ephemeral: true`는 메모리 안의 분기이며 저장된 thread 목록에 추가되지 않는다. 복구해야 하는 사용자 세션 분기에는 사용하지 않는다. 근거는 [App Server의 fork 설명](https://developers.openai.com/codex/app-server)이다.

4. **스킬 로드 확인:** 정확히 확인한 메서드는 `skills/list`이고 요청 필드는 `cwds`, `forceReload`, 선택적 `perCwdExtraUserRoots`다. 명시 호출은 `turn/start.input`에 `{type:"text", text:"$name ..."}`와 `{type:"skill", name, path}`를 함께 넣는 형식이 [공식 문서](https://developers.openai.com/codex/app-server)에 있다. `skills/list`는 **발견**, `type:"skill"`은 **주입 요청**의 증거다. 전용 “실제 로드·사용 완료” 이벤트의 존재는 **UNVERIFIED**다. 사용 판정에는 실행 추적과 스킬별 결과 검사가 더 필요하다.

5. **TypeScript·Electron·Hybrid C에 대한 남은 이견:** 구조 자체에는 없다. 다만 Claude 제안의 **Electron 내장 Node를 독립 데몬으로 재사용하는 방식**은 [`runAsNode` fuse의 보안 의미](https://www.electronjs.org/docs/latest/tutorial/fuses)와 설치물 수명 검증 전에는 합의로 간주하지 않는다. 별도 동봉 Node 런타임을 우선 비교하자.

6. **토큰만 있는 비용 제한:** 금액을 0으로 계산하지 않는다. 공급자별 `input`, `cached input`, `output` 등 제공되는 토큰 항목을 원본 그대로 보관하고, 작업별 총 토큰·호출 수·활성 시간·재시도·리뷰 횟수 상한을 둔다. 누적 사용량 이벤트는 마지막 값과의 **증분**으로 집계해 중복 계산을 피한다. 금액은 API 과금 단가가 확인된 모드에서만 추정으로 표시한다.

### 합의 요약 표

| 쟁점 | 합의 상태 | 최종 권장 | 남은 검증 |
|---|---|---|---|
| 1. 패키징 | 합의 | electron-builder v26 + electron-updater; Linux 채널 분리 | 데몬을 보존하는 업데이트 실험 |
| 2. SQLite | 조건부 합의 | MVP `better-sqlite3`, 단일 writer | 동봉 런타임·세 OS 네이티브 로드 |
| 3. 편집기 | 조건부 합의 | Monaco 목표, MVP Diff 지연 로드 | 설치물 worker·실제 번들·대용량 파일 |
| 4. 상태 관리 | 조건부 합의 | 저널 `seq` + 외부 store + 프레임당 배치 | 부하·재접속 누락 시험, 상태 라이브러리 |
| 5. 이용 약관 | 조건부 합의 | 공급자별 인증 모드; MVP API key 경로 | Claude 구독 통합 범위, Codex SIWC 접근 |
| 6. Rust | 합의 | V1 범위 밖 | 성능·격리 실패가 발생할 때만 재검토 |
| 7. Electron 보안 | 조건부 합의 | 명시적 격리 설정, 엄격한 CSP·IPC | Monaco CSP 및 설치물 IPC 시험 |
| 8. 3-OS CI | 합의 | OS별 빌드·설치 시험, 공개 배포물 서명 | 서명 자격·notarization·Linux 배포 채널 |

### UNVERIFIED

1. **신규** Agent Studio가 사용자의 기존 Codex CLI ChatGPT 로그인을 App Server에서 그대로 사용하는 방식의 허용 범위. OpenAI 문서의 기존 로컬 앱 지속 사용 문구와 신규 SIWC 경로는 확인했으나, 이를 신규 제품의 포괄 허가로 읽지 않는다.
2. Claude Agent SDK 통합이 “사용자가 수정되지 않은 Claude Code 바이너리에 직접 로그인”하는 예외에 해당하는지.
3. 이 제품에서 SIWC ChatGPT plan 사용을 신청·등록할 수 있는지, 대상 플랜과 배포 형태가 충족되는지.
4. Codex `0.166.0`의 장시간 App Server 안정성, 재접속 뒤 이벤트 재구독의 실제 동작, 현재 온라인 문서와 설치 버전의 완전한 스키마 일치.
5. App Server 승인 요청을 수 분~수 시간 보류할 때 턴이 유지되는 보장 시간.
6. Codex 스킬 본문의 실제 로드·사용을 직접 알려 주는 전용 App Server 이벤트의 존재.
7. 독립 데몬을 Electron 실행 파일의 Node 모드로 구동할 때 세 OS의 종료·업데이트·fuse·네이티브 모듈 동작. 별도 동봉 Node 방식의 패키징 비용도 실측 전이다.
8. Monaco worker와 제안한 엄격한 CSP가 서명된 custom-protocol 설치물에서 수정 없이 함께 동작하는지, 이후 LSP 통합의 구현 비용.
9. 제시한 UI 지연 목표와 batching 구간이 실제 대화·로그 부하에 적절한지. 이 값들은 검증 목표이며 관측 결과가 아니다.