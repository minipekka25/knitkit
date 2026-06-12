import { describe, expect, it } from "vitest";
import { serializeImportMap, serializeImportMapJson } from "../src/serialize.js";

const OPEN = '<script type="importmap">';
const CLOSE = "</script>";

describe("serializeImportMap", () => {
  it("produces a script tag whose payload round-trips through JSON.parse", () => {
    const map = { imports: { react: "https://cdn/react.js", "react-dom": "https://cdn/react-dom.js" } };
    const html = serializeImportMap(map);
    expect(html.startsWith(OPEN)).toBe(true);
    expect(html.endsWith(CLOSE)).toBe(true);
    const inner = html.slice(OPEN.length, -CLOSE.length);
    expect(JSON.parse(inner)).toEqual(map);
  });

  it("neutralizes a </script> injection inside a URL value", () => {
    const map = { imports: { evil: "https://x/</script><script>alert(1)</script>" } };
    const html = serializeImportMap(map);
    // Only the wrapper's closing tag remains literal; the injected ones are escaped.
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).toContain("\\u003c/script>");
    const inner = html.slice(OPEN.length, -CLOSE.length);
    expect(JSON.parse(inner).imports.evil).toBe("https://x/</script><script>alert(1)</script>");
  });

  it("carries scopes and integrity through", () => {
    const map = {
      imports: { react: "https://cdn/react.js" },
      scopes: { "https://cdn/checkout/": { lodash: "https://cdn/checkout/lodash.js" } },
      integrity: { react: "sha384-abc" },
    };
    const inner = serializeImportMap(map).slice(OPEN.length, -CLOSE.length);
    expect(JSON.parse(inner)).toEqual(map);
  });

  it("escapes U+2028 line separators", () => {
    const map = { imports: { a: "https://x/a" + String.fromCharCode(0x2028) + "b" } };
    const json = serializeImportMapJson(map);
    expect(json).toContain("\\u2028");
    expect(json).not.toContain(String.fromCharCode(0x2028));
  });
});
