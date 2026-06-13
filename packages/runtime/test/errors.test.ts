import { describe, expect, it } from "vitest";
import { KnitError, isKnitError } from "../src/errors.js";
import * as runtime from "../src/index.js";

describe("KnitError", () => {
  it("carries a code and an optional suggestion", () => {
    const e = new KnitError("KNIT_ERR_LOAD_FAILED", "boom", "try again");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("KnitError");
    expect(e.code).toBe("KNIT_ERR_LOAD_FAILED");
    expect(e.suggestion).toBe("try again");
    expect(isKnitError(e)).toBe(true);
  });

  it("isKnitError rejects plain errors", () => {
    expect(isKnitError(new Error("x"))).toBe(false);
    expect(isKnitError(null)).toBe(false);
  });

  it("keeps the deprecated FedkitError aliases pointing at the new symbols", () => {
    // Back-compat: the old names must still resolve to the renamed implementation
    // until they are removed in a future minor.
    expect(runtime.FedkitError).toBe(runtime.KnitError);
    expect(runtime.isFedkitError).toBe(runtime.isKnitError);
    const e = new runtime.FedkitError("KNIT_ERR_NOT_REGISTERED", "nope");
    expect(e).toBeInstanceOf(runtime.KnitError);
    expect(runtime.isFedkitError(e)).toBe(true);
  });
});
