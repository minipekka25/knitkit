import { describe, it, expect, beforeEach } from "vitest";
import { applyOverrides } from "../src/applyOverrides.js";
import { setOverride } from "../src/storage.js";

beforeEach(() => localStorage.clear());

describe("applyOverrides", () => {
  const remotes = [
    { name: "checkout", manifest: "https://cdn.example.com/checkout/knit.manifest.json" },
    { name: "profile", manifest: "https://cdn.example.com/profile/knit.manifest.json" },
  ];

  it("returns the input unchanged when there are no overrides", () => {
    expect(applyOverrides(remotes)).toBe(remotes);
  });

  it("rewrites only the overridden remote's manifest", () => {
    setOverride("checkout", "http://localhost:5174/knit.manifest.json");
    const result = applyOverrides(remotes);
    expect(result[0]).toEqual({ name: "checkout", manifest: "http://localhost:5174/knit.manifest.json" });
    expect(result[1]).toBe(remotes[1]); // untouched remote passes through by reference
  });

  it("does not mutate the input array or items", () => {
    setOverride("checkout", "http://localhost:5174/knit.manifest.json");
    applyOverrides(remotes);
    expect(remotes[0]!.manifest).toBe("https://cdn.example.com/checkout/knit.manifest.json");
  });

  it("leaves unknown overrides without a matching remote alone", () => {
    setOverride("does-not-exist", "http://localhost:9999/knit.manifest.json");
    expect(applyOverrides(remotes).map((r) => r.manifest)).toEqual(remotes.map((r) => r.manifest));
  });
});
