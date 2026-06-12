import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeIntegrity } from "../src/sri.js";

const REMOTE_SOURCE = 'export const greeting = "hello from the remote";\n';

const here = fileURLToPath(new URL(".", import.meta.url));
const distIndex = join(here, "..", "dist", "index.js");
const childScript = join(here, "fixtures", "ssr-child.mjs");
const packageRoot = join(here, "..");

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/greeting.js") {
      res.writeHead(200, { "Content-Type": "text/javascript", "Access-Control-Allow-Origin": "*" });
      res.end(REMOTE_SOURCE);
    } else {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (addr && typeof addr === "object") baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function runChild(env: Record<string, string>): Promise<{ out: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [childScript], {
      cwd: packageRoot,
      env: { ...process.env, FEDKIT_DIST: distIndex, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => resolve({ out: out || err, code: code ?? -1 }));
  });
}

describe("SSR loader hooks (integration)", () => {
  it("resolves a bare specifier to a remote HTTP module and imports it", async () => {
    const { out, code } = await runChild({
      REMOTE_SPECIFIER: "remote-greeting",
      REMOTE_URL: `${baseUrl}/greeting.js`,
      REMOTE_INTEGRITY: computeIntegrity(REMOTE_SOURCE),
    });
    expect(code).toBe(0);
    expect(out).toBe("OK:hello from the remote");
  });

  it("loads without an integrity pin (SRI optional)", async () => {
    const { out, code } = await runChild({
      REMOTE_SPECIFIER: "remote-greeting",
      REMOTE_URL: `${baseUrl}/greeting.js`,
      REMOTE_INTEGRITY: "",
    });
    expect(code).toBe(0);
    expect(out).toBe("OK:hello from the remote");
  });

  it("refuses to execute a module whose content does not match its SRI hash", async () => {
    const wrongIntegrity = computeIntegrity("export const greeting = 'a different module';\n");
    const { out, code } = await runChild({
      REMOTE_SPECIFIER: "remote-greeting",
      REMOTE_URL: `${baseUrl}/greeting.js`,
      REMOTE_INTEGRITY: wrongIntegrity,
    });
    expect(code).toBe(3);
    expect(out).toBe("ERR:FED_ERR_SRI_MISMATCH");
  });

  it("surfaces a coded load error for an unreachable remote", async () => {
    const { out, code } = await runChild({
      REMOTE_SPECIFIER: "remote-greeting",
      REMOTE_URL: "http://127.0.0.1:1/nope.js",
      REMOTE_INTEGRITY: "",
    });
    expect(code).toBe(3);
    expect(out).toBe("ERR:FED_ERR_LOAD_FAILED");
  });
});
