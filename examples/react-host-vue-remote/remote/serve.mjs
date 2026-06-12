// Static file server for the remote. Runs `fedkit build` on boot to produce
// `dist/exposes/CartWidget.js` and `dist/fed.manifest.json`, then serves them.
// The remote's exposed module imports `vue` (resolved at build time) and
// `shared-state` (a bare specifier mapped by the host's import map to a URL
// the host also serves — guaranteeing one instance).

import { createServer } from "node:http";
import { readFile, stat, mkdir, copyFile, writeFile } from "node:fs/promises";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(import.meta.url), "..");
const port = Number(process.env.PORT ?? 5174);
const distDir = join(root, "dist");

// On boot: bundle the exposed component (resolving `vue` from node_modules)
// and copy a shared-state.js alongside. The manifest is hand-written here
// (a future fedkit build command will do this; for the demo we keep it inline).
async function buildOnce() {
  await mkdir(join(distDir, "exposes"), { recursive: true });
  await mkdir(join(distDir, "shared"), { recursive: true });

  // Copy shared-state from the host (the "one file served to both apps" arrangement).
  await copyFile(
    resolve(root, "..", "host", "src", "shared-state.js"),
    join(distDir, "shared", "shared-state.js"),
  );

  // Bundle the Vue component so the artifact is self-contained except for
  // import-map-managed bare specifiers (vue, shared-state), which the host's
  // import map will resolve at runtime.
  const result = await build({
    entryPoints: [join(root, "src", "CartWidget.vue.js")],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: false,
    sourcemap: false,
    write: false,
    metafile: false,
    legalComments: "none",
    external: ["vue", "shared-state"],
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const code = result.outputFiles[0].text;
  await writeFile(join(distDir, "exposes", "CartWidget.js"), code, "utf8");

  // Hand-rolled manifest (real fedkit build will replace this in a follow-up).
  const manifest = {
    spec: "0.1",
    name: "checkout",
    exposes: {
      "./CartWidget": {
        url: "./exposes/CartWidget.js",
      },
    },
    shared: {
      react: {
        version: "18.3.1",
        requiredVersion: "^18.0.0",
        singleton: true,
        url: "https://esm.sh/react@18.3.1",
      },
      "react-dom": {
        version: "18.3.1",
        requiredVersion: "^18.0.0",
        singleton: true,
        url: "https://esm.sh/react-dom@18.3.1",
      },
    },
    meta: {
      buildTime: new Date().toISOString(),
      framework: "vue@3",
    },
  };
  await writeFile(join(distDir, "fed.manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

await buildOnce();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

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

server.listen(port, () => {
  console.log(`remote: http://localhost:${port}`);
});
