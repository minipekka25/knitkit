// Dependency-free static server — no install needed, just `node serve.mjs`.
// Serves this folder: /, /src/*, /remote/*, /shared/*.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "..");
const port = Number(process.env.PORT ?? 8080);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = normalize(join(root, urlPath));
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
    res.writeHead(200, { "content-type": mime[extname(filePath)] ?? "application/octet-stream" });
    res.end(await readFile(filePath));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
}).listen(port, () => console.log(`knitkit app: http://localhost:${port}`));
