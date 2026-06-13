import { register } from "node:module";
import type { ImportMap } from "@knitkit/runtime";

export { serializeImportMap, serializeImportMapJson } from "./serialize.js";
export { ModuleCache } from "./cache.js";
export type { CachedModule } from "./cache.js";
export { computeIntegrity, verifyIntegrity } from "./sri.js";
export type { SriAlgorithm, IntegrityCheck } from "./sri.js";

// Convenience re-exports so SSR code negotiates with the SAME function as the browser.
export { negotiateShared } from "@knitkit/runtime";
export type { ImportMap, NegotiationResult, Manifest } from "@knitkit/runtime";

export interface RegisterOptions {
  /** Base URL the hooks module is resolved against. Defaults to this module's URL. */
  parentURL?: string;
}

/**
 * Install the knitkit loader hooks for the current Node process, seeded with a negotiated
 * import map. After this call, `import("<bareSpecifier>")` resolves shared deps and remote
 * modules over HTTP using the SAME map the browser receives via `serializeImportMap`.
 *
 * Call this once, before importing any module that depends on the map — typically at the
 * very top of your server entry, or via `--import @knitkit/node/register`.
 */
export function registerFederation(importMap: ImportMap, options: RegisterOptions = {}): void {
  register("./hooks.js", {
    parentURL: options.parentURL ?? import.meta.url,
    data: { importMap },
  });
}
