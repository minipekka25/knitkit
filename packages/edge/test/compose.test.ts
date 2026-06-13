import { describe, it, expect } from "vitest";
import { parseTemplate, compose, composeStream, composeResponse } from "../src/index.js";

function mockFetch(routes: Record<string, { status?: number; body: string }>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const r = routes[url];
    if (!r) return new Response("not found", { status: 404 });
    return new Response(r.body, { status: r.status ?? 200 });
  }) as typeof fetch;
}

const TEMPLATE = `<!doctype html><html><head><title>shell</title></head><body>
<header>host</header>
<knitkit-fragment name="checkout">loading checkout…</knitkit-fragment>
<knitkit-fragment name="profile" />
<footer>host</footer>
</body></html>`;

describe("parseTemplate", () => {
  it("splits text and fragment segments, capturing fallbacks and self-closing tags", () => {
    const segs = parseTemplate(TEMPLATE);
    const frags = segs.filter((s) => s.type === "fragment");
    expect(frags.map((f) => (f as { name: string }).name)).toEqual(["checkout", "profile"]);
    expect((frags[0] as { fallback: string }).fallback).toBe("loading checkout…");
    expect((frags[1] as { fallback: string }).fallback).toBe("");
    // text segments preserved around fragments
    expect(segs[0]).toMatchObject({ type: "text" });
    expect((segs[0] as { value: string }).value).toContain("<header>host</header>");
  });
});

describe("compose", () => {
  it("inlines fetched fragments in document order", async () => {
    const html = await compose({
      template: TEMPLATE,
      fragments: [
        { name: "checkout", src: "https://checkout.example/f" },
        { name: "profile", src: "https://profile.example/f" },
      ],
      fetch: mockFetch({
        "https://checkout.example/f": { body: "<section id=cart>CART</section>" },
        "https://profile.example/f": { body: "<section id=me>ME</section>" },
      }),
    });
    expect(html).toContain("<section id=cart>CART</section>");
    expect(html).toContain("<section id=me>ME</section>");
    expect(html).not.toContain("<knitkit-fragment");
    // order: header before cart before me before footer
    expect(html.indexOf("host")).toBeLessThan(html.indexOf("CART"));
    expect(html.indexOf("CART")).toBeLessThan(html.indexOf("ME"));
    expect(html.indexOf("ME")).toBeLessThan(html.lastIndexOf("host"));
  });

  it("injects the import map before </head>", async () => {
    const html = await compose({
      template: TEMPLATE,
      fragments: [],
      importMap: { imports: { react: "https://esm.sh/react@18.3.1" } },
      fetch: mockFetch({}),
    });
    expect(html).toMatch(/<script type="importmap">.*<\/script><\/head>/s);
    expect(html).toContain("esm.sh/react@18.3.1");
  });

  it("falls back to the placeholder content when a fragment fails to load", async () => {
    const html = await compose({
      template: TEMPLATE,
      fragments: [{ name: "checkout", src: "https://down.example/f" }],
      fetch: mockFetch({ "https://down.example/f": { status: 503, body: "err" } }),
    });
    expect(html).toContain("loading checkout…"); // the inline fallback
    expect(html).not.toContain("<knitkit-fragment");
  });

  it("uses onError when provided", async () => {
    const html = await compose({
      template: `<div><knitkit-fragment name="x">fb</knitkit-fragment></div>`,
      fragments: [{ name: "x", src: "https://down/f" }],
      fetch: mockFetch({}),
      onError: (f, e) => `<!-- ${f.name}: ${e.message.includes("404") ? "404" : "err"} -->`,
    });
    expect(html).toBe("<div><!-- x: 404 --></div>");
  });

  it("emits a comment for a placeholder with no registered fragment", async () => {
    const html = await compose({
      template: `<div><knitkit-fragment name="ghost" /></div>`,
      fragments: [],
      fetch: mockFetch({}),
    });
    expect(html).toContain('no fragment registered for "ghost"');
  });
});

describe("composeStream / composeResponse", () => {
  it("composeStream yields a readable stream of bytes", async () => {
    const stream = composeStream({
      template: `a<knitkit-fragment name="x"/>b`,
      fragments: [{ name: "x", src: "https://x/f" }],
      fetch: mockFetch({ "https://x/f": { body: "X" } }),
    });
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(await new Response(stream).text()).toBe("aXb");
  });

  it("composeResponse returns an HTML Response", async () => {
    const res = composeResponse({
      template: `<p><knitkit-fragment name="x"/></p>`,
      fragments: [{ name: "x", src: "https://x/f" }],
      fetch: mockFetch({ "https://x/f": { body: "Y" } }),
    });
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(await res.text()).toBe("<p>Y</p>");
  });
});
