import { readFileSync } from "node:fs";
import type { ImportMap } from "@fedkit/runtime";
import { registerFederation } from "./index.js";

// Side-effect entry for the `node --import @fedkit/node/register` workflow.
// Supplies the negotiated import map from the environment:
//   FEDKIT_IMPORT_MAP_JSON='{"imports":{...}}'   (inline JSON), or
//   FEDKIT_IMPORT_MAP=/path/to/importmap.json    (file path).

function loadMapFromEnv(): ImportMap | undefined {
  const inline = process.env.FEDKIT_IMPORT_MAP_JSON;
  const path = process.env.FEDKIT_IMPORT_MAP;
  try {
    if (inline) return JSON.parse(inline) as ImportMap;
    if (path) return JSON.parse(readFileSync(path, "utf8")) as ImportMap;
  } catch (e) {
    process.emitWarning(
      `[fedkit] @fedkit/node/register: could not parse import map from env: ${(e as Error).message}`,
    );
    return undefined;
  }
  return undefined;
}

const map = loadMapFromEnv();
if (map) {
  registerFederation(map);
} else {
  process.emitWarning(
    "[fedkit] @fedkit/node/register loaded but no import map found. " +
      "Set FEDKIT_IMPORT_MAP_JSON or FEDKIT_IMPORT_MAP, or call registerFederation(map) programmatically.",
  );
}
