// Bytes-shipped benchmark: how much JavaScript does a host download just to DO federation?
//
// We measure each @fedkit package's published bundle, production-minified (esbuild) and then
// gzip + brotli compressed — the bytes that actually cross the wire. Shared deps (react, …)
// are NOT counted: an app ships those whether or not it federates, so they aren't federation
// overhead. The headline number is "federation overhead" = the runtime a host must load.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  ["@fedkit/runtime", "packages/runtime/dist/index.js"],
  ["@fedkit/react", "packages/react/dist/index.js"],
  ["@fedkit/overrides", "packages/overrides/dist/index.js"],
  ["@fedkit/node", "packages/node/dist/index.js"],
  ["@fedkit/edge", "packages/edge/dist/index.js"],
];

async function measure(file) {
  const src = readFileSync(file, "utf8");
  const { code } = await transform(src, { minify: true, format: "esm", target: "es2022" });
  const buf = Buffer.from(code, "utf8");
  return {
    minified: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
}

const results = {};
for (const [name, rel] of TARGETS) {
  const file = join(root, rel);
  if (!existsSync(file)) {
    console.warn(`skip ${name} — not built (${rel}). Run its build first.`);
    continue;
  }
  results[name] = await measure(file);
}

// Federation overhead a browser host actually ships:
//   - minimum: just @fedkit/runtime (registerRemotes + loadRemote)
//   - with the React wrapper: + @fedkit/react
const overhead = {
  "runtime only": results["@fedkit/runtime"]?.brotli ?? null,
  "runtime + react": results["@fedkit/runtime"] && results["@fedkit/react"]
    ? results["@fedkit/runtime"].brotli + results["@fedkit/react"].brotli
    : null,
};

function fmt(n) {
  return n == null ? "—" : (n / 1024).toFixed(2) + " KB";
}

console.log("\nfedkit — bytes shipped (production minified)\n");
console.log("package".padEnd(20), "min".padStart(10), "gzip".padStart(10), "brotli".padStart(10));
console.log("-".repeat(52));
for (const [name, s] of Object.entries(results)) {
  console.log(name.padEnd(20), fmt(s.minified).padStart(10), fmt(s.gzip).padStart(10), fmt(s.brotli).padStart(10));
}
console.log("\nFederation overhead (brotli, what a host loads to federate):");
console.log("  runtime only   :", fmt(overhead["runtime only"]));
console.log("  runtime + react:", fmt(overhead["runtime + react"]));
console.log("\nNote: shared deps (react, etc.) are NOT counted — apps ship those regardless.");

const outDir = join(root, "benchmarks", "results");
mkdirSync(outDir, { recursive: true });
const out = { measuredAt: new Date().toISOString(), packages: results, federationOverheadBytes: overhead };
writeFileSync(join(outDir, "bytes.json"), JSON.stringify(out, null, 2) + "\n");
console.log("\nwrote benchmarks/results/bytes.json");
