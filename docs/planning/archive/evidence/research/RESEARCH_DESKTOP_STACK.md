# Agent Studio 데스크톱 스택 조사 (1차 출처 기반)

## 1. 조사 개요

- **조사일**: 2026-11-01
- **범위**: 데스크톱 프레임워크(Tauri v2 / Electron / .NET Avalonia(+WPF 비교) / Qt PySide6), 편집기·터미널 컴포넌트, 로컬 상태 저장(SQLite 계열), 자격증명 저장 라이브러리, 백엔드 구조별 백그라운드 지속·IPC 메커니즘, 프런트엔드 프레임워크
- **출처 규칙**: 공식 문서, 저장소 README/소스, 패키지 레지스트리 메타데이터(npm registry / crates.io API / PyPI / NuGet), GitHub Releases API만 사용. 블로그·비교 글 미사용. 출처가 없는 숫자는 `UNVERIFIED`로 표기.
- **현재 PC 툴체인 (로컬 `--version` 실행 결과, 2026-11-01)**:

| 도구 | 상태 |
|---|---|
| Node.js | `v24.21.0` |
| Python | `Python 3.14.7` |
| git | `git version 2.56.0.windows.4` |
| Rust (`cargo`, `rustc`) | 없음 (`cargo: not found`, `rustc: not found`) |
| Go | 없음 (`go: not found`) |
| .NET SDK | 없음 (`dotnet --version` → "No .NET SDKs were found.") |

