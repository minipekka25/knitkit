# `@knitkit/edge`

Edge-side composition for **knitkit** — stitch remote HTML fragments into one streamed page at
the edge, and inject the negotiated import map so the composed page shares dependencies. Built
on Web standards (`fetch` + Web Streams), so it runs on **Cloudflare Workers**, **Deno Deploy**,
and **Vercel Edge** (and Node 18+).

This complements Cloudflare's fragment piercing rather than competing with it: each app keeps
its own manifest and runs independently; the gateway just composes their output.

## Usage

Mark insertion points in your host template, then compose in an edge handler:

```ts
import { composeResponse } from "@knitkit/edge";

const template = `<!doctype html><html><head><title>shop</title></head><body>
  <header>…</header>
  <knitkit-fragment name="checkout">loading checkout…</knitkit-fragment>
  <knitkit-fragment name="recommendations" />
  <footer>…</footer>
</body></html>`;

export default {
  fetch() {
    return composeResponse({
      template,
      fragments: [
        { name: "checkout", src: "https://checkout.example/fragment" },
        { name: "recommendations", src: "https://recs.example/fragment" },
      ],
      importMap: negotiatedImportMap, // optional — injected before </head>
    });
  },
};
```

- The head and static content **flush immediately**; fragments are fetched in **parallel** and
  streamed in document order as they resolve.
- A fragment that fails degrades to its **inline fallback** (the placeholder's inner HTML) or
  your `onError` — the page never 500s because one remote is down.
- `<knitkit-fragment name="x" />` (self-closing) and `<knitkit-fragment name="x">fallback</knitkit-fragment>`
  are both supported.

## API

| Export | Purpose |
| --- | --- |
| `composeResponse(options, init?)` | Compose into an HTML `Response` (typical edge return value). |
| `composeStream(options)` | Compose into a `ReadableStream<Uint8Array>`. |
| `compose(options)` | Buffered convenience: compose to a single HTML string. |
| `parseTemplate(template)` | Split a template into text/fragment segments (exported for tooling/tests). |
| `serializeImportMap(map)` | The `<script type="importmap">` serializer used for injection. |

`ComposeOptions`: `{ template, fragments, importMap?, fetch?, onError? }`.
