import { createHash } from "node:crypto";

export type SriAlgorithm = "sha256" | "sha384" | "sha512";

const SUPPORTED: ReadonlySet<string> = new Set(["sha256", "sha384", "sha512"]);

export interface IntegrityCheck {
  ok: boolean;
  algorithm: SriAlgorithm;
  expected: string;
  actual: string;
}

/** Compute a Subresource Integrity string ("<alg>-<base64>") for the given content. */
export function computeIntegrity(content: string | Uint8Array, algorithm: SriAlgorithm = "sha384"): string {
  const digest = createHash(algorithm).update(content).digest("base64");
  return `${algorithm}-${digest}`;
}

/**
 * Verify content against an SRI `integrity` string. The string may contain several
 * space-separated hashes; per the SRI spec we honor the strongest algorithm present.
 * Returns details so callers can build precise, coded error messages.
 */
export function verifyIntegrity(content: string | Uint8Array, integrity: string): IntegrityCheck {
  const candidates = parseIntegrity(integrity);
  if (candidates.length === 0) {
    throw new Error(`Unparseable or unsupported integrity value: "${integrity}"`);
  }
  // Strongest first (sha512 > sha384 > sha256).
  candidates.sort((a, b) => strength(b.algorithm) - strength(a.algorithm));
  const strongest = candidates[0]!;
  const actual = createHash(strongest.algorithm).update(content).digest("base64");
  return {
    ok: timingSafeStringEqual(actual, strongest.expected),
    algorithm: strongest.algorithm,
    expected: strongest.expected,
    actual,
  };
}

interface ParsedHash {
  algorithm: SriAlgorithm;
  expected: string;
}

function parseIntegrity(integrity: string): ParsedHash[] {
  const out: ParsedHash[] = [];
  for (const token of integrity.trim().split(/\s+/)) {
    if (!token) continue;
    const dash = token.indexOf("-");
    if (dash <= 0) continue;
    const alg = token.slice(0, dash);
    const expected = token.slice(dash + 1);
    if (SUPPORTED.has(alg) && expected) {
      out.push({ algorithm: alg as SriAlgorithm, expected });
    }
  }
  return out;
}

function strength(alg: SriAlgorithm): number {
  return alg === "sha512" ? 3 : alg === "sha384" ? 2 : 1;
}

/** Length-checked, content-independent-time string comparison (base64 digests). */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
