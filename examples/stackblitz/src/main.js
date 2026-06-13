import { loadRemote } from "@knitkit/runtime";
import { store, increment, subscribe } from "shared-store";

const root = document.getElementById("root");
root.innerHTML = `
  <h1>knitkit — load a remote at runtime</h1>
  <p>
    No bundler plugin. The widget below lives behind its own manifest and is fetched + mounted by
    <code>loadRemote</code>. Open DevTools → Network to watch the import map resolve and the remote
    module load.
  </p>
  <p>
    host sees shared count: <strong data-host-count>${store.count}</strong>
    <button data-host-inc style="cursor:pointer">+1 from the host</button>
  </p>
  <div id="slot">loading remote…</div>
  <p style="color:#555;margin-top:24px">
    Click either button — host and remote update together because they share <em>one</em>
    <code>store</code> module instance (one import-map entry → one instance). That's the
    singleton, by construction.
  </p>`;

const hostCount = root.querySelector("[data-host-count]");
subscribe((n) => (hostCount.textContent = String(n)));
root.querySelector("[data-host-inc]").addEventListener("click", () => increment());

const mount = await loadRemote("widgets/Widget");
mount(document.getElementById("slot"));
