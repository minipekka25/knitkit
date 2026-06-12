import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { registerRemotes, getLastResult } from "../src/registerRemotes.js";
import { loadRemote } from "../src/loadRemote.js";
import type { Manifest } from "../src/manifest.js";
import { isFedkitError } from "../src/errors.js";

interface FakeScript {
  type: string;
  textContent: string;
}

function setupDom(): FakeScript[] {
  const scripts: FakeScript[] = [];
  (globalThis as unknown as { document: unknown }).document = {
    querySelector(sel: string) {
      if (sel.includes("importmap")) return scripts.find((s) => s.type === "importmap") ?? null;
      return null;
    },
    createElement(): FakeScript {
      return { type: "", textContent: "" };
    },
    head: { appendChild(el: FakeScript) { scripts.push(el); } },
  };
  return scripts;
}

function manifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    spec: "0.1",
    name: "checkout",
    exposes: { "./CartWidget": { url: "./exposes/CartWidget.js" } },
    shared: {
      react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true, url: "./shared/react-18.3.1.js" },
    },
    ...overrides,
  };
}

let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  setupDom();
});

afterEach(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
  delete (globalThis as unknown as { document?: unknown }).document;
});

describe("registerRemotes", () => {
  it("registers an inline manifest and exposes the result via getLastResult", async () => {
    const result = await registerRemotes([{ name: "checkout", manifest: manifest() }]);
    expect(result.winners.react!.version).toBe("18.3.1");
    expect(getLastResult()).toBe(result);
  });

  it("fetches a manifest by URL and resolves relative URLs against the response URL", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        url: "https://cdn.example.com/checkout/fed.manifest.json",
        json: async () => manifest(),
      }) as unknown as Response) as typeof globalThis.fetch;

    const result = await registerRemotes([
      { name: "checkout", manifest: "https://cdn.example.com/checkout/fed.manifest.json" },
    ]);
    expect(result.importMap.imports.react).toBe("https://cdn.example.com/checkout/shared/react-18.3.1.js");

    // The exposed module's URL also resolves against the response URL.
    await expect(loadRemote("checkout/CartWidget")).rejects.toMatchObject({ code: "FED_ERR_LOAD_FAILED" });
  });

  it("wraps a network failure in FED_ERR_LOAD_FAILED", async () => {
    globalThis.fetch = (async () => {
      throw new Error("connection refused");
    }) as typeof globalThis.fetch;
    try {
      await registerRemotes([{ name: "checkout", manifest: "https://down.example.com/m.json" }]);
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.code).toBe("FED_ERR_LOAD_FAILED");
    }
  });

  it("wraps a non-OK HTTP response in FED_ERR_LOAD_FAILED", async () => {
    globalThis.fetch = (async () =>
      ({ ok: false, status: 404, url: "https://cdn/m.json", json: async () => ({}) }) as unknown as Response) as typeof globalThis.fetch;
    try {
      await registerRemotes([{ name: "checkout", manifest: "https://cdn/m.json" }]);
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.code).toBe("FED_ERR_LOAD_FAILED");
      expect(isFedkitError(e) && e.message).toMatch(/404/);
    }
  });
});
