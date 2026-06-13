# React host + React remote — `<RemoteComponent>`

A React host renders a React remote with **`@knitkit/react`'s `<RemoteComponent>`**, sharing
**one React instance** across the boundary via the import map. Zero bundler plugins.

```tsx
<RemoteComponent name="widgets/Counter" fallback={<p>loading…</p>} />
```

## Why the counter is the proof

The remote `Counter` uses `useState`. React hooks only work when the component renders with
the **same** React instance as the host's reconciler. If React were duplicated you'd get
*"Invalid hook call… more than one copy of React."* Here `react` is a single import-map
entry, so the host, `@knitkit/react`, and the remote all resolve the same React — and the
counter increments. That's the singleton, by construction.

## Run it

```bash
# from the repo root
npm run --workspace=@knitkit/runtime build
npm run --workspace=@knitkit/react build
npm --prefix examples/react-host-react-remote test   # Playwright boots both servers
```

Host on `:5183`, remote on `:5184`. Open DevTools → Network shows one `react` request.

## Note on Next.js

This works because the **host controls the import map**, so Next's bundled React is not in
play. In a Next.js App Router host, Next bundles its own React; sharing it with a federated
remote (so the remote's hooks use Next's React) currently requires a `next.config.js`
externals change — it is **not** zero-config. An isolated, hooks-free remote widget can be
embedded zero-config, but a true shared-React `<RemoteComponent>` in Next is a roadmap item.
