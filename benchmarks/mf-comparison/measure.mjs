// Honest, classification-free federation-overhead comparison via the DELTA method.
//
// We build the SAME React app twice with the SAME bundler (rspack): once with Module
// Federation (host/) and once without (baseline/). The difference in total shipped JS is the
// federation machinery MF adds to a host — independent of how either build chunks React.
// We compare that to knitkit's federation overhead, which is just @knitkit/runtime (the host
// also ships a one-line import map; React is shared in both worlds and excluded from both).
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const brotli = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const gzip = (b) => gzipSync(b, { level: 9 }).length;
const k = (n) => (n / 1024).toFixed(2) + " KB";

function totalJs(dir) {
  if (!existsSync(dir)) throw new Error(`missing ${dir} — run \`npm run build\` first`);
  let raw = 0, br = 0;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const b = readFileSync(join(dir, f));
    raw += b.length;
    br += brotli(b);
  }
  return { raw, brotli: br };
}

const fed = totalJs(join(here, "host", "dist"));
const base = totalJs(join(here, "baseline", "dist"));
const mfOverhead = { raw: fed.raw - base.raw, brotli: fed.brotli - base.brotli };

// knitkit federation overhead = the runtime bundle the host loads (React shared, excluded).
const knitkitDist = join(repoRoot, "packages", "runtime", "dist", "index.js");
let knitkit = null;
if (existsSync(knitkitDist)) {
  const b = readFileSync(knitkitDist);
  knitkit = { raw: b.length, gzip: gzip(b), brotli: brotli(b) };
}

console.log("\nFederation overhead — extra JS a host ships to federate (React shared/excluded)\n");
console.log("approach".padEnd(34), "raw".padStart(11), "brotli".padStart(11));
console.log("-".repeat(58));
console.log("Module Federation 2.0 (delta)".padEnd(34), k(mfOverhead.raw).padStart(11), k(mfOverhead.brotli).padStart(11));
if (knitkit) console.log("knitkit (@knitkit/runtime)".padEnd(34), k(knitkit.raw).padStart(11), k(knitkit.brotli).padStart(11));
console.log("\ncontext (full host bundle, incl. shared React):");
console.log("  MF federated host :", k(fed.brotli), "brotli");
console.log("  MF baseline (no MF):", k(base.brotli), "brotli");
if (knitkit && knitkit.brotli) {
  console.log(`\nMF adds ~${(mfOverhead.brotli / knitkit.brotli).toFixed(1)}x more federation overhead than knitkit (brotli).`);
}
console.log("\nMethod: delta = federated_host_total − identical_non_federated_total. Reproducible:");
console.log("  npm install && npm run build && npm run measure   (in benchmarks/mf-comparison)");

const outDir = join(repoRoot, "benchmarks", "results");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "mf-comparison.json"),
  JSON.stringify({ measuredAt: new Date().toISOString(), method: "delta", mf: { federatedHost: fed, baseline: base, overhead: mfOverhead }, knitkit }, null, 2) + "\n",
);
console.log("\nwrote benchmarks/results/mf-comparison.json");
