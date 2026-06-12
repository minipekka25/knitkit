// SSR renderer for a federated React component.
//
// The loader hooks (installed by registerFederation) resolve the remote's `react` to the
// SAME local React that react-dom/server uses, so a single React renders the whole tree —
// the SSR singleton. The negotiated import map is serialized into the HTML so the browser
// hydrates with the same React version (no dual-React, no hydration mismatch).
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { registerFederation, serializeImportMap } from "@fedkit/node";

const require = createRequire(import.meta.url);
const reactFile = pathToFileURL(require.resolve("react")).href;

export async function setupRenderer(remoteBase) {
  const manifestUrl = `${remoteBase}/fed.manifest.json`;
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error(`Failed to fetch manifest ${manifestUrl}: HTTP ${res.status}`);
  const manifest = await res.json();
  const baseUrl = res.url;
  const decl = manifest.exposes["./Greeting"];
  const remoteUrl = new URL(decl.url, baseUrl).href;

  // Server import map for the hooks: `react` -> local React (shared with react-dom/server),
  // and the remote module is SRI-pinned (tampered code is refused before execution).
  registerFederation({
    imports: { react: reactFile, "widgets/Greeting": remoteUrl },
    integrity: decl.integrity ? { "widgets/Greeting": decl.integrity } : undefined,
  });

  const Greeting = (await import("widgets/Greeting")).default;

  // Client import map (browser URLs, same React version) for hydration parity.
  const head = serializeImportMap({
    imports: {
      react: "https://esm.sh/react@18.3.1",
      "react-dom": "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "widgets/Greeting": remoteUrl,
    },
  });

  function renderHtml(props = { name: "world" }) {
    const appHtml = renderToString(createElement(Greeting, props));
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>fedkit — SSR of a federated React component</title>
${head}
</head>
<body>
<h1>fedkit — SSR of a federated React component</h1>
<div id="root">${appHtml}</div>
<script type="module">
  import { hydrateRoot } from "react-dom/client";
  import { createElement } from "react";
  const Greeting = (await import("widgets/Greeting")).default;
  hydrateRoot(document.getElementById("root"), createElement(Greeting, ${JSON.stringify(props)}));
</script>
</body>
</html>
`;
  }

  return { renderHtml };
}

/** One-shot render (used by the smoke test and the CLI form). */
export async function renderPage(remoteBase, props) {
  const { renderHtml } = await setupRenderer(remoteBase);
  return renderHtml(props);
}

// `node render.mjs` -> render one page. Writes to FEDKIT_SSR_OUT (a file) if set, else
// stdout. We force-exit because module.register keeps a loader thread alive; on Windows
// that exit can trip a libuv teardown assertion AFTER the output is flushed, so callers
// should read the output file rather than rely on the exit code.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outFile = process.env.FEDKIT_SSR_OUT;
  renderPage(process.env.REMOTE_BASE ?? "http://localhost:5194").then(
    async (html) => {
      if (outFile) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(outFile, html, "utf8");
      } else {
        process.stdout.write(html);
      }
      process.exit(0);
    },
    (e) => {
      process.stderr.write("RENDER_ERROR:" + (e?.stack || e) + "\n");
      process.exit(1);
    },
  );
}
