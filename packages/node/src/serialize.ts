import type { ImportMap } from "@knitkit/runtime";

/**
 * Serialize a negotiated import map to a `<script type="importmap">` tag for SSR.
 *
 * Emitting the SAME map the server negotiated guarantees the browser resolves shared
 * deps identically — no dual-React, no hydration mismatch. The tag must appear before
 * the first module import in the rendered HTML (same constraint as the browser runtime).
 */
export function serializeImportMap(map: ImportMap): string {
  return `<script type="importmap">${escapeForScript(JSON.stringify(map))}</script>`;
}

/** Serialize just the JSON payload (for callers that build their own tag). */
export function serializeImportMapJson(map: ImportMap): string {
  return escapeForScript(JSON.stringify(map));
}

// U+2028 LINE SEPARATOR / U+2029 PARAGRAPH SEPARATOR, built from code points so no raw
// separator characters live in this source file.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

/**
 * Escape a JSON string for safe inclusion inside an HTML <script> element. The parser
 * ends the script at the first `</script` (case-insensitively) and treats `<!--` as a
 * comment opener, so neutralize `<`. Also escape the U+2028/U+2029 line separators.
 */
function escapeForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .split(LINE_SEP)
    .join("\\u2028")
    .split(PARA_SEP)
    .join("\\u2029");
}
