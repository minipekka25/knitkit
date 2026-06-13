---
title: "Roadmap"
description: "Honest status — what's shipped, what's next, and what we won't build."
---

Honest status. knitkit is pre-1.0, published under the `@knitkit/*` npm scope.

## Shipped

- **`@knitkit/runtime`** — `registerRemotes`, `loadRemote`, in-house semver negotiation
  (caret/tilde/x-ranges/comparators), import-map injection, manifest validation, coded errors,
  augmentable typing for `loadRemote`. < 5 KB, zero deps.
- **Manifest spec v0.1** — versioned in [`/spec`](../spec/manifest-0.1.md).
- **`@knitkit/cli`** — shared-deps emitter (esbuild), manifest generation, `sha384` SRI,
  `knitkit types generate` / `knitkit types sync`.
- **`@knitkit/node`** — SSR via `module.register` loader hooks, SRI verification, module cache,
  hydration-parity import-map serialization.
- **`@knitkit/react`** — `"use client"` `<RemoteComponent>` (lazy + Suspense + error boundary).
- **`@knitkit/overrides`** — local-override dev tool.
- **`@knitkit/edge`** — ESI-style HTML fragment stream-stitching + import-map injection for
  Cloudflare Workers / Deno Deploy / Vercel Edge (Web-standard `fetch` + Web Streams).
- **Tier-2 fragment composition** — `@knitkit/react`'s `<RemoteFragment>` (client boundary) and
  the [edge-composition example](../examples/edge-composition) (independent apps stitched at the
  edge). Isolated fragments, each its own framework — no shared React.
- **Examples** — React+Vue, React `<RemoteComponent>`, Node SSR, and edge composition, each with a smoke test.
- **Docs site** — published with Mintlify (`docs/docs.json`).
- **Release discipline** — changesets configured; `0.1.0` pending the GitHub repo + npm scope publish.

## Next

- **Next.js App Router story** — needs an honest resolution first. A true shared-React
  `<RemoteComponent>` inside Next is **not** zero-config: Next bundles its own React, so a
  federated remote's `import "react"` resolves to a CDN React via the import map → two React
  instances → "invalid hook call". Sharing requires a `next.config.js` externals change. An
  isolated, hooks-free remote widget can be embedded zero-config; the shared-React case is the
  open item. (See the [`react-host-react-remote`](../examples/react-host-react-remote) example
  notes — `<RemoteComponent>` works zero-config when the **host** owns the import map.)

## Later

- Runtime SRI enforcement for exposed modules in the browser (platform-limited — see
  [Security](./security.md)); manifest signing.
- Tier-3 (watch, don't build): module-level RSC/Flight federation — monitor `react-server-dom-esm`.
- A benchmark harness (cold-load + bytes shipped vs Module Federation).
- `--auto` shared-list proposer, if demanded.

## Won't build

Cross-remote HMR; module-level RSC/Flight federation; React Native; maintained Webpack/Rspack/
Vite plugins; automatic transitive sharing; patching framework internals. See
`project_brief.md` §6.