참고: Node.js 24는 2025-10-28 LTS 진입, 2026-10-20 Maintenance 진입, 2028-04-30 EOL (출처: nodejs/Release `schedule.json`, https://raw.githubusercontent.com/nodejs/Release/main/schedule.json). Node 26 "Lithium"은 2026-10-28 LTS 진입(동일 출처).

---

## 2. 항목별 비교

### 2.1 데스크톱 프레임워크

#### 비교표

| 항목 | Tauri v2 | Electron | .NET Avalonia | Qt 6 / PySide6 |
|---|---|---|---|---|
| 최신 안정 버전 | `tauri` 2.12.5 (2026-10-21) [T1] | 45.2.1 (2026-10-31) [E1] | 12.1.4 (2026-10-09) [A1] | Qt 6.12.0 (2026-09-30) [Q1] / PySide6 6.12.0 (2026-10-08) [Q2] |
| 데스크톱 OS 지원 | Windows(WebView2), macOS(WKWebView), Linux(webkit2gtk) [T2] | macOS Ventura+, Windows 10+, Linux 주요 배포판 [E2] | Windows 10 22H2+, macOS 14+, Ubuntu 16.04/Fedora 30/Debian 9+ (Tier 2) [A2] | Windows 10(1809+)/11, macOS 14.4+, Ubuntu 22.04/24.04, Debian 11.6/12, RHEL 9.6/10 등 [Q3] |
| 설치 크기 공식 수치 | UNVERIFIED (공식 문서에 수치 없음; WebView2 번들 옵션별 추가 크기만 공개 [T3]) | UNVERIFIED | UNVERIFIED | UNVERIFIED (PySide6 메타 휠 자체는 579.0 kB이지만 실제 Qt 바이너리는 PySide6_Essentials/Addons에 있음 [Q2]) |
| 자식 프로세스 API | `@tauri-apps/plugin-shell`: `Command.spawn()` → `Child`, `stdout/stderr` `data` 이벤트(라인 단위 또는 raw), `Child.write()`, `Child.kill()` [T4]; Rust: `spawn() -> (Receiver<CommandEvent>, CommandChild)` [T5] | Node `child_process.spawn` (stdio pipe, `stdin.write`, `kill(signal)`, `detached`+`unref`) [E3]; `utilityProcess.fork` (stdout/stderr pipe, MessagePort, `kill()`; **stdin 미지원**) [E4] | `System.Diagnostics.Process`: `RedirectStandardOutput` + `OutputDataReceived` + `BeginOutputReadLine`, `StandardInput`, `Kill()` [A3] | `QProcess`: `start()`, `readyReadStandardOutput` 시그널, `readAllStandardOutput()`, `write()`, `closeWriteChannel()`, `terminate()`/`kill()` [Q4]; Python `asyncio.create_subprocess_exec` [P1] |
| 샌드박스·권한 모델 | Capabilities(JSON/TOML, `src-tauri/capabilities`) → 창/웹뷰 단위 permission 부여, 기본은 번들 코드만 API 접근 [T6]; shell 플러그인은 `allow-spawn/kill/stdin-write/execute`를 명시 허용해야 함 [T7] | 렌더러 sandbox: Electron 20부터 기본 활성 [E5]; `contextIsolation`: Electron 12부터 기본 활성 [E6]; 프리로드는 `electron` 모듈만 `require` 가능 [E5] | 프레임워크 자체 샌드박스 모델 없음(.NET 일반 프로세스) — 공식 문서에 별도 권한 모델 서술 없음 (UNVERIFIED: 부재 확인 범위 한정) | 프레임워크 자체 샌드박스 모델 없음 — 공식 문서에 별도 권한 모델 서술 없음 (UNVERIFIED: 부재 확인 범위 한정) |
| 자동 업데이트 공식 플러그인 | `tauri-plugin-updater`: 서명 필수(`tauri signer generate`), Windows NSIS/MSI, macOS `.app.tar.gz`, Linux AppImage만 지원(deb 미언급) [T8] | 내장 `autoUpdater`(Squirrel.Windows / Squirrel.Mac) + `update.electronjs.org`(공개 GitHub 저장소·macOS 서명 필요) [E7]; 서드파티 `electron-builder`의 `electron-updater` [E8] | 공식 자동 업데이트 플러그인 **발견되지 않음** (배포 문서에 언급 없음 [A4][A5]) | Qt Installer Framework의 Maintenance Tool이 자동 업데이트 제공 [Q5]; PySide6 전용 공식 업데이터 **발견되지 않음** |
| 배포 포맷 | Windows: NSIS `-setup.exe`, WiX MSI(Windows에서만 빌드) [T9]; macOS: `.app`, DMG, App Store [T10]; Linux: deb, rpm, AppImage, Snap, Flatpak, AUR [T10] | Electron Forge makers: appx, deb, dmg, flatpak, msix, pkg, rpm, snap, squirrel, wix, zip [E9]; DMG는 macOS에서만, deb는 Linux/macOS에서만 빌드 [E10]; WiX MSI는 WiX v3 필요 [E11] | `dotnet publish` 결과를 수동 패키징: macOS `.app` 번들+codesign+notarytool [A4]; Debian은 `dpkg-deb`로 수동 생성 [A5] | `pyside6-deploy`(Nuitka 기반): Windows `.exe`, Linux `.bin`, macOS `.app` [Q6]; 설치 패키지는 Qt Installer Framework 등 별도 [Q5] |
| 코드 서명 | "Signing is required on most platforms." [T10]; Windows: OV/EV 인증서, Azure Key Vault(relic), Azure Artifact Signing, 임의 `signCommand` [T11]; macOS: Apple Developer 계정(연 99달러), Developer ID 사용 시 notarization 필수, Apple 기기 필요 [T12] | macOS: Apple Developer Program, 서명+notarization 2단계, Squirrel.Mac은 서명 필수 [E12]; Windows: 2023-06 이후 EV 인증서 필요 또는 Azure Artifact Signing [E12] | macOS: Developer ID 인증서, hardened runtime, notarytool, `--deep` 지양 [A4] | 공식 Qt 문서에서 서명 절차 **미확인** (UNVERIFIED) |
| 백그라운드 실행(트레이/창 닫아도 유지) | `tray-icon` feature로 트레이 [T13]; JS `onCloseRequested` → `preventDefault()`로 창 닫기 차단, `hide()` [T14]; Rust `RunEvent::ExitRequested` + `ExitRequestApi::prevent_exit()` [T15]; `tauri-plugin-autostart`로 로그인 시 자동 실행 [T16] | `Tray` API [E13]; `window-all-closed` 미구독 시 기본 종료, 구독하면 종료 여부 제어 가능 [E14]; `app.setLoginItemSettings({openAtLogin})` [E14] | `TrayIcon`(Windows/macOS/일부 Linux) [A6]; `ShutdownMode.OnExplicitShutdown`으로 자동 종료 비활성 [A7] | `QSystemTrayIcon`(Windows/macOS/StatusNotifierItem·XEmbed Linux) [Q7]; `quitOnLastWindowClosed` 기본 `true`, `false`로 변경 가능 [Q8] |
| 필요 툴체인 | **Rust 필수**("Tauri is built with Rust and requires it for development."), Windows: MSVC C++ Build Tools + WebView2; Node.js는 JS 프런트엔드 사용 시에만 [T17]; shell/updater/autostart/stronghold 플러그인은 Rust ≥ 1.90 [T7][T8][T16][K3] | Node.js (현 PC 보유) | .NET 8.0+ SDK(데스크톱) [A2]; .NET 10 LTS(2025-11-11 출시) [A8] — 현 PC 미설치 | Python ≥3.10 <3.16 [Q2] (현 PC 3.14.7 충족) |
| 라이선스 | "MIT or MIT/Apache 2.0 where applicable." [T18]; crates.io: `Apache-2.0 OR MIT` [T1] | MIT [E2] | MIT [A1][A9] | PySide6: `LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only` + 상용 [Q2]; Qt LGPLv3 동적 링크 시 앱 소스 비공개 가능, 정적 링크는 제약 [Q9] |

#### 보조 사실: WPF / WinUI
- WPF 공식 문서: "Even though .NET is a cross-platform technology, WPF only runs on Windows." → 크로스플랫폼 요건 미충족 [A10]. 따라서 .NET 축에서 크로스플랫폼 후보는 Avalonia.

#### 근거 인용

- **[T1]** crates.io API `tauri`: `max_stable_version: "2.12.5"`, `created_at: "2026-10-21T11:54:45Z"`, `license: "Apache-2.0 OR MIT"` — https://crates.io/api/v1/crates/tauri
- **[T2]** "Tauri uses WebView2 which is based on Microsoft Edge and therefore Chromium." / "Tauri uses WebKit on macOS (through WKWebView) and Linux (through webkit2gtk)." — https://v2.tauri.app/reference/webview-versions/
- **[T3]** WebView2 설치 모드 표: `downloadBootstrapper` 0MB, `embedBootstrapper` ~1.8MB, `offlineInstaller` ~127MB, `fixedVersion` ~180MB — https://v2.tauri.app/distribute/windows-installer/
- **[T4]** `spawn(): Promise<Child>` "Executes the command as a child process, returning a handle to it." / `write(data)` "Writes `data` to the `stdin`." / `kill()` "Kills the child process." / `data` 이벤트: "for each line the process wrote to the stream, or for each raw chunk when the `raw` encoding is used." — https://v2.tauri.app/reference/javascript/shell/
- **[T5]** `pub fn spawn(self) -> Result<(Receiver<CommandEvent>, CommandChild), Error>`; `CommandEvent` variants: `Stdout(Vec<u8>)`, `Stderr(Vec<u8>)`, `Error(String)`, `Terminated(TerminatedPayload)` — https://docs.rs/tauri-plugin-shell/latest/tauri_plugin_shell/process/struct.Command.html , https://docs.rs/tauri-plugin-shell/latest/tauri_plugin_shell/process/enum.CommandEvent.html
- **[T6]** "Capabilities define which permissions are granted or denied for which windows or webviews." / "By default the API is only accessible to bundled code shipped with the Tauri App." — https://v2.tauri.app/security/capabilities/
- **[T7]** shell 플러그인 권한 `shell:allow-spawn`, `shell:allow-kill`, `shell:allow-stdin-write`, `shell:allow-execute`(각 `deny-` 변형 존재), 기본 세트는 `allow-open`만; "This plugin requires a Rust version of at least 1.90." — https://v2.tauri.app/plugin/shell/
- **[T8]** "Tauri's updater needs a signature to verify that the update is from a trusted source."; Linux AppImage, macOS `.app.tar.gz`, Windows NSIS/MSI `.sig`; deb 미언급; Rust ≥1.90 — https://v2.tauri.app/plugin/updater/
- **[T9]** "`.msi` installers can only be created on Windows"; "Cross compiling Windows apps on Linux and macOS hosts is possible with caveats when using NSIS." — https://v2.tauri.app/distribute/windows-installer/
- **[T10]** "Signing is required on most platforms."; macOS "ship a DMG installer as direct download"; Linux "the Debian package, Snap, AppImage, Flatpak, RPM or Arch User Repository (AUR) formats." — https://v2.tauri.app/distribute/
- **[T11]** `bundle > windows > signCommand` "any codesign tool that can sign Windows executables"; 크로스컴파일 시 커스텀 sign command 필수 — https://v2.tauri.app/distribute/sign/windows/
- **[T12]** "Code signing on macOS requires an Apple Developer account which is either paid (99$ per year)"; "Notarization is required when using a Developer ID Application certificate."; "You also need an Apple device where you perform the code signing." — https://v2.tauri.app/distribute/sign/macos/
- **[T13]** `tauri = { version = "2.0.0", features = [ "tray-icon" ] }`; Linux에서 일부 트레이 이벤트 "Unsupported. The event is not emitted even though the icon is shown." — https://v2.tauri.app/learn/system-tray/
- **[T14]** `CloseRequestedEvent.preventDefault()`: "Prevents the window from being closed." / "Must be called before the handler returns (await anything you need first), otherwise the window is destroyed as usual." — https://v2.tauri.app/reference/javascript/api/namespacewindow/
- **[T15]** `RunEvent::ExitRequested` "The app is about to exit"; `ExitRequestApi::prevent_exit` "Prevents the app from exiting." — https://docs.rs/tauri/latest/tauri/enum.RunEvent.html , https://docs.rs/tauri/latest/tauri/struct.ExitRequestApi.html
- **[T16]** "Automatically launch your application at system startup."; Rust ≥1.90 — https://v2.tauri.app/plugin/autostart/
- **[T17]** "Tauri is built with Rust and requires it for development."; Node.js "Only if you intend to use a JavaScript frontend framework."; Windows: C++ Build Tools, WebView2 "These are both required for development on Windows." — https://v2.tauri.app/start/prerequisites/
- **[T18]** README Licenses: "MIT or MIT/Apache 2.0 where applicable." — https://github.com/tauri-apps/tauri
- **[T19]** 사이드카: `bundle.externalBin`, "a binary with the same name and a `-$TARGET_TRIPLE` suffix must exist on the specified path."; `Command.sidecar(...)` + `shell:allow-execute`/`allow-spawn`에 `"sidecar": true` — https://v2.tauri.app/develop/sidecar/
- **[E1]** "Electron 45.2.1", 2026-10-31, Chromium 156.0.8078.75, Node.js 24.22.1; 안정 라인 45/44/43 — https://releases.electronjs.org/ ; npm `electron@latest` = 45.2.1, MIT — https://registry.npmjs.org/electron/latest
- **[E2]** "Each Electron release provides binaries for macOS, Windows, and Linux."; macOS "Ventura and up"; Windows "Windows 10 and up"; 라이선스 MIT — https://github.com/electron/electron
- **[E3]** "By default, pipes for `stdin`, `stdout`, and `stderr` are established between the parent Node.js process and the spawned subprocess."; "On Windows, setting `options.detached` to `true` makes it possible for the child process to continue running after the parent exits."; `subprocess.unref()`: "allowing the parent process to exit independently of the child process" — https://nodejs.org/api/child_process.html
- **[E4]** `utilityProcess.fork` "uses Services API from Chromium to launch the child process"; `stdio` "Currently this option only supports configuring `stdout` and `stderr` to either `pipe`, `inherit` or `ignore`"(stdin은 `ignore`만 허용); `postMessage`로 `MessagePortMain` 전송; `kill()` "Terminates the process gracefully." — https://www.electronjs.org/docs/latest/api/utility-process
- **[E5]** "Starting from Electron 20, the sandbox is enabled for renderer processes without any further configuration."; 프리로드 "No Node.js built-in modules or Node.js globals such as `Buffer` or `setImmediate` are available." — https://www.electronjs.org/docs/latest/tutorial/sandbox
- **[E6]** "Context isolation has been enabled by default since Electron 12" — https://www.electronjs.org/docs/latest/tutorial/context-isolation
- **[E7]** 내장 Squirrel 기반 autoUpdater "the easiest and officially supported one"; update.electronjs.org 조건: macOS/Windows, "public GitHub repository", GitHub Releases, macOS 코드 서명 — https://www.electronjs.org/docs/latest/tutorial/updates
- **[E8]** electron-builder: "A complete solution to package and build a ready for distribution Electron app with "auto update" support out of the box", MIT — https://github.com/electron-userland/electron-builder ; npm 26.18.0, MIT — https://registry.npmjs.org/electron-builder/latest
- **[E9]** Forge `packages/maker` 디렉터리: appx, base, deb, dmg, flatpak, msix, pkg, rpm, snap, squirrel, wix, zip — https://api.github.com/repos/electron/forge/contents/packages/maker
- **[E10]** "You can only build the DMG target on macOS machines." — https://www.electronforge.io/config/makers/dmg ; "You can only build the deb target on Linux or macOS machines with the fakeroot and dpkg packages installed." — https://www.electronforge.io/config/makers/deb
- **[E11]** "You can only build the WiX MSI target on machines with WiX Toolset v3 installed."; "These MSI files are a worse user experience for installation" — https://www.electronforge.io/config/makers/wix-msi ; Squirrel.Windows 출력 `Setup.exe`, `-full.nupkg`, `RELEASES` — https://www.electronforge.io/config/makers/squirrel.windows
- **[E12]** "Preparing macOS applications for release requires two steps: First, the app needs to be code signed."; "Squirrel.Mac requires the app to be signed for automatic updates to work at all."; Windows EV 인증서 미사용 시 "Windows will treat your app as completely unsigned" — https://www.electronjs.org/docs/latest/tutorial/code-signing
- **[E13]** `Tray` 클래스, Linux StatusNotifierItem 기본, Windows "It is recommended to use `ICO` icons" — https://www.electronjs.org/docs/latest/api/tray
- **[E14]** `window-all-closed` "Emitted when all windows have been closed."; 미구독 시 "the default behavior is to quit the app."; `openAtLogin` "`true` to open the app at login" — https://www.electronjs.org/docs/latest/api/app
- **[E15]** "Each Electron app has a single main process"; "The main process runs in a Node.js environment"; utility process는 "untrusted services, CPU intensive tasks or crash prone components" 호스팅용 — https://www.electronjs.org/docs/latest/tutorial/process-model
- **[A1]** NuGet Avalonia 12.1.4, "Last updated 10/9/2026", MIT, net8.0/net10.0 — https://www.nuget.org/packages/Avalonia
- **[A2]** Windows 10 22H2(Tier 2), macOS 14 Sonoma(Tier 2), Desktop Linux Ubuntu 16.04/Fedora 30/Debian 9(Tier 2); 데스크톱 .NET 8.0 이상 — https://docs.avaloniaui.net/docs/overview/supported-platforms
- **[A3]** "BeginOutputReadLine starts asynchronous read operations on the StandardOutput stream."; "the event handler is called each time the associated Process writes a line of text to its StandardOutput stream." — https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.beginoutputreadline
- **[A4]** "macOS applications are distributed as `.app` bundles."; "Notarization is an automated process where you upload your signed app to Apple's servers for a security scan."; "Apple recommends avoiding `--deep`"; 자동 업데이트 언급 없음 — https://docs.avaloniaui.net/docs/deployment/macos
- **[A5]** `dotnet publish` 후 `dpkg-deb --root-owner-group --build`; 의존성 `libx11-6`, `libice6`, `libsm6`, `libfontconfig1` — https://docs.avaloniaui.net/docs/deployment/debian-ubuntu
- **[A6]** TrayIcon "supported on Windows, macOS, and some Linux distributions." — https://docs.avaloniaui.net/docs/reference/controls/tray-icon
- **[A7]** "`OnExplicitShutdown` - disables automatic shutdown of the application, you need to call the `Shutdown` method in your code." — https://docs.avaloniaui.net/docs/concepts/application-lifetimes
- **[A8]** .NET 10 LTS 2025-11-11 출시, 지원 종료 2028-11-14; .NET 8 LTS 지원 종료 2026-11-10 — https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- **[A9]** "Avalonia is licenced under the MIT licence." — https://github.com/AvaloniaUI/Avalonia
- **[A10]** "Even though .NET is a cross-platform technology, WPF only runs on Windows." — https://learn.microsoft.com/en-us/dotnet/desktop/wpf/overview/
- **[Q1]** "Qt 6.12.0 Released 30rd September 2026!" — https://wiki.qt.io/Qt_6.12_Release
- **[Q2]** PySide6 6.12.0 (Oct 8, 2026), 라이선스 "LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only", Python "<3.16, >=3.10", 휠: win_amd64 579.0 kB / macosx_14_0_universal2 577.5 kB / manylinux_2_34_x86_64 577.7 kB; PySide6 휠은 PySide6_Essentials + PySide6_Addons의 alias — https://pypi.org/project/PySide6/ (주의: 6.11.3이 2026-10-26로 더 늦게 게시됨)
- **[Q3]** Qt 6.12 지원 플랫폼 표: "Windows 10 (1809 or later)", "Windows 11", "macOS 14.4 or higher (including macOS 26)", Ubuntu 22.04/24.04 등; "Qt 6.12 will be the last version to support Windows 10" — https://doc.qt.io/qt-6/supported-platforms.html
- **[Q4]** "It also emits readyReadStandardOutput() when new standard output data is available."; "You can then write to the process's standard input by calling write()."; `kill()` "Kills the current process, causing it to exit immediately."(Windows `TerminateProcess`) — https://doc.qt.io/qt-6/qprocess.html
- **[Q5]** Qt Installer Framework: Linux/Windows/macOS, Maintenance Tool "allows your end users to later add, update, and remove components." — https://doc.qt.io/qtinstallerframework/ifw-overview.html
- **[Q6]** pyside6-deploy는 Nuitka 사용("a Python compiler that compiles your Python code to C code"); 기본 standalone 모드 `<name>.dist` 폴더, Windows `.exe`, Linux `.bin`, macOS `.app`; 6.12에서 기본 모드 onefile→standalone — https://doc.qt.io/qtforpython-6/deployment/deployment-pyside6-deploy.html
- **[Q7]** QSystemTrayIcon: "All supported versions of Windows.", "All supported versions of macOS.", D-Bus StatusNotifierItem 구현 Linux 데스크톱, XEmbed 트레이 — https://doc.qt.io/qt-6/qsystemtrayicon.html
- **[Q8]** `quitOnLastWindowClosed`: "This property holds whether the application implicitly quits when the last window is closed." / "The default is `true`." — https://doc.qt.io/qt-6/qguiapplication.html
- **[Q9]** LGPL 동적 링크 시 "it is possible, but not mandatory, to keep application source code proprietary" — https://www.qt.io/licensing/open-source-lgpl-obligations

---

### 2.2 편집기·터미널 컴포넌트

| 항목 | Monaco Editor | CodeMirror 6 (`@codemirror/view`) | xterm.js (`@xterm/xterm`) |
|---|---|---|---|
| 최신 버전 | 0.57.0 (2026-09-24) [M1] | 6.43.15 (npm `latest`; 날짜 UNVERIFIED — 아래 참고) [C1] | 6.0.0 (2025-12-22) [X1] |
| 라이선스 | MIT [M2] | MIT [C1][C2] | MIT [X2] |
| 번들/패키지 크기 | npm unpackedSize 101,674,083 bytes, 1,918 files (설치 패키지 크기; 실제 번들 크기는 UNVERIFIED) [M1] | npm unpackedSize 1,264,544 bytes, 8 files (view 패키지만; 전체 에디터는 state/commands/language 등 다중 패키지) [C1][C3] | npm unpackedSize 5,921,599 bytes, 161 files [X3] |
| 프레임워크 무관 | README에 명시 없음(UNVERIFIED). 순수 DOM API 제공 | "The packages are distributed as ES6 modules."; 프레임워크 언급 없음 — 명시 진술은 UNVERIFIED [C3] | "The core library has zero dependencies." [X2] |
| 접근성 언급 | README: "Read this guide to ensure the editor is accessible to all your users!"; 가이드: 스크린리더 연결 시 wrapping 비활성, `accessibilitySupport: "on"`, Alt+F1 접근성 도움말 [M2][M3] | "Works well with screen readers and keyboard-only users." [C2] | "Screen reader mode and minimum contrast ratio support can be turned on." [X2] |
| 기타 | 모바일 브라우저 지원 "No."; `file://`에서 web worker 생성 불가 → http(s) 서빙 필요 [M2] | "Most features are implemented on top of a generic public API." [C2] | — |

근거:
- **[M1]** GitHub Releases API `tag_name: v0.57.0`, `published_at: 2026-09-24T21:25:23Z` — https://api.github.com/repos/microsoft/monaco-editor/releases/latest ; npm `monaco-editor@latest` version 0.57.0, license MIT, unpackedSize 101674083, fileCount 1918 — https://registry.npmjs.org/monaco-editor/latest
- **[M2]** "Licensed under the MIT License."; FAQ "Is the editor supported in mobile browsers or mobile web app frameworks?" → "No."; "HTML5 does not allow pages loaded on `file://` to create web workers." — https://github.com/microsoft/monaco-editor
- **[M3]** 접근성 가이드(스크린리더 wrapping 비활성, NVDA 2017.3+, `ariaLabel`, `accessibilitySupport`, `accessibilityHelpUrl`) — https://github.com/microsoft/monaco-editor/wiki/Accessibility-Guide-for-Integrators
- **[C1]** npm `@codemirror/view@latest`: version 6.43.15, MIT, unpackedSize 1264544, fileCount 8 — https://registry.npmjs.org/@codemirror/view/latest ; 버전 존재 확인 — https://registry.npmjs.org/@codemirror/view/6.43.15 . **주의**: 저장소 `main` 브랜치 CHANGELOG 최신 항목은 "## 6.41.0 (2026-04-01)"로 npm과 불일치 → 6.43.15 게시일 UNVERIFIED — https://raw.githubusercontent.com/codemirror/view/main/CHANGELOG.md
- **[C2]** "Works well with screen readers and keyboard-only users."; "CodeMirror is open source under a permissive license (MIT)."; "Most features are implemented on top of a generic public API." — https://codemirror.net/
- **[C3]** "CodeMirror is set up as a collection of separate modules"; "the codemirror package pulls in most of the things you need for a baseline editor"(언어 패키지 제외); "The packages are distributed as ES6 modules." — https://codemirror.net/docs/guide/
- **[X1]** GitHub Releases API `tag_name: 6.0.0`, `published_at: 2025-12-22T13:59:51Z` — https://api.github.com/repos/xtermjs/xterm.js/releases/latest
- **[X2]** "Self-contained: The core library has zero dependencies."; "Accessible: Screen reader mode and minimum contrast ratio support can be turned on."; MIT; `npm install --save @xterm/xterm` — https://github.com/xtermjs/xterm.js
- **[X3]** npm `@xterm/xterm@latest`: 6.0.0, MIT, unpackedSize 5921599, fileCount 161 — https://registry.npmjs.org/@xterm/xterm/latest

---

### 2.3 로컬 상태 저장 (SQLite)

#### SQLite 공식 문서: WAL·동시성·단일 writer

| 주제 | 공식 진술 | 출처 |
|---|---|---|
| WAL 동시성 | "WAL provides more concurrency as readers do not block writers and a writer does not block readers." | [S1] |
| 단일 writer | "However, since there is only one WAL file, there can only be one writer at a time." / "SQLite supports an unlimited number of simultaneous readers, but it will only allow one writer at any instant in time." | [S1][S2] |
| SQLITE_BUSY 가능성 | "there are some obscure cases where a query against a WAL-mode database can return SQLITE_BUSY, so applications should be prepared for that happenstance." | [S1] |
| 동일 호스트 제약 | "All processes using a database must be on the same host computer; WAL does not work over a network filesystem." | [S1] |
| 체크포인트 | "By default, SQLite does a checkpoint automatically when the WAL file reaches a threshold size of 1000 pages." | [S1] |
| WAL 영구 설정 | "The WAL journaling mode is persistent; after being set it stays in effect across multiple database connections and after closing and reopening the database." | [S3] |
| synchronous=NORMAL | "WAL mode is always consistent with synchronous=NORMAL, but WAL mode does lose durability. A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash. Transactions are durable across application crashes regardless of the synchronous setting or journal mode." | [S3] |
| busy_timeout | "Each database connection can only have a single busy handler." (PRAGMA busy_timeout) | [S3] |
| 대용량 트랜잭션 | "WAL works best with smaller transactions. ... Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode." | [S1] |

#### 이벤트 저널(append-only) 패턴에 대한 공식 권고 유무
- SQLite 공식 문서에서 "append-only 이벤트 저널" 패턴을 직접 다루는 문서는 **발견되지 않음**(`appfileformat.html`은 "append", "log", "journal" 용어를 사용하지 않음) [S4]. 관련 가능한 공식 진술만 존재:
  - 애플리케이션 파일 포맷: "An SQLite database file with a defined schema often makes an excellent application file format."; "Writes to an SQLite database are atomic." [S4]
  - 단조 증가 ID: "With AUTOINCREMENT, rows with automatically selected ROWIDs are guaranteed to have ROWIDs that have never been used before by the same table in the same database. And the automatically generated ROWIDs are guaranteed to be monotonically increasing." 단, "AUTOINCREMENT guarantees that automatically chosen ROWIDs will be increasing but not that they will be sequential." 및 "should be avoided if not strictly needed." [S5]
  - 적합 영역: "For device-local storage with low writer concurrency and less than a terabyte of content, SQLite is almost always a better solution." [S2]

#### 언어별 바인딩

| 바인딩 | 최신 버전·날짜 | 상태/특성 | 라이선스 | 출처 |
|---|---|---|---|---|
| `node:sqlite` (Node 24 내장) | Node v24.x 문서 | `Stability: 1.2 - Release candidate`; v22.5.0 추가, v23.4.0/v22.13.0에서 `--experimental-sqlite` 플래그 제거, **v24.15.0에서 release candidate** 로 승격. 플래그 불필요 | Node.js(MIT 계열; 본 조사 범위 외) | [N1] |
| `better-sqlite3` | 13.0.3 (2026-08-05) | Node-API 네이티브 애드온(`node-addon-api ^8.0.0`), "Prebuilt binaries are available for major platforms/architectures."; "Easy-to-use synchronous API"; Electron 지원은 README 미언급(UNVERIFIED) | MIT | [N2][N3] |
| `rusqlite` (Rust) | 0.41.1 (2026-10-28) | — | MIT | [R1] |
| `sqlx` (Rust) | 0.9.0 (2026-05-21) | — | MIT OR Apache-2.0 | [R2] |
| Python `sqlite3` | 3.14 표준 라이브러리(optional module) | "requires the third-party SQLite library"; `check_same_thread` 기본 `True`; `autocommit` 속성(3.12+), 기본값 `LEGACY_TRANSACTION_CONTROL`은 "will change to `False` in a future Python release." | PSF | [P2] |

근거:
- **[S1]** https://www.sqlite.org/wal.html
- **[S2]** https://www.sqlite.org/whentouse.html
- **[S3]** https://www.sqlite.org/pragma.html
- **[S4]** https://www.sqlite.org/appfileformat.html
- **[S5]** https://www.sqlite.org/autoinc.html
- **[N1]** "Stability: 1.2 - Release candidate."; History: "v24.15.0 SQLite is now a release candidate." — https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- **[N2]** npm `better-sqlite3@latest`: 13.0.3, MIT, dependencies `node-addon-api ^8.0.0` — https://registry.npmjs.org/better-sqlite3/latest ; GitHub Releases API `v13.0.3`, `2026-08-05T03:26:05Z` — https://api.github.com/repos/WiseLibs/better-sqlite3/releases/latest
- **[N3]** README: "Prebuilt binaries are available for major platforms/architectures."; "Easy-to-use synchronous API"; MIT — https://github.com/WiseLibs/better-sqlite3
- **[R1]** crates.io API `rusqlite`: `max_stable_version 0.41.1`, `created_at 2026-10-28T17:58:27Z`, MIT — https://crates.io/api/v1/crates/rusqlite
- **[R2]** crates.io API `sqlx`: `max_stable_version 0.9.0`, `created_at 2026-05-21T17:35:53Z`, "MIT OR Apache-2.0" — https://crates.io/api/v1/crates/sqlx
- **[P2]** https://docs.python.org/3.14/library/sqlite3.html

---

### 2.4 자격증명 저장 라이브러리

| 라이브러리 | 생태계 | 최신 버전·날짜 | 유지보수 상태(최근 커밋) | 라이선스 | 출처 |
|---|---|---|---|---|---|
| `keyring` 크레이트 | Rust | 4.2.0 (2026-08-29) | 저장소 `open-source-cooperative/keyring-rs` `pushed_at: 2026-10-31`, archived: false | crates.io: "MIT OR Apache-2.0"; GitHub `license.spdx_id: Apache-2.0` | [K1][K2] |
| `tauri-plugin-stronghold` | Tauri(Rust+JS) | 안정 2.4.0 (crate `updated_at` 2026-10-14; 최신 pre-release 3.0.0-alpha.3) | `tauri-apps/plugins-workspace` 모노레포; 공식 문서에 deprecation 고지 없음; Rust ≥1.90; IOTA Stronghold 엔진, argon2 기반 32바이트 키 파생 | "Apache-2.0 OR MIT" | [K3][K4] |
| `keytar` | Node | 7.9.0 (2022-02-17 게시) | 저장소 `atom/node-keytar` **archived: true**, `pushed_at: 2022-12-12`; npm `deprecated` 필드는 `latest` 메타데이터에 없음 | MIT | [K5][K6] |
| `@napi-rs/keyring` | Node | 2.1.2 (2026-10-19) | 저장소 `Brooooooklyn/keyring-node` `pushed_at: 2026-10-28`, archived: false; 설명 "keyring-rs Node.js binding via napi.rs. Including 100% compatible node-keytar alternative." | MIT | [K7][K8] |

- 세 OS 백엔드(Windows Credential Manager / macOS Keychain / Linux Secret Service)를 모두 추상화한다는 **공식 문구 인용은 본 조사에서 확보하지 못함**(keyring-rs 설명: "Cross-platform library and utility to manage passwords") → 백엔드별 지원 범위는 UNVERIFIED.

근거:
- **[K1]** crates.io API `keyring`: 4.2.0, `created_at 2026-08-29T23:48:56Z`, "MIT OR Apache-2.0", repository `https://github.com/open-source-cooperative/keyring-rs` — https://crates.io/api/v1/crates/keyring
- **[K2]** GitHub API: `pushed_at 2026-10-31T19:10:01Z`, `archived: false`, `license.spdx_id: Apache-2.0`, "Cross-platform library and utility to manage passwords" — https://api.github.com/repos/open-source-cooperative/keyring-rs
- **[K3]** 공식 문서: "using the IOTA Stronghold secret management engine"; "This plugin requires a Rust version of at least 1.90."; 기본 argon2 해시 — https://v2.tauri.app/plugin/stronghold/
- **[K4]** crates.io API: `max_stable_version 2.4.0`, `updated_at 2026-10-14T21:51:46Z`, newest `3.0.0-alpha.3`, "Apache-2.0 OR MIT" — https://crates.io/api/v1/crates/tauri-plugin-stronghold
- **[K5]** npm: `dist-tags.latest 7.9.0`, `time['7.9.0'] 2022-02-17T12:13:51Z`, `time.modified 2025-07-30`, MIT — https://registry.npmjs.org/keytar
- **[K6]** GitHub API: `archived: true`, `pushed_at 2022-12-12T11:01:01Z`, MIT — https://api.github.com/repos/atom/node-keytar
- **[K7]** npm: 2.1.2, `2026-10-19T08:30:36Z`, MIT — https://registry.npmjs.org/@napi-rs/keyring
- **[K8]** GitHub API: `pushed_at 2026-10-28T02:56:33Z`, `archived: false`, MIT — https://api.github.com/repos/Brooooooklyn/keyring-node

---

### 2.5 백엔드 구조 선택지의 공식 메커니즘

| 구조 | 자식 프로세스 스트리밍 API | 앱 종료 후 백그라운드 지속 — 공식 메커니즘 | IPC 방식 |
|---|---|---|---|
| **(A) Python + FastAPI 사이드카** | `asyncio.create_subprocess_exec` → `Process.stdout`(StreamReader) `readline()`, `stdin.write()`+`drain()`, `terminate()`/`kill()`; Windows는 `ProactorEventLoop`에서만 subprocess 지원 [P1] | 프로세스 분리: POSIX `start_new_session`(`setsid()`), Windows `creationflags=DETACHED_PROCESS`("will not inherit its parent's console"), `CREATE_NO_WINDOW` [P3]; OS 상주: Windows Service(SCM), launchd user agent, systemd `--user` [O1][O2][O3]; Tauri에 번들 시 사이드카(`externalBin`) [T19] | HTTP/WebSocket: "You can use WebSockets with FastAPI."(`websockets` 라이브러리 추가 필요) [F1]; FastAPI 0.162.0 (2026-10-23), MIT [F2] |
| **(B) Rust 네이티브 (Tauri 코어)** | `tauri-plugin-shell` Rust `spawn() -> (Receiver<CommandEvent>, CommandChild)` [T5]; `tokio::process`: "a spawned process will, by default, continue to execute even after the Child handle has been dropped."(`kill_on_drop`로 변경 가능) [RT1] | 트레이 상주: `tray-icon` + `onCloseRequested.preventDefault()`/`ExitRequested.prevent_exit()` [T13][T14][T15]; 로그인 자동 실행 `tauri-plugin-autostart` [T16]; 완전 분리 데몬은 OS 메커니즘(O1~O3) 별도 구현 필요 — Tauri 공식 플러그인 **발견되지 않음** | Commands(`invoke`, JSON 직렬화 필수), Events(fire-and-forget), **Channels**: "Channels are designed to be fast and deliver ordered data." 내부적으로 "download progress, child process output and WebSocket messages"에 사용; 이벤트는 "not designed for low latency or high throughput situations." [T20][T21] |
| **(C) Node 프로세스 (Electron main/utilityProcess)** | main: `child_process.spawn` (stdio pipe, `stdin.write`, `kill`) [E3]; `utilityProcess.fork`: stdout/stderr pipe 가능, **stdin은 `ignore`만**, `MessagePortMain` 전달 [E4] | `window-all-closed` 구독으로 종료 억제 + `Tray` [E13][E14]; 자식 분리: `detached: true` + `stdio: 'ignore'`(또는 파일) + `subprocess.unref()` [E3]; `setLoginItemSettings({openAtLogin})` [E14]; utilityProcess가 앱 종료 후 생존하는지 공식 진술 **발견되지 않음**(UNVERIFIED) | `ipcMain.handle`("Adds a handler for an `invoke`able IPC.") / `ipcMain.on` [E16]; `MessageChannelMain`/`MessagePortMain`: "the usual IPC methods like `send` and `invoke` cannot be used to transfer `MessagePort`s"; 두 끝단이 "communicate without relaying through the main process" [E17] |

OS 수준 백그라운드 메커니즘(공식 문서):
- **[O1]** Windows: "The service control manager (SCM) maintains a database of installed services and driver services"; 표에서 auto-start 서비스는 "Long-running daemons that must always be available", "Runs from boot until shutdown."; "Prefer trigger-start services over auto-start services." — https://learn.microsoft.com/en-us/windows/win32/services/about-services
- **[O2]** macOS launchd: "A user agent is essentially identical to a daemon, but is specific to a given logged-in user and executes only while that user is logged in."; agent plist는 `/Library/LaunchAgents` 또는 사용자 `Library/LaunchAgents`; `KeepAlive` "indicates that this job needs to be running at all times" — https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
- **[O3]** systemd: "Each systemd --user instance manages a hierarchy of units specific to that user."; PID 1이 `user@UID.service`로 사용자 매니저 기동 — https://www.freedesktop.org/software/systemd/man/latest/user@.service.html (로그아웃 시 종료 조건·`enable-linger`는 해당 페이지에 없음 → UNVERIFIED)

근거(추가):
- **[P1]** "Subprocesses are available for Windows if a `ProactorEventLoop` is used."; "Use the `communicate()` method rather than `process.stdin.write()`, `await process.stdout.read()` ... This avoids deadlocks" — https://docs.python.org/3.14/library/asyncio-subprocess.html
- **[P3]** `start_new_session`: "the `setsid()` system call will be made in the child process"; `DETACHED_PROCESS`: "a new process will not inherit its parent's console"; `CREATE_NO_WINDOW`: "a new process will not create a window." — https://docs.python.org/3.14/library/subprocess.html
- **[RT1]** https://docs.rs/tokio/latest/tokio/process/index.html
- **[T20]** "Events are fire-and-forget, one-way IPC messages"; `invoke` "allows the Frontend to invoke Rust functions, pass arguments, and receive data."; "all arguments and return data must be serializable to JSON" — https://v2.tauri.app/concept/inter-process-communication/
- **[T21]** https://v2.tauri.app/develop/calling-frontend/
- **[E16]** https://www.electronjs.org/docs/latest/api/ipc-main
- **[E17]** https://www.electronjs.org/docs/latest/tutorial/message-ports
- **[F1]** https://fastapi.tiangolo.com/advanced/websockets/
- **[F2]** GitHub Releases API `0.162.0`, `2026-10-23T18:47:17Z`; repo `license.spdx_id: MIT` — https://api.github.com/repos/fastapi/fastapi/releases/latest , https://api.github.com/repos/fastapi/fastapi

---

### 2.6 프런트엔드 프레임워크

| 프레임워크 | 최신 안정 버전·날짜 | 릴리스 주기(공식) | 라이선스 | 가상 스크롤/대용량 목록 공식 가이드 |
|---|---|---|---|---|
| React | 19.3.1 (2026-10-14) [W1] | "Stable React releases ... follow semantic versioning (semver) principles."; "Minor releases are the most common type of release."; 패치는 "only for the most critical bugs and security vulnerabilities" [W2] | MIT [W1] | 레거시 문서 "Virtualize Long Lists"(windowing; react-window/react-virtualized 언급) — https://legacy.reactjs.org/docs/optimizing-performance.html ; 현행 react.dev 내 공식 가이드는 **미확인**(UNVERIFIED) |
| Vue | 3.5.44 (2026-10-13) [W3] | "Vue does not have a fixed release cycle."; "Patch releases are released as needed."; minor "a typical time frame of 3~6 months in between" [W4] | MIT [W3] | "Virtualize Large Lists": "rendering a list with thousands of items **will** be slow due to the sheer number of DOM nodes"; 커뮤니티 라이브러리(vue-virtual-scroller 등) 안내 — https://vuejs.org/guide/best-practices/performance.html [W5] |
| Svelte | 5.57.3 (2026-10-26) [W6] | 공식 릴리스 주기 문서 **미확인**(UNVERIFIED) | MIT [W6] | 공식 가상 스크롤 가이드 **미확인**(UNVERIFIED) |

근거:
- **[W1]** GitHub Releases API `v19.3.1`, `2026-10-14T17:06:15Z` — https://api.github.com/repos/facebook/react/releases/latest ; npm `react@latest` 19.3.1, MIT — https://registry.npmjs.org/react/latest
- **[W2]** https://react.dev/community/versioning-policy
- **[W3]** GitHub Releases API `v3.5.44`, `2026-10-13T07:43:25Z` — https://api.github.com/repos/vuejs/core/releases/latest ; npm `vue@latest` 3.5.44, MIT — https://registry.npmjs.org/vue/latest
- **[W4]** https://vuejs.org/about/releases.html
- **[W5]** https://vuejs.org/guide/best-practices/performance.html
- **[W6]** GitHub Releases API `svelte@5.57.3`, `2026-10-26T18:15:06Z` — https://api.github.com/repos/sveltejs/svelte/releases/latest ; npm `svelte@latest` 5.57.3, MIT — https://registry.npmjs.org/svelte/latest

---

## 3. Agent Studio 요구사항에 비춘 사실 기반 관찰 (trade-off만 서술, 추천 없음)

1. **툴체인 격차**: 현 PC에는 Node 24.21 / Python 3.14.7만 있고 Rust·.NET SDK가 없다. Tauri는 "Tauri is built with Rust and requires it for development."[T17], Avalonia는 .NET 8.0+ SDK[A2]가 필요하므로 두 축은 툴체인 설치가 선행 비용이다. Electron(Node)·PySide6(Python ≥3.10)는 현 툴체인만으로 개발 가능하다[Q2].
2. **자식 프로세스 stdin 제어 범위 차이**: Electron `utilityProcess.fork`는 stdin을 `ignore`로만 설정 가능해 CLI(claude.exe/codex.exe)에 stdin을 써야 하는 경우 main 프로세스의 `child_process.spawn`을 써야 한다[E3][E4]. Tauri shell 플러그인은 JS에서 `Child.write()`/`kill()`을 제공하되 `shell:allow-spawn/kill/stdin-write` 권한과 인자 스코프(정규식 validator)를 capability에 명시해야 한다[T4][T7]. .NET `Process`와 `QProcess`는 stdin/stdout/kill을 모두 기본 제공한다[A3][Q4].
3. **JSONL 라인 스트리밍 적합성**: Tauri shell `data` 이벤트는 기본 라인 단위(또는 raw 청크)로 전달되고[T4][T5], .NET `OutputDataReceived`는 "each time the associated Process writes a line of text"[A3]로 호출되어 JSONL과 자연스럽게 맞는다. Node `spawn`의 `stdout` `data`는 라인 경계를 보장하지 않는 스트림 청크여서 애플리케이션이 라인 분할을 해야 한다[E3]. Python asyncio는 `readline()`을 제공하되 공식 문서가 `communicate()` 외 직접 read/write 시 데드락 가능성을 경고한다[P1].
4. **고처리량 IPC 경로**: Tauri 이벤트 시스템은 "not designed for low latency or high throughput situations"이며 다수 CLI의 로그 스트리밍에는 Channels가 공식적으로 지정된 경로다[T21]. Electron은 `ipcMain` 외에 `MessagePortMain`으로 렌더러↔유틸리티 프로세스 직접 채널을 만들 수 있다[E17]. Python 사이드카는 HTTP/WebSocket 경계를 하나 더 거친다[F1].
5. **"앱 종료 후 작업 지속"의 공식 지원 범위**: 네 프레임워크 모두 트레이 상주 + 창 닫기 억제(Tauri `preventDefault`/`prevent_exit`, Electron `window-all-closed`, Avalonia `OnExplicitShutdown`, Qt `quitOnLastWindowClosed=false`)는 공식 API로 제공한다[T14][T15][E14][A7][Q8]. 그러나 프로세스 자체가 완전히 종료된 뒤에도 작업을 이어가는 데몬화는 어느 프레임워크도 공식 플러그인으로 제공하지 않으며 OS 메커니즘(Windows Service/SCM, launchd agent, systemd --user)을 직접 통합해야 한다[O1][O2][O3]. Node는 `detached`+`unref`, Python은 `start_new_session`/`DETACHED_PROCESS`로 자식 프로세스만 분리하는 공식 옵션이 있다[E3][P3].
6. **배포 포맷 빌드 호스트 제약**: Tauri MSI는 Windows에서만, NSIS는 크로스컴파일 가능(제약 있음)[T9]; Electron Forge DMG는 macOS에서만, deb는 Linux/macOS에서만[E10]; Tauri macOS 서명은 "Apple device"와 유료 개발자 계정 필요[T12]. 세 OS 배포는 어떤 스택이든 멀티 호스트 CI가 사실상 전제된다.
7. **자동 업데이트 공식 지원의 유무**: Tauri(updater 플러그인, 서명 필수, deb 미지원)[T8]와 Electron(autoUpdater + update.electronjs.org, 단 공개 GitHub 저장소 조건)[E7]은 공식 경로가 있다. Avalonia는 공식 배포 문서에 자동 업데이트 언급이 없고[A4][A5], PySide6는 Qt Installer Framework의 Maintenance Tool에 의존한다[Q5].
8. **샌드박스 모델의 존재 여부**: Tauri는 창 단위 capability·권한 모델[T6], Electron은 렌더러 sandbox(20+)·contextIsolation(12+) 기본값[E5][E6]을 가지나, Avalonia·Qt는 프레임워크 차원의 웹뷰형 권한 모델이 없다(일반 네이티브 프로세스). 내장 코드 편집기/브라우저 미리보기를 웹 기술로 구현할 경우 전자 두 스택의 모델이 직접 관련된다.
9. **SQLite 단일 writer 원칙과 다중 CLI 프로세스**: 공식 문서는 "there can only be one writer at a time"[S1], 무제한 readers[S2]를 명시하고 WAL은 동일 호스트 전제[S1]다. 여러 CLI 스트림을 동시에 기록하려면 애플리케이션 계층에서 writer를 직렬화(단일 writer 프로세스/큐)하거나 `busy_timeout`으로 SQLITE_BUSY를 처리해야 한다[S1][S3]. `synchronous=NORMAL`은 WAL에서 일관성은 유지되나 전원 손실 시 마지막 트랜잭션 롤백 가능성이 있다[S3].
10. **Node SQLite 선택지의 안정성 등급**: Node 24에 내장된 `node:sqlite`는 v24.15.0에서 "Stability: 1.2 - Release candidate"로 아직 Stable(2)이 아니다[N1]. `better-sqlite3`는 네이티브 애드온으로 prebuilt 바이너리를 제공하나 Electron 호환은 README에 명시되지 않았다[N2][N3]. Rust는 `rusqlite`(0.41.1)/`sqlx`(0.9.0), Python은 표준 라이브러리 `sqlite3`를 쓸 수 있다[R1][R2][P2].
11. **자격증명 라이브러리 유지보수 상태**: Node `keytar`는 저장소가 archived(마지막 push 2022-12-12)[K6]이고, `@napi-rs/keyring`(2026-10-28 push, keyring-rs 바인딩)[K7][K8]과 Rust `keyring` 4.2.0(2026-10-31 push)[K1][K2]은 활성 상태다. Tauri `stronghold`는 파일 기반 암호화 vault로 OS 키체인 연동 방식과 다르다[K3].
12. **라이선스 trade-off**: Tauri/Electron/Avalonia/React/Vue/Svelte/Monaco/CodeMirror/xterm.js는 MIT(또는 MIT/Apache) 계열인 반면, PySide6는 LGPLv3/GPL 또는 상용이며 LGPL 준수 시 동적 링크·재링크 허용 등의 의무가 따른다[Q2][Q9].

---

## 4. UNVERIFIED 목록

| 항목 | 사유 |
|---|---|
| Tauri / Electron / Avalonia / PySide6 **설치 크기(앱 번들 크기) 공식 수치** | 공식 문서에 수치 없음. Tauri는 WebView2 모드별 추가 크기(0 / ~1.8 / ~127 / ~180MB)만 공개[T3]. PySide6 메타 휠 크기(≈579 kB)는 실제 Qt 바이너리를 포함하지 않음[Q2] |
| Monaco / CodeMirror / xterm.js **번들(빌드 후) 크기** | npm `unpackedSize`(설치 패키지 크기)만 확보; 실제 번들 크기 공식 수치 없음 |
| `@codemirror/view` 6.43.15 **게시일** | npm에 버전 존재하나 날짜 필드 미확보; 저장소 main CHANGELOG 최신 항목은 6.41.0 (2026-04-01)로 불일치 |
| Monaco Editor **프레임워크 무관성 명시 문구** | README에 해당 진술 없음 |
| Avalonia / Qt **프레임워크 차원 샌드박스·권한 모델 부재** | 공식 문서에서 해당 모델 서술을 찾지 못함(부재의 확정 아님) |
| Avalonia **공식 자동 업데이트 플러그인** | 배포 문서(macOS, Debian)에 언급 없음; 존재 여부 미확정 |
| Qt / PySide6 **코드 서명 공식 절차** | 본 조사에서 공식 문서 미확인 |
| Qt 6.12 **LTS 여부** | 릴리스 위키 페이지에 명시 없음 |
| PySide6 **최신 버전 기준**: 6.12.0(2026-10-08) vs 6.11.3(2026-10-26) | PyPI가 6.12.0을 "latest"로 표시하나 6.11.3 게시일이 더 늦음 |
| Electron `utilityProcess` **앱 종료 후 생존 여부** | 공식 문서(utility-process API, process-model)에 진술 없음 |
| systemd 사용자 매니저의 **로그아웃 시 종료 조건 / `loginctl enable-linger`** | `user@.service` 매뉴얼 페이지에 해당 서술 없음(다른 매뉴얼 페이지 미조회) |
| Tauri 2.12.5 **GitHub Releases 페이지의 연도** | GitHub 표시에 연도 없음 → crates.io API `created_at`(2026-10-21)로 대체 확정 |
| Avalonia 12.1.4 **GitHub Releases 연도** | GitHub 표시에 연도 없음 → NuGet "Last updated 10/9/2026"으로 대체 확정 |
| `keytar` npm **deprecated 플래그** | `latest` 메타데이터에 `deprecated` 필드 없음(저장소는 archived) |
| 자격증명 라이브러리의 **OS별 백엔드(Credential Manager/Keychain/Secret Service) 지원 범위 명시 문구** | 공식 설명문 "Cross-platform library and utility to manage passwords"만 확보 |
| `better-sqlite3` **Electron 지원 명시** | README에 Electron 언급 없음 |
| React(react.dev 현행 문서) / Svelte **가상 스크롤 공식 가이드**, Svelte **릴리스 주기 문서** | 미확인 |
| electron-builder **OS별 타깃 목록**(NSIS/MSI/AppImage 등) | 공식 문서 페이지 조회 실패(404/빈 응답); "auto update" 지원 문구와 MIT 라이선스만 확보[E8] |
| Electron / Tauri **공식 문서 기준 앱 메모리·성능 수치** | 조사 범위 외, 수치 없음 |
