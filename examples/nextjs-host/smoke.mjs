// Boots the remote fragment + the Next dev server, then checks the fragment actually embeds in
// the rendered page (and that there's no dual-React "invalid hook call"). Uses Playwright's
// chromium from the repo root node_modules. Local only (browser + Next dev).
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const procs = [];
const start = (args, env) =>
  procs.push(spawn(process.execPath, args, { cwd: here, env: { ...process.env, ...env }, stdio: ["ignore", "ignore", "inherit"] }));

async function waitFor(url, attempts = 200) {
  for (let i = 0; i < attempts; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timed out waiting for ${url}`);
}

start([join(here, "fragment-server.mjs")], { PORT: "5304" });
start([join(here, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", "5300"], {});

let browser;
try {
  await waitFor("http://localhost:5304/");
  await waitFor("http://localhost:5300/");
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto("http://localhost:5300/", { waitUntil: "commit" });
  // next dev compiles on first hit; the fragment is fetched client-side and embedded.
  await page.getByText("Remote fragment").waitFor({ state: "visible", timeout: 60000 });

  if (/Invalid hook call|more than one copy of React/i.test(errors.join("\n"))) {
    throw new Error("dual-React error:\n" + errors.join("\n"));
  }
  console.log("nextjs-host smoke: PASS");
} catch (e) {
  console.error("nextjs-host smoke: FAIL\n" + (e?.stack || e));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  for (const p of procs) p.kill();
}
