# Next.js App Router + knitkit

A Next.js App Router host that embeds a **knitkit remote with zero `next.config` changes**,
using the published [`@knitkit/react`](https://www.npmjs.com/package/@knitkit/react) from npm.

```bash
cd examples/nextjs-host
npm install
npm run dev:remote     # the remote fragment server, on :5304
npm run dev            # Next on http://localhost:5300
# or verify it end-to-end (boots both + a headless browser):
npm test
```

## The honest version: two paths, very different costs

### ✅ Zero-config — `<RemoteFragment>` (this demo)

The page is a **server component** that renders `<RemoteFragment src=… />`. Because
`@knitkit/react` is marked `"use client"`, importing it creates a client boundary
automatically — **no `next.config` edits, no webpack tweaks**. The remote is its *own*
independent app (its own framework/React); Next embeds its rendered HTML and never has to
share a runtime with it. So there is **no "invalid hook call"** risk. `next.config.mjs` here is
literally empty. This is the path we recommend in Next.

### ⚠️ Shared-React — `<RemoteComponent>` (not zero-config in Next)

`<RemoteComponent>` renders a remote **React component inside the host's React tree**, which
only works if the host and the remote share *one* React instance. In a plain Vite/ESM host you
get that for free with a single import-map entry (see the
[`react-host-react-remote`](../react-host-react-remote) example). **Next is different**: it
bundles its own React, so a federated remote's `import "react"` would resolve to a *second*
React (via the import map) → "invalid hook call". Making them share requires routing Next's
React through the same import map — that's extra configuration, not zero-config, and is brittle.

**Recommendation:** in Next.js, use `<RemoteFragment>` (isolation). Reserve shared-React
`<RemoteComponent>` for hosts where you control the import map. Honest beats magic.

## Notes

- The remote here is a trivial HTML server; in practice it's any app that serves a fragment.
- This example is standalone (its own `node_modules`, excluded from the repo's workspaces) so
  Next doesn't bloat the main install or CI.
