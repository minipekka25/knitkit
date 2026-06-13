import { KnitError } from "./errors.js";
import type { ImportMap } from "./manifest.js";

/**
 * Inject an import map into the document before the first module import.
 *
 * IMPORTANT: this MUST run before any <script type="module"> that resolves
 * through the map. Native import maps are immutable once a module graph has
 * started loading on some browsers.
 */
export function injectImportMap(map: ImportMap): void {
  if (typeof document === "undefined") {
    throw new KnitError(
      "KNIT_ERR_IMPORT_MAP_INJECTION_FAILED",
      "injectImportMap requires a DOM (document is undefined).",
      "Use this function only in the browser. For Node, use @knitkit/node.",
    );
  }
  const existing = document.querySelector('script[type="importmap"]');
  if (existing) {
    // Merge: this is a best-effort single-map implementation. Multi-map
    // support is browser-version dependent and a Phase 2 feature.
    try {
      const prior = JSON.parse(existing.textContent || "{}");
      const merged: ImportMap = {
        imports: { ...(prior.imports ?? {}), ...map.imports },
        scopes: { ...(prior.scopes ?? {}), ...(map.scopes ?? {}) },
        integrity: { ...(prior.integrity ?? {}), ...(map.integrity ?? {}) },
      };
      existing.textContent = JSON.stringify(merged);
      return;
    } catch {
      // fall through and replace
    }
  }
  const el = document.createElement("script");
  el.type = "importmap";
  el.textContent = JSON.stringify(map);
  document.head.appendChild(el);
}
