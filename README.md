# knitkit

> **Module federation, minus the bundler.**
> A tiny (< 5 KB), zero-dependency, runtime-first module federation system built on native ES modules + import maps — identical in the browser, Node SSR, and the edge.

> ⚠️ **Pre-1.0.** Published under the `@knitkit/*` npm scope; APIs may change before 1.0.

---

## The problem

Module federation today means buying into a bundler plugin (`ModuleFederationPlugin`, `vite-plugin-federation`) and its config surface, its singleton-versioning footguns (“Invalid hook call… more than one copy of React”), and its plugin-treadmill bug backlog. SSR is labeled experimental even by its own authors.

The web platform grew the primitives to do this natively: **import maps** (Chrome 89+, Firefox 108+, Safari 16.4+), the **`integrity` key** for module SRI, and **`module.register`** hooks in Node. `knitkit` is the runtime that uses them — and nothing else.

## How it works in 10 lines

```html
<!-- The import map is injected before the first module import. Zero bundler plugins. -->
<script type="importmap">
  { "imports": { "@knitkit/runtime": "/runtime/index.js", "react": "https://esm.sh/react@18.3.1" } }
</script>
<script type="module">
  import { registerRemotes, loadRemote } from "@knitkit/runtime";
  await registerRemotes([{ name: "checkout", manifest: "/federation/knit.manifest.json" }]);
  const mount = await loadRemote("checkout/CartWidget"); // resolved via the negotiated import map
  mount(document.getElementById("slot"));                // a Vue widget, mounted inside a React host
</script>
```

That's the whole contract: declare remotes by manifest URL, `loadRemote` an exposed module, and shared dependencies resolve to **one instance** through the browser's module cache.

## Live demo

Two runnable examples (both zero bundler plugins, both with a self-booting Playwright smoke test):

- [`examples/react-host-vue-remote`](./examples/react-host-vue-remote) — a **React host mounting a Vue 3 remote**, one shared state object proven identical across the framework boundary.
- [`examples/react-host-react-remote`](./examples/react-host-react-remote) — a **React host rendering a React remote via `<RemoteComponent>`**, sharing one React instance so the remote's hooks work across the boundary.
- [`examples/node-ssr`](./examples/node-ssr) — **Node SSR** of a federated React component via `@knitkit/node` loader hooks (SRI-verified), with the import map serialized for hydration parity.
- [`examples/edge-composition`](./examples/edge-composition) — **Tier-2 edge composition**: independent apps (a React fragment + a framework-less fragment) stitched into one streamed page by `@knitkit/edge`.

The Vue demo:

```bash
pnpm install
pnpm --filter @knitkit/runtime build
pnpm --filter @knitkit/example-react-host-vue-remote test   # Playwright boots both servers and asserts the singleton proof
```

Open `examples/react-host-vue-remote` — the host serves on `:5173`, the Vue remote on `:5174`. Open DevTools → the import map shows exactly which shared dependency won and from where.

> 🔜 A hosted StackBlitz link lands with the public launch (pending the final project name — see the roadmap).

## Why the singleton just works

One import map entry per shared package → one URL → one module instance in the browser cache, shared by the host and every remote. There is no “share scope” to negotiate at runtime and no way to accidentally load React twice. **The shared surface is explicit and inspectable**: open the import map in DevTools and you can see who won and why. We call this *debuggability by construction* — and it kills the ecosystem's #1 bug class by design, not by configuration.

## vs Module Federation 2.0

| | **knitkit** | **Module Federation 2.0** |
| --- | --- | --- |
| **Bundler coupling** | None — runtime + manifest + tiny CLI. Externalize shared deps (1 line). | Ergonomic path is `ModuleFederationPlugin`; ESM output still maturing. |
| **Shared singletons** | One import map entry → one instance, by construction. | `singleton: true` + `requiredVersion` — powerful, but the canonical footgun. |
| **Substrate** | Native import maps + ESM. | Bundler runtime + share scopes. |
| **SSR** | Same manifest drives Node via `module.register` *(Phase 2)*. | Supported, but labeled experimental/hard by its own creator. |
| **Next.js App Router** | Loads a remote with zero `next.config.js` changes *(Phase 2 demo)*. | `nextjs-mf` is EOL/maintenance. |
| **Edge** | Same manifest, native import maps on Deno/Workers *(Phase 3)*. | Not a first-class target. |
| **Types** | `.d.ts` published next to the manifest, synced to the host *(Phase 2)*. | Strong — TS hints are a praised MF feature. |
| **Core size** | < 5 KB min+gzip, zero deps. | Larger; bundler-embedded. |

