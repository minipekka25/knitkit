import { describe, expect, it } from "vitest";
import { validateManifest } from "../src/manifest.js";
import { isFedkitError } from "../src/errors.js";

describe("validateManifest", () => {
  it("accepts a minimal valid manifest", () => {
    const m = validateManifest(
      {
        spec: "0.1",
        name: "checkout",
        exposes: { "./Foo": { url: "./Foo.js" } },
        shared: {},
      },
      "inline",
    );
    expect(m.name).toBe("checkout");
  });

  it("rejects non-object input", () => {
    try {
      validateManifest("not an object", "inline");
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.code).toBe("FED_ERR_MANIFEST_INVALID");
    }
  });

  it("rejects wrong spec version", () => {
    try {
      validateManifest(
        { spec: "0.2", name: "x", exposes: {}, shared: {} },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/spec/);
    }
  });

  it("rejects invalid name", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "Not Allowed!", exposes: {}, shared: {} },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/name/);
    }
  });

  it("rejects missing exposes", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "x", shared: {} },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/exposes/);
    }
  });

  it("rejects missing shared", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "x", exposes: {} },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/shared/);
    }
  });

  it("rejects expose entries missing url", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "x", exposes: { "./Foo": {} }, shared: {} },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/expose entry/);
    }
  });

  it("rejects shared entries missing version or requiredVersion", () => {
    try {
      validateManifest(
        {
          spec: "0.1",
          name: "x",
          exposes: {},
          shared: { react: { version: "18.0.0" } },
        },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/requiredVersion/);
    }
  });

  it("accepts full manifest with optional fields", () => {
    const m = validateManifest(
      {
        spec: "0.1",
        name: "checkout",
        exposes: {
          "./CartWidget": {
            url: "./exposes/CartWidget.js",
            types: "./types/CartWidget.d.ts",
          },
        },
        shared: {
          react: {
            version: "18.3.1",
            requiredVersion: "^18.2.0",
            singleton: true,
            url: "./shared/react-18.3.1.js",
            integrity: "sha384-...",
          },
        },
        meta: { framework: "react@18" },
      },
      "inline",
    );
    expect(m.shared.react!.integrity).toBe("sha384-...");
    expect(m.meta?.framework).toBe("react@18");
  });

  it("rejects a shared version that is not a valid semver", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "x", exposes: {}, shared: { react: { version: "latest", requiredVersion: "^18.0.0" } } },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.code).toBe("FED_ERR_MANIFEST_INVALID");
      expect(isFedkitError(e) && e.message).toMatch(/version/);
    }
  });

  it("rejects a shared requiredVersion that the matcher cannot parse", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "x", exposes: {}, shared: { react: { version: "18.3.1", requiredVersion: "garbage||range" } } },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.code).toBe("FED_ERR_MANIFEST_INVALID");
      expect(isFedkitError(e) && e.message).toMatch(/requiredVersion/);
    }
  });

  it("rejects a non-string shared url", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "x", exposes: {}, shared: { react: { version: "18.3.1", requiredVersion: "^18.0.0", url: 42 } } },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/url/);
    }
  });

  it("rejects a non-boolean singleton", () => {
    try {
      validateManifest(
        { spec: "0.1", name: "x", exposes: {}, shared: { react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: "yes" } } },
        "inline",
      );
      expect.fail("expected throw");
    } catch (e) {
      expect(isFedkitError(e) && e.message).toMatch(/singleton/);
    }
  });
});
