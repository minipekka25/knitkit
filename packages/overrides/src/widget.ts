import { getOverrides, setOverride, removeOverride, clearOverrides } from "./storage.js";

export interface OverridesWidgetOptions {
  /** Remote names to list (in addition to any that already have an override). */
  remotes?: string[];
  /** Placeholder shown in the URL input. */
  placeholder?: string;
}

const WIDGET_ID = "fedkit-overrides-widget";

function reload(): void {
  try {
    location.reload();
  } catch {
    // jsdom / non-browser: no-op. The override is already persisted.
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { dataset?: Record<string, string> } = {},
  style = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { dataset, ...rest } = props;
  Object.assign(node, rest);
  if (dataset) for (const [k, v] of Object.entries(dataset)) node.dataset[k] = v;
  if (style) node.setAttribute("style", style);
  return node;
}

/**
 * Mount a small floating panel for setting per-remote local overrides — point a remote at
 * `localhost` while the rest stay deployed (the single-spa import-map-overrides DX). Call it
 * only in development. Returns an unmount function.
 */
export function mountOverridesWidget(options: OverridesWidgetOptions = {}): () => void {
  if (typeof document === "undefined") return () => {};
  document.getElementById(WIDGET_ID)?.remove();

  const placeholder = options.placeholder ?? "http://localhost:5174/fed.manifest.json";
  const overrides = getOverrides();
  const names = Array.from(new Set([...(options.remotes ?? []), ...Object.keys(overrides)]));

  const root = el("div", { id: WIDGET_ID }, "position:fixed;bottom:12px;right:12px;z-index:2147483647;font-family:system-ui;font-size:13px");

  const panel = el(
    "div",
    { dataset: { testid: "fedkit-overrides-panel" } },
    "display:none;background:#111;color:#eee;border:1px solid #333;border-radius:8px;padding:12px;width:320px;box-shadow:0 6px 24px rgba(0,0,0,.4)",
  );

  const toggle = el(
    "button",
    {
      textContent: "⚙ fedkit overrides" + (Object.keys(overrides).length ? ` (${Object.keys(overrides).length})` : ""),
      dataset: { testid: "fedkit-overrides-toggle" },
    },
    "background:#111;color:#eee;border:1px solid #333;border-radius:8px;padding:6px 10px;cursor:pointer",
  );
  toggle.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  panel.appendChild(el("strong", { textContent: "Remote overrides" }));

  if (names.length === 0) {
    panel.appendChild(el("p", { textContent: "No remotes provided. Pass { remotes: [...] }." }, "color:#999"));
  }

  for (const name of names) {
    const current = overrides[name];
    const row = el("div", { dataset: { testid: "fedkit-override-row", remote: name } }, "margin-top:10px;border-top:1px solid #333;padding-top:8px");
    row.appendChild(el("label", { textContent: name }, "display:block;font-weight:600"));
    if (current) {
      row.appendChild(el("div", { textContent: `→ ${current}`, dataset: { testid: "fedkit-override-status" } }, "color:#7dd3fc;word-break:break-all;margin:2px 0"));
    }
    const input = el("input", { value: current ?? "", placeholder, dataset: { testid: "fedkit-override-input" } }, "width:100%;box-sizing:border-box;margin:4px 0;padding:4px;background:#000;color:#eee;border:1px solid #444;border-radius:4px");
    const apply = el("button", { textContent: "Use local", dataset: { testid: "fedkit-override-apply" } }, "margin-right:6px;cursor:pointer");
    apply.addEventListener("click", () => {
      const url = input.value.trim();
      if (!url) return;
      setOverride(name, url);
      reload();
    });
    const clear = el("button", { textContent: "Clear", dataset: { testid: "fedkit-override-clear" } }, "cursor:pointer");
    clear.addEventListener("click", () => {
      removeOverride(name);
      reload();
    });
    row.append(input, apply, clear);
    panel.appendChild(row);
  }

  const clearAll = el("button", { textContent: "Clear all & reload", dataset: { testid: "fedkit-overrides-clear-all" } }, "margin-top:12px;cursor:pointer");
  clearAll.addEventListener("click", () => {
    clearOverrides();
    reload();
  });
  panel.appendChild(clearAll);

  root.append(toggle, panel);
  document.body.appendChild(root);
  return () => root.remove();
}
