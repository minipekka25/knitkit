// Static file server for the host dev experience. No bundler plugins.
// Proxies /federation/* to the remote so the host can load the remote's
// manifest and exposed modules.
import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { readFile, stat, mkdir, copyFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(import.meta.url), "..");
const port = Number(process.env.PORT ?? 5173);
const remotePort = Number(process.env.REMOTE_PORT ?? 5174);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function proxyToRemote(req, res, urlPath) {
  const target = `http://localhost:${remotePort}${urlPath}`;
  const proxyReq = httpRequest(target, { method: req.method, headers: req.headers }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (e) => {
    res.writeHead(502);
    res.end(`proxy error: ${e.message}`);
  });
  req.pipe(proxyReq);
}

// Bundle the host's main.jsx on boot so the browser can import the @fedkit/runtime
// from the local node_modules. In a real demo this would be a one-line dev pipeline
// (esbuild --watch); for the demo we do a one-shot build.
async function buildHostBundle() {
  const outDir = join(root, "dist-bundle");
  await mkdir(outDir, { recursive: true });
  // Also emit shared-state.js so the host can serve it under /shared/.
  await copyFile(join(root, "src", "shared-state.js"), join(outDir, "shared-state.js"));
  await build({
    entryPoints: [join(root, "src", "main.jsx")],
    outdir: outDir,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: false,
    sourcemap: false,
    jsx: "automatic",
    loader: { ".js": "jsx", ".jsx": "jsx" },
    // Mark import-map-managed bare specifiers as external so esbuild doesn't try to
    // resolve them from node_modules. The browser will resolve them via the import map.
    external: ["react", "react-dom", "react-dom/client", "@fedkit/runtime", "shared-state"],
    define: { "process.env.NODE_ENV": '"production"' },
  });
}
await buildHostBundle();

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";

    if (urlPath.startsWith("/federation/")) {
      return proxyToRemote(req, res, urlPath.slice("/federation".length));
    }

    if (urlPath.startsWith("/shared/")) {
      const filePath = join(root, "dist-bundle", urlPath.slice("/shared/".length));
      const s = await stat(filePath).catch(() => null);
      if (!s || !s.isFile()) {
        res.writeHead(404);
        res.end("not found: " + urlPath);
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": mime[extname(filePath)] ?? "application/octet-stream" });
      res.end(data);
      return;
    }

    if (urlPath.startsWith("/runtime/")) {
      // host -> react-host-vue-remote -> examples -> mf-agno
      const filePath = join(root, "..", "..", "..", "packages", "runtime", "dist", urlPath.slice("/runtime/".length));
      const s = await stat(filePath).catch((e) => e);
      if (!s || (s && !(s.isFile && s.isFile()))) {
        res.writeHead(404);
        res.end("not found: " + urlPath + " (resolved: " + filePath + ", err: " + (s?.message ?? "none") + ")");
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": mime[extname(filePath)] ?? "application/octet-stream" });
      res.end(data);
      return;
    }

    if (urlPath.startsWith("/src/")) {
      const filePath = join(root, "dist-bundle", urlPath.slice("/src/".length));
      const s = await stat(filePath).catch(() => null);
      if (!s || !s.isFile()) {
        res.writeHead(404);
        res.end("not found: " + urlPath);
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": mime[extname(filePath)] ?? "application/octet-stream" });
      res.end(data);
      return;
    }

    const filePath = join(root, urlPath);
    if (!filePath.startsWith(root)) {
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
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});

server.listen(port, () => {
  console.log(`host: http://localhost:${port}  (proxies /federation/* -> :${remotePort})`);
});
