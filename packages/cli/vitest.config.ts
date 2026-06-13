import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // These are build/compile-heavy integration tests (esbuild bundling, the TypeScript
    // compiler). Run files sequentially so they don't contend for CPU and time out, and give
    // the compile steps generous headroom.
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
