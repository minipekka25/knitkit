# Roadmap

Honest status. fedkit is pre-1.0; the `@fedkit/*` scope is a placeholder until the project is
named (`project_brief.md` §10).

## Shipped

- **`@fedkit/runtime`** — `registerRemotes`, `loadRemote`, in-house semver negotiation
  (caret/tilde/x-ranges/comparators), import-map injection, manifest validation, coded errors,
  augmentable typing for `loadRemote`. < 5 KB, zero deps.
- **Manifest spec v0.1** — versioned in [`/spec`](../spec/manifest-0.1.md).
- **`@fedkit/cli`** — shared-deps emitter (esbuild), manifest generation, `sha384` SRI,
  `fedkit types generate` / `fedkit types sync`.
- **`@fedkit/node`** — SSR via `module.register` loader hooks, SRI verification, module cache,
  hydration-parity import-map serialization.
- **`@fedkit/react`** — `"use client"` `<RemoteComponent>` (lazy + Suspense + error boundary).
- **`@fedkit/overrides`** — local-override dev tool.
- **`@fedkit/edge`** — ESI-style HTML fragment stream-stitching + import-map injection for
  Cloudflare Workers / Deno Deploy / Vercel Edge (Web-standard `fetch` + Web Streams).
- **Tier-2 fragment composition** — `@fedkit/react`'s `<RemoteFragment>` (client boundary) and
  the [edge-composition example](../examples/edge-composition) (independent apps stitched at the
  edge). Isolated fragments, each its own framework — no shared React.
- **Examples** — React+Vue, React `<RemoteComponent>`, Node SSR, and edge composition, each with a smoke test.
- **Release discipline** — changesets configured (publish gated on the name decision).

## Next

- **Docs site** — framework (Astro Starlight vs VitePress) is an open decision (§10.3). This
  `/docs` content is framework-agnostic Markdown, ready to drop in.
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
