// Static file server for the React remote. On boot it bundles the exposed Counter
// component (with `react`/`react/jsx-runtime` marked external so the host's import map
// supplies the shared React) and writes the manifest. No bundler plugins.
import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(import.meta.url), "..");
const port = Number(process.env.PORT ?? 5184);
const distDir = join(root, "dist");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

async function buildOnce() {
  await mkdir(join(distDir, "exposes"), { recursive: true });
  const result = await build({
    entryPoints: [join(root, "src", "Counter.jsx")],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    jsx: "automatic",
    loader: { ".js": "jsx", ".jsx": "jsx" },
    write: false,
    legalComments: "none",
    // Resolved via the host page's import map → the SAME React instance as the host.
    external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    define: { "process.env.NODE_ENV": '"production"' },
  });
  await writeFile(join(distDir, "exposes", "Counter.js"), result.outputFiles[0].text, "utf8");

  const manifest = {
    spec: "0.1",
    name: "widgets",
    exposes: { "./Counter": { url: "./exposes/Counter.js" } },
    shared: {
      react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true, url: "https://esm.sh/react@18.3.1" },
      "react-dom": { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true, url: "https://esm.sh/react-dom@18.3.1" },
    },
    meta: { buildTime: new Date().toISOString(), framework: "react@18" },
  };
  await writeFile(join(distDir, "fed.manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
await buildOnce();

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/fed.manifest.json";
    const filePath = join(distDir, urlPath);
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const s = await stat(filePath).catch(() => null);
    if (!s || !s.isFile()) {
      res.writeHead(404);
      res.end("not found in remote: " + urlPath);
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mime[extname(filePath)] ?? "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});

server.listen(port, () => console.log(`react remote: http://localhost:${port}`));
