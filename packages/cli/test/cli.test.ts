import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../src/index.js";
import { typesGenerateCommand } from "../src/commands/typesGenerate.js";
import { typesSyncCommand } from "../src/commands/typesSync.js";
import { validateCommand } from "../src/commands/validate.js";

const argv = (...args: string[]) => ["node", "knitkit", ...args];

let outSpy: MockInstance;
let errSpy: MockInstance;
beforeEach(() => {
  outSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  errSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
});
afterEach(() => {
  outSpy.mockRestore();
  errSpy.mockRestore();
});

describe("CLI dispatcher (main)", () => {
  it("prints help and exits 0 for no command / help / -h", async () => {
    expect(await main(argv())).toBe(0);
    expect(await main(argv("help"))).toBe(0);
    expect(await main(argv("-h"))).toBe(0);
  });

  it("exits 2 for an unknown command", async () => {
    expect(await main(argv("frobnicate"))).toBe(2);
  });

  it("exits 2 for an unknown types subcommand", async () => {
    expect(await main(argv("types", "bogus"))).toBe(2);
  });

  it("exits 2 when validate is missing its argument", async () => {
    expect(await main(argv("validate"))).toBe(2);
  });

  it("validates a good manifest (exit 0) and a bad one (exit 1)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "knitkit-cli-"));
    const good = join(dir, "good.json");
    const bad = join(dir, "bad.json");
    writeFileSync(good, JSON.stringify({ spec: "0.1", name: "checkout", exposes: {}, shared: {} }));
    writeFileSync(bad, JSON.stringify({ spec: "0.2", name: "x" }));
    expect(await main(argv("validate", good))).toBe(0);
    expect(await main(argv("validate", bad))).toBe(1);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("command error paths", () => {
  it("validateCommand reports an unreadable file", async () => {
    const r = await validateCommand(join(tmpdir(), "does-not-exist-xyz.json"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Failed to read/);
  });

  it("typesGenerate fails clearly without a prior build", async () => {
    const dir = mkdtempSync(join(tmpdir(), "knitkit-tg-err-"));
    writeFileSync(join(dir, "knit.config.json"), JSON.stringify({ name: "x", shared: [], exposes: [] }));
    await expect(typesGenerateCommand({ cwd: dir })).rejects.toThrow(/knitkit build/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("typesSync fails clearly without knit.host.json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "knitkit-ts-err-"));
    await expect(typesSyncCommand({ cwd: dir })).rejects.toThrow(/host config/);
    rmSync(dir, { recursive: true, force: true });
  });
});
