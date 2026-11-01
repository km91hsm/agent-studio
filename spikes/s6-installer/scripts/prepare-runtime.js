/**
 * 동봉 Node 런타임 준비(extraResources `runtime/`): 시스템 node.exe 복사 + Node ABI로 설치한 네이티브 모듈 복사 + 공용 daemon.js 복사
 * + S5 데몬(spikes/s5-daemon/daemon.ts·protocol.ts)을 tsc로 컴파일해 `runtime/s5/`(ESM)에 둔다(Codex 리뷰 #2: 설치물에서 S5 데몬 기동 검증).
 * (제품에서는 릴리스 파이프라인이 고정 버전 Node 바이너리를 내려받는다 — 스파이크는 실행 중인 node를 쓴다)
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const repoRoot = path.join(root, "..", "..");
const runtime = path.join(root, "runtime");
fs.rmSync(runtime, { recursive: true, force: true });
fs.mkdirSync(runtime, { recursive: true });
fs.copyFileSync(process.execPath, path.join(runtime, "node.exe"));
fs.copyFileSync(path.join(root, "app", "daemon.js"), path.join(runtime, "daemon.js"));
const src = path.join(root, "runtime-node-abi", "node_modules");
if (!fs.existsSync(src)) throw new Error("runtime-node-abi/node_modules missing — run npm install there first");
fs.cpSync(src, path.join(runtime, "node_modules"), { recursive: true });

// S5 데몬 컴파일(루트 typescript 사용). 출력은 ESM이므로 package.json {"type":"module"}을 함께 둔다.
const tsc = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");
execFileSync(process.execPath, [tsc, "-p", path.join(root, "tsconfig.s5.json")], { stdio: "inherit", cwd: repoRoot });
fs.writeFileSync(path.join(runtime, "s5", "package.json"), JSON.stringify({ type: "module", private: true }, null, 2));
for (const f of ["daemon.js", "protocol.js"]) if (!fs.existsSync(path.join(runtime, "s5", f))) throw new Error(`s5 compile missing ${f}`);

fs.writeFileSync(path.join(runtime, "RUNTIME.json"), JSON.stringify({ node: process.version, modules: process.versions.modules, preparedAt: new Date().toISOString(), s5: "spikes/s5-daemon (tsc NodeNext)" }, null, 2));
console.log(`runtime prepared: node ${process.version} (ABI ${process.versions.modules}) → ${runtime} (+ s5 daemon)`);
