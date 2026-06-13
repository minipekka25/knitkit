---
title: "Getting started"
description: "Install knitkit, build a remote, load it from a host, and type it."
---

knitkit is runtime-first module federation on native ES modules + import maps. There is no
bundler plugin to install — you ship a runtime, a manifest, and a small CLI.

## Quickest start

Scaffold a runnable host + remote (shared singleton, no build step) in one command:

```bash
npm create @knitkit my-app
cd my-app
npm run dev          # http://localhost:8080
```

Then read on to build your own remotes and load them from a host.

## Install

```bash
npm i @knitkit/runtime          # browser core
npm i -D @knitkit/cli           # build-time: shared assets, manifest, types
# optional, as needed:
npm i @knitkit/node             # Node SSR
npm i @knitkit/react            # <RemoteComponent>
npm i -D @knitkit/overrides     # local-override dev widget
```

> Published under the `@knitkit/*` npm scope. APIs are pre-1.0.

## Build a remote

A remote declares what it shares and exposes in `knit.config.json`:

```json
{ "name": "checkout", "shared": ["react", "react-dom"], "exposes": ["./CartWidget.tsx"] }
```

```bash
knitkit build               # emits dist/shared/*, dist/exposes/*, dist/knit.manifest.json (+ SRI)
knitkit types generate      # optional: emits dist/types/*.d.ts and records them in the manifest
```

Serve `dist/` from any static host. The manifest's relative URLs resolve against the
manifest's own URL.

> **Building the host with a bundler?** Mark your shared deps (and `@knitkit/runtime`) as
> `external` so the bundler keeps them as bare imports for the import map to resolve — one line
> per bundler. See [Use knitkit with your bundler](/bundler-recipes).

## Load remotes from a host

The one hard rule: **the import map must be injected before the first module import that
resolves through it.** Use a tiny module bootstrap at the top of your page:

```html
<script type="importmap">
  { "imports": { "@knitkit/runtime": "/runtime/index.js", "react": "https://esm.sh/react@18.3.1" } }
</script>
<script type="module">
  import { registerRemotes, loadRemote } from "@knitkit/runtime";

  await registerRemotes(
    [{ name: "checkout", manifest: "https://cdn.example.com/checkout/knit.manifest.json" }],
    { hostShared: { react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true, url: "https://esm.sh/react@18.3.1" } } },
  );

  // After the map is in place, dynamic-import the rest of your app.
  await import("/src/main.js");
</script>
```

Then load an exposed module anywhere:

```ts
const CartWidget = await loadRemote("checkout/CartWidget");
```

In React, use the wrapper instead:

```tsx
import { RemoteComponent } from "@knitkit/react";
<RemoteComponent name="checkout/CartWidget" fallback={<Spinner />} sku="ABC" />;
```

## Type your remotes

On the host, list remotes in `knit.host.json` and sync their types:

```json
{ "remotes": [{ "name": "checkout", "manifest": "https://cdn.example.com/checkout/knit.manifest.json" }], "typesDir": ".knitkit/types" }
```

```bash
knitkit types sync          # downloads remotes' .d.ts and augments @knitkit/runtime
```

Add `.knitkit/types` to your tsconfig `include`, and `loadRemote("checkout/CartWidget")` is
now fully typed.

## SSR (optional)

See [`@knitkit/node`](../packages/node/README.md) and the [`node-ssr`](../examples/node-ssr)
example: the same manifest drives the server via `module.register` loader hooks, with the
import map serialized into the HTML for hydration parity.

## Browser support

Dynamic import-map injection works in Chrome 89+, Firefox 108+, Safari 16.4+. The import map
`integrity` key (module SRI) is Chrome 127 / Firefox 138 / Safari 18.4. `es-module-shims` is
a documented fallback for older browsers, never the default. Re-verify these at ship time.
