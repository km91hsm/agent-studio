import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["spikes/**/*.test.ts", "packages/**/*.test.ts", "apps/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "spikes/fixtures/**", "spikes/s6-installer/{dist,runtime,runtime-node-abi,app}/**"],
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 60 * 1000,
    fileParallelism: false,
    reporters: ["default"],
  },
});
