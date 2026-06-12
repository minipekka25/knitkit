# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets). It drives
versioning and changelogs for the published `@fedkit/*` packages.

## Workflow

1. After making a change, add a changeset describing it:
   ```bash
   npm run changeset
   ```
   Pick the affected packages and a bump type (patch / minor / major), and write a
   one-line summary aimed at users. This writes a markdown file here.

2. To apply pending changesets (bump versions + update CHANGELOGs):
   ```bash
   npm run version
   ```

3. To publish (gated — see below):
   ```bash
   npm run release
   ```

## Semver policy (0.x)

While we are pre-1.0:

- **minor** (`0.x.0`) — new features and any breaking change to a stable surface. We call
  out breaking changes prominently in the changeset summary.
- **patch** (`0.x.y`) — bug fixes and non-breaking internal changes.
- The **manifest spec** (`/spec`) is versioned independently of the packages; a breaking
  spec change is always a minor bump here and a spec major bump there.

## Publishing is gated

`npm run release` will not work until the real package name / npm scope is chosen (the
`@fedkit/*` scope is a placeholder — see `project_brief.md` §10). The private example app
(`@fedkit/example-react-host-vue-remote`) is never published.
