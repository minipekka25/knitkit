import { defineConfig } from "@playwright/test";

// Boots both servers so the smoke test is self-contained.
export default defineConfig({
  testDir: "test",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:5183", headless: true },
  webServer: [
    {
      command: "node remote/serve.mjs",
      port: 5184,
      reuseExistingServer: !process.env.CI,
      env: { PORT: "5184" },
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "node host/serve.mjs",
      port: 5183,
      reuseExistingServer: !process.env.CI,
      env: { PORT: "5183", REMOTE_PORT: "5184" },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
