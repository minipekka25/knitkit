import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/hooks.ts", "src/register.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: "es2022",
  platform: "node",
  splitting: false,
});
