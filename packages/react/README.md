# `@fedkit/react`

The thin React client wrapper for **fedkit** — load a federated remote component by name, with Suspense and an error boundary already wired up.

The package is marked `"use client"`, so you can import it directly into a **Next.js App Router** server component and it becomes a client boundary automatically — **no `next.config.js` changes**.

## Usage

```tsx
import { RemoteComponent } from "@fedkit/react";

export default function Page() {
  return (
    <RemoteComponent
      name="checkout/CartWidget"      // "<remoteName>/<exposeKey>"
      fallback={<Spinner />}          // shown while loading
      errorFallback={(err) => <p>Couldn't load cart: {err.message}</p>}
      onError={(err) => report(err)}
      sku="ABC-123"                   // any extra props are forwarded to the remote
    />
  );
}
```

The remote's exposed module must **default-export a React component**. Register your remotes once (browser: `registerRemotes` from `@fedkit/runtime`; SSR: `registerFederation` from `@fedkit/node`) before the component mounts.

## API

| Export | Purpose |
| --- | --- |
| `<RemoteComponent name fallback errorFallback onError {...props} />` | Load + render a remote component with Suspense + error boundary. |
| `lazyRemote(specifier)` | Lower-level: a `React.lazy` component backed by `loadRemote` (render it inside your own `<Suspense>`). Cached per specifier. |
| `clearRemoteCache(specifier?)` | Drop the cached lazy component to retry a remote that previously failed. |
| `<RemoteErrorBoundary fallback onError>` | The error boundary used internally, exported for standalone use. |

## Notes

- A remote that fails to load is cached as failed (React.lazy memoizes the rejection). Call `clearRemoteCache(name)` and re-render to retry.
- This is the RSC **Tier 1** surface: the runtime works *inside* RSC apps (server components load via `@fedkit/node`, client components via the browser path behind this wrapper). Fragment-level and module-level RSC federation are later tiers — see the project roadmap.
