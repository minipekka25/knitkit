// Cold-load benchmark: boot the React <RemoteComponent> demo, load it in a fresh browser,
// and measure what a first-time visitor pays — request count, encoded bytes over the wire
// (Resource Timing API), and time from navigation to the remote component being visible.
//
// Network-dependent (the demo pulls React from esm.sh) and browser-dependent, so this runs
// locally, not in CI. The bytes.mjs benchmark is the deterministic, CI-safe one.
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const demo = join(root, "examples", "react-host-react-remote");
const HOST = 5183;
const REMOTE = 5184;
const procs = [];

function start(script, port, extraEnv = {}) {
  procs.push(spawn(process.execPath, [script], { env: { ...process.env, PORT: String(port), ...extraEnv }, stdio: ["ignore", "ignore", "inherit"] }));
}
async function waitFor(url, attempts = 100) {
  for (let i = 0; i < attempts; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out waiting for ${url}`);
}

start(join(demo, "remote", "serve.mjs"), REMOTE);
start(join(demo, "host", "serve.mjs"), HOST, { REMOTE_PORT: String(REMOTE) });

let browser;
try {
  await waitFor(`http://localhost:${REMOTE}/knit.manifest.json`);
  await waitFor(`http://localhost:${HOST}/`);

  browser = await chromium.launch();
  const page = await browser.newPage();

  const t0 = Date.now();
  await page.goto(`http://localhost:${HOST}/`, { waitUntil: "commit" });
  await page.getByText("Counter (React remote)").waitFor({ state: "visible", timeout: 20000 });
  const timeToRemoteMs = Date.now() - t0;

  const timing = await page.evaluate(() => {
    const res = performance.getEntriesByType("resource");
    const nav = performance.getEntriesByType("navigation")[0];
    const encoded = res.reduce((n, r) => n + (r.encodedBodySize || 0), 0) + (nav?.encodedBodySize || 0);
    const transfer = res.reduce((n, r) => n + (r.transferSize || 0), 0) + (nav?.transferSize || 0);
    return { requests: res.length + 1, encodedBytes: encoded, transferBytes: transfer };
  });

  const result = {
    measuredAt: new Date().toISOString(),
    demo: "react-host-react-remote",
    timeToRemoteVisibleMs: timeToRemoteMs,
    requests: timing.requests,
    encodedBytes: timing.encodedBytes,
    transferBytes: timing.transferBytes,
  };

  console.log("\nknitkit — cold load (react-host-react-remote)\n");
  console.log("  time to remote visible :", timeToRemoteMs, "ms");
  console.log("  requests               :", timing.requests);
  console.log("  encoded bytes          :", (timing.encodedBytes / 1024).toFixed(1), "KB");
  console.log("  transfer bytes (w/ hdrs):", (timing.transferBytes / 1024).toFixed(1), "KB");
  console.log("\nNote: includes React fetched from esm.sh; figures vary with the network.");

  const outDir = join(root, "benchmarks", "results");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "cold-load.json"), JSON.stringify(result, null, 2) + "\n");
  console.log("wrote benchmarks/results/cold-load.json");
} catch (e) {
  console.error("cold-load benchmark FAILED:\n" + (e?.stack || e));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  for (const p of procs) p.kill();
}
