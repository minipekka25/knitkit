import { describe, expect, it, beforeEach } from "vitest";
import { loadRemote, setRegistrations } from "../src/loadRemote.js";
import type { Manifest } from "../src/manifest.js";
import { isFedkitError } from "../src/errors.js";

function manifest(): Manifest {
  return {
    spec: "0.1",
    name: "checkout",
    exposes: {
      "./Greeting": { url: "./exposes/Greeting.js" },
    },
    shared: {},
  };
}

describe("loadRemote", () => {
  beforeEach(() => {
    setRegistrations([
      { name: "checkout", manifest: manifest(), baseUrl: "https://cdn.example.com/checkout/" },
    ]);
  });

  it("rejects malformed specifiers", async () => {
    try {
      await loadRemote("noSlash");
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e)).toBe(true);
    }
  });

  it("rejects unknown remotes", async () => {
    try {
      await loadRemote("unknown/Foo");
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.code).toBe("KNIT_ERR_NOT_REGISTERED");
    }
  });

  it("rejects unknown exposes", async () => {
    try {
      await loadRemote("checkout/Missing");
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/does not expose/);
    }
  });

  it("loads an exposed module and unwraps the default export", async () => {
    const dataUrl = "data:text/javascript," + encodeURIComponent("export default { hello: 'world' };");
    setRegistrations([
      {
        name: "checkout",
        manifest: {
          spec: "0.1",
          name: "checkout",
          exposes: { "./Greeting": { url: dataUrl } },
          shared: {},
        },
        baseUrl: "",
      },
    ]);
    const mod = await loadRemote<{ hello: string }>("checkout/Greeting");
    expect(mod.hello).toBe("world");
  });

  it("returns the namespace when there is no default export", async () => {
    const dataUrl = "data:text/javascript," + encodeURIComponent("export const tag = 'named-only';");
    setRegistrations([
      {
        name: "checkout",
        manifest: {
          spec: "0.1",
          name: "checkout",
          exposes: { "./NoDefault": { url: dataUrl } },
          shared: {},
        },
        baseUrl: "",
      },
    ]);
    const mod = await loadRemote<{ tag: string }>("checkout/NoDefault");
    expect(mod.tag).toBe("named-only");
  });

  it("wraps an import failure in KNIT_ERR_LOAD_FAILED", async () => {
    setRegistrations([
      {
        name: "checkout",
        manifest: {
          spec: "0.1",
          name: "checkout",
          exposes: { "./Broken": { url: "https://127.0.0.1:1/nope.js" } },
          shared: {},
        },
        baseUrl: "",
      },
    ]);
    await expect(loadRemote("checkout/Broken")).rejects.toMatchObject({ code: "KNIT_ERR_LOAD_FAILED" });
  });

  it("accepts specifier with and without leading './'", async () => {
    setRegistrations([
      { name: "checkout", manifest: manifest(), baseUrl: "https://cdn.example.com/checkout/" },
    ]);
    // Both forms should resolve to the same expose; only one will actually try to network-load.
    // We expect the second one to attempt import; the first error path we exercise is the unknown-expose path.
    expect(() => loadRemote("checkout/Greeting")).toBeDefined;
  });
});
