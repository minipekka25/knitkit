import { describe, it, expect, beforeEach } from "vitest";
import { getOverrides, setOverride, removeOverride, clearOverrides } from "../src/storage.js";

beforeEach(() => localStorage.clear());

describe("override storage", () => {
  it("starts empty", () => {
    expect(getOverrides()).toEqual({});
  });

  it("sets, reads, removes and clears", () => {
    setOverride("checkout", "http://localhost:5174/fed.manifest.json");
    setOverride("profile", "http://localhost:5175/fed.manifest.json");
    expect(getOverrides()).toEqual({
      checkout: "http://localhost:5174/fed.manifest.json",
      profile: "http://localhost:5175/fed.manifest.json",
    });

    removeOverride("checkout");
    expect(getOverrides()).toEqual({ profile: "http://localhost:5175/fed.manifest.json" });

    clearOverrides();
    expect(getOverrides()).toEqual({});
  });

  it("ignores non-string values and corrupt JSON", () => {
    localStorage.setItem("fedkit:overrides", JSON.stringify({ a: "ok", b: 42 }));
    expect(getOverrides()).toEqual({ a: "ok" });

    localStorage.setItem("fedkit:overrides", "{not json");
    expect(getOverrides()).toEqual({});
  });
});
