import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";

export interface FedConfig {
  name: string;
  shared: string[];
  exposes: string[];
  /** Optional: defaults to "browser". */
  platform?: "browser" | "node";
}

export function loadConfig(cwd: string = process.cwd()): FedConfig {
  const path = resolve(cwd, "fed.config.json");
  if (!existsSync(path)) {
    throw new Error(`fed.config.json not found at ${path}. Create one before running fedkit build.`);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<FedConfig>;
  if (typeof raw.name !== "string" || !raw.name) {
    throw new Error(`fed.config.json: "name" is required.`);
  }
  if (!Array.isArray(raw.shared)) {
    throw new Error(`fed.config.json: "shared" must be an array of package names.`);
  }
  if (!Array.isArray(raw.exposes)) {
    throw new Error(`fed.config.json: "exposes" must be an array of paths.`);
  }
  return {
    name: raw.name,
    shared: raw.shared,
    exposes: raw.exposes,
    platform: raw.platform,
  };
}

/**
 * Resolve a package's installed location + entry from the consumer cwd's node_modules.
 * Uses createRequire so we resolve relative to the consumer, not the CLI.
 *
 * `entry` is an absolute path to the package's main module (honoring `exports`/`main`).
 * We hand this concrete path to esbuild rather than a bare specifier so resolution
 * does not depend on esbuild walking the directory tree (which can pick up an
 * unrelated ancestor Yarn PnP manifest and refuse to resolve).
 */
export function resolvePackageDir(
  cwd: string,
  pkg: string,
): { dir: string; version: string; entry: string } {
  const req = createRequire(resolve(cwd, "package.json"));
  const pkgJsonPath = req.resolve(`${pkg}/package.json`);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as { version: string };
  let entry: string;
  try {
    entry = req.resolve(pkg);
  } catch {
    // Some packages only expose subpath `exports` and no main entry; fall back to
    // the directory + package.json `module`/`main` if the bare resolve fails.
    const meta = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as { module?: string; main?: string };
    const rel = meta.module ?? meta.main ?? "index.js";
    entry = resolve(dirname(pkgJsonPath), rel);
  }
  return { dir: dirname(pkgJsonPath), version: pkgJson.version, entry };
}
