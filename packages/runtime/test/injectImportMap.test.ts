import { describe, expect, it, afterEach } from "vitest";
import { injectImportMap } from "../src/injectImportMap.js";
import { isKnitError } from "../src/errors.js";

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
    head: {
      appendChild(el: FakeScript) {
        scripts.push(el);
      },
    },
  };
  return scripts;
}

afterEach(() => {
  delete (globalThis as unknown as { document?: unknown }).document;
});

describe("injectImportMap", () => {
  it("creates a new <script type=importmap> when none exists", () => {
    const scripts = setupDom();
    injectImportMap({ imports: { react: "https://cdn/react.js" } });
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.type).toBe("importmap");
    expect(JSON.parse(scripts[0]!.textContent)).toEqual({ imports: { react: "https://cdn/react.js" } });
  });

  it("merges into an existing import map, preserving prior entries", () => {
    const scripts = setupDom();
    injectImportMap({ imports: { react: "https://cdn/react.js" } });
    injectImportMap({ imports: { vue: "https://cdn/vue.js" } });
    expect(scripts).toHaveLength(1);
    const parsed = JSON.parse(scripts[0]!.textContent);
    expect(parsed.imports.react).toBe("https://cdn/react.js");
    expect(parsed.imports.vue).toBe("https://cdn/vue.js");
  });

  it("a later entry for the same key overrides the earlier one", () => {
    const scripts = setupDom();
    injectImportMap({ imports: { react: "https://cdn/react-a.js" } });
    injectImportMap({ imports: { react: "https://cdn/react-b.js" } });
    const parsed = JSON.parse(scripts[0]!.textContent);
    expect(parsed.imports.react).toBe("https://cdn/react-b.js");
  });

  it("throws a coded error when there is no document", () => {
    delete (globalThis as unknown as { document?: unknown }).document;
    try {
      injectImportMap({ imports: {} });
      expect.fail("expected throw");
    } catch (e) {
      expect(isKnitError(e) && e.code).toBe("KNIT_ERR_IMPORT_MAP_INJECTION_FAILED");
    }
  });
});
