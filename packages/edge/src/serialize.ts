import type { ImportMap } from "@knitkit/runtime";

// U+2028 / U+2029, built from code points so no raw separator characters live in this file.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

/** Serialize an import map to a `<script type="importmap">` tag, safe inside HTML. */
export function serializeImportMap(map: ImportMap): string {
  return `<script type="importmap">${escapeForScript(JSON.stringify(map))}</script>`;
}

function escapeForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .split(LINE_SEP)
    .join("\\u2028")
    .split(PARA_SEP)
    .join("\\u2029");
}
