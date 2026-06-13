---
title: "vs Module Federation 2.0"
description: "A fair, measured comparison with the incumbent — where each wins."
---

Module Federation 2.0 (ByteDance Web Infra + Zack Jackson) is the incumbent and a genuinely
capable system: a decoupled runtime, an `mf-manifest.json`, TypeScript type hints, Chrome
devtools, runtime plugins, and Node SSR. It was announced in April 2024 and reported stable
(InfoQ) in April 2026. If you want a batteries-included plugin that does everything, use it.

knitkit makes a different bet: **radical simplicity on platform primitives**.

| | **knitkit** | **Module Federation 2.0** |
| --- | --- | --- |
| **Substrate** | Native import maps + ESM | Bundler runtime + share scopes |
| **Bundler coupling** | None. Runtime + manifest + a tiny CLI; externalize shared deps (one line) | Ergonomic path is `ModuleFederationPlugin`; ESM output still maturing |
| **Shared singletons** | One import-map entry → one instance, by construction | `singleton: true` + `requiredVersion` — powerful, but the canonical footgun |
| **Debuggability** | Open DevTools → the import map shows who won and from where | Share-scope resolution is bundler-internal |
| **SSR** | Same manifest drives Node via `module.register`; SRI verified before exec | Supported, but labeled experimental/hard by its own creator |
| **Types** | `.d.ts` published next to the manifest, synced to augment `loadRemote` | Strong — TS hints are a praised MF feature |
| **Federation overhead** | ~3.5 KB brotli (`@knitkit/runtime`) | ~27 KB brotli (measured, delta method) |

## Where MF's worst bugs live — and why ours can't

The ecosystem's #1 bug class is *"Invalid hook call… more than one copy of React."* It comes
from implicit/transitive sharing and version negotiation that resolves inside the bundler,
where you can't see it.

knitkit's shared surface is **explicit and inspectable**. You declare what's shared; the CLI
emits each shared package as one ESM asset from your installed version; the host and every
remote import it through a single import-map entry → the browser module cache guarantees one
instance. There is no share scope to misconfigure, and nothing is shared silently.

## What we deliberately give up

- **Automatic transitive sharing.** You declare the shared surface. (This is exactly where
  MF's silent failures originate — we treat that as a feature, not a regression.)
- **Extracting a dep from an already-inlined bundle.** Externalization is mandatory (one line
  per bundler, or no bundler).
- **Cross-remote HMR.** It requires bundler coupling, which we refuse — see
  [Dev experience & HMR](./hmr-and-dev.md).

## When to use which

- **Use Module Federation** if you need its full feature breadth, deep Webpack/Rspack
  integration, or automatic transitive sharing, and you're comfortable owning the config.
- **Use knitkit** if you want a small, standards-native primitive you can read in an afternoon,
  identical behavior across browser/SSR/edge, and a shared surface you can see.

*(Figures and dates above are anchored to named versions; re-verify before publishing — brief §9.)*
