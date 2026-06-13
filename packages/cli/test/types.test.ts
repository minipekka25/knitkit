import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { buildCommand } from "../src/commands/build.js";
import { typesGenerateCommand } from "../src/commands/typesGenerate.js";
import { typesSyncCommand } from "../src/commands/typesSync.js";

const REMOTE_MANIFEST = {
  spec: "0.1",
  name: "checkout",
  exposes: { "./CartWidget": { url: "./exposes/CartWidget.js", types: "./types/CartWidget.d.ts" } },
  shared: {},
};
const REMOTE_DTS = "declare const CartWidget: (props: { sku: string }) => string;\nexport default CartWidget;\n";

const here = dirname(fileURLToPath(import.meta.url));
const runtimeDts = resolve(here, "..", "..", "runtime", "dist", "index.d.ts");

describe("knitkit types generate", () => {
  it("emits a .d.ts per exposed module and patches the manifest", async () => {
    const dir = mkdtempSync(join(tmpdir(), "knitkit-tg-"));
    writeFileSync(
      join(dir, "knit.config.json"),
      JSON.stringify({ name: "checkout", shared: [], exposes: ["./Widget.ts"] }),
    );
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", version: "0.0.0" }));
    writeFileSync(
      join(dir, "Widget.ts"),
      "export interface WidgetProps { sku: string }\nexport default function Widget(p: WidgetProps): string { return p.sku }\n",
    );

    await buildCommand({ cwd: dir });
    const { generated } = await typesGenerateCommand({ cwd: dir });

    expect(generated.length).toBe(1);
    const dtsPath = join(dir, "dist", "types", "Widget.d.ts");
    expect(existsSync(dtsPath)).toBe(true);
    const dts = readFileSync(dtsPath, "utf8");
    expect(dts).toContain("WidgetProps");
    expect(dts).toContain("export default function Widget");

    const manifest = JSON.parse(readFileSync(join(dir, "dist", "knit.manifest.json"), "utf8"));
    expect(manifest.exposes["./Widget"].types).toBe("./types/Widget.d.ts");

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("knitkit types sync", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === "/checkout/knit.manifest.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(REMOTE_MANIFEST));
      } else if (req.url === "/checkout/types/CartWidget.d.ts") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(REMOTE_DTS);
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    if (addr && typeof addr === "object") baseUrl = `http://127.0.0.1:${addr.port}`;
  });
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("downloads remote .d.ts and generates a RemoteModules augmentation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "knitkit-ts-"));
    writeFileSync(
      join(dir, "knit.host.json"),
      JSON.stringify({
        remotes: [{ name: "checkout", manifest: `${baseUrl}/checkout/knit.manifest.json` }],
        typesDir: ".knitkit/types",
      }),
    );

    const { written, declaration, declarationPath } = await typesSyncCommand({ cwd: dir });

    expect(written.length).toBe(1);
    expect(existsSync(join(dir, ".knitkit", "types", "checkout", "CartWidget.d.ts"))).toBe(true);
    expect(declaration).toContain('import type R0 from "./checkout/CartWidget";');
    expect(declaration).toContain('"checkout/CartWidget": R0;');
    expect(declaration).toContain('declare module "@knitkit/runtime"');

    // Type-level proof: the generated augmentation must actually type loadRemote().
    const typesDir = join(dir, ".knitkit", "types");
    writeFileSync(
      join(typesDir, "consumer.ts"),
      [
        'import { loadRemote } from "@knitkit/runtime";',
        // No contextual type fed into the call: the result type comes purely from the
        // augmentation. Without it, `w` would be Promise<unknown> and the assignment fails.
        'const w = loadRemote("checkout/CartWidget");',
        "const typed: Promise<(props: { sku: string }) => string> = w;",
        // An unknown specifier falls back to the generic Promise<unknown> overload.
        'const u = loadRemote("not/registered");',
        "const fallback: Promise<unknown> = u;",
        "void typed; void fallback;",
      ].join("\n"),
    );

    const diagnostics = typecheck(
      [join(typesDir, "consumer.ts"), declarationPath],
      typesDir,
    );
    expect(diagnostics).toEqual([]);

    rmSync(dir, { recursive: true, force: true });
  });
});

/** Type-check the given files, resolving @knitkit/runtime to its built declarations. */
function typecheck(rootNames: string[], baseDir: string): string[] {
  const program = ts.createProgram(rootNames, {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    baseUrl: baseDir,
    paths: { "@knitkit/runtime": [runtimeDts] },
  });
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}
