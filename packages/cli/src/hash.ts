import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function sha384Integrity(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const hash = createHash("sha384").update(buf).digest("base64");
  return `sha384-${hash}`;
}
