// Remote server for the SSR demo. Bundles the exposed Greeting component (react external),
// computes its SRI hash, and serves it + a manifest. Same artifact the browser would use.
import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(import.meta.url), "..");
const port = Number(process.env.PORT ?? 5194);
const distDir = join(root, "dist");

const mime = { ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };

async function buildOnce() {
  await mkdir(join(distDir, "exposes"), { recursive: true });
  const result = await build({
    entryPoints: [join(root, "src", "Greeting.jsx")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: ["es2022"],
    jsx: "automatic",
    loader: { ".js": "jsx", ".jsx": "jsx" },
    write: false,
    legalComments: "none",
    external: ["react", "react-dom", "react/jsx-runtime"],
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const source = result.outputFiles[0].text;
  await writeFile(join(distDir, "exposes", "Greeting.js"), source, "utf8");
  const integrity = "sha384-" + createHash("sha384").update(source).digest("base64");

  const manifest = {
    spec: "0.1",
    name: "widgets",
    exposes: { "./Greeting": { url: "./exposes/Greeting.js", integrity } },
    shared: {
      react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true, url: "https://esm.sh/react@18.3.1" },
    },
    meta: { buildTime: new Date().toISOString(), framework: "react@18" },
  };
  await writeFile(join(distDir, "knit.manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
await buildOnce();

const server = createServer(async (req, res) => {
  let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/knit.manifest.json";
  const filePath = join(distDir, urlPath);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  const s = await stat(filePath).catch(() => null);
  if (!s || !s.isFile()) {
    res.writeHead(404);
    res.end("not found: " + urlPath);
    return;
  }
  res.writeHead(200, {
    "Content-Type": mime[extname(filePath)] ?? "application/octet-stream",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(await readFile(filePath));
});

server.listen(port, () => console.log(`ssr remote: http://localhost:${port}`));
