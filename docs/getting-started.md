---
title: "Getting started"
description: "Install fedkit, build a remote, load it from a host, and type it."
---

fedkit is runtime-first module federation on native ES modules + import maps. There is no
bundler plugin to install — you ship a runtime, a manifest, and a small CLI.

## Install

```bash
npm i @fedkit/runtime          # browser core
npm i -D @fedkit/cli           # build-time: shared assets, manifest, types
# optional, as needed:
npm i @fedkit/node             # Node SSR
npm i @fedkit/react            # <RemoteComponent>
npm i -D @fedkit/overrides     # local-override dev widget
```

> The package scope `@fedkit/*` is a placeholder until the project is named
> (`project_brief.md` §10). APIs are pre-1.0.

## Build a remote

A remote declares what it shares and exposes in `fed.config.json`:

```json
{ "name": "checkout", "shared": ["react", "react-dom"], "exposes": ["./CartWidget.tsx"] }
```

```bash
fedkit build               # emits dist/shared/*, dist/exposes/*, dist/fed.manifest.json (+ SRI)
fedkit types generate      # optional: emits dist/types/*.d.ts and records them in the manifest
```

Serve `dist/` from any static host. The manifest's relative URLs resolve against the
manifest's own URL.

## Load remotes from a host

The one hard rule: **the import map must be injected before the first module import that
resolves through it.** Use a tiny module bootstrap at the top of your page:

```html
<script type="importmap">
  { "imports": { "@fedkit/runtime": "/runtime/index.js", "react": "https://esm.sh/react@18.3.1" } }
</script>
<script type="module">
  import { registerRemotes, loadRemote } from "@fedkit/runtime";

  await registerRemotes(
    [{ name: "checkout", manifest: "https://cdn.example.com/checkout/fed.manifest.json" }],
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
import { RemoteComponent } from "@fedkit/react";
<RemoteComponent name="checkout/CartWidget" fallback={<Spinner />} sku="ABC" />;
```

## Type your remotes

On the host, list remotes in `fed.host.json` and sync their types:

```json
{ "remotes": [{ "name": "checkout", "manifest": "https://cdn.example.com/checkout/fed.manifest.json" }], "typesDir": ".fedkit/types" }
```

```bash
fedkit types sync          # downloads remotes' .d.ts and augments @fedkit/runtime
```

Add `.fedkit/types` to your tsconfig `include`, and `loadRemote("checkout/CartWidget")` is
now fully typed.

## SSR (optional)

See [`@fedkit/node`](../packages/node/README.md) and the [`node-ssr`](../examples/node-ssr)
example: the same manifest drives the server via `module.register` loader hooks, with the
import map serialized into the HTML for hydration parity.

## Browser support

Dynamic import-map injection works in Chrome 89+, Firefox 108+, Safari 16.4+. The import map
`integrity` key (module SRI) is Chrome 127 / Firefox 138 / Safari 18.4. `es-module-shims` is
a documented fallback for older browsers, never the default. Re-verify these at ship time.
