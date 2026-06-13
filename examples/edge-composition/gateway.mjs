// The edge gateway. Uses @fedkit/edge to stitch the independent fragments into one streamed
// page and inject an import map. On a real edge runtime (Workers/Deno/Vercel) you'd return
// composeResponse(...) directly; here we adapt the Web stream to Node's http for the demo.
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { composeStream } from "@fedkit/edge";

const port = Number(process.env.PORT ?? 5203);
const PRODUCT = process.env.PRODUCT_URL ?? "http://localhost:5204/";
const REVIEWS = process.env.REVIEWS_URL ?? "http://localhost:5205/";

const template = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>fedkit — edge-composed shop</title></head>
<body>
<h1>fedkit — independent apps composed at the edge</h1>
<fedkit-fragment name="product">loading product…</fedkit-fragment>
<fedkit-fragment name="reviews">loading reviews…</fedkit-fragment>
<footer>Each fragment is its own app (React, or no framework). No shared runtime required.</footer>
</body></html>`;

const server = createServer((req, res) => {
  if ((req.url ?? "/") !== "/") {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const stream = composeStream({
    template,
    fragments: [
      { name: "product", src: PRODUCT },
      { name: "reviews", src: REVIEWS },
    ],
    importMap: { imports: { "@shop/analytics": "https://cdn.example.com/analytics.js" } },
  });
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  Readable.fromWeb(stream).pipe(res);
});
server.listen(port, () => console.log(`edge gateway: http://localhost:${port}  (product ${PRODUCT}, reviews ${REVIEWS})`));
