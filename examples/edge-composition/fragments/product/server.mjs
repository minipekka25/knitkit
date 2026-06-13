// A self-contained React "product" fragment. It renders its OWN React app to HTML and
// serves the markup — no shared runtime with the host or the other fragments.
import { createServer } from "node:http";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

const port = Number(process.env.PORT ?? 5204);

function ProductCard() {
  return h(
    "div",
    {
      "data-fragment": "product",
      style: { border: "2px solid #f59e0b", borderRadius: "8px", padding: "16px", fontFamily: "system-ui" },
    },
    h("h2", { style: { margin: 0, color: "#b45309" } }, "Product (React fragment)"),
    h("p", null, "Its own React app, rendered independently and composed at the edge."),
  );
}

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(renderToString(h(ProductCard)));
});
server.listen(port, () => console.log(`product fragment: http://localhost:${port}`));
