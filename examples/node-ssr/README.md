# Node SSR of a federated React component

Server-side renders a **federated React component** with `@fedkit/node` — the same manifest
that drives the browser, driving the server. No bundler plugins.

```bash
# from the repo root
npm run --workspace=@fedkit/node build
npm --prefix examples/node-ssr test        # boots the remote, renders, asserts the output
# or run it live:
npm --prefix examples/node-ssr run dev:remote   # remote on :5194
npm --prefix examples/node-ssr run dev          # SSR host on :5193
```

## How it works

`server/render.mjs`:

1. Fetches the remote's manifest and installs the fedkit loader hooks with
   `registerFederation(...)`. The server import map resolves `react` to the **local** React
   that `react-dom/server` uses, so a single React renders the whole tree — the SSR
   singleton. The remote module is **SRI-pinned**; tampered code is refused before execution.
2. `await import("widgets/Greeting")` — the hook fetches the remote ESM over HTTP and runs it.
3. `renderToString` produces HTML. `serializeImportMap(...)` emits a `<script type="importmap">`
   with **browser** URLs for the same React version, so the client hydrates identically — no
   dual-React, no hydration mismatch.

That the remote's `useState` renders server-side is the proof React is shared (a second React
instance would throw "Invalid hook call").

## Notes

- This demo uses `renderToString`; `react-dom/server`'s streaming APIs
  (`renderToPipeableStream`) drop in the same way.
- Loader hooks run on a worker thread; the renderer process force-exits when done. On Windows
  that exit can trip a libuv teardown assertion *after* the HTML is produced — harmless, and
  why the smoke test reads an output file rather than trusting the child's exit code.
