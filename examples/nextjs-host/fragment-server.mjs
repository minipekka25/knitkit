// A standalone remote fragment — its own app, no knitkit dependency, no shared runtime with
// the Next host. Serves an HTML fragment that <RemoteFragment> embeds.
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 5304);

const html = `<div style="border:2px solid #6366f1;border-radius:8px;padding:16px;font-family:system-ui">
  <h2 style="margin:0;color:#4f46e5">Remote fragment</h2>
  <p>Rendered by an independent app and embedded into the Next.js page at runtime — zero config.</p>
</div>`;

createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(html);
}).listen(port, () => console.log(`fragment: http://localhost:${port}`));
