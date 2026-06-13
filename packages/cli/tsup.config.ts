import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: "es2022",
  banner: { js: "#!/usr/bin/env node" },
  // typescript is an optional peer (only needed for `knitkit types generate`) — never bundle it.
  external: ["esbuild", "typescript", "@knitkit/runtime"],
  splitting: false,
});
