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
    expect(document.getElementById("fedkit-overrides-widget")).toBeTruthy();
    expect(q("fedkit-overrides-toggle")).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="fedkit-override-row"]').length).toBe(2);
  });

  it("toggles the panel open and closed", () => {
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    const panel = q("fedkit-overrides-panel") as HTMLElement;
    expect(panel.style.display).toBe("none");
    (q("fedkit-overrides-toggle") as HTMLButtonElement).click();
    expect(panel.style.display).toBe("block");
  });

  it("'Use local' persists the typed override", () => {
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    const input = q("fedkit-override-input") as HTMLInputElement;
    input.value = "http://localhost:5174/fed.manifest.json";
    (q("fedkit-override-apply") as HTMLButtonElement).click();
    expect(getOverrides()).toEqual({ checkout: "http://localhost:5174/fed.manifest.json" });
  });

  it("shows existing overrides and 'Clear' removes them", () => {
    setOverride("checkout", "http://localhost:5174/fed.manifest.json");
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    expect(q("fedkit-override-status")?.textContent).toContain("http://localhost:5174");
    (q("fedkit-override-clear") as HTMLButtonElement).click();
    expect(getOverrides()).toEqual({});
  });

  it("includes remotes that only exist as overrides", () => {
    setOverride("legacy", "http://localhost:6000/fed.manifest.json");
    unmount = mountOverridesWidget({ remotes: ["checkout"] });
    const remotes = [...document.querySelectorAll('[data-testid="fedkit-override-row"]')].map(
      (r) => (r as HTMLElement).dataset.remote,
    );
    expect(remotes).toContain("checkout");
    expect(remotes).toContain("legacy");
  });
});
