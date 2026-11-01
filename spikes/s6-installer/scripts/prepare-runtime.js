/**
 * 동봉 Node 런타임 준비(extraResources `runtime/`): 시스템 node.exe 복사 + Node ABI로 설치한 네이티브 모듈 복사 + 공용 daemon.js 복사.
 * (제품에서는 릴리스 파이프라인이 고정 버전 Node 바이너리를 내려받는다 — 스파이크는 실행 중인 node를 쓴다)
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const runtime = path.join(root, "runtime");
fs.rmSync(runtime, { recursive: true, force: true });
fs.mkdirSync(runtime, { recursive: true });
fs.copyFileSync(process.execPath, path.join(runtime, "node.exe"));
fs.copyFileSync(path.join(root, "app", "daemon.js"), path.join(runtime, "daemon.js"));
const src = path.join(root, "runtime-node-abi", "node_modules");
if (!fs.existsSync(src)) throw new Error("runtime-node-abi/node_modules missing — run npm install there first");
fs.cpSync(src, path.join(runtime, "node_modules"), { recursive: true });
fs.writeFileSync(path.join(runtime, "RUNTIME.json"), JSON.stringify({ node: process.version, modules: process.versions.modules, preparedAt: new Date().toISOString() }, null, 2));
console.log(`runtime prepared: node ${process.version} (ABI ${process.versions.modules}) → ${runtime}`);
