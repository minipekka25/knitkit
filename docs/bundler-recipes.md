---
title: "Use knitkit with your bundler"
description: "Mark shared deps external so your bundler keeps bare imports — the import map resolves them to one instance. One line per bundler."
---

knitkit has no bundler plugin. The only thing your bundler has to do is **stop inlining the
dependencies you share** and leave them as bare `import` specifiers in its ESM output. The
import map injected by `registerRemotes()` then resolves those specifiers — `react`,
`@knitkit/runtime`, your shared state module — to a single URL, which the browser loads once.
That single-URL-per-package is the whole singleton guarantee.

## Why externalize

A bundler's job is to inline your imports. If you don't tell it otherwise, this:

```ts
import React from "react";
```

gets compiled into a private copy of React baked into your host's bundle — and the remote you
load at runtime brings its *own* React from the import map. Two Reacts, two `useState`
identities, the "Invalid hook call… more than one copy of React" footgun knitkit exists to
kill. **Marking `react` external** keeps the line as a bare `import "react"` in the output, so
both the host and every remote resolve it through the one import-map entry.

So the rule is one line: *externalize every package you list in `shared`*, plus
`@knitkit/runtime` itself. Two non-negotiable constraints come with it:

1. **Output must be ESM.** Import maps only resolve ES module imports. Set your output format
   to `es` / `"module"`. No IIFE, no UMD, no CommonJS.
2. **The import map must be injected before the entry runs.** Keep the
   [bootstrap pattern](/getting-started#load-remotes-from-a-host): a tiny inline
   `<script type="module">` that `await`s `registerRemotes()` and *then* dynamic-`import()`s
   your bundled entry. Don't load the entry with a plain `<script src>` — it would execute
   before the map exists.

## Vite

`vite build` uses Rollup under the hood, so you externalize through `rollupOptions`. Output is
ESM by default.

```ts
// vite.config.ts
import { defineConfig } from "vite";

const shared = ["react", "react-dom", "react-dom/client", "@knitkit/runtime"];

export default defineConfig({
  build: {
    rollupOptions: {
      external: shared, // keep these as bare imports; the import map resolves them
    },
  },
});
```

> **Dev server.** `vite dev` pre-bundles bare imports and serves them from `/node_modules/.vite`,
> which bypasses your import map. For an import-map-faithful dev experience, either preview the
> production build (`vite build && vite preview`) or add the shared packages to
> [`optimizeDeps.exclude`](https://vite.dev/config/dep-optimization-options) and provide the
> import map in your `index.html` so dev resolves the same URLs as prod.

## webpack 5

Use [`externalsType: "module"`](https://webpack.js.org/configuration/externals/#externalstype)
so externals are emitted as ESM imports, mark the output as a module, and list the shared
packages in `externals`.

```js
// webpack.config.js
module.exports = {
  experiments: { outputModule: true },
  output: { module: true, library: { type: "module" } },
  externalsType: "module",
  externals: {
    react: "react",
    "react-dom": "react-dom",
    "react-dom/client": "react-dom/client",
    "@knitkit/runtime": "@knitkit/runtime",
  },
};
```

This is the one case where it's more than literally one line — webpack needs `outputModule`
turned on before it will emit `import` statements for externals. Without it, `externals`
fall back to `require()` and the import map never sees them.

## Rollup

```js
// rollup.config.js
export default {
  input: "src/main.js",
  output: { format: "es" }, // ESM is required
  external: ["react", "react-dom", "react-dom/client", "@knitkit/runtime"],
};
```

`external` accepts a function too, if you'd rather externalize by predicate (e.g. "anything I
declared in `shared`"):

```js
const shared = new Set(["react", "react-dom", "@knitkit/runtime"]);
export default {
  /* … */
  external: (id) => shared.has(id) || id.startsWith("react-dom/"),
};
```

## esbuild

```js
// build.mjs
import { build } from "esbuild";

await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "esm", // required
  external: ["react", "react-dom", "react-dom/client", "@knitkit/runtime"],
  outfile: "dist/main.js",
});
```

Or from the CLI:

```bash
esbuild src/main.js --bundle --format=esm \
  --external:react --external:react-dom --external:@knitkit/runtime \
  --outfile=dist/main.js
```

## Verify you got it right

There is one definitive check, and it takes ten seconds:

1. Build and serve the host, open it, and open **DevTools → Network**, filter by `react`.
2. You should see **exactly one** request for React — the URL from your import map (e.g.
   `esm.sh/react@18.3.1`), shared by the host and every remote.
3. If you also see React's code *inside* your `main.js` bundle (search the response for
   `useState` / `react.production.min`), externalization didn't take — recheck the package name
   matches the import specifier exactly (`react-dom/client` is a different specifier from
   `react-dom`).

A second confirmation: a shared singleton holds its identity across the boundary. The
[`react-host-react-remote`](https://github.com/minipekka25/knitkit/tree/main/examples/react-host-react-remote)
example asserts exactly this in a Playwright smoke test.

## Common pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Invalid hook call… more than one copy of React" | `react` got inlined into the host bundle | Add `react` **and** `react-dom` to `external`. |
| Bare import 404s at runtime (`Failed to resolve module specifier "react"`) | The import map is missing that key, or the entry ran before the map was injected | Add the key to the map; keep the [bootstrap](/getting-started#load-remotes-from-a-host) (`await registerRemotes()` → dynamic `import()`). |
| Externals emitted as `require(...)` | Output isn't ESM (webpack without `outputModule`, or a UMD/CJS format) | Force ESM output (`format: "es"`, webpack `experiments.outputModule`). |
| Subpath like `react-dom/client` still bundled | You externalized `react-dom` but not the subpath | List subpaths explicitly, or externalize by prefix (`id.startsWith("react-dom/")`). |
| Two versions still load | Host and remote pin different exact URLs | Let negotiation pick one: pass the host's contribution via `hostShared` so it competes in the same negotiation as the remotes. |

## What you do **not** do

No `knitkit` plugin in your bundler config. No `ModuleFederationPlugin`, no
`vite-plugin-federation`, no shared-scope declaration block. The shared surface lives in your
manifest and your import map — both plain, inspectable artifacts — not in bundler internals.
</content>
</invoke>
