import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../src/index.js";

let work: string;

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

beforeEach(async () => {
  work = await mkdtemp(join(tmpdir(), "knitkit-create-"));
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(work, { recursive: true, force: true });
});

describe("@knitkit/create", () => {
  it("scaffolds a complete, runnable starter", async () => {
    const dest = join(work, "My-App");
    await main([dest]);

    for (const f of [
      "index.html",
      "src/main.js",
      "remote/widget.js",
      "remote/knit.manifest.json",
      "shared/store.js",
      "serve.mjs",
      "package.json",
      "README.md",
      ".gitignore", // shipped as _gitignore, renamed on scaffold
    ]) {
      expect(await exists(join(dest, f)), `missing ${f}`).toBe(true);
    }

    // _gitignore must not leak into the scaffolded project.
    expect(await exists(join(dest, "_gitignore"))).toBe(false);

    // package.json name is derived from the target dir, normalized to a valid npm name.
    const pkg = JSON.parse(await readFile(join(dest, "package.json"), "utf8"));
    expect(pkg.name).toBe("my-app");

    // The manifest is valid JSON exposing the widget the host loads.
    const manifest = JSON.parse(await readFile(join(dest, "remote/knit.manifest.json"), "utf8"));
    expect(manifest.exposes["./Widget"].url).toBe("./widget.js");
  });

  it("refuses to overwrite a non-empty directory without --force", async () => {
    const dest = join(work, "occupied");
    await mkdir(dest, { recursive: true });
    await writeFile(join(dest, "keep.txt"), "do not clobber");

    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);

    await expect(main([dest])).rejects.toThrow("exit:2");
    expect(exit).toHaveBeenCalledWith(2);
    expect(await exists(join(dest, "keep.txt"))).toBe(true);
  });

  it("scaffolds into a non-empty directory when --force is passed", async () => {
    const dest = join(work, "forced");
    await mkdir(dest, { recursive: true });
    await writeFile(join(dest, "keep.txt"), "kept");

    await main([dest, "--force"]);
    expect(await exists(join(dest, "index.html"))).toBe(true);
    expect(await exists(join(dest, "keep.txt"))).toBe(true);
  });
});
