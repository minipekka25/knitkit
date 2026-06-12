# Dev experience & HMR

The honest version: **fedkit has no cross-remote hot module replacement, and won't.**

Cross-remote HMR requires the host's bundler to own the module graph of every remote — which
means bundler coupling, the exact thing fedkit refuses. Promising it would mean becoming the
plugin treadmill we set out to avoid. So we don't.

What you get instead is a workflow that's arguably nicer, borrowed from
[single-spa](https://single-spa.js.org/)'s beloved `import-map-overrides`:

## Each remote keeps its own dev server

Run each remote with its normal dev server and its normal HMR. Nothing about federation takes
that away — within a single remote, edit-and-refresh is exactly as fast as it always was.

## Point a remote at localhost with `@fedkit/overrides`

The cross-app workflow is: develop one remote locally **against the deployed versions of
everything else**. Wrap your remotes with `applyOverrides`, and mount the widget in dev:

```ts
import { registerRemotes } from "@fedkit/runtime";
import { applyOverrides, mountOverridesWidget } from "@fedkit/overrides";

await registerRemotes(applyOverrides([
  { name: "checkout", manifest: "https://cdn.example.com/checkout/fed.manifest.json" },
  { name: "profile",  manifest: "https://cdn.example.com/profile/fed.manifest.json" },
]));

if (import.meta.env?.DEV) mountOverridesWidget({ remotes: ["checkout", "profile"] });
```

Open the floating **⚙ fedkit overrides** panel, paste `http://localhost:5174/fed.manifest.json`
for `checkout`, click **Use local**, and the page reloads with `checkout` served from your dev
server while everything else stays deployed. Overrides live in `localStorage`
(`fedkit:overrides`), so they're per-browser and never affect production or your teammates.

See [`@fedkit/overrides`](../packages/overrides/README.md).

## Why this is the right trade

- **No magic to break.** The override just rewrites a manifest URL; there's no cross-bundler
  bridge to desync.
- **Realistic.** You test your remote against the *actual* deployed others, not a local mock.
- **Honest.** We say all of this in the docs and never over-promise HMR.
