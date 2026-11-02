/**
 * Renderer 번들(P01 T7). `vite build apps/renderer` → `apps/renderer/dist/`. Shell 이 `app://bundle/renderer/` 로 서빙하므로
 * 자원 경로는 상대(`base: "./"`). CSP `script-src 'self'` 를 지키기 위해 인라인 스크립트를 만들지 않는다(modulePreload polyfill 비활성).
 */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome130",
    modulePreload: { polyfill: false },
    sourcemap: false,
  },
});
