// Smoke test: boot two independent fragment apps + the edge gateway, then assert the gateway
// composes both into one page (in order, placeholders gone, import map injected).
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const procs = [];

function start(script, port) {
  procs.push(spawn(process.execPath, [script], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "ignore", "inherit"] }));
}

async function waitFor(url, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out waiting for ${url}`);
}

start(join(here, "fragments", "product", "server.mjs"), 5204);
start(join(here, "fragments", "reviews", "server.mjs"), 5205);
start(join(here, "gateway.mjs"), 5203);

try {
  await waitFor("http://localhost:5204/");
  await waitFor("http://localhost:5205/");
  await waitFor("http://localhost:5203/");

  const html = await (await fetch("http://localhost:5203/")).text();

  assert.match(html, /Product \(React fragment\)/, "React fragment composed");
  assert.match(html, /Reviews \(vanilla fragment\)/, "vanilla fragment composed");
  assert.doesNotMatch(html, /<knitkit-fragment/, "placeholders replaced");
  assert.match(html, /<script type="importmap">/, "import map injected");
  assert.ok(html.indexOf("Product") < html.indexOf("Reviews"), "fragments composed in document order");

  console.log("edge-composition smoke: PASS");
} catch (e) {
  console.error("edge-composition smoke: FAIL\n" + (e?.stack || e));
  process.exitCode = 1;
} finally {
  // Kill the child servers and let the event loop drain so the process exits naturally —
  // calling process.exit() here would skip this cleanup and can trip a Windows libuv assert.
  for (const p of procs) p.kill();
}
