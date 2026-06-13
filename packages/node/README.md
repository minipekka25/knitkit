# `@knitkit/node`

Node SSR for **knitkit** — the same module federation that runs in the browser, on the server, driven by the same manifest and the same negotiation.

It installs Node `module.register` loader hooks that:

- **resolve** bare specifiers through the negotiated import map (one React, shared with the browser),
- **fetch** remote exposed modules over HTTP and execute them as ESM,
- **verify SRI** before execution — a tampered remote asset is refused with a coded error,
- **cache** fetched modules in-memory to offset the documented loader-hook overhead.

## Usage

```ts
// server entry — run negotiation once, register hooks, render.
import { negotiateShared, registerFederation, serializeImportMap } from "@knitkit/node";

const result = negotiateShared(
  [{ name: "checkout", manifest, baseUrl: "https://cdn.example.com/checkout/" }],
  { react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true, url: "https://cdn.example.com/shared/react-18.3.1.js" } },
);

// 1) Install loader hooks so server-side import() resolves shared + remote modules.
registerFederation(result.importMap);

// 2) Render, then emit the SAME import map into the HTML so the client resolves identically
//    (no dual-React, no hydration mismatch).
const html = `<!doctype html><html><head>${serializeImportMap(result.importMap)}</head>...`;
```

### `--import` workflow

For frameworks that own the entry, register via a flag and pass the map through the environment:

```bash
FEDKIT_IMPORT_MAP_JSON='{"imports":{"react":"https://cdn/react-18.3.1.js"}}' \
  node --import @knitkit/node/register server.js
# or: FEDKIT_IMPORT_MAP=/path/to/importmap.json node --import @knitkit/node/register server.js
```

## API

| Export | Purpose |
| --- | --- |
| `registerFederation(importMap, opts?)` | Install the loader hooks for this process. Call before importing anything that uses the map. |
| `serializeImportMap(map)` / `serializeImportMapJson(map)` | Emit a `<script type="importmap">` (script-injection-safe) for hydration parity. |
| `negotiateShared(...)` | Re-exported from `@knitkit/runtime` — negotiate with the same function the browser uses. |
| `computeIntegrity(content, alg?)` / `verifyIntegrity(content, integrity)` | SRI helpers (sha256/384/512). |
| `ModuleCache` | The in-memory module cache (exposed for advanced control). |

## Notes & constraints

- Loader hooks run in a worker thread with documented ~4×/~400ms overhead for a no-op — that's why fetched modules are cached. Disk caching is a future option.
- SRI is enforced when a shared/remote entry carries an `integrity` value; entries without one load unverified (pin your remotes — see the security guide).
- This is the Weeks 2–4 SSR foundation. A streaming-SSR example and `@knitkit/react` `<RemoteComponent>` build on it.
