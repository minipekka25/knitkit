// Smoke test: boot the remote, render the page in a child process, assert the federated
// component was server-rendered and the import map serialized for hydration. Localhost only
// (the server-side render uses local React, no external network), so it's robust.
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const REMOTE_PORT = 5194;
const remoteBase = `http://localhost:${REMOTE_PORT}`;

async function waitFor(url, attempts = 60) {
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

// Render in a child process, writing to a file. We wait for the child to close but read
// the FILE rather than trust the exit code (module.register + process.exit can trip a
// Windows-only libuv teardown assertion AFTER the HTML is written).
function renderToFile(script, env, outFile) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, ...env, FEDKIT_SSR_OUT: outFile },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("close", () => resolve(err));
  });
}

const tmp = mkdtempSync(join(tmpdir(), "knitkit-ssr-"));
const outFile = join(tmp, "page.html");
const remote = spawn(process.execPath, [join(here, "remote", "serve.mjs")], {
  env: { ...process.env, PORT: String(REMOTE_PORT) },
  stdio: ["ignore", "ignore", "inherit"],
});

try {
  await waitFor(`${remoteBase}/knit.manifest.json`);
  const childErr = await renderToFile(join(here, "server", "render.mjs"), { REMOTE_BASE: remoteBase }, outFile);
  if (!existsSync(outFile)) throw new Error("render produced no output file. stderr:\n" + childErr);
  const html = readFileSync(outFile, "utf8");

  assert.match(html, /Hello, world!/, "server-rendered greeting present");
  assert.match(html, /federated component, rendered on the server/, "remote component markup present");
  assert.match(html, /<script type="importmap">/, "import map serialized into HTML");
  assert.match(html, /esm\.sh\/react@18\.3\.1/, "client import map points at the shared React version");
  assert.doesNotMatch(html, /Invalid hook call/i, "no dual-React hook error");

  console.log("SSR smoke: PASS");
  process.exit(0);
} catch (e) {
  console.error("SSR smoke: FAIL\n" + (e?.stack || e));
  process.exit(1);
} finally {
  remote.kill();
  rmSync(tmp, { recursive: true, force: true });
}
