import { describe, expect, it } from "vitest";
import { getShareInfo, setShareInfo } from "../src/getShareInfo.js";
import { negotiateShared } from "../src/negotiate.js";
import type { Manifest } from "../src/manifest.js";

describe("getShareInfo", () => {
  it("returns an empty report before any negotiation", () => {
    expect(getShareInfo()).toEqual({ packages: {} });
  });

  it("returns the negotiation report after setShareInfo", () => {
    const m: Manifest = {
      spec: "0.1",
      name: "checkout",
      exposes: {},
      shared: { react: { version: "18.3.1", requiredVersion: "^18.0.0", singleton: true, url: "./r.js" } },
    };
    const result = negotiateShared([{ name: "checkout", manifest: m, baseUrl: "https://cdn/checkout/" }]);
    setShareInfo(result);
    const info = getShareInfo();
    expect(info).toBe(result.report);
    expect(info.packages.react!.winner.version).toBe("18.3.1");
    expect(info.packages.react!.conflict).toBe(false);
  });
});
