# Manifest Spec `0.1`

> **Status:** v0.1, locked for Phase 1.
> **Source of truth:** this document. The implementation in `@knitkit/runtime`'s `validateManifest` is the reference validator; any divergence is a bug.

A **manifest** is a JSON document that describes a federated application's exposed modules and shared dependencies. Host applications fetch manifests from remote URLs at boot, run version negotiation, and emit a single import map.

## Top-level shape

```json
{
  "spec": "0.1",
  "name": "checkout",
  "exposes": { ... },
  "shared": { ... },
  "meta": { ... }
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `spec` | `"0.1"` | yes | Pin to the spec version this manifest conforms to. |
| `name` | string | yes | Lowercase, `[a-z][a-z0-9_-]*`. Used as the prefix in `loadRemote("<name>/<exposeKey>")`. |
| `exposes` | object | yes | Map of expose key → expose declaration. Empty object is valid. |
| `shared` | object | yes | Map of package name → shared declaration. Empty object is valid. |
| `meta` | object | no | Free-form. Suggested keys: `buildTime`, `framework`. |

## `exposes`

```json
"./CartWidget": {
  "url": "./exposes/CartWidget.js",
  "types": "./types/CartWidget.d.ts"
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `url` | string (URL or path) | yes | Resolved relative to the manifest's own URL. May be absolute. |
| `types` | string (URL or path) | no | Path to a `.d.ts` file, used by `knitkit types sync`. |

Expose keys are written with a leading `./` (e.g. `"./CartWidget"`). When calling `loadRemote`, the consumer may omit the `./` (e.g. `loadRemote("checkout/CartWidget")`).

## `shared`

```json
"react": {
  "version": "18.3.1",
  "requiredVersion": "^18.2.0",
  "singleton": true,
  "url": "./shared/react-18.3.1.js",
  "integrity": "sha384-..."
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `version` | semver string | yes | The exact version this participant contributes. |
| `requiredVersion` | semver range | yes | The range of versions this participant can accept. Supports `^`, `~`, `>=`, `>`, `<=`, `<`, `=`, x-ranges (`1.x`, `1.2.x`, `*`), and exact. |
| `singleton` | bool | no, default `true` | If `true`, a conflict throws `KNIT_ERR_SINGLETON_CONFLICT`. If `false`, an outlier is loaded via a `scopes` entry. |
| `url` | string (URL or path) | yes | URL to the prebundled ESM asset for this package. |
| `integrity` | string | no | SRI hash (`sha384-...`). Computed by `@knitkit/cli` at build time. Enforced in Phase 2. |

## URL resolution

All relative URLs (`url`, `types`) resolve against the manifest's own URL. The runtime constructs the resolved URL via `new URL(ref, manifestBaseUrl).toString()`.

## Versioning

- **Breaking** changes to the JSON shape (renames, removed required fields, stricter types) → bump major.
- **Additive** changes (new optional fields, new sibling keys) → bump minor.
- **Clarifications** (text edits, examples) → bump patch.

## Full example

```json
{
  "spec": "0.1",
  "name": "checkout",
  "exposes": {
    "./CartWidget": {
      "url": "./exposes/CartWidget.js",
      "types": "./types/CartWidget.d.ts"
    },
    "./CheckoutForm": {
      "url": "./exposes/CheckoutForm.js"
    }
  },
  "shared": {
    "react": {
      "version": "18.3.1",
      "requiredVersion": "^18.2.0",
      "singleton": true,
      "url": "./shared/react-18.3.1.js",
      "integrity": "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9r7jQfbYyF3sD5nK8n+dvY3nK0O2uP0kQ=="
    },
    "react-dom": {
      "version": "18.3.1",
      "requiredVersion": "^18.2.0",
      "singleton": true,
      "url": "./shared/react-dom-18.3.1.js",
      "integrity": "sha384-..."
    }
  },
  "meta": {
    "buildTime": "2026-06-12T18:00:00Z",
    "framework": "react@18"
  }
}
```

## Validation

`@knitkit/runtime` exports `validateManifest(input, sourceLabel)`. The function throws `KnitError` with code `KNIT_ERR_MANIFEST_INVALID` and a precise `.message` + `.suggestion`. The CLI uses the same function (re-exported, not duplicated) to validate manifests on disk.
