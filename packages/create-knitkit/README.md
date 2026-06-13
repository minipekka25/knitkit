# `create-knitkit`

Scaffold a runnable [knitkit](https://github.com/minipekka25/knitkit) starter in one command.

```bash
npm create knitkit@latest my-app
cd my-app
npm run dev          # http://localhost:8080
```

(or `pnpm create knitkit my-app`, `yarn create knitkit my-app`, `bun create knitkit my-app`)

You get a host that `loadRemote()`s a remote behind its own manifest, sharing one module
instance across the boundary — **no bundler plugin, no build step**. Open DevTools → Network to
watch the import map resolve and the remote load; click either **+1** button to see the shared
singleton update both sides.

## What it scaffolds

```
index.html              host page: one import map + a bootstrap that
                        registerRemotes() then imports the app
src/main.js             host app: loadRemote("widgets/Widget") + shared UI
remote/widget.js        the exposed remote module (mount(el))
remote/knit.manifest.json   the remote's manifest
shared/store.js         the shared singleton both sides import
serve.mjs               a dependency-free static server
```

The runtime is loaded from a CDN, so the demo runs with zero install.

## Usage

```
npm create knitkit@latest [dir] [--force]
```

- `dir` — target directory (default `knitkit-app`). The scaffolded `package.json` name is
  derived from it.
- `--force` — scaffold into a directory that already exists and is non-empty.

## License

[MIT](https://github.com/minipekka25/knitkit/blob/main/LICENSE)
