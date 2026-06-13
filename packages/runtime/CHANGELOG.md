# @knitkit/runtime

## 0.2.0

### Minor Changes

- c785c50: Rename the public error type to `KnitError` / `isKnitError` / `KnitErrorCode`.

  The old `FedkitError` / `isFedkitError` / `FedkitErrorCode` names are kept as deprecated
  aliases that point at the renamed symbols, so existing `catch` code keeps working. They will
  be removed in a future minor — update imports to the `Knit*` names.

- ac4ae11: Negotiation now accepts `||` union ranges (`^17 || ^18`), whitespace intersections
  (`>=1.2.0 <2.0.0`), and partial caret/tilde operands (`^18`, `~1.2`) in `requiredVersion`.
  A range is parsed as a union of comparator sets, matching node-semver's model, so common
  real-world ranges no longer fail validation.

## 0.1.0

### Minor Changes

- 458f4f4: Initial `0.1.0` preview of runtime-first, bundler-agnostic module federation:

  - **`@knitkit/runtime`** — browser core: `registerRemotes`, `loadRemote`, semver negotiation, import-map injection, coded errors. < 5 KB, zero deps.
  - **`@knitkit/cli`** — emits shared ESM assets from `node_modules` + manifest + SRI hashes; `types generate`/`types sync` so `loadRemote()` is fully typed.
  - **`@knitkit/node`** — SSR via `module.register` loader hooks with SRI verification, a module cache, and hydration-parity import-map serialization.
  - **`@knitkit/react`** — `"use client"` `<RemoteComponent>` (lazy + Suspense + error boundary) over `loadRemote`.
  - **`@knitkit/overrides`** — local-override dev tool: point a remote at `localhost` against deployed others (localStorage + a tiny UI widget).
  - **`@knitkit/edge`** — ESI-style edge composition: stream-stitch remote HTML fragments and inject the negotiated import map, on Cloudflare Workers / Deno Deploy / Vercel Edge.
