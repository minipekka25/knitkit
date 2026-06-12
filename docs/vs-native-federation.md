# fedkit vs Native Federation

[Native Federation](https://github.com/angular-architects/native-federation) (Manfred Steyer)
is fedkit's closest philosophical sibling: it also builds on **import maps + native ESM**
rather than a bundler runtime, and it deserves credit for proving the approach.

The difference is positioning and scope.

| | **fedkit** | **Native Federation** |
| --- | --- | --- |
| **Primary audience** | Framework-agnostic (React, Vue, Svelte, vanilla) | Angular-first in practice |
| **Framework-agnostic core** | The whole project is the core | `@softarc/native-federation` exists but has little independent mindshare |
| **SSR** | First-class `@fedkit/node` (loader hooks, SRI, hydration-parity map) | Not the focus |
| **Edge** | On the roadmap (same manifest, native import maps on Deno/Workers) | Not the focus |
| **Types** | `fedkit types` generate + sync, augmenting `loadRemote` | — |
| **DX** | `<RemoteComponent>`, local-override widget, coded errors | Angular tooling-centric |

## The gap fedkit aims at

Nobody yet owns *"framework-agnostic, runtime-first, SSR + edge, great DX"* on import maps.
Native Federation showed import-map federation is viable; fedkit's goal is to be the
**framework-neutral, SSR-and-edge-capable, sharply-DX'd** take on the same substrate — with a
versioned [manifest spec](../spec/manifest-0.1.md) as a shared foundation the ecosystem can
build on.

This is a friendly space. If you are an Angular shop already happy with Native Federation,
there's little reason to switch. fedkit is for teams that want the import-map approach without
an Angular-shaped toolchain, and that need SSR/edge parity.

*(Re-verify project descriptions before publishing — brief §9.)*
