import { getOverrides } from "./storage.js";

export interface RemoteInput {
  name: string;
  manifest: string | object;
}

/**
 * Rewrite each remote whose name has a local override so its manifest points at the
 * override URL. Pass the result straight to `registerRemotes()`:
 *
 * ```ts
 * await registerRemotes(applyOverrides([
 *   { name: "checkout", manifest: "https://cdn.example.com/checkout/knit.manifest.json" },
 * ]));
 * ```
 *
 * With an override set for "checkout", that remote loads from localhost while every other
 * remote stays on its deployed manifest. Non-overridden remotes pass through untouched.
 */
export function applyOverrides<T extends RemoteInput>(remotes: T[]): T[] {
  const overrides = getOverrides();
  if (Object.keys(overrides).length === 0) return remotes;
  return remotes.map((r) => (overrides[r.name] ? { ...r, manifest: overrides[r.name]! } : r));
}
