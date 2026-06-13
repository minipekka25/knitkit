// A shared module. The host AND the remote import it via the SAME import-map entry
// ("shared-store" -> /shared/store.js), so the browser's module cache gives them ONE instance.
// Incrementing from either side updates both — the singleton, by construction.
export const store = { count: 0 };
const listeners = new Set();

export function increment() {
  store.count++;
  for (const fn of listeners) fn(store.count);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
