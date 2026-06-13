# Contributing to knitkit

Thanks for your interest! knitkit is an npm-workspaces monorepo. Issues, discussion, and PRs
are welcome — especially around the negotiation algorithm, SSR, and edge composition.

## Setup

```bash
git clone https://github.com/minipekka25/knitkit.git
cd knitkit
npm ci
```

Node 18+ is required (CI runs on 22, on Linux, Windows, and macOS).

## Everyday commands

```bash
npm run typecheck     # builds @knitkit/runtime first, then type-checks every package
npm run build         # build all packages (runtime first — its .d.ts is consumed by the rest)
npm test              # run every package's unit tests

# per package
npm run --workspace=@knitkit/runtime test
npm run --workspace=@knitkit/runtime size   # enforces the <5 KB runtime budget
```

Examples have their own self-booting smoke tests (Playwright / Node); they are run locally,
not in CI (they're network- and browser-dependent). See each `examples/*/README.md`.

## Ground rules

These aren't bureaucracy — they're what keeps knitkit small and predictable:

- **The core stays < 5 KB and zero-dependency.** `@knitkit/runtime` has no runtime deps, and
  CI fails if it exceeds the size budget. New runtime deps will be declined; put optional
  features in their own package.
- **The negotiation function is the most-tested code in the repo.** Changes to
  `packages/runtime/src/negotiate.ts` (or `semver.ts`) need tests first.
- **Everything is typed and errors are coded.** Throw `KnitkitError` with a `code` and a
  `suggestion`, not bare `Error`s.
- **No bundler plugins, no cross-remote HMR, no automatic transitive sharing.** These are
  deliberate non-goals — see the [roadmap](./docs/roadmap.md). PRs adding them won't be merged.

## Submitting a change

1. Branch off `main`.
2. Make the change with tests; ensure `npm run typecheck`, `npm test`, and (for runtime)
   `npm run --workspace=@knitkit/runtime size` pass.
3. **Add a changeset** describing the change for the release notes:
   ```bash
   npm run changeset
   ```
   Pick the affected packages and a bump type (patch = fix, minor = feature or breaking while
   pre-1.0). Commit the generated file with your change.
4. Open a PR. CI runs typecheck/build/test/size on all three OSes.

On merge to `main`, a "Version Packages" PR is opened automatically from the pending
changesets; merging it publishes the new versions to npm (with provenance).

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