MF 2.0 is genuinely capable (decoupled runtime, manifest, TS hints, devtools). `knitkit` makes a different bet: **radical simplicity on platform primitives**, not feature breadth.

## Roadmap (honest)

- **Week 1 — Minimal Lovable MVP** *(done):* `@knitkit/runtime` (negotiation, import-map injection, `loadRemote`), the manifest spec v0.1, `@knitkit/cli` (emits shared ESM assets + manifest + SRI hashes from your `node_modules`), and the React-host / Vue-remote demo with a passing singleton smoke test.
- **Weeks 2–4 — Production-credible v1:** `@knitkit/node` SSR via `module.register` with SRI enforcement, module cache, and hydration-parity import maps *(done)*; robust negotiation (x-ranges, `scopes` fallbacks, coded errors) *(done)*; `@knitkit/react` `<RemoteComponent>` *(done)*; `knitkit types generate` + `knitkit types sync` so `loadRemote()` is fully typed *(done)*; an SSR example rendering a federated React component *(done)*; `@knitkit/overrides` local-override dev widget *(done)*; still to come — a docs site and the Next.js App Router story (which needs a documented React-sharing approach — see the example notes).
- **Months 2–3 — Traction & edge:** `@knitkit/edge` (ESI-style fragment composition for Workers/Deno/Vercel Edge), Tier-2 RSC fragment composition, a cold-load + bytes benchmark vs MF, and partnerships.

## When **not** to use this

`knitkit` is deliberately scoped. It is the wrong tool if you need:

- **Cross-remote HMR** — requires bundler coupling, which we refuse. Each remote uses its own dev server's HMR; point a remote at `localhost` via the local-override widget instead.
- **Automatic transitive sharing** — the shared surface is explicit by design. You declare what's shared; nothing is shared silently. (This is exactly where MF's worst bugs live.)
- **Module-level RSC / Flight federation** — no standard exists for cross-app Flight module references yet. We are RSC-*compatible*, not RSC-*federated* (we're watching `react-server-dom-esm`).
- **React Native** — out of scope.

If you want a bundler plugin that does everything, use Module Federation. If you want a small, standards-native primitive you can read in an afternoon, that's this.

## Packages

| Package | Status | Purpose |
| --- | --- | --- |
| [`@knitkit/runtime`](./packages/runtime) | ✅ MVP | Browser core: `registerRemotes`, `loadRemote`, negotiation, import-map injection. < 5 KB, zero deps. |
| [`@knitkit/cli`](./packages/cli) | ✅ MVP | Emits shared ESM assets from `node_modules` (esbuild), generates the manifest, computes SRI hashes. |
| [`@knitkit/node`](./packages/node) | ✅ MVP | `module.register` SSR loader hooks, SRI verification, module cache, hydration-parity import-map serialization. |
| [`@knitkit/react`](./packages/react) | ✅ MVP | Thin `"use client"` `<RemoteComponent>` wrapper (lazy + Suspense + error boundary) over `loadRemote`. |
| [`@knitkit/overrides`](./packages/overrides) | ✅ MVP | Local-override dev tool: point a remote at `localhost` against deployed others (localStorage + UI widget). |
| [`@knitkit/edge`](./packages/edge) | ✅ MVP | ESI-style HTML fragment stream-stitching + import-map injection for Workers / Deno / Vercel Edge. |

The **manifest spec** lives in [`/spec`](./spec/manifest-0.1.md) and is versioned from day one.

## Documentation

Guides and comparisons live in [`/docs`](./docs/README.md): [getting started](./docs/getting-started.md), [security (SRI/CSP/CORS)](./docs/security.md), [dev experience & HMR](./docs/hmr-and-dev.md), [vs Module Federation](./docs/vs-module-federation.md), [vs Native Federation](./docs/vs-native-federation.md), and the [roadmap](./docs/roadmap.md). The site is published with [Mintlify](https://mintlify.com) (`docs/docs.json`; `cd docs && npx mint@latest dev` to preview). Reproducible [benchmarks](./benchmarks/README.md) measure knitkit's federation overhead at **~3.5 KB brotli — ~7–8× smaller than Module Federation** (delta method, measured against a real MF 2.0 build).

## Contributing

Early days — issues and discussion welcome. The negotiation function ([`packages/runtime/src/negotiate.ts`](./packages/runtime/src/negotiate.ts)) is the most-tested code in the repo; changes there need tests first. Core stays **< 5 KB and zero-dependency** — that constraint is non-negotiable and CI-enforced.

## License

[MIT](./LICENSE)
