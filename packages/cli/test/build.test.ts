import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildCommand } from "../src/commands/build.js";
import { validateCommand } from "../src/commands/validate.js";

function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "fedkit-test-"));
  const cliRoot = join(import.meta.dirname, "..", "fixtures", "react-cjs");
  const nodeModules = join(dir, "node_modules", "react");
  mkdirSync(nodeModules, { recursive: true });
  copyFileSync(join(cliRoot, "package.json"), join(nodeModules, "package.json"));
  copyFileSync(join(cliRoot, "index.cjs"), join(nodeModules, "index.cjs"));

  writeFileSync(
    join(dir, "fed.config.json"),
    JSON.stringify({ name: "checkout", shared: ["react"], exposes: ["./CartWidget.js"] }),
  );
  writeFileSync(join(dir, "CartWidget.js"), "export const CartWidget = () => 1;\n");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "checkout-fixture", version: "0.0.0", dependencies: { react: "18.3.1" } }),
  );
  return dir;
}

describe("fedkit build", () => {
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
    // not { name, main, type }.
    const mod = await import(pathToFileURL(join(sharedDir, reactFile)).href);
    const React = mod.default;
    expect(typeof React).toBe("object");
    expect(typeof React.createElement).toBe("function");
    expect(React.version).toBe("18.3.1");
    expect(React).not.toHaveProperty("main");
  });
});

describe("fedkit validate", () => {
  it("rejects a malformed manifest with a message", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fedkit-val-"));
    const path = join(dir, "bad.manifest.json");
    writeFileSync(path, JSON.stringify({ spec: "0.2", name: "x" }));
    const r = await validateCommand(path);
    expect(r.ok).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});
