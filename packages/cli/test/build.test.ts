import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { buildCommand } from "../src/commands/build.js";
import { validateCommand } from "../src/commands/validate.js";

function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "knitkit-test-"));
  const cliRoot = join(import.meta.dirname, "..", "fixtures", "react-cjs");
  const nodeModules = join(dir, "node_modules", "react");
  mkdirSync(nodeModules, { recursive: true });
  copyFileSync(join(cliRoot, "package.json"), join(nodeModules, "package.json"));
  copyFileSync(join(cliRoot, "index.cjs"), join(nodeModules, "index.cjs"));

  writeFileSync(
    join(dir, "knit.config.json"),
    JSON.stringify({ name: "checkout", shared: ["react"], exposes: ["./CartWidget.js"] }),
  );
  writeFileSync(join(dir, "CartWidget.js"), "export const CartWidget = () => 1;\n");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "checkout-fixture", version: "0.0.0", dependencies: { react: "18.3.1" } }),
  );
  return dir;
}

describe("knitkit build", () => {
  let project: string;
  beforeEach(() => {
    project = makeProject();
  });
  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it("emits shared ESM, exposes, and a valid manifest", async () => {
    const { manifestPath } = await buildCommand({ cwd: project });
    expect(existsSync(manifestPath)).toBe(true);

    const sharedDir = join(project, "dist", "shared");
    expect(readdirSync(sharedDir).some((f) => f.startsWith("react-"))).toBe(true);

    const exposesDir = join(project, "dist", "exposes");
    expect(existsSync(join(exposesDir, "CartWidget.js"))).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.spec).toBe("0.1");
    expect(manifest.name).toBe("checkout");
    expect(manifest.shared.react).toBeTruthy();
    expect(manifest.shared.react.integrity).toMatch(/^sha384-/);
    expect(manifest.exposes["./CartWidget"]).toBeTruthy();
  });

  it("converts React (CJS) to a standalone ESM file with the package's real API", async () => {
    await buildCommand({ cwd: project });
    const sharedDir = join(project, "dist", "shared");
    const files = readdirSync(sharedDir);
    const reactFile = files.find((f) => f.startsWith("react-"))!;
    const code = readFileSync(join(sharedDir, reactFile), "utf8");
    expect(code.length).toBeGreaterThan(0);
    // It must be ESM, not CJS.
    expect(code).toMatch(/export\s*\{|export default/);

    // Regression guard: the bundle must contain the package's ACTUAL code, not its
    // package.json. Importing it must yield React's real surface (createElement/version),
    // not { name, main, type }. Execute it in a real Node process (not via vitest/vite,
    // which mangles absolute temp-dir file URLs on Windows).
    const url = pathToFileURL(join(sharedDir, reactFile)).href;
    const probe = `import(${JSON.stringify(url)}).then((m)=>{const R=m.default;process.stdout.write(JSON.stringify({type:typeof R,createElement:typeof R.createElement,version:R.version,hasMain:"main" in R}));}).catch((e)=>{process.stderr.write(String(e));process.exit(1);})`;
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", probe], { encoding: "utf8" });
    const info = JSON.parse(out);
    expect(info.type).toBe("object");
    expect(info.createElement).toBe("function");
    expect(info.version).toBe("18.3.1");
    expect(info.hasMain).toBe(false);
  });
});

describe("knitkit validate", () => {
  it("rejects a malformed manifest with a message", async () => {
    const dir = mkdtempSync(join(tmpdir(), "knitkit-val-"));
    const path = join(dir, "bad.manifest.json");
    writeFileSync(path, JSON.stringify({ spec: "0.2", name: "x" }));
    const r = await validateCommand(path);
    expect(r.ok).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});
