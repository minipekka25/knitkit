# `@knitkit/overrides`

The local-override dev tool for **knitkit** — point any remote at `localhost` while every
other remote stays on its deployed manifest. The single-spa
[`import-map-overrides`](https://github.com/single-spa/import-map-overrides) DX, for knitkit.

There is no cross-remote HMR (that needs bundler coupling — which knitkit refuses). Instead,
each remote runs its own dev server, and this widget repoints the host at it.

## Usage

Wrap your remotes with `applyOverrides` and mount the widget in development:

```ts
import { registerRemotes } from "@knitkit/runtime";
import { applyOverrides, mountOverridesWidget } from "@knitkit/overrides";

await registerRemotes(
  applyOverrides([
    { name: "checkout", manifest: "https://cdn.example.com/checkout/knit.manifest.json" },
    { name: "profile", manifest: "https://cdn.example.com/profile/knit.manifest.json" },
  ]),
);

if (import.meta.env?.DEV) {
  mountOverridesWidget({ remotes: ["checkout", "profile"] });
}
```

Open the floating **⚙ knitkit overrides** panel, paste a localhost manifest URL for `checkout`,
click **Use local**, and the page reloads loading `checkout` from your dev server — everything
else stays deployed.

## API

| Export | Purpose |
| --- | --- |
| `applyOverrides(remotes)` | Rewrite overridden remotes' manifest URLs. Pass the result to `registerRemotes`. |
| `mountOverridesWidget({ remotes?, placeholder? })` | Mount the floating override panel. Returns an unmount function. |
| `getOverrides()` / `setOverride(name, url)` / `removeOverride(name)` / `clearOverrides()` | Programmatic access to the localStorage-backed override store. |

Overrides live in `localStorage` under `knitkit:overrides`, so they persist per-browser and
never affect other developers or production.
