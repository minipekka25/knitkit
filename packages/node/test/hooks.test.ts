import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initialize, resolve, load } from "../src/hooks.js";
import { computeIntegrity } from "../src/sri.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// nextResolve/nextLoad stubs that return a sentinel so we can assert fall-through.
const nextResolve = (sentinel: unknown) => vi.fn(async () => sentinel as never);
const nextLoad = (sentinel: unknown) => vi.fn(async () => sentinel as never);
const setFetch = (fn: (url: string) => Promise<Response>) => {
  globalThis.fetch = fn as unknown as typeof fetch;
};

describe("hooks.resolve", () => {
  beforeEach(() => {
    initialize({ importMap: { imports: { react: "https://cdn/react.js", "widgets/Counter": "https://cdn/counter.js" } } });
  });

  it("maps a bare specifier via the import map", async () => {
    const r = await resolve("react", {}, nextResolve({ url: "DEFAULT" }));
    expect(r).toEqual({ url: "https://cdn/react.js", shortCircuit: true });
  });

  it("resolves a relative import against an http parent", async () => {
    const r = await resolve("./util.js", { parentURL: "https://cdn/app/index.js" }, nextResolve({ url: "DEFAULT" }));
    expect(r.url).toBe("https://cdn/app/util.js");
  });

  it("falls through to nextResolve for an unmapped bare specifier", async () => {
    const nx = nextResolve({ url: "DEFAULT" });
    const r = await resolve("lodash", {}, nx);
    expect(r).toEqual({ url: "DEFAULT" });
    expect(nx).toHaveBeenCalledOnce();
  });

  it("falls through for a relative import with a non-http parent", async () => {
    const nx = nextResolve({ url: "DEFAULT" });
    await resolve("./x.js", { parentURL: "file:///app/index.js" }, nx);
    expect(nx).toHaveBeenCalledOnce();
  });
});

describe("hooks.load", () => {
  it("defers non-http URLs to nextLoad", async () => {
    initialize({ importMap: { imports: {} } });
    const nx = nextLoad({ format: "module", source: "X" });
    const r = await load("file:///x.js", {}, nx);
    expect(nx).toHaveBeenCalledOnce();
    expect(r.source).toBe("X");
  });

  it("fetches an http module and returns it as ESM", async () => {
    initialize({ importMap: { imports: {} } });
    setFetch(async () => new Response("export default 1;", { status: 200 }));
    const r = await load("https://cdn/a1.js", {}, nextLoad(null));
    expect(r.format).toBe("module");
    expect(r.source).toContain("export default 1;");
  });

  it("passes SRI when the hash matches", async () => {
    const src = "export const ok = 1;\n";
    initialize({ importMap: { imports: { "w/ok": "https://cdn/ok.js" }, integrity: { "w/ok": computeIntegrity(src) } } });
    setFetch(async () => new Response(src, { status: 200 }));
    const r = await load("https://cdn/ok.js", {}, nextLoad(null));
    expect(r.source).toContain("ok");
  });

  it("refuses tampered content with KNIT_ERR_SRI_MISMATCH", async () => {
    initialize({ importMap: { imports: { "w/x": "https://cdn/sri.js" }, integrity: { "w/x": computeIntegrity("DIFFERENT CONTENT") } } });
    setFetch(async () => new Response("export const x = 1;\n", { status: 200 }));
    await expect(load("https://cdn/sri.js", {}, nextLoad(null))).rejects.toMatchObject({ code: "KNIT_ERR_SRI_MISMATCH" });
  });

  it("caches a fetched module so a second load does not refetch", async () => {
    initialize({ importMap: { imports: {} } });
    const f = vi.fn(async () => new Response("export default 2;", { status: 200 }));
    setFetch(f);
    await load("https://cdn/cache.js", {}, nextLoad(null));
    await load("https://cdn/cache.js", {}, nextLoad(null));
    expect(f).toHaveBeenCalledOnce();
  });

  it("wraps a network failure in KNIT_ERR_LOAD_FAILED", async () => {
    initialize({ importMap: { imports: {} } });
    setFetch(async () => {
      throw new Error("connection refused");
    });
    await expect(load("https://cdn/down1.js", {}, nextLoad(null))).rejects.toMatchObject({ code: "KNIT_ERR_LOAD_FAILED" });
  });

  it("wraps a non-OK response in KNIT_ERR_LOAD_FAILED", async () => {
    initialize({ importMap: { imports: {} } });
    setFetch(async () => new Response("nope", { status: 404 }));
    await expect(load("https://cdn/down2.js", {}, nextLoad(null))).rejects.toMatchObject({ code: "KNIT_ERR_LOAD_FAILED" });
  });
});
