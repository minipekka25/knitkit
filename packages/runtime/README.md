# `@fedkit/runtime`

Browser core for **fedkit** — runtime-first, bundler-agnostic module federation on native ESM + import maps.

**Zero dependencies. ESM-only. < 5 KB min+gzip.**

## Public API

```ts
import {
  registerRemotes,
  loadRemote,
  negotiateShared,
  injectImportMap,
  getShareInfo,
  validateManifest,
  FedkitError,
} from "@fedkit/runtime";

await registerRemotes(
  [
    { name: "checkout", manifest: "/static/federation/checkout/fed.manifest.json" },
    { name: "marketing", manifest: "https://cdn.example.com/marketing/fed.manifest.json" },
  ],
  {
    hostShared: {
      react: {
        version: "18.3.1",
        requiredVersion: "^18.0.0",
        singleton: true,
        url: "/static/shared/react-18.3.1.js",
      },
    },
  },
);

const CartWidget = await loadRemote<React.ComponentType>("checkout/CartWidget");
```

## Bootstrap pattern (IMPORTANT)

Native import maps must be injected **before the first module import** that resolves through them. The supported pattern is:

```html
<!doctype html>
<html>
  <head>
    <script type="module">
      import { registerRemotes } from "/static/runtime/index.mjs";
      await registerRemotes([
        { name: "checkout", manifest: "/static/federation/checkout/fed.manifest.json" },
      ]);
      // Optional: dynamic-import the rest of your app so the import map is in place.
      await import("/src/main.mjs");
    </script>
  </head>
</html>
```

Do **not** do this:

```html
<!-- WRONG: main.mjs may import a module that resolves through the map before the map exists. -->
<script type="module" src="/src/main.mjs"></script>
<script type="module">
  import { registerRemotes } from "/static/runtime/index.mjs";
  await registerRemotes([...]);
</script>
```

## Browser support

- Chrome 89+, Firefox 108+, Safari 16.4+ — dynamic import map injection.
- Chrome 127, Firefox 138, Safari 18.4 — import map `integrity` key (SRI; emitted, enforced in Phase 2).
- `es-module-shims` is a documented fallback for older browsers, never the default.

## Errors

All errors are coded. Catch `FedkitError` and inspect `.code` and `.suggestion`:

| Code | Meaning |
| --- | --- |
| `FED_ERR_NEGOTIATION_CONFLICT` | No single version satisfies every participant's range and the package is not singleton. |
| `FED_ERR_SINGLETON_CONFLICT` | A singleton package has incompatible versions. |
| `FED_ERR_MANIFEST_INVALID` | A manifest failed validation. |
| `FED_ERR_LOAD_FAILED` | A network or import() error. |
| `FED_ERR_NOT_REGISTERED` | `loadRemote` called for a remote that wasn't registered. |
| `FED_ERR_IMPORT_MAP_INJECTION_FAILED` | `injectImportMap` called outside the browser. |
