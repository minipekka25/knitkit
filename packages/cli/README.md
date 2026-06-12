# `@fedkit/cli`

The build-time companion for **fedkit**. Emits the shared-dependency ESM assets and the manifest, computes SRI hashes, and generates/syncs types — no bundler plugin required.

```bash
fedkit build [cwd]            # emit dist/shared/*, dist/exposes/*, dist/fed.manifest.json
fedkit types generate [cwd]   # generate .d.ts per exposed module, patch the manifest
fedkit types sync [cwd]       # fetch remotes' types (fed.host.json) so loadRemote() is typed
fedkit validate <manifest>    # validate a manifest against the spec
```

## `fedkit build`

Reads `fed.config.json`:

```json
{ "name": "checkout", "shared": ["react", "react-dom"], "exposes": ["./CartWidget.tsx"] }
```

For each `shared` package it resolves the **exact installed version** from your `node_modules`, pre-bundles it to a standalone ESM asset with esbuild (handles CJS like React), and records the version + a sha384 SRI hash in the manifest. Exposed modules are emitted and listed in `exposes`.

## Types

`loadRemote()` parity with Module Federation's most-praised feature — without a bundler plugin.

- **Remote:** `fedkit types generate` runs your installed TypeScript compiler over each exposed module, writes `dist/types/<Name>.d.ts`, and patches `exposes[].types` in the manifest. (`typescript` is an optional peer dependency — only needed for this command.)
- **Host:** `fedkit types sync` reads `fed.host.json`, fetches each remote's `.d.ts`, and generates `.fedkit/types/fedkit-remotes.d.ts` — a declaration that augments `@fedkit/runtime`'s `RemoteModules`, making `loadRemote("checkout/CartWidget")` fully typed. Add the types dir to your tsconfig `include`.

```json
// fed.host.json
{
  "remotes": [{ "name": "checkout", "manifest": "https://cdn.example.com/checkout/fed.manifest.json" }],
  "typesDir": ".fedkit/types"
}
```

## Exit codes

`0` success · `1` build/validation error · `2` usage error. Errors are coded and actionable.
