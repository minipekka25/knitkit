// A "reviews" fragment with NO framework at all — just HTML. The edge gateway composes it
// next to the React fragment without either knowing about the other.
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 5205);

const html = `<div data-fragment="reviews" style="border:2px solid #10b981;border-radius:8px;padding:16px;font-family:system-ui">
  <h2 style="margin:0;color:#047857">Reviews (vanilla fragment)</h2>
  <p>No framework here — just HTML. Independent app, composed into the same page.</p>
</div>`;

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(html);
});
server.listen(port, () => console.log(`reviews fragment: http://localhost:${port}`));
