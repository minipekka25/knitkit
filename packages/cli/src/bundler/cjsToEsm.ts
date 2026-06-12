import { build } from "esbuild";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Pre-bundle a single package's entry into a standalone ESM file.
 * The output is suitable for serving from a CDN and importing via an import map.
 *
 * We point esbuild at the package's resolved entry FILE (an absolute path) and let
 * it convert CJS → ESM and bundle the package's own dependencies. Bundling the
 * package.json (or assuming a hard-coded entry name) would miss the package's code.
 */
export async function bundlePackage(opts: {
  /** Absolute path to the package's entry module (from resolvePackageDir). */
  entry: string;
  pkgName: string;
  version: string;
  outFile: string;
}): Promise<void> {
  const { entry, pkgName, version, outFile } = opts;
  await mkdir(dirname(outFile), { recursive: true });

  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    sourcemap: false,
    write: false,
    metafile: false,
    legalComments: "none",
    mainFields: ["module", "browser", "main"],
    conditions: ["module", "browser", "import", "default"],
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  if (result.outputFiles.length === 0) {
    throw new Error(`esbuild produced no output for ${pkgName}@${version}`);
  }
  const code = result.outputFiles[0]!.text;
  await writeFile(outFile, code, "utf8");
}
