import { readFile } from "node:fs/promises";
import { validateManifest, isKnitError } from "@knitkit/runtime";

export async function validateCommand(manifestPath: string): Promise<{ ok: true } | { ok: false; message: string; suggestion?: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (e) {
    return { ok: false, message: `Failed to read ${manifestPath}: ${(e as Error).message}` };
  }
  try {
    validateManifest(raw, manifestPath);
    return { ok: true };
  } catch (e) {
    if (isKnitError(e)) return { ok: false, message: e.message, suggestion: e.suggestion };
    return { ok: false, message: (e as Error).message };
  }
}
