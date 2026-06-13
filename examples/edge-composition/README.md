# Edge composition (Tier-2 fragment composition)

One page assembled at the edge from **independent apps** — a React fragment and a
framework-less HTML fragment — stitched by [`@knitkit/edge`](../../packages/edge/README.md),
with the import map injected by the gateway. No shared runtime; each fragment is its own app.

This is **Tier-2** federation: unlike Tier-1 `<RemoteComponent>`
(which shares one React), each fragment renders itself and is composed as HTML — so there's
**no "invalid hook call"** concern and apps can use entirely different frameworks (or none).

```
fragments/product   → a React app rendered with react-dom/server  (port 5204)
fragments/reviews   → plain HTML, no framework                     (port 5205)
gateway.mjs         → @knitkit/edge composes them into the shell     (port 5203)
```

## Run it

```bash
# from the repo root
npm run --workspace=@knitkit/edge build
npm --prefix examples/edge-composition test        # boots fragments + gateway, asserts the composed page
# or live:
npm --prefix examples/edge-composition run dev:product
npm --prefix examples/edge-composition run dev:reviews
npm --prefix examples/edge-composition run dev:gateway   # open http://localhost:5203
```

The gateway uses `composeStream` and adapts the Web stream to Node's `http` for the demo; on a
real edge runtime you'd return `composeResponse(...)` directly from the handler. Fragments are
fetched in parallel and streamed in document order; a fragment that's down degrades to its
inline fallback instead of failing the page.

## Related

- Edge package: [`@knitkit/edge`](../../packages/edge/README.md)
- The client-side Tier-2 path: `<RemoteFragment>` in [`@knitkit/react`](../../packages/react/README.md).
