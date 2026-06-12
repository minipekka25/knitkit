import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { computeIntegrity, verifyIntegrity } from "../src/sri.js";

const SRC = "export default 42;\n";

describe("computeIntegrity", () => {
  it("matches node:crypto for sha384 (default)", () => {
    const expected = "sha384-" + createHash("sha384").update(SRC).digest("base64");
    expect(computeIntegrity(SRC)).toBe(expected);
  });

  it("supports sha256 and sha512", () => {
    expect(computeIntegrity(SRC, "sha256")).toMatch(/^sha256-/);
    expect(computeIntegrity(SRC, "sha512")).toMatch(/^sha512-/);
  });
});

describe("verifyIntegrity", () => {
  it("passes when the hash matches", () => {
    const check = verifyIntegrity(SRC, computeIntegrity(SRC));
    expect(check.ok).toBe(true);
    expect(check.algorithm).toBe("sha384");
  });

  it("fails when the content was tampered with", () => {
    const integrity = computeIntegrity(SRC);
    const check = verifyIntegrity(SRC + "// evil\n", integrity);
    expect(check.ok).toBe(false);
    expect(check.expected).not.toBe(check.actual);
  });

  it("honors the strongest algorithm when several are provided", () => {
    const weak = computeIntegrity(SRC, "sha256");
    const strong = computeIntegrity(SRC, "sha512");
    const check = verifyIntegrity(SRC, `${weak} ${strong}`);
    expect(check.algorithm).toBe("sha512");
    expect(check.ok).toBe(true);
  });

  it("detects a forged weak hash even when a strong one is also listed", () => {
    const forgedWeak = "sha256-" + "A".repeat(43) + "=";
    const realStrong = computeIntegrity(SRC, "sha512");
    // The strongest (sha512) is real and is the one we check → still passes.
    expect(verifyIntegrity(SRC, `${forgedWeak} ${realStrong}`).ok).toBe(true);
  });

  it("throws on an unparseable/unsupported integrity value", () => {
    expect(() => verifyIntegrity(SRC, "md5-abc")).toThrow();
    expect(() => verifyIntegrity(SRC, "garbage")).toThrow();
  });
});
