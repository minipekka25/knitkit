// Zero configuration. Embedding a remote fragment with <RemoteFragment> needs no Next changes
// at all — the fragment is an isolated app, so there is no shared-React/bundler coupling.
//
// (Sharing React with a federated remote via <RemoteComponent> is the other story — see the
// README; that one needs a documented `transpilePackages` + import-map setup and is NOT
// zero-config, because Next bundles its own React.)
/** @type {import('next').NextConfig} */
export default {};
