# my knitkit app

A runnable [knitkit](https://github.com/minipekka25/knitkit) starter — a host that loads a
remote **at runtime** behind its own manifest, sharing one module instance across the boundary.
No bundler plugin, no build step.

## Run it

```bash
npm run dev      # http://localhost:8080
```

Open the page, then open **DevTools → Network**: you'll see the import map resolve
`@knitkit/runtime` (from a CDN) and the remote `widget.js` load. Click either **+1** button —
the host and the remote count move together because they share *one* `shared-store` instance
(one import-map entry → one instance). That's the singleton, by construction.

## What's here

```
index.html              the host page: one import map + a bootstrap that
                        registerRemotes() then imports the app
src/main.js             the host app: loadRemote("widgets/Widget") + shared UI
remote/widget.js        the exposed remote module (mount(el)); imports shared-store
remote/knit.manifest.json   the remote's manifest (exposes ./Widget)
shared/store.js         the shared singleton both sides import
serve.mjs               a dependency-free static server
```

## Where to go next

- Swap the vanilla widget for **React** or **Vue** — the remote just needs to export a
  `mount(el)` (or use [`@knitkit/react`](https://www.npmjs.com/package/@knitkit/react)'s
  `<RemoteComponent>`).
- Generate real manifests + SRI hashes from your `node_modules` with
  [`@knitkit/cli`](https://www.npmjs.com/package/@knitkit/cli) (`npm i -D @knitkit/cli`,
  then `knitkit build`).
- Building the host with a bundler? See
  [Use knitkit with your bundler](https://knitkit.mintlify.app/bundler-recipes).

Docs: **https://knitkit.mintlify.app**
