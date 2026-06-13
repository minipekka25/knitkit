import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mountOverridesWidget } from "../src/widget.js";
import { getOverrides, setOverride } from "../src/storage.js";

let unmount: () => void = () => {};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});
afterEach(() => unmount());

function q(testid: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testid}"]`);
}

describe("mountOverridesWidget", () => {
  it("mounts a panel with a row per known remote", () => {
    unmount = mountOverridesWidget({ remotes: ["checkout", "profile"] });
    expect(document.getElementById("knitkit-overrides-widget")).toBeTruthy();
    expect(q("knitkit-overrides-toggle")).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="knitkit-override-row"]').length).toBe(2);
  });

  it("toggles the panel open and closed", () => {
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    const panel = q("knitkit-overrides-panel") as HTMLElement;
    expect(panel.style.display).toBe("none");
    (q("knitkit-overrides-toggle") as HTMLButtonElement).click();
    expect(panel.style.display).toBe("block");
  });

  it("'Use local' persists the typed override", () => {
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    const input = q("knitkit-override-input") as HTMLInputElement;
    input.value = "http://localhost:5174/knit.manifest.json";
    (q("knitkit-override-apply") as HTMLButtonElement).click();
    expect(getOverrides()).toEqual({ checkout: "http://localhost:5174/knit.manifest.json" });
  });

  it("shows existing overrides and 'Clear' removes them", () => {
    setOverride("checkout", "http://localhost:5174/knit.manifest.json");
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    expect(q("knitkit-override-status")?.textContent).toContain("http://localhost:5174");
    (q("knitkit-override-clear") as HTMLButtonElement).click();
    expect(getOverrides()).toEqual({});
  });

  it("shows a hint when no remotes are provided", () => {
    unmount = mountOverridesWidget();
    const panel = q("knitkit-overrides-panel") as HTMLElement;
    expect(panel.textContent).toMatch(/No remotes provided/i);
    expect(document.querySelectorAll('[data-testid="knitkit-override-row"]').length).toBe(0);
  });

  it("'Clear all & reload' wipes every override", () => {
    setOverride("a", "http://localhost:1/m.json");
    setOverride("b", "http://localhost:2/m.json");
    unmount = mountOverridesWidget({ remotes: ["a", "b"] });
    (q("knitkit-overrides-clear-all") as HTMLButtonElement).click();
    expect(getOverrides()).toEqual({});
  });

  it("ignores an empty 'Use local' input", () => {
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    (q("knitkit-override-input") as HTMLInputElement).value = "   ";
    (q("knitkit-override-apply") as HTMLButtonElement).click();
    expect(getOverrides()).toEqual({});
  });

  it("includes remotes that only exist as overrides", () => {
    setOverride("legacy", "http://localhost:6000/knit.manifest.json");
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    const remotes = [...document.querySelectorAll('[data-testid="knitkit-override-row"]')].map(
      (r) => (r as HTMLElement).dataset.remote,
    );
    expect(remotes).toContain("checkout");
    expect(remotes).toContain("legacy");
  });
});
