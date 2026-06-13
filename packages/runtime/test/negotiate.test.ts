import { describe, expect, it } from "vitest";
import { negotiateShared } from "../src/negotiate.js";
import type { Manifest } from "../src/manifest.js";
import { isFedkitError } from "../src/errors.js";

function manifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    spec: "0.1",
    name: "checkout",
    exposes: {},
    shared: {},
    ...overrides,
  };
}

describe("negotiateShared", () => {
  it("returns empty result when no shared deps and no host shared", () => {
    const result = negotiateShared([], {}, "");
    expect(result.winners).toEqual({});
    expect(result.scopes).toEqual({});
    expect(result.importMap.imports).toEqual({});
  });

  describe("happy path", () => {
    it("picks a shared version satisfying every participant", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
          },
        },
      });
      const m2 = manifest({
        name: "marketing",
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
          },
        },
      });

      const result = negotiateShared(
        [
          { name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" },
          { name: "marketing", manifest: m2, baseUrl: "https://cdn.example.com/marketing/" },
        ],
        {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
          },
        },
        "https://cdn.example.com/host/",
      );

      expect(result.winners.react).toBeDefined();
      expect(result.winners.react!.version).toBe("18.3.1");
      expect(result.winners.react!.source).toMatch(/host|checkout|marketing/);
      expect(result.importMap.imports.react).toMatch(/react-18\.3\.1\.js$/);
    });

    it("picks the highest version that satisfies every participant's range", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          react: {
            version: "18.2.0",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.2.0.js",
          },
        },
      });
      const m2 = manifest({
        name: "marketing",
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
          },
        },
      });

      const result = negotiateShared([
        { name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" },
        { name: "marketing", manifest: m2, baseUrl: "https://cdn.example.com/marketing/" },
      ]);

      // Both 18.2.0 and 18.3.1 are in the set; 18.3.1 satisfies both ranges.
      expect(result.winners.react!.version).toBe("18.3.1");
      expect(result.winners.react!.source).toBe("marketing");
    });
  });

  describe("non-singleton conflict -> scopes fallback", () => {
    it("emits a scopes entry for the outlier when ranges are incompatible but not singleton", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          lodash: {
            version: "3.10.1",
            requiredVersion: "^3.0.0",
            singleton: false,
            url: "./shared/lodash-3.10.1.js",
          },
        },
      });
      const m2 = manifest({
        name: "marketing",
        shared: {
          lodash: {
            version: "4.17.21",
            requiredVersion: "^4.0.0",
            singleton: false,
            url: "./shared/lodash-4.17.21.js",
          },
        },
      });

      const result = negotiateShared([
        { name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" },
        { name: "marketing", manifest: m2, baseUrl: "https://cdn.example.com/marketing/" },
      ]);

      // No version satisfies both: 3.10.1 doesn't satisfy ^4.0.0, 4.17.21 doesn't satisfy ^3.0.0.
      // Both non-singleton -> winner is one (majority) and the other is a fallback via scopes.
      expect(result.winners.lodash).toBeDefined();
      expect(result.report.packages.lodash!.conflict).toBe(true);
      expect(Object.keys(result.scopes).length).toBeGreaterThan(0);
    });

    it("picks the most-requested major and scopes only the true outlier (3 participants)", () => {
      const mk = (name: string, version: string, range: string) =>
        manifest({
          name,
          shared: { lodash: { version, requiredVersion: range, singleton: false, url: `./lodash-${version}.js` } },
        });
      const result = negotiateShared([
        { name: "a", manifest: mk("a", "4.17.21", "^4.0.0"), baseUrl: "https://x/a/" },
        { name: "b", manifest: mk("b", "4.0.0", "^4.0.0"), baseUrl: "https://x/b/" },
        { name: "c", manifest: mk("c", "3.10.1", "^3.0.0"), baseUrl: "https://x/c/" },
      ]);
      // ^4 is the majority (2 of 3) and 4.17.21 is its highest version.
      expect(result.winners.lodash!.version).toBe("4.17.21");
      // b (^4.0.0) is satisfied by the winner → shares it; only c (^3) needs its own copy.
      expect(result.report.packages.lodash!.fallbacks.map((f) => f.from)).toEqual(["c"]);
    });
  });

  describe("singleton conflict -> coded error", () => {
    it("throws KNIT_ERR_SINGLETON_CONFLICT naming participants and their ranges", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          react: {
            version: "17.0.2",
            requiredVersion: "^17.0.0",
            singleton: true,
            url: "./shared/react-17.0.2.js",
          },
        },
      });
      const m2 = manifest({
        name: "marketing",
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
          },
        },
      });

      expect(() =>
        negotiateShared([
          { name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" },
          { name: "marketing", manifest: m2, baseUrl: "https://cdn.example.com/marketing/" },
        ]),
      ).toThrowError(/Singleton conflict for "react"/);

      try {
        negotiateShared([
          { name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" },
          { name: "marketing", manifest: m2, baseUrl: "https://cdn.example.com/marketing/" },
        ]);
      } catch (e) {
        expect(isFedkitError(e)).toBe(true);
        if (isFedkitError(e)) {
          expect(e.code).toBe("KNIT_ERR_SINGLETON_CONFLICT");
          expect(e.suggestion).toBeTruthy();
        }
      }
    });
  });

  describe("host has no shared decl, remote does", () => {
    it("remote's own asset wins", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
          },
        },
      });

      const result = negotiateShared([{ name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" }]);
      expect(result.winners.react!.version).toBe("18.3.1");
      expect(result.winners.react!.source).toBe("checkout");
    });
  });

  describe("resolveUrl", () => {
    it("resolves relative URLs against baseUrl", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
          },
        },
      });
      const result = negotiateShared([{ name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" }]);
      expect(result.importMap.imports.react).toBe("https://cdn.example.com/checkout/shared/react-18.3.1.js");
    });
  });

  describe("report", () => {
    it("records winners and fallbacks per package", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          lodash: {
            version: "3.10.1",
            requiredVersion: "^3.0.0",
            singleton: false,
            url: "./shared/lodash-3.10.1.js",
          },
        },
      });
      const m2 = manifest({
        name: "marketing",
        shared: {
          lodash: {
            version: "4.17.21",
            requiredVersion: "^4.0.0",
            singleton: false,
            url: "./shared/lodash-4.17.21.js",
          },
        },
      });
      const result = negotiateShared([
        { name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" },
        { name: "marketing", manifest: m2, baseUrl: "https://cdn.example.com/marketing/" },
      ]);
      expect(result.report.packages.lodash!.winner.version).toBeDefined();
      expect(result.report.packages.lodash!.fallbacks.length).toBeGreaterThan(0);
    });
  });

  describe("integrity propagation", () => {
    it("carries the winner's integrity into the import map", () => {
      const m1 = manifest({
        name: "checkout",
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
            integrity: "sha384-abc",
          },
        },
      });
      const result = negotiateShared([{ name: "checkout", manifest: m1, baseUrl: "https://cdn.example.com/checkout/" }]);
      expect(result.importMap.integrity).toBeDefined();
      expect(result.importMap.integrity!.react).toBe("sha384-abc");
    });
  });

  describe("three participants", () => {
    it("picks the highest version satisfying every range", () => {
      const mk = (name: string, version: string) =>
        manifest({
          name,
          shared: { react: { version, requiredVersion: "^18.0.0", singleton: true, url: `./r-${version}.js` } },
        });
      const result = negotiateShared([
        { name: "a", manifest: mk("a", "18.1.0"), baseUrl: "https://x/a/" },
        { name: "b", manifest: mk("b", "18.3.1"), baseUrl: "https://x/b/" },
        { name: "c", manifest: mk("c", "18.2.0"), baseUrl: "https://x/c/" },
      ]);
      expect(result.winners.react!.version).toBe("18.3.1");
      expect(Object.keys(result.scopes)).toHaveLength(0);
    });
  });

  describe("host shared validation", () => {
    it("throws KNIT_ERR_MANIFEST_INVALID when a host shared decl has no url", () => {
      try {
        negotiateShared(
          [],
          { react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true } as never },
          "https://host/",
        );
        expect.fail("expected throw");
      } catch (e) {
        expect(isFedkitError(e) && e.code).toBe("KNIT_ERR_MANIFEST_INVALID");
      }
    });

    it("honors importAs to rename the host's package key", () => {
      const result = negotiateShared(
        [],
        {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.0.0",
            singleton: true,
            url: "https://host/react.js",
            importAs: "react",
          },
        },
        "https://host/",
      );
      expect(result.importMap.imports.react).toBe("https://host/react.js");
      expect(result.winners.react!.source).toBe("host");
    });
  });
});
