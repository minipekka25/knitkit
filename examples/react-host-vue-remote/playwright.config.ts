import { defineConfig } from "@playwright/test";

// Boots both servers so the smoke test is self-contained (`pnpm test` just works).
// The host proxies /federation/* to the remote, so both must be up.
export default defineConfig({
  testDir: "test",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
  webServer: [
    {
      command: "node remote/serve.mjs",
      port: 5174,
      reuseExistingServer: !process.env.CI,
      env: { PORT: "5174" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "node host/serve.mjs",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      env: { PORT: "5173", REMOTE_PORT: "5174" },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
