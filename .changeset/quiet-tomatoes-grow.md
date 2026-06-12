---
"@fedkit/runtime": minor
"@fedkit/cli": minor
"@fedkit/node": minor
"@fedkit/react": minor
"@fedkit/overrides": minor
---

Initial `0.1.0` preview of runtime-first, bundler-agnostic module federation:

- **`@fedkit/runtime`** — browser core: `registerRemotes`, `loadRemote`, semver negotiation, import-map injection, coded errors. < 5 KB, zero deps.
- **`@fedkit/cli`** — emits shared ESM assets from `node_modules` + manifest + SRI hashes; `types generate`/`types sync` so `loadRemote()` is fully typed.
- **`@fedkit/node`** — SSR via `module.register` loader hooks with SRI verification, a module cache, and hydration-parity import-map serialization.
- **`@fedkit/react`** — `"use client"` `<RemoteComponent>` (lazy + Suspense + error boundary) over `loadRemote`.
- **`@fedkit/overrides`** — local-override dev tool: point a remote at `localhost` against deployed others (localStorage + a tiny UI widget).
