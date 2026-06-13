# knitkit documentation

> Published with **[Mintlify](https://mintlify.com)** (`docs.json` + MDX/Markdown pages with
> frontmatter). Preview locally:
>
> ```bash
> cd docs && npx mint@latest dev      # http://localhost:3000
> ```
>
> The page files below double as plain Markdown for GitHub viewing.

## Start here

- [Getting started](./getting-started.md) — install, your first host + remote, the boot pattern.

## Guides

- [Security: SRI, CSP, CORS](./security.md) — pin and verify every remote module.
- [Dev experience & HMR](./hmr-and-dev.md) — the honest stance, and the local-override widget.

## Comparisons

- [vs Module Federation 2.0](./vs-module-federation.md)
- [vs Native Federation](./vs-native-federation.md)

## Reference

- Package READMEs: [`@knitkit/runtime`](../packages/runtime/README.md) ·
  [`@knitkit/cli`](../packages/cli/README.md) · [`@knitkit/node`](../packages/node/README.md) ·
  [`@knitkit/react`](../packages/react/README.md) · [`@knitkit/overrides`](../packages/overrides/README.md)
- [Manifest spec v0.1](../spec/manifest-0.1.md)
- [Roadmap](./roadmap.md)

## Examples

- [`react-host-vue-remote`](../examples/react-host-vue-remote) — React host, Vue remote, shared-state singleton.
- [`react-host-react-remote`](../examples/react-host-react-remote) — `<RemoteComponent>`, shared React.
- [`node-ssr`](../examples/node-ssr) — SSR of a federated React component.

> **Verify before publishing:** browser-support and competitor claims in these
> docs are anchored to named versions and dates; re-check them at publish time.
