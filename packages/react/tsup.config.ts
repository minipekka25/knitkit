import { defineConfig } from "tsup";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: "es2022",
  external: ["react", "react-dom"],
  // esbuild strips a "use client" banner during bundling, so prepend it after the build.
  // This package is a client wrapper (loadRemote + Suspense + hooks); the directive lets
  // RSC bundlers (Next.js App Router) treat an import of it as a client boundary.
  async onSuccess() {
    const file = join("dist", "index.js");
    const code = await readFile(file, "utf8");
    if (!code.startsWith('"use client"')) {
      await writeFile(file, `"use client";\n${code}`, "utf8");
    }
  },
});
