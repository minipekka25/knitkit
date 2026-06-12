import { writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname, join, basename } from "node:path";
import { loadConfig, resolvePackageDir } from "../config.js";
import { bundlePackage } from "../bundler/cjsToEsm.js";
import { sha384Integrity } from "../hash.js";
import type { Manifest, SharedDecl, ExposeDecl } from "@fedkit/runtime";

export interface BuildOptions {
  cwd?: string;
  outDir?: string;
}

export async function buildCommand(opts: BuildOptions = {}): Promise<{ manifestPath: string }> {
  const cwd = opts.cwd ?? process.cwd();
  const outDir = resolve(cwd, opts.outDir ?? "dist");
  const config = loadConfig(cwd);

  await mkdir(join(outDir, "shared"), { recursive: true });
  await mkdir(join(outDir, "exposes"), { recursive: true });

  const shared: Record<string, SharedDecl> = {};
  for (const pkg of config.shared) {
    const { version, entry } = resolvePackageDir(cwd, pkg);
    const outFile = join(outDir, "shared", `${pkg}-${version}.js`);
    await bundlePackage({ entry, pkgName: pkg, version, outFile });
    const integrity = await sha384Integrity(outFile);
    shared[pkg] = {
      version,
      requiredVersion: `^${version}`,
      singleton: true,
      url: `./shared/${pkg}-${version}.js`,
      integrity,
    };
  }

  const exposes: Record<string, ExposeDecl> = {};
  for (const exposePath of config.exposes) {
    const srcAbs = resolve(cwd, exposePath);
    const destAbs = join(outDir, "exposes", basename(exposePath));
    await mkdir(dirname(destAbs), { recursive: true });
    await copyFile(srcAbs, destAbs);
    // The expose key is the logical name, not the file path. Strip extension + normalize to "./Foo".
    const base = basename(exposePath).replace(/\.[^.]+$/, "");
    const key = `./${base}`;
    exposes[key] = {
      url: `./exposes/${basename(exposePath)}`,
    };
  }

  const manifest: Manifest = {
    spec: "0.1",
    name: config.name,
    exposes,
    shared,
    meta: {
      buildTime: new Date().toISOString(),
      framework: detectFramework(config.shared),
    },
  };

  const manifestPath = join(outDir, "fed.manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  return { manifestPath };
}

function detectFramework(shared: string[]): string {
  if (shared.includes("react")) return "react@18";
  if (shared.includes("vue")) return "vue@3";
  return "unknown";
}
