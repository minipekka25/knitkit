# Benchmarks

Reproducible measurements of what knitkit costs. Run them yourself — we don't commit the
generated numbers (they live in `results/`, gitignored).

```bash
# build the packages first
npm run --workspace=@knitkit/runtime build
npm run --workspace=@knitkit/react build   # (and node/edge/overrides if measuring those)

node benchmarks/bytes.mjs        # deterministic; CI-safe
node benchmarks/cold-load.mjs    # boots the React demo in a real browser; local only
```

## `bytes.mjs` — bytes shipped

Production-minifies each `@knitkit/*` bundle (esbuild), then gzip + brotli compresses it — the
bytes that actually cross the wire. **Shared deps (react, etc.) are not counted**: an app
ships those whether or not it federates, so they aren't federation overhead.

The headline is **federation overhead** — the JS a host loads purely to federate:

| | brotli |
| --- | --- |
| `@knitkit/runtime` only | ~3.5 KB |
| `@knitkit/runtime` + `@knitkit/react` | ~4.2 KB |

(Run the script for exact, current numbers; the runtime figure cross-checks the `size-limit`
CI gate of < 5 KB.)

## `cold-load.mjs` — first-visit cost

Boots the [`react-host-react-remote`](../examples/react-host-react-remote) demo, loads it in a
fresh Chromium, and reports request count, encoded bytes (Resource Timing API), and time from
navigation to the remote component being visible. Representative local run: ~15 requests,
~18 KB encoded, a few hundred ms to low seconds depending on the network (React is pulled from
esm.sh in the demo; self-hosting shared assets removes that variance).

## vs Module Federation 2.0 — measured, not asserted

`mf-comparison/` is a **real Module Federation 2.0 app** (`@module-federation/enhanced` +
rspack: a host, a remote, shared React). We measure federation overhead with the **delta
method** — build the *same* app twice, with and without federation, and diff the total shipped
JS. This isolates the federation machinery regardless of how either build chunks React, so
there's nothing to fudge.

```bash
cd benchmarks/mf-comparison
npm install        # MF 2.0 + rspack (isolated; not part of the main workspace)
npm run build      # builds the federated host, the remote, and a non-federated baseline
npm run measure
```

Representative result (run it for current numbers):

| Federation overhead a host ships (React shared/excluded) | raw | brotli |
| --- | --- | --- |
| **Module Federation 2.0** (delta: federated − non-federated host) | ~108 KB | **~27 KB** |
| **knitkit** (`@knitkit/runtime`) | ~11 KB | **~3.5 KB** |

So MF adds roughly **7–8× more federation code** to a host. The honest framing, though, isn't
only bytes: MF's overhead is bundler-generated per app (a container entry, share-scope
bootstrap, module wrappers), whereas knitkit's is a single shared runtime + a static, inspectable
import map. Re-verify before quoting publicly (`project_brief.md` §9); versions move.
