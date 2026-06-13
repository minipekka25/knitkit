import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { loadRemote } from "@knitkit/runtime";

// Cache the lazy wrapper per specifier so React doesn't re-create it (and re-suspend)
// on every render. React.lazy itself memoizes the import promise.
const cache = new Map<string, LazyExoticComponent<ComponentType<Record<string, unknown>>>>();

/**
 * A React.lazy component backed by `loadRemote`. The remote's exposed module must
 * default-export a React component. Render it inside <Suspense> (and ideally an error
 * boundary) — `<RemoteComponent>` wires both up for you.
 */
export function lazyRemote<P extends Record<string, unknown> = Record<string, unknown>>(
  specifier: string,
): LazyExoticComponent<ComponentType<P>> {
  let comp = cache.get(specifier);
  if (!comp) {
    comp = lazy(async () => {
      const mod = await loadRemote<ComponentType<Record<string, unknown>>>(specifier);
      return { default: mod };
    });
    cache.set(specifier, comp);
  }
  return comp as LazyExoticComponent<ComponentType<P>>;
}

/** Clear the lazy-component cache, e.g. to retry a remote that previously failed to load. */
export function clearRemoteCache(specifier?: string): void {
  if (specifier) cache.delete(specifier);
  else cache.clear();
}
