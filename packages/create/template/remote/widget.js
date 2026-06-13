// The exposed remote module (./Widget). Framework-agnostic: it exports a mount(el) function.
// It imports the shared store via a BARE specifier, which the host page's import map resolves
// to the very same module the host uses — one instance across the boundary, no bundler.
import { store, increment, subscribe } from "shared-store";

export default function mount(el) {
  el.innerHTML = `
    <div style="border:2px solid #6366f1;border-radius:8px;padding:16px;background:#eef2ff">
      <h2 style="margin:0;color:#4f46e5">Remote widget</h2>
      <p>Fetched over the network and mounted by knitkit — no bundler plugin.</p>
      <p>shared count: <strong data-count>${store.count}</strong></p>
      <button data-inc style="cursor:pointer">+1 from the remote</button>
    </div>`;
  const countEl = el.querySelector("[data-count]");
  const off = subscribe((n) => (countEl.textContent = String(n)));
  el.querySelector("[data-inc]").addEventListener("click", () => increment());
  return () => {
    off();
    el.innerHTML = "";
  };
}
