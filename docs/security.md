---
title: "Security: SRI, CSP, CORS"
description: "Pin and verify every remote module — Subresource Integrity, CSP, and CORS guidance."
---

Loading code from another origin at runtime is powerful and dangerous. fedkit's headline
guidance: **pin and verify every remote module's hash.**

## Subresource Integrity (SRI)

`fedkit build` computes a `sha384` hash for each shared asset and records it in the manifest:

```json
"shared": {
  "react": { "version": "18.3.1", "requiredVersion": "^18.0.0", "singleton": true,
             "url": "./shared/react-18.3.1.js", "integrity": "sha384-…" }
}
```

How that hash is enforced depends on the environment:

- **Browser, shared deps** — the negotiated import map carries the
  [`integrity` key](https://github.com/WICG/import-maps#subresource-integrity), so the browser
  natively refuses a tampered shared module. Available in Chrome 127 / Firefox 138 /
  Safari 18.4 (re-verify at ship time).
- **Node SSR** — `@fedkit/node` verifies the hash itself **before executing** any fetched
  remote module. A mismatch throws a coded `FED_ERR_SRI_MISMATCH` and the module never runs.
  This is covered by tests in the package.

### Honest limitation: exposed modules in the browser

The platform has no `integrity` option on a dynamic `import()`. So an *exposed* module loaded
by `loadRemote` in the browser is only hash-verified if it goes through an import-map entry
that carries integrity. Options:

1. Put exposed modules in the import map with integrity (so the browser enforces it), or
2. Rely on `@fedkit/node`'s server-side verification (which always runs), or
3. Pin remotes you trust and serve them over HTTPS from an origin you control.

Manifest **signing** (verifying the manifest itself, not just the assets) is on the roadmap.

## Content Security Policy (CSP)

A federated page loads modules from one or more remote origins. Your CSP must allow them. A
starting point (tighten to your actual origins):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;          /* remote module origins */
  connect-src 'self' https://cdn.example.com;          /* fetch() of manifests + modules */
  require-trusted-types-for 'script';                  /* optional, recommended */
```

Notes:

- The import map is an inline `<script type="importmap">`. Under a strict CSP, allow it with a
  `nonce` (preferred) rather than `'unsafe-inline'`.
- `connect-src` must include every origin you `fetch` a manifest or module from.
- Prefer SRI + a small allowlist of remote origins over broad wildcards.

## CORS

Cross-origin module fetches and manifest fetches require the remote to send CORS headers — a
well-known footgun in older plugin-based setups. The remote's static host must respond with:

```
Access-Control-Allow-Origin: https://your-host.example.com   /* or * for public assets */
```

for `fed.manifest.json`, exposed modules, and shared assets. If a remote 404s or omits CORS,
`registerRemotes` / `loadRemote` fail with a coded `FED_ERR_LOAD_FAILED` whose suggestion
points at CORS and reachability.

## Trust model, briefly

You are executing the remote's code with your page's privileges. Treat every remote origin as
part of your trusted computing base: serve over HTTPS, pin hashes, scope your CSP, and only
federate origins you control or have a contract with. Optional `vm`/ShadowRealm isolation for
SSR is a roadmap item.
