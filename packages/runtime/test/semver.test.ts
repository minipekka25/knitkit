import { describe, expect, it } from "vitest";
import { satisfies, maxSatisfying, isValidVersion, isValidRange, type Version } from "../src/semver.js";

describe("semver", () => {
  describe("parse", () => {
    it("parses a strict version", () => {
      expect(satisfies("1.2.3", "1.2.3")).toBe(true);
    });

    it("rejects malformed versions", () => {
      expect(() => satisfies("not-a-version", "1.0.0")).toThrow();
      expect(() => satisfies("1.2", "1.0.0")).toThrow();
    });
  });

  describe("caret ranges (^)", () => {
    it("^1.2.3 allows 1.x.y >= 1.2.3", () => {
      expect(satisfies("1.2.3", "^1.2.3")).toBe(true);
      expect(satisfies("1.9.9", "^1.2.3")).toBe(true);
      expect(satisfies("2.0.0", "^1.2.3")).toBe(false);
      expect(satisfies("1.2.2", "^1.2.3")).toBe(false);
    });

    it("^0.2.3 pins to 0.2.x (caret on 0.x is special)", () => {
      expect(satisfies("0.2.3", "^0.2.3")).toBe(true);
      expect(satisfies("0.2.99", "^0.2.3")).toBe(true);
      expect(satisfies("0.3.0", "^0.2.3")).toBe(false);
    });

    it("^0.0.3 pins to exactly 0.0.3", () => {
      expect(satisfies("0.0.3", "^0.0.3")).toBe(true);
      expect(satisfies("0.0.4", "^0.0.3")).toBe(false);
    });
  });

  describe("tilde ranges (~)", () => {
    it("~1.2.3 allows 1.2.x >= 1.2.3", () => {
      expect(satisfies("1.2.3", "~1.2.3")).toBe(true);
      expect(satisfies("1.2.99", "~1.2.3")).toBe(true);
      expect(satisfies("1.3.0", "~1.2.3")).toBe(false);
    });
  });

  describe("exact ranges", () => {
    it("1.2.3 is exact", () => {
      expect(satisfies("1.2.3", "1.2.3")).toBe(true);
      expect(satisfies("1.2.4", "1.2.3")).toBe(false);
    });
  });

  describe("x-ranges", () => {
    it("* matches anything", () => {
      expect(satisfies("0.0.0", "*")).toBe(true);
      expect(satisfies("99.99.99", "*")).toBe(true);
    });

    it("1.x matches 1.any.any", () => {
      expect(satisfies("1.0.0", "1.x")).toBe(true);
      expect(satisfies("1.99.99", "1.x")).toBe(true);
      expect(satisfies("2.0.0", "1.x")).toBe(false);
    });

    it("1.2.x matches 1.2.any", () => {
      expect(satisfies("1.2.0", "1.2.x")).toBe(true);
      expect(satisfies("1.2.99", "1.2.x")).toBe(true);
      expect(satisfies("1.3.0", "1.2.x")).toBe(false);
    });
  });

  describe("comparison ranges (>=, >, <=, <, =)", () => {
    it(">= 1.2.3", () => {
      expect(satisfies("1.2.3", ">=1.2.3")).toBe(true);
      expect(satisfies("1.2.4", ">=1.2.3")).toBe(true);
      expect(satisfies("1.2.2", ">=1.2.3")).toBe(false);
    });

    it("> 1.2.3", () => {
      expect(satisfies("1.2.4", ">1.2.3")).toBe(true);
      expect(satisfies("1.2.3", ">1.2.3")).toBe(false);
    });
  });

  describe("pre-release handling", () => {
    it("treats pre-release as a different version (no semver pre-release precedence for v0)", () => {
      // v0 supports exact and comparison; pre-releases are valid versions for equality.
      expect(satisfies("1.2.3-rc.1", "1.2.3-rc.1")).toBe(true);
      expect(satisfies("1.2.3-rc.1", "1.2.3")).toBe(false);
    });
  });

  describe("maxSatisfying", () => {
    const versions: Version[] = ["1.0.0", "1.2.3", "1.2.4", "1.3.0", "2.0.0", "2.1.5"];

    it("picks the highest version that satisfies the range", () => {
      expect(maxSatisfying(versions, "^1.2.0")).toBe("1.3.0");
      expect(maxSatisfying(versions, "^1.0.0")).toBe("1.3.0");
      expect(maxSatisfying(versions, "^2.0.0")).toBe("2.1.5");
      expect(maxSatisfying(versions, "^3.0.0")).toBeUndefined();
    });

    it("returns undefined when no version satisfies", () => {
      expect(maxSatisfying(versions, "9.0.0")).toBeUndefined();
    });

    it("handles *", () => {
      expect(maxSatisfying(versions, "*")).toBe("2.1.5");
    });

    it("prefers a release over a pre-release of the same x.y.z", () => {
      expect(maxSatisfying(["1.2.3-rc.1", "1.2.3"], ">=1.2.3-rc.1")).toBe("1.2.3");
    });
  });

  describe("comparison ranges (<=, <, =, bare x-ranges)", () => {
    it("<= and <", () => {
      expect(satisfies("1.2.3", "<=1.2.3")).toBe(true);
      expect(satisfies("1.2.4", "<=1.2.3")).toBe(false);
      expect(satisfies("1.2.2", "<1.2.3")).toBe(true);
      expect(satisfies("1.2.3", "<1.2.3")).toBe(false);
    });

    it("= is exact", () => {
      expect(satisfies("1.2.3", "=1.2.3")).toBe(true);
      expect(satisfies("1.2.4", "=1.2.3")).toBe(false);
    });

    it("bare '1' behaves like 1.x", () => {
      expect(satisfies("1.0.0", "1")).toBe(true);
      expect(satisfies("1.9.9", "1")).toBe(true);
      expect(satisfies("2.0.0", "1")).toBe(false);
    });

    it("bare '1.2' behaves like 1.2.x", () => {
      expect(satisfies("1.2.0", "1.2")).toBe(true);
      expect(satisfies("1.2.9", "1.2")).toBe(true);
      expect(satisfies("1.3.0", "1.2")).toBe(false);
    });
  });

  describe("isValidVersion / isValidRange", () => {
    it("isValidVersion accepts x.y.z and pre-release, rejects partial/garbage", () => {
      expect(isValidVersion("1.2.3")).toBe(true);
      expect(isValidVersion("1.2.3-rc.1")).toBe(true);
      expect(isValidVersion("1.2")).toBe(false);
      expect(isValidVersion("latest")).toBe(false);
      expect(isValidVersion("")).toBe(false);
    });

    it("isValidRange accepts supported ranges", () => {
      for (const r of [
        "^18.2.0", "~1.2.3", "1.x", "1.2.x", "*", ">=1.0.0", "<2.0.0", "=1.2.3", "1", "1.2",
        "^18", "~1", "^1.2", "^17 || ^18", ">=1.2.0 <2.0.0", ">= 1.2.0",
      ]) {
        expect(isValidRange(r)).toBe(true);
      }
    });

    it("isValidRange rejects ranges the matcher cannot parse", () => {
      expect(isValidRange("not-a-range")).toBe(false);
      expect(isValidRange(">=garbage")).toBe(false);
      expect(isValidRange("^1.2.3 || nope")).toBe(false);
    });
  });

  describe("union (||) ranges", () => {
    it("satisfies if any union member matches", () => {
      expect(satisfies("17.0.2", "^17 || ^18")).toBe(true);
      expect(satisfies("18.3.1", "^17 || ^18")).toBe(true);
      expect(satisfies("16.8.0", "^17 || ^18")).toBe(false);
      expect(satisfies("19.0.0", "^17 || ^18")).toBe(false);
    });

    it("maxSatisfying picks the highest across all members", () => {
      expect(maxSatisfying(["16.8.0", "17.0.2", "18.3.1", "19.0.0"], "^17 || ^18")).toBe("18.3.1");
    });
  });

  describe("intersection (whitespace) ranges", () => {
    it("requires every comparator in the set", () => {
      expect(satisfies("1.5.0", ">=1.2.0 <2.0.0")).toBe(true);
      expect(satisfies("1.2.0", ">=1.2.0 <2.0.0")).toBe(true);
      expect(satisfies("2.0.0", ">=1.2.0 <2.0.0")).toBe(false);
      expect(satisfies("1.1.0", ">=1.2.0 <2.0.0")).toBe(false);
    });

    it("tolerates a space between an operator and its version", () => {
      expect(satisfies("1.5.0", ">= 1.2.0 < 2.0.0")).toBe(true);
    });
  });

  describe("partial caret / tilde", () => {
    it("^18 == ^18.0.0", () => {
      expect(satisfies("18.3.1", "^18")).toBe(true);
      expect(satisfies("18.0.0", "^18")).toBe(true);
      expect(satisfies("19.0.0", "^18")).toBe(false);
      expect(satisfies("17.9.9", "^18")).toBe(false);
    });

    it("^1.2 allows minor/patch up to <2.0.0", () => {
      expect(satisfies("1.9.9", "^1.2")).toBe(true);
      expect(satisfies("1.1.0", "^1.2")).toBe(false);
      expect(satisfies("2.0.0", "^1.2")).toBe(false);
    });

    it("^0 == <1.0.0 and ^0.0 == <0.1.0", () => {
      expect(satisfies("0.9.9", "^0")).toBe(true);
      expect(satisfies("1.0.0", "^0")).toBe(false);
      expect(satisfies("0.0.9", "^0.0")).toBe(true);
      expect(satisfies("0.1.0", "^0.0")).toBe(false);
    });

    it("~1 == <2.0.0 and ~1.2 == <1.3.0", () => {
      expect(satisfies("1.9.0", "~1")).toBe(true);
      expect(satisfies("2.0.0", "~1")).toBe(false);
      expect(satisfies("1.2.9", "~1.2")).toBe(true);
      expect(satisfies("1.3.0", "~1.2")).toBe(false);
    });
  });
});
