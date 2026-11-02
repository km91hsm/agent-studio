/**
 * Shell 번들(P01 T6): `vite build apps/shell` → `dist/main.cjs`(Electron main), `vite build apps/shell --mode preload` → `dist/preload.cjs`
 * (sandbox preload 는 main 과 코드를 공유하면 안 되므로 별도 빌드 — 단일 파일, electron 외 require 없음).
 * 워크스페이스 `.ts`(core·protocol)는 번들에 포함하고, `electron`·네이티브 모듈(`better-sqlite3`·`@napi-rs/keyring`)·Node 내장은 external.
 * external 의 부수효과 import 는 버린다(`moduleSideEffects`) — core 의 sqlite-store 가 끌려와 Electron ABI 에서 better-sqlite3 를 로드하지 않도록.
 */
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const EXTERNAL = ["electron", "better-sqlite3", "@napi-rs/keyring", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig(({ mode }) => {
  const preload = mode === "preload";
  const input: Record<string, string> = preload ? { preload: resolve(import.meta.dirname, "src/preload.ts") } : { main: resolve(import.meta.dirname, "src/main.ts") };
  return {
    root: import.meta.dirname,
    ssr: { target: "node", noExternal: true },
    build: {
      ssr: true,
      outDir: "dist",
      emptyOutDir: !preload,
      target: "node22",
      minify: false,
      sourcemap: false,
      rollupOptions: {
        input,
        external: EXTERNAL,
        treeshake: { moduleSideEffects: (_id: string, external: boolean) => !external },
        output: { format: "cjs", entryFileNames: "[name].cjs", chunkFileNames: "chunks/[name]-[hash].cjs" },
      },
    },
  };
});
