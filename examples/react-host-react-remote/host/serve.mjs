// Static file server for the React host. Bundles main.jsx on boot (with react and the
// @fedkit/* packages marked external — the browser resolves them via the import map),
// serves the built @fedkit/runtime and @fedkit/react, and proxies /federation/* to the
// remote. No bundler plugins.
import { createServer, request as httpRequest } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(import.meta.url), "..");
const repoRoot = resolve(root, "..", "..", "..");
const port = Number(process.env.PORT ?? 5183);
const remotePort = Number(process.env.REMOTE_PORT ?? 5184);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function proxyToRemote(req, res, urlPath) {
  const proxyReq = httpRequest(
    `http://localhost:${remotePort}${urlPath}`,
    { method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", (e) => {
    res.writeHead(502);
    res.end(`proxy error: ${e.message}`);
  });
  req.pipe(proxyReq);
}

async function buildHostBundle() {
  const outDir = join(root, "dist-bundle");
  await mkdir(outDir, { recursive: true });
  await build({
    entryPoints: [join(root, "src", "main.jsx")],
    outdir: outDir,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    jsx: "automatic",
    loader: { ".js": "jsx", ".jsx": "jsx" },
    external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "@fedkit/runtime", "@fedkit/react"],
    define: { "process.env.NODE_ENV": '"production"' },
  });
}
await buildHostBundle();

async function serveFile(res, filePath) {
  const s = await stat(filePath).catch(() => null);
  if (!s || !s.isFile()) {
    res.writeHead(404);
    res.end("not found: " + filePath);
    return;
  }
  const data = await readFile(filePath);
  res.writeHead(200, { "Content-Type": mime[extname(filePath)] ?? "application/octet-stream" });
  res.end(data);
}

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";

    if (urlPath.startsWith("/federation/")) return proxyToRemote(req, res, urlPath.slice("/federation".length));
    if (urlPath.startsWith("/runtime/")) return serveFile(res, join(repoRoot, "packages", "runtime", "dist", urlPath.slice("/runtime/".length)));
    if (urlPath.startsWith("/react-pkg/")) return serveFile(res, join(repoRoot, "packages", "react", "dist", urlPath.slice("/react-pkg/".length)));
    if (urlPath.startsWith("/src/")) return serveFile(res, join(root, "dist-bundle", urlPath.slice("/src/".length)));

    const filePath = join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    return serveFile(res, filePath);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});

server.listen(port, () => console.log(`react host: http://localhost:${port}  (proxies /federation/* -> :${remotePort})`));
