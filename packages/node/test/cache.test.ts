import { describe, expect, it } from "vitest";
import { ModuleCache } from "../src/cache.js";

describe("ModuleCache", () => {
  it("stores and retrieves modules by URL", () => {
    const c = new ModuleCache();
    expect(c.has("https://x/a.js")).toBe(false);
    c.set("https://x/a.js", { source: "export default 1;", format: "module" });
    expect(c.has("https://x/a.js")).toBe(true);
    expect(c.get("https://x/a.js")?.source).toBe("export default 1;");
    expect(c.size).toBe(1);
  });

  it("deletes and clears", () => {
    const c = new ModuleCache();
    c.set("a", { source: "1", format: "module" });
    c.set("b", { source: "2", format: "module" });
    expect(c.delete("a")).toBe(true);
    expect(c.delete("a")).toBe(false);
    expect(c.size).toBe(1);
    c.clear();
    expect(c.size).toBe(0);
  });
});
