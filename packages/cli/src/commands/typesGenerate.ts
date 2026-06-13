import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { loadConfig } from "../config.js";
import type { Manifest } from "@knitkit/runtime";

export interface TypesGenerateOptions {
  cwd?: string;
  outDir?: string;
}

/**
 * Generate a `.d.ts` for each exposed module and patch the built manifest's `exposes[].types`.
 * Uses the project's installed TypeScript compiler (optional peer dependency).
 *
 * Run after `knitkit build` (it patches `dist/knit.manifest.json`).
 */
export async function typesGenerateCommand(
  opts: TypesGenerateOptions = {},
): Promise<{ generated: string[] }> {
  const cwd = opts.cwd ?? process.cwd();
  const outDir = resolve(cwd, opts.outDir ?? "dist");
  const config = loadConfig(cwd);

  const manifestPath = join(outDir, "knit.manifest.json");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  } catch {
    throw new Error(`No manifest at ${manifestPath}. Run "knitkit build" before "knitkit types generate".`);
  }

  const ts = await loadTypeScript();
  const typesDir = join(outDir, "types");
  await mkdir(typesDir, { recursive: true });

  const options = {
    declaration: true,
    emitDeclarationOnly: true,
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    strict: false,
    noEmitOnError: false,
  };

  const generated: string[] = [];

  for (const exposePath of config.exposes) {
    const srcAbs = resolve(cwd, exposePath);
    const keyBase = basename(exposePath).replace(/\.[^.]+$/, "");
    const key = `./${keyBase}`;

    const program = ts.createProgram([srcAbs], options);
    let dts: { name: string; text: string } | undefined;
    program.emit(undefined, (fileName: string, text: string) => {
      if (!fileName.endsWith(".d.ts")) return;
      // Capture the declaration emitted for the entry file (matched by base name).
      if (!dts || basename(fileName).replace(/\.d\.ts$/, "") === keyBase) {
        dts = { name: fileName, text };
      }
    });

    if (!dts) {
      throw new Error(
        `Could not generate types for "${exposePath}". Ensure it is a .ts/.tsx/.js/.jsx module with exports.`,
      );
    }

    const outName = `${keyBase}.d.ts`;
    const outPath = join(typesDir, outName);
    await writeFile(outPath, dts.text, "utf8");
    if (manifest.exposes[key]) {
      manifest.exposes[key]!.types = `./types/${outName}`;
    }
    generated.push(outPath);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return { generated };
}

async function loadTypeScript(): Promise<typeof import("typescript")> {
  try {
    const mod = (await import("typescript")) as unknown as {
      default?: typeof import("typescript");
    } & typeof import("typescript");
    return mod.default ?? mod;
  } catch {
    throw new Error(
      'knitkit types generate requires "typescript" to be installed in your project (npm i -D typescript).',
    );
  }
}
