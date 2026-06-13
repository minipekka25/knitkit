import { FedkitError } from "./errors.js";
import type { Manifest } from "./manifest.js";

export interface RemoteRegistration {
  name: string;
  manifest: Manifest;
  baseUrl: string;
}

let registered: RemoteRegistration[] = [];

export function setRegistrations(next: RemoteRegistration[]): void {
  registered = next;
}

export function getRegistrations(): RemoteRegistration[] {
  return registered;
}

/**
 * Augmentable registry mapping a remote specifier to its exposed module's type.
 *
 * `knitkit types sync` generates declarations of the form:
 *
 * ```ts
 * declare module "@knitkit/runtime" {
 *   interface RemoteModules { "checkout/CartWidget": typeof import("./checkout/CartWidget").default }
 * }
 * ```
 *
 * which makes `loadRemote("checkout/CartWidget")` fully typed. Specifiers not present in
 * the registry fall back to the generic `loadRemote<T>(specifier: string)` overload.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RemoteModules {}

/**
 * Load an exposed module from a registered remote.
 *
 * `specifier` is `"<remoteName>/<exposeKey>"`, e.g. `"checkout/CartWidget"`.
 * Returns the module's default export if present, otherwise the namespace.
 */
export function loadRemote<K extends keyof RemoteModules>(specifier: K): Promise<RemoteModules[K]>;
export function loadRemote<T = unknown>(specifier: string): Promise<T>;
export async function loadRemote(specifier: string): Promise<unknown> {
  const slash = specifier.indexOf("/");
  if (slash <= 0 || slash === specifier.length - 1) {
    throw new FedkitError(
      "KNIT_ERR_LOAD_FAILED",
      `Invalid specifier "${specifier}". Expected "<remoteName>/<exposeKey>".`,
      `Example: loadRemote("checkout/CartWidget")`,
    );
  }
  const remoteName = specifier.slice(0, slash);
  const exposeKey = specifier.slice(slash + 1);
  const ensureKey = exposeKey.startsWith("./") ? exposeKey : `./${exposeKey}`;
  const remote = registered.find((r) => r.name === remoteName);
  if (!remote) {
    throw new FedkitError(
      "KNIT_ERR_NOT_REGISTERED",
      `Remote "${remoteName}" is not registered.`,
      `Call registerRemotes() with this remote's manifest first.`,
    );
  }
  const expose = remote.manifest.exposes[ensureKey];
  if (!expose) {
    throw new FedkitError(
      "KNIT_ERR_LOAD_FAILED",
      `Remote "${remoteName}" does not expose "${ensureKey}".`,
      `Available: ${Object.keys(remote.manifest.exposes).join(", ") || "(none)"}`,
    );
  }
  const url = resolveModuleUrl(remote.baseUrl, expose.url);
  try {
    const mod = (await import(/* @vite-ignore */ url)) as { default?: unknown } & Record<string, unknown>;
    return mod.default ?? mod;
  } catch (e) {
    throw new FedkitError(
      "KNIT_ERR_LOAD_FAILED",
      `Failed to load module "${specifier}" from ${url}: ${(e as Error).message}`,
      `Check the remote's built artifact, network access, and CORS.`,
    );
  }
}

/**
 * Resolve an expose URL against the manifest base. Handles:
 * - relative URLs against an absolute manifest base,
 * - already-absolute URLs (http(s):, data:, etc.) when the base is empty (inline manifests).
 * Never throws; a value that can't be resolved is returned as-is so the import() call
 * surfaces a coded KNIT_ERR_LOAD_FAILED rather than an uncoded URL TypeError.
 */
function resolveModuleUrl(base: string, ref: string): string {
  try {
    return new URL(ref, base || undefined).toString();
  } catch {
    try {
      return new URL(ref).toString();
    } catch {
      return ref;
    }
  }
}
