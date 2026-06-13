# knitkit — live StackBlitz demo

A zero-build, runnable demo of knitkit's core: a host `registerRemotes` + `loadRemote`s a
remote module behind its own manifest, and shares one module instance across the boundary —
all in the browser, with **the published `@knitkit/runtime` loaded from a CDN**.

**▶ Open it:** https://stackblitz.com/github/minipekka25/knitkit/tree/main/examples/stackblitz

Or locally:

```bash
cd examples/stackblitz
npm run dev      # http://localhost:8080  (no dependencies, no build)
```

## What it shows

- **Runtime federation, no bundler plugin** — `loadRemote("widgets/Widget")` fetches the remote
  module from `remote/knit.manifest.json` and mounts it.
- **Singleton by construction** — the host and the remote both import `shared-store` through one
  import-map entry, so they share *one* instance. Click either "+1" button and both counts move.
- **Debuggability** — open DevTools → Network and you'll see the import map and the remote
  module load; nothing is hidden inside a bundler.

It's intentionally framework-agnostic (the remote exposes a `mount(el)` function) so it runs
anywhere with zero setup. For React/Vue/SSR/edge variants, see the other `examples/`.
