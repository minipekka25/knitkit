# Benchmarks

Reproducible measurements of what fedkit costs. Run them yourself — we don't commit the
generated numbers (they live in `results/`, gitignored).

```bash
# build the packages first
npm run --workspace=@fedkit/runtime build
npm run --workspace=@fedkit/react build   # (and node/edge/overrides if measuring those)

node benchmarks/bytes.mjs        # deterministic; CI-safe
node benchmarks/cold-load.mjs    # boots the React demo in a real browser; local only
```

## `bytes.mjs` — bytes shipped

Production-minifies each `@fedkit/*` bundle (esbuild), then gzip + brotli compresses it — the
bytes that actually cross the wire. **Shared deps (react, etc.) are not counted**: an app
ships those whether or not it federates, so they aren't federation overhead.

The headline is **federation overhead** — the JS a host loads purely to federate:

| | brotli |
| --- | --- |
| `@fedkit/runtime` only | ~3.5 KB |
| `@fedkit/runtime` + `@fedkit/react` | ~4.2 KB |

(Run the script for exact, current numbers; the runtime figure cross-checks the `size-limit`
CI gate of < 5 KB.)

## `cold-load.mjs` — first-visit cost

Boots the [`react-host-react-remote`](../examples/react-host-react-remote) demo, loads it in a
fresh Chromium, and reports request count, encoded bytes (Resource Timing API), and time from
navigation to the remote component being visible. Representative local run: ~15 requests,
~18 KB encoded, a few hundred ms to low seconds depending on the network (React is pulled from
esm.sh in the demo; self-hosting shared assets removes that variance).

## Comparing against Module Federation — honestly

We deliberately **do not ship fabricated competitor numbers** (`project_brief.md` §9: such
figures fluctuate and must be verified before publishing). To produce a fair comparison:

1. Build the **same** app twice — once with fedkit, once with Module Federation 2.0
   (`@module-federation/enhanced` + your bundler) — same host, same one remote, same shared
   React.
2. For **bytes**, measure the federation runtime each ships (exclude the shared React, which
   both load): point `bytes.mjs`'s approach at MF's emitted runtime chunk.
3. For **cold-load**, run `cold-load.mjs`'s methodology (Resource Timing) against both apps on
   the same machine/network, several times, and report medians.
4. Publish the methodology alongside the numbers so they're reproducible.

What we can say without measuring MF: fedkit's federation overhead is the
**`@fedkit/runtime` bundle alone (~3.5 KB brotli, zero deps)** plus a one-line import map —
there is no bundler-embedded runtime, share-scope bookkeeping, or plugin chunk. The honest
comparison is left to a real MF build, run with the scripts above.
