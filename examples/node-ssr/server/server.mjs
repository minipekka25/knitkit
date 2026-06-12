// Long-running SSR host for `npm run dev`. Registers federation once, renders per request.
import { createServer } from "node:http";
import { setupRenderer } from "./render.mjs";

const port = Number(process.env.PORT ?? 5193);
const remoteBase = process.env.REMOTE_BASE ?? `http://localhost:${process.env.REMOTE_PORT ?? 5194}`;

const { renderHtml } = await setupRenderer(remoteBase);

const server = createServer(async (req, res) => {
  if ((req.url ?? "/") !== "/") {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  try {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderHtml({ name: "world" }));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e?.stack || e));
  }
});

server.listen(port, () => console.log(`ssr host: http://localhost:${port}  (remote ${remoteBase})`));
