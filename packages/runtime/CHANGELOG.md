# @knitkit/runtime

## 0.1.0

### Minor Changes

- 458f4f4: Initial `0.1.0` preview of runtime-first, bundler-agnostic module federation:

  - **`@knitkit/runtime`** — browser core: `registerRemotes`, `loadRemote`, semver negotiation, import-map injection, coded errors. < 5 KB, zero deps.
  - **`@knitkit/cli`** — emits shared ESM assets from `node_modules` + manifest + SRI hashes; `types generate`/`types sync` so `loadRemote()` is fully typed.
  - **`@knitkit/node`** — SSR via `module.register` loader hooks with SRI verification, a module cache, and hydration-parity import-map serialization.
  - **`@knitkit/react`** — `"use client"` `<RemoteComponent>` (lazy + Suspense + error boundary) over `loadRemote`.
  - **`@knitkit/overrides`** — local-override dev tool: point a remote at `localhost` against deployed others (localStorage + a tiny UI widget).
  - **`@knitkit/edge`** — ESI-style edge composition: stream-stitch remote HTML fragments and inject the negotiated import map, on Cloudflare Workers / Deno Deploy / Vercel Edge.
