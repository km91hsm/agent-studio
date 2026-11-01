import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["spikes/**/*.test.ts"],
    exclude: ["**/node_modules/**", "spikes/fixtures/**", "spikes/s6-installer/**"],
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 60 * 1000,
    fileParallelism: false,
    reporters: ["default"],
  },
});
